from __future__ import annotations

import re
import sys
from pathlib import Path

EXPORT_META_REPLACEMENT = r'''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Export META JSON history (one file per chain/day).

META JSON is the enriched "overview" envelope used by the web UI (scorecard, regime, confidence, etc.),
but persisted historically per day so the UI can load it without recomputing on the fly.

Output layout:
  <out_root>/<chain>/YYYY-MM-DD.json

Design goals:
- Deterministic and idempotent (skips existing files unless --force/--mode rebuild; always refreshes latest.json and lastXd.json)
- Does not require the API server to run; uses api.main computation functions directly.
"""

from __future__ import annotations

import argparse
import os
import datetime as dt
import json
import sys
from pathlib import Path
from typing import Any, Dict

import pandas as pd


METHODOLOGY_VERSION = os.environ.get("METHODOLOGY_VERSION", "1.0")


def _parse_date(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


def _normalize_daily_df(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    if "date" not in d.columns and "day" in d.columns:
        d = d.rename(columns={"day": "date"})
    if "date" in d.columns:
        d["date"] = pd.to_datetime(d["date"], errors="coerce").dt.date
        d = d.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
    return d


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Repo root (main folder)")
    ap.add_argument("--out-root", required=True, help="Output root for meta json (main/data/calculated/meta)")
    ap.add_argument("--start", required=True, help="Start date YYYY-MM-DD (inclusive)")
    ap.add_argument("--force", action="store_true", help="Overwrite existing files")
    ap.add_argument(
        "--mode",
        default=os.environ.get("CSS_PIPELINE_MODE", "incremental"),
        choices=["incremental", "rebuild"],
        help="incremental=preserve existing day files; rebuild=overwrite history",
    )
    ap.add_argument("--windows", default="7,30,90,180,365", help="Comma-separated window sizes to materialize as lastXd.json")
    args = ap.parse_args()

    mode = str(args.mode)
    windows = tuple(int(x) for x in str(args.windows).split(",") if x.strip())
    force = bool(args.force) or (mode == "rebuild")

    repo_root = Path(args.root).resolve()
    out_root = Path(args.out_root).resolve()
    start = _parse_date(args.start)

    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

    from api.main import (  # noqa: WPS433 (intentional runtime import)
        SUPPORTED_CHAINS,
        PUBLISH_LAG_DAYS_POLICY,
        _load_gold_df,
        _load_gold_status,
        _compute_confidence_from_gold,
        _build_confidence_payload,
        _last_gold_date_iso,
        get_chain_profile,
        _status_from_regime_and_scorecard,
        CONFIDENCE_THRESHOLD,
    )
    from api.market_scorecard import compute_market_scorecard
    from api.regime_engine import compute_regime

    out_root.mkdir(parents=True, exist_ok=True)

    for chain in SUPPORTED_CHAINS:
        gs = _load_gold_status(chain)
        df = _load_gold_df(chain, "daily")
        if df is None or df.empty:
            continue

        d = _normalize_daily_df(df)
        last_iso = _last_gold_date_iso(d)
        if not last_iso:
            continue
        end = _parse_date(last_iso)

        ch_out = out_root / chain
        ch_out.mkdir(parents=True, exist_ok=True)

        cur = start
        while cur <= end:
            out_file = ch_out / f"{cur.isoformat()}.json"
            if out_file.exists() and not force:
                cur += dt.timedelta(days=1)
                continue

            slice_df = d[d["date"] <= cur].copy()
            if slice_df.empty:
                cur += dt.timedelta(days=1)
                continue

            profile = get_chain_profile(chain)
            asof_iso = cur.isoformat()

            # Pass 1: compute a pure data-quality seed from GOLD only.
            data_quality_seed = _compute_confidence_from_gold(slice_df, chain=chain, gold_status=gs)

            preliminary_scorecard = compute_market_scorecard(
                slice_df,
                chain=chain,
                confidence_score=data_quality_seed,
                window_days=7,
            )
            preliminary_scorecard = dict(preliminary_scorecard)
            preliminary_scorecard["asof_date"] = asof_iso

            preliminary_regime = compute_regime(
                slice_df,
                chain=chain,
                profile=profile,
                asof_date=asof_iso,
                window_days=7,
                confidence_score=data_quality_seed,
                confidence_threshold=CONFIDENCE_THRESHOLD,
            )

            confidence = _build_confidence_payload(
                slice_df,
                chain=chain,
                gold_status=gs,
                scorecard=preliminary_scorecard,
                regime=preliminary_regime,
                asof_date=asof_iso,
            )
            effective_confidence = confidence.get("confidence_score")

            # Pass 2: recompute final scorecard/regime using the effective confidence.
            scorecard = compute_market_scorecard(
                slice_df,
                chain=chain,
                confidence_score=effective_confidence,
                window_days=7,
            )
            scorecard = dict(scorecard)
            scorecard["asof_date"] = asof_iso

            regime = compute_regime(
                slice_df,
                chain=chain,
                profile=profile,
                asof_date=asof_iso,
                window_days=7,
                confidence_score=effective_confidence,
                confidence_threshold=CONFIDENCE_THRESHOLD,
            )
            status = _status_from_regime_and_scorecard(regime, scorecard)

            updated_through = confidence.get("updated_through") or _last_gold_date_iso(slice_df)
            data_quality_score = confidence.get("data_quality_score")

            data_confidence: Dict[str, Any] = {
                "missing": data_quality_score is None,
                "confidence_score": data_quality_score,
                "date": updated_through,
                "lag_days_vs_asof_date": confidence.get("lag_days_vs_asof_date"),
                "lag_days_vs_utc_today": confidence.get("lag_days_vs_utc_today"),
                "components": confidence.get("components"),
                "semantics": "data_quality_and_history_coverage_only",
            }

            publish_confidence: Dict[str, Any] = {
                "missing": effective_confidence is None,
                "confidence_score": effective_confidence,
                "threshold": CONFIDENCE_THRESHOLD,
                "eligible": bool(effective_confidence >= CONFIDENCE_THRESHOLD) if isinstance(effective_confidence, (int, float)) else None,
                "reason": "combined_confidence_threshold" if isinstance(effective_confidence, (int, float)) else "missing_confidence",
            }

            obj: Dict[str, Any] = {
                "date": asof_iso,
                "chain": chain,
                "missing": False,
                "methodology_version": METHODOLOGY_VERSION,
                "profile": profile,
                "gold_status": gs,
                "confidence": confidence,
                "data_confidence": data_confidence,
                "publish_confidence": publish_confidence,
                "scorecard": scorecard,
                "regime": regime,
                "updated_through": updated_through,
                "publish_lag_days_policy": PUBLISH_LAG_DAYS_POLICY.get(chain, 1),
                "tier_used": "standard",
                "status": status,
            }

            out_file.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
            cur += dt.timedelta(days=1)

        try:
            day_paths = []
            for p in ch_out.glob("*.json"):
                if p.name == "latest.json" or (p.name.startswith("last") and p.name.endswith("d.json")):
                    continue
                try:
                    dt.date.fromisoformat(p.stem)
                    day_paths.append(p)
                except Exception:
                    continue
            day_paths.sort(key=lambda p: p.stem)

            if day_paths:
                latest_day = day_paths[-1]
                latest_obj = json.loads(latest_day.read_text(encoding="utf-8"))
                if not isinstance(latest_obj, dict):
                    latest_obj = {"date": latest_day.stem, "missing": True, "chain": chain}
                if "date" not in latest_obj or not latest_obj.get("date"):
                    latest_obj["date"] = latest_day.stem
                (ch_out / "latest.json").write_text(json.dumps(latest_obj, ensure_ascii=False, indent=2), encoding="utf-8")

                for n in windows:
                    if n <= 0:
                        continue
                    slice_paths = day_paths[-n:]
                    payload = []
                    for p in slice_paths:
                        o = json.loads(p.read_text(encoding="utf-8"))
                        if isinstance(o, dict) and ("date" not in o or not o.get("date")):
                            o["date"] = p.stem
                        payload.append(o)
                    (ch_out / f"last{n}d.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass


if __name__ == "__main__":
    main()
'''

HELPER_BLOCK = r'''

LOGICAL_METRIC_ALIASES: Dict[str, List[str]] = {
    "tx_count_daily": ["tx_count_daily"],
    "block_count_daily": ["block_count_daily"],
    "value_transferred_native": ["value_transferred_native"],
    "median_tx_value_native": ["median_tx_value_native"],
    "median_tx_fee_native": ["median_tx_fee_native", "median_fee_native"],
    "failed_tx_rate": ["failed_tx_rate"],
    "gas_utilization_pct": ["gas_utilization_pct"],
    "unique_active_addresses": ["unique_active_addresses"],
    "avg_block_time_sec": ["avg_block_time_sec", "avg_block_time_s"],
}

CHAIN_REQUIRED_LOGICAL_METRICS: Dict[str, List[str]] = {
    "bitcoin": [
        "tx_count_daily",
        "block_count_daily",
        "value_transferred_native",
        "median_tx_value_native",
        "avg_block_time_sec",
    ],
    "ethereum": [
        "tx_count_daily",
        "block_count_daily",
        "value_transferred_native",
        "median_tx_value_native",
        "median_tx_fee_native",
        "failed_tx_rate",
        "gas_utilization_pct",
        "unique_active_addresses",
        "avg_block_time_sec",
    ],
    "arbitrum": [
        "tx_count_daily",
        "block_count_daily",
        "value_transferred_native",
        "median_tx_value_native",
        "median_tx_fee_native",
        "unique_active_addresses",
        "avg_block_time_sec",
    ],
    "base": [
        "tx_count_daily",
        "block_count_daily",
        "value_transferred_native",
        "median_tx_value_native",
        "median_tx_fee_native",
        "unique_active_addresses",
        "avg_block_time_sec",
    ],
}


def _normalize_gold_daily_df(df: Optional[pd.DataFrame]) -> pd.DataFrame:
    if df is None or getattr(df, "empty", True):
        return pd.DataFrame()
    d = df.copy()
    if "date" not in d.columns and "day" in d.columns:
        d = d.rename(columns={"day": "date"})
    if "date" in d.columns:
        d["date"] = pd.to_datetime(d["date"], errors="coerce").dt.date
        d = d.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
    return d


def _logical_metric_value(row: pd.Series, logical_name: str) -> Any:
    for candidate in LOGICAL_METRIC_ALIASES.get(logical_name, [logical_name]):
        if candidate in row.index:
            return row.get(candidate)
    return None


def _is_present_value(value: Any) -> bool:
    if value is None:
        return False
    try:
        return bool(pd.notna(value))
    except Exception:
        return False


def _required_metrics_for_chain(chain: str) -> List[str]:
    return list(CHAIN_REQUIRED_LOGICAL_METRICS.get(chain, CHAIN_REQUIRED_LOGICAL_METRICS["ethereum"]))


def _row_metric_coverage(row: pd.Series, chain: str) -> Optional[float]:
    required = _required_metrics_for_chain(chain)
    if not required:
        return None
    present = 0
    total = 0
    for logical_name in required:
        total += 1
        if _is_present_value(_logical_metric_value(row, logical_name)):
            present += 1
    if total <= 0:
        return None
    return present / total


def _freshness_factor_asof(lag_days: Optional[int], chain: str) -> Optional[float]:
    if lag_days is None:
        return None
    expected = int(PUBLISH_LAG_DAYS_POLICY.get(chain, 1))
    soft = expected + (1 if expected <= 1 else 3)
    hard = expected + (3 if expected <= 1 else 8)
    if lag_days <= expected:
        return 1.0
    if lag_days >= hard:
        return 0.0
    if lag_days <= soft:
        span = max(1, soft - expected)
        return max(0.70, 1.0 - ((lag_days - expected) / span) * 0.30)
    span = max(1, hard - soft)
    return max(0.0, 0.70 - ((lag_days - soft) / span) * 0.70)


def _compute_data_quality_details(df: Optional[pd.DataFrame], *, chain: str, gold_status: Optional[Dict[str, Any]] = None, asof_date: Optional[str] = None) -> Dict[str, Any]:
    d = _normalize_gold_daily_df(df)
    if d.empty:
        return {
            "score": None,
            "updated_through": None,
            "lag_days_vs_asof_date": None,
            "components": {
                "current_row_coverage": None,
                "recent_metric_coverage": None,
                "recent_density": None,
                "history_depth": None,
                "freshness_asof": None,
            },
        }

    latest_row = d.iloc[-1]
    updated_through = latest_row["date"].isoformat() if hasattr(latest_row["date"], "isoformat") else str(latest_row["date"])

    if asof_date:
        try:
            asof_dt = _parse_iso_date(asof_date)
        except Exception:
            asof_dt = latest_row["date"]
    else:
        asof_dt = latest_row["date"]

    lag_days_vs_asof_date = max(0, (asof_dt - latest_row["date"]).days)

    current_row_coverage = _row_metric_coverage(latest_row, chain)

    recent_start = asof_dt - timedelta(days=29)
    recent_rows = d[d["date"] >= recent_start].copy()
    expected_recent_days = 30
    observed_recent_days = int(recent_rows["date"].nunique()) if not recent_rows.empty else 0
    recent_density = min(1.0, observed_recent_days / expected_recent_days)

    if not recent_rows.empty:
        row_coverages = [
            _row_metric_coverage(row, chain)
            for _, row in recent_rows.iterrows()
        ]
        row_coverages = [float(v) for v in row_coverages if isinstance(v, (int, float)) and math.isfinite(float(v))]
        recent_metric_coverage = (sum(row_coverages) / len(row_coverages)) if row_coverages else current_row_coverage
    else:
        recent_metric_coverage = current_row_coverage

    history_depth = min(1.0, float(d["date"].nunique()) / 90.0)
    freshness_asof = _freshness_factor_asof(lag_days_vs_asof_date, chain)

    weighted_parts = [
        (current_row_coverage, 0.30),
        (recent_metric_coverage, 0.20),
        (recent_density, 0.20),
        (history_depth, 0.15),
        (freshness_asof, 0.15),
    ]
    num = 0.0
    den = 0.0
    for value, weight in weighted_parts:
        if isinstance(value, (int, float)) and math.isfinite(float(value)):
            num += float(value) * weight
            den += weight
    score = None if den <= 0 else max(0.0, min(1.0, num / den))

    return {
        "score": score,
        "updated_through": updated_through,
        "lag_days_vs_asof_date": lag_days_vs_asof_date,
        "components": {
            "current_row_coverage": current_row_coverage,
            "recent_metric_coverage": recent_metric_coverage,
            "recent_density": recent_density,
            "history_depth": history_depth,
            "freshness_asof": freshness_asof,
        },
    }


def _compute_confidence_from_gold(df: Optional[pd.DataFrame], *, chain: str, gold_status: Optional[Dict[str, Any]] = None) -> Optional[float]:
    details = _compute_data_quality_details(df, chain=chain, gold_status=gold_status)
    value = details.get("score")
    return float(value) if isinstance(value, (int, float)) and math.isfinite(float(value)) else None


def _score_level_margin(score: Optional[float], level: Optional[str]) -> Optional[float]:
    if score is None or not isinstance(score, (int, float)) or not math.isfinite(float(score)):
        return None
    s = float(score)
    norm = str(level or "").strip().lower()
    if not norm:
        if s >= 67:
            norm = "high"
        elif s <= 33:
            norm = "low"
        else:
            norm = "normal"
    if norm in {"balanced"}:
        norm = "normal"
    if norm in {"normal", "neutral"}:
        margin = min(max(0.0, s - 33.0), max(0.0, 67.0 - s))
        return max(0.0, min(1.0, margin / 17.0))
    if norm in {"high", "elevated", "heating", "congested"}:
        return max(0.0, min(1.0, (s - 67.0) / 33.0))
    if norm in {"low", "cheap", "cooling"}:
        return max(0.0, min(1.0, (33.0 - s) / 33.0))
    if s >= 67:
        return max(0.0, min(1.0, (s - 67.0) / 33.0))
    if s <= 33:
        return max(0.0, min(1.0, (33.0 - s) / 33.0))
    return max(0.0, min(1.0, min(s - 33.0, 67.0 - s) / 17.0))


def _driver_signal_support(regime: Optional[Dict[str, Any]], *, stable_mode: bool = False) -> Optional[float]:
    drivers = []
    if isinstance(regime, dict):
        raw = regime.get("drivers")
        if isinstance(raw, list):
            drivers = raw[:5]
    zs: List[float] = []
    for driver in drivers:
        if not isinstance(driver, dict):
            continue
        z = driver.get("z_robust")
        if isinstance(z, (int, float)) and math.isfinite(float(z)):
            zs.append(max(0.0, min(1.0, abs(float(z)) / 3.0)))
    if not zs:
        return None
    mean_z = sum(zs) / len(zs)
    if stable_mode:
        return max(0.0, min(1.0, 1.0 - mean_z))
    return mean_z


def _compute_label_clarity(scorecard: Optional[Dict[str, Any]], regime: Optional[Dict[str, Any]]) -> Optional[float]:
    if not isinstance(scorecard, dict):
        return None

    dims = ((scorecard.get("dimensions") or {}) if isinstance(scorecard.get("dimensions"), dict) else {})
    valid_scores: List[float] = []
    margins: List[float] = []
    for axis in ("demand", "friction", "capacity"):
        block = dims.get(axis) if isinstance(dims.get(axis), dict) else {}
        score = block.get("score")
        level = block.get("level")
        if isinstance(score, (int, float)) and math.isfinite(float(score)):
            valid_scores.append(float(score))
        margin = _score_level_margin(score if isinstance(score, (int, float)) else None, level if isinstance(level, str) else None)
        if isinstance(margin, (int, float)) and math.isfinite(float(margin)):
            margins.append(float(margin))

    if not valid_scores and not margins:
        return None

    axis_margin = (sum(margins) / len(margins)) if margins else None
    neutrality = max(0.0, min(1.0, 1.0 - (sum(abs(v - 50.0) for v in valid_scores) / max(1, len(valid_scores))) / 17.0)) if valid_scores else None

    label = ""
    if isinstance(regime, dict):
        label = str(regime.get("label") or "").upper().strip()

    if label in {"", "UNKNOWN/DEGRADED"}:
        return 0.0

    if label == "STABLE":
        driver_support = _driver_signal_support(regime, stable_mode=True)
        parts = [
            (neutrality, 0.60),
            (axis_margin, 0.25),
            (driver_support, 0.15),
        ]
    else:
        driver_support = _driver_signal_support(regime, stable_mode=False)
        parts = [
            (axis_margin, 0.65),
            (driver_support, 0.35),
        ]

    num = 0.0
    den = 0.0
    for value, weight in parts:
        if isinstance(value, (int, float)) and math.isfinite(float(value)):
            num += float(value) * weight
            den += weight
    if den <= 0:
        return None
    return max(0.0, min(1.0, num / den))


def _build_confidence_payload(
    df: Optional[pd.DataFrame],
    *,
    chain: str,
    gold_status: Optional[Dict[str, Any]] = None,
    scorecard: Optional[Dict[str, Any]] = None,
    regime: Optional[Dict[str, Any]] = None,
    asof_date: Optional[str] = None,
) -> Dict[str, Any]:
    details = _compute_data_quality_details(df, chain=chain, gold_status=gold_status, asof_date=asof_date)
    data_quality_score = details.get("score")
    label_confidence_score = _compute_label_clarity(scorecard, regime)

    if isinstance(data_quality_score, (int, float)) and math.isfinite(float(data_quality_score)):
        if isinstance(label_confidence_score, (int, float)) and math.isfinite(float(label_confidence_score)):
            confidence_score = max(0.0, min(1.0, math.sqrt(float(data_quality_score) * float(label_confidence_score))))
        else:
            confidence_score = float(data_quality_score)
    else:
        confidence_score = None

    updated_through = details.get("updated_through")
    effective_date = updated_through or asof_date

    return {
        "chain": chain,
        "missing": confidence_score is None,
        "date": effective_date,
        "asof_date": asof_date,
        "updated_through": updated_through,
        "confidence_score": confidence_score,
        "data_quality_score": float(data_quality_score) if isinstance(data_quality_score, (int, float)) and math.isfinite(float(data_quality_score)) else None,
        "label_confidence_score": float(label_confidence_score) if isinstance(label_confidence_score, (int, float)) and math.isfinite(float(label_confidence_score)) else None,
        "lag_days_vs_asof_date": details.get("lag_days_vs_asof_date"),
        "lag_days_vs_utc_today": _compute_lag_days(effective_date),
        "semantics": "combined_data_quality_and_label_stability",
        "source": "gold_history",
        "components": details.get("components") or {},
    }
'''

COMPUTE_OVERVIEW_REPLACEMENT = r'''def compute_overview(chain: str, *, asof: Optional[str] = None) -> Dict[str, Any]:
    if chain not in SUPPORTED_CHAINS:
        return {"chain": chain, "missing": True, "unsupported": True}

    gs = _load_gold_status(chain)
    df = _load_gold_df(chain, "daily")

    if asof:
        try:
            asof_dt = pd.to_datetime(asof, errors="raise")
        except Exception:
            raise HTTPException(status_code=400, detail=f"asof must be YYYY-MM-DD, got: {asof}")

        if df is not None and not df.empty:
            ddf = df.copy()
            if "date" not in ddf.columns and "day" in ddf.columns:
                ddf = ddf.rename(columns={"day": "date"})
            if "date" in ddf.columns:
                if not pd.api.types.is_datetime64_any_dtype(ddf["date"]):
                    ddf["date"] = pd.to_datetime(ddf["date"], errors="coerce")
                ddf = ddf.dropna(subset=["date"]).sort_values("date")
                ddf = ddf[ddf["date"] <= asof_dt]
                df = ddf

    if df is None or df.empty:
        return {
            "chain": chain,
            "missing": True,
            "profile": get_chain_profile(chain),
            "gold_status": gs,
            "confidence": {
                "chain": chain,
                "missing": True,
                "date": None,
                "confidence_score": None,
                "data_quality_score": None,
                "label_confidence_score": None,
                "lag_days_vs_asof_date": None,
                "lag_days_vs_utc_today": None,
                "semantics": "combined_data_quality_and_label_stability",
                "components": {},
            },
            "data_confidence": {"missing": True, "confidence_score": None, "date": None, "lag_days_vs_asof_date": None, "lag_days_vs_utc_today": None, "components": {}, "semantics": "data_quality_and_history_coverage_only"},
            "publish_confidence": {"missing": True, "confidence_score": None, "threshold": CONFIDENCE_THRESHOLD, "eligible": None, "reason": "missing_confidence"},
            "scorecard": {},
            "regime": {},
            "updated_through": None,
            "publish_lag_days_policy": PUBLISH_LAG_DAYS_POLICY.get(chain, 1),
            "tier_used": "standard",
            "status": {"label": "UNKNOWN/DEGRADED", "one_liner": None, "color": "gray"},
        }

    asof_iso = _last_gold_date_iso(df)

    data_quality_seed = _compute_confidence_from_gold(df, chain=chain, gold_status=gs)

    preliminary_scorecard = compute_market_scorecard(df, chain=chain, confidence_score=data_quality_seed, window_days=7)
    preliminary_regime = compute_regime(
        df,
        chain=chain,
        profile=get_chain_profile(chain),
        asof_date=preliminary_scorecard.get("asof_date"),
        window_days=7,
        confidence_score=data_quality_seed,
        confidence_threshold=CONFIDENCE_THRESHOLD,
    )

    conf = _build_confidence_payload(
        df,
        chain=chain,
        gold_status=gs,
        scorecard=preliminary_scorecard,
        regime=preliminary_regime,
        asof_date=asof_iso,
    )
    conf_score = conf.get("confidence_score")

    scorecard = compute_market_scorecard(df, chain=chain, confidence_score=conf_score, window_days=7)
    regime = compute_regime(
        df,
        chain=chain,
        profile=get_chain_profile(chain),
        asof_date=scorecard.get("asof_date"),
        window_days=7,
        confidence_score=conf_score,
        confidence_threshold=CONFIDENCE_THRESHOLD,
    )

    status = _status_from_regime_and_scorecard(regime, scorecard)
    missing = bool(gs.get("missing", False) and (df is None or df.empty))
    updated_through = conf.get("updated_through") or _last_gold_date_iso(df)

    data_confidence_score = conf.get("data_quality_score")

    publish_confidence: Dict[str, Any] = {
        "missing": conf_score is None,
        "confidence_score": conf_score,
        "threshold": CONFIDENCE_THRESHOLD,
        "eligible": bool(conf_score >= CONFIDENCE_THRESHOLD) if isinstance(conf_score, (int, float)) and math.isfinite(float(conf_score)) else None,
        "reason": "combined_confidence_threshold" if isinstance(conf_score, (int, float)) and math.isfinite(float(conf_score)) else "missing_confidence",
    }

    data_confidence: Dict[str, Any] = {
        "missing": data_confidence_score is None,
        "confidence_score": data_confidence_score,
        "date": updated_through,
        "lag_days_vs_asof_date": conf.get("lag_days_vs_asof_date"),
        "lag_days_vs_utc_today": conf.get("lag_days_vs_utc_today"),
        "components": conf.get("components") or {},
        "semantics": "data_quality_and_history_coverage_only",
    }

    return {
        "chain": chain,
        "missing": missing,
        "profile": get_chain_profile(chain),
        "gold_status": gs,
        "confidence": conf,
        "data_confidence": data_confidence,
        "publish_confidence": publish_confidence,
        "scorecard": scorecard,
        "regime": regime,
        "updated_through": updated_through,
        "publish_lag_days_policy": PUBLISH_LAG_DAYS_POLICY.get(chain, 1),
        "tier_used": "standard",
        "status": status,
    }
'''

OLD_GOLD_DIR_LINE = 'GOLD_DIR = Path(os.getenv("GOLD_DIR", str(REPO_ROOT / "data" / "calculated" / "gold"))).resolve()'
NEW_GOLD_DIR_LINE = 'GOLD_DIR = Path(os.getenv("GOLD_DIR", str(REPO_ROOT / "data" / "published" / "v1" / "gold"))).resolve()'

OLD_LOAD_GOLD_DF = r'''def _load_gold_df(chain: str, granularity: str = "daily") -> pd.DataFrame:
    g = (granularity or "daily").lower().strip()
    cache_key = f"{chain}|{g}"

    # 1) Parquet if present (optional)
    p = _gold_path(chain, g)
    if p.exists():
        st = p.stat()
        ent = _GOLD_CACHE.get(cache_key)
        if ent and ent.mtime_ns == st.st_mtime_ns:
            return ent.df
        try:
            df = pd.read_parquet(p)
        except Exception:
            return pd.DataFrame()
        _GOLD_CACHE[cache_key] = GoldCacheEntry(mtime_ns=st.st_mtime_ns, df=df)
        return df

    # 2) JSON mode: prefer day-files YYYY-MM-DD.json (your intended contract)
    jdir = _gold_json_dir(chain, g)
    if not jdir.exists() or not jdir.is_dir():
        return pd.DataFrame()

    day_files: list[Path] = []
    try:
        for pth in jdir.glob("*.json"):
            if re.match(r"^\d{4}-\d{2}-\d{2}\.json$", pth.name):
                day_files.append(pth)
    except Exception:
        day_files = []

    if day_files:
        day_files = sorted(day_files, key=lambda p: p.name)

        try:
            MAX_DAYS = int(os.getenv("GOLD_JSON_MAX_DAYS", "2000"))
        except Exception:
            MAX_DAYS = 2000
        if len(day_files) > MAX_DAYS:
            day_files = day_files[-MAX_DAYS:]

        try:
            latest_mtime = max(p.stat().st_mtime_ns for p in day_files)
            ent = _GOLD_CACHE.get(cache_key)
            if ent and ent.mtime_ns == latest_mtime:
                return ent.df

            rows: list[dict] = []
            for pth in day_files:
                try:
                    obj = json.loads(pth.read_text(encoding="utf-8", errors="replace"))
                    if isinstance(obj, dict):
                        rows.append(obj)
                except Exception:
                    continue

            if not rows:
                return pd.DataFrame()

            df = pd.DataFrame(rows)
            if "date" not in df.columns and "day" in df.columns:
                df = df.rename(columns={"day": "date"})
            if "date" in df.columns:
                dtv = pd.to_datetime(df["date"], errors="coerce", utc=False)
                df = df.assign(date=dtv.dt.date).dropna(subset=["date"]).sort_values("date").reset_index(drop=True)

            _GOLD_CACHE[cache_key] = GoldCacheEntry(mtime_ns=latest_mtime, df=df)
            return df
        except Exception:
            return pd.DataFrame()

    # 3) Fallback: aggregated files (last30d.json may be array; latest.json is single datapoint)
    p30 = jdir / "last30d.json"
    platest = jdir / "latest.json"
    src = p30 if p30.exists() else (platest if platest.exists() else None)
    if src is None:
        return pd.DataFrame()

    try:
        st = src.stat()
        ent = _GOLD_CACHE.get(cache_key)
        if ent and ent.mtime_ns == st.st_mtime_ns:
            return ent.df

        obj = json.loads(src.read_text(encoding="utf-8", errors="replace"))
        if isinstance(obj, list):
            df = pd.DataFrame(obj)
        elif isinstance(obj, dict):
            df = pd.DataFrame([obj])
        else:
            return pd.DataFrame()

        if "date" not in df.columns and "day" in df.columns:
            df = df.rename(columns={"day": "date"})
        if "date" in df.columns:
            dtv = pd.to_datetime(df["date"], errors="coerce", utc=False)
            df = df.assign(date=dtv.dt.date).dropna(subset=["date"]).sort_values("date").reset_index(drop=True)

        _GOLD_CACHE[cache_key] = GoldCacheEntry(mtime_ns=st.st_mtime_ns, df=df)
        return df
    except Exception:
        return pd.DataFrame()
'''

NEW_LOAD_GOLD_DF = r'''def _load_gold_df(chain: str, granularity: str = "daily") -> pd.DataFrame:
    g = (granularity or "daily").lower().strip()
    cache_key = f"{chain}|{g}"

    # 1) Canonical source of truth: published day-files YYYY-MM-DD.json.
    #    This avoids stale calculated parquet silently overriding the web contract.
    jdir = _gold_json_dir(chain, g)
    if jdir.exists() and jdir.is_dir():
        day_files: list[Path] = []
        try:
            for pth in jdir.glob("*.json"):
                if re.match(r"^\d{4}-\d{2}-\d{2}\.json$", pth.name):
                    day_files.append(pth)
        except Exception:
            day_files = []

        if day_files:
            day_files = sorted(day_files, key=lambda p: p.name)

            try:
                max_days = int(os.getenv("GOLD_JSON_MAX_DAYS", "5000"))
            except Exception:
                max_days = 5000
            if len(day_files) > max_days:
                day_files = day_files[-max_days:]

            try:
                latest_mtime = max(p.stat().st_mtime_ns for p in day_files)
                ent = _GOLD_CACHE.get(cache_key)
                if ent and ent.mtime_ns == latest_mtime:
                    return ent.df

                rows: list[dict] = []
                for pth in day_files:
                    try:
                        obj = json.loads(pth.read_text(encoding="utf-8", errors="replace"))
                        if isinstance(obj, dict):
                            rows.append(obj)
                    except Exception:
                        continue

                if rows:
                    df = pd.DataFrame(rows)
                    if "date" not in df.columns and "day" in df.columns:
                        df = df.rename(columns={"day": "date"})
                    if "date" in df.columns:
                        dtv = pd.to_datetime(df["date"], errors="coerce", utc=False)
                        df = df.assign(date=dtv.dt.date).dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
                    _GOLD_CACHE[cache_key] = GoldCacheEntry(mtime_ns=latest_mtime, df=df)
                    return df
            except Exception:
                return pd.DataFrame()

        # 2) Fallback inside same published tree: aggregated JSON views.
        p30 = jdir / "last30d.json"
        platest = jdir / "latest.json"
        src = p30 if p30.exists() else (platest if platest.exists() else None)
        if src is not None:
            try:
                st = src.stat()
                ent = _GOLD_CACHE.get(cache_key)
                if ent and ent.mtime_ns == st.st_mtime_ns:
                    return ent.df

                obj = json.loads(src.read_text(encoding="utf-8", errors="replace"))
                if isinstance(obj, list):
                    df = pd.DataFrame(obj)
                elif isinstance(obj, dict):
                    df = pd.DataFrame([obj])
                else:
                    return pd.DataFrame()

                if "date" not in df.columns and "day" in df.columns:
                    df = df.rename(columns={"day": "date"})
                if "date" in df.columns:
                    dtv = pd.to_datetime(df["date"], errors="coerce", utc=False)
                    df = df.assign(date=dtv.dt.date).dropna(subset=["date"]).sort_values("date").reset_index(drop=True)

                _GOLD_CACHE[cache_key] = GoldCacheEntry(mtime_ns=st.st_mtime_ns, df=df)
                return df
            except Exception:
                return pd.DataFrame()

    # 3) Last-resort fallback: parquet if no published JSON contract is available.
    p = _gold_path(chain, g)
    if p.exists():
        st = p.stat()
        ent = _GOLD_CACHE.get(cache_key)
        if ent and ent.mtime_ns == st.st_mtime_ns:
            return ent.df
        try:
            df = pd.read_parquet(p)
        except Exception:
            return pd.DataFrame()
        _GOLD_CACHE[cache_key] = GoldCacheEntry(mtime_ns=st.st_mtime_ns, df=df)
        return df

    return pd.DataFrame()
'''

TRACK_RECORD_REGEX = re.compile(
    r'confidence:\s*\{\s*confidence_score\?: number;\s*lag_days_vs_utc_today\?: number;\s*\};',
    re.MULTILINE,
)
TRACK_RECORD_REPL = 'confidence: {\n    confidence_score?: number;\n    lag_days_vs_asof_date?: number;\n    lag_days_vs_utc_today?: number;\n    data_quality_score?: number;\n    label_confidence_score?: number;\n  };'

TRACK_RECORD_LAG_REGEX = re.compile(
    r'lagDays:\s*typeof row\.confidence\?\.lag_days_vs_utc_today === "number"\s*\?\s*row\.confidence\.lag_days_vs_utc_today\s*:\s*null,',
    re.MULTILINE,
)
TRACK_RECORD_LAG_REPL = 'lagDays:\n        typeof row.confidence?.lag_days_vs_asof_date === "number"\n          ? row.confidence.lag_days_vs_asof_date\n          : typeof row.confidence?.lag_days_vs_utc_today === "number"\n            ? row.confidence.lag_days_vs_utc_today\n            : null,'

CHAIN_NOTICE_1 = "Confidence is reduced due to limited history or missing components. Published scores are pulled toward neutral (50) to reduce over-interpretation, while the canonical regime label remains visible."
CHAIN_NOTICE_1_NEW = "Confidence combines data sufficiency and label stability. Lower values mean either incomplete inputs or a regime classification that sits close to a boundary rather than a clearly separated state."
CHAIN_NOTICE_2 = "Confidence is below the canonical threshold. The regime should be treated as UNKNOWN/DEGRADED, while the latest available data remains visible for traceability."
CHAIN_NOTICE_2_NEW = "Combined confidence is below the canonical threshold. The latest row remains visible for traceability, but the regime should be treated as UNKNOWN/DEGRADED until both data sufficiency and label stability improve."



def patch_main_py(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if OLD_GOLD_DIR_LINE in text:
        text = text.replace(OLD_GOLD_DIR_LINE, NEW_GOLD_DIR_LINE)
    if OLD_LOAD_GOLD_DF in text:
        text = text.replace(OLD_LOAD_GOLD_DF, NEW_LOAD_GOLD_DF)
    if HELPER_BLOCK not in text:
        text = text.replace("def compute_overview(chain: str, *, asof: Optional[str] = None) -> Dict[str, Any]:", HELPER_BLOCK + "\n\ndef compute_overview(chain: str, *, asof: Optional[str] = None) -> Dict[str, Any]:")
    text = re.sub(
        r'def compute_overview\(chain: str, \*, asof: Optional\[str\] = None\) -> Dict\[str, Any\]:.*?\n@app\.get\(f"\{API_PREFIX\}/overview"\)',
        COMPUTE_OVERVIEW_REPLACEMENT + "\n\n@app.get(f\"{API_PREFIX}/overview\")",
        text,
        flags=re.DOTALL,
    )
    path.write_text(text, encoding="utf-8")



def patch_track_record(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = TRACK_RECORD_REGEX.sub(TRACK_RECORD_REPL, text)
    text = TRACK_RECORD_LAG_REGEX.sub(TRACK_RECORD_LAG_REPL, text)
    path.write_text(text, encoding="utf-8")



def patch_chain_page(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = text.replace(CHAIN_NOTICE_1, CHAIN_NOTICE_1_NEW)
    text = text.replace(CHAIN_NOTICE_2, CHAIN_NOTICE_2_NEW)
    path.write_text(text, encoding="utf-8")



def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python apply_actual_confidence_patch.py D:\\css\\main")
        raise SystemExit(2)

    root = Path(sys.argv[1]).resolve()
    if not root.exists():
        print(f"Root not found: {root}")
        raise SystemExit(2)

    main_py = root / "api" / "main.py"
    export_py = root / "pipeline" / "tools" / "export_meta_json_history.py"
    track_record_page = root / "src" / "app" / "track-record" / "page.tsx"
    chain_page = root / "src" / "app" / "chains" / "[chain]" / "page.tsx"

    missing = [str(p) for p in [main_py, export_py] if not p.exists()]
    if missing:
        print("Missing required files:")
        for item in missing:
            print(f"  - {item}")
        raise SystemExit(1)

    patch_main_py(main_py)
    export_py.write_text(EXPORT_META_REPLACEMENT, encoding="utf-8")

    if track_record_page.exists():
        patch_track_record(track_record_page)
    if chain_page.exists():
        patch_chain_page(chain_page)

    print("Actual confidence patch applied.")
    print(f"  main.py: {main_py}")
    print(f"  export_meta_json_history.py: {export_py}")
    if track_record_page.exists():
        print(f"  track-record page: {track_record_page}")
    if chain_page.exists():
        print(f"  chain page copy: {chain_page}")


if __name__ == "__main__":
    main()
