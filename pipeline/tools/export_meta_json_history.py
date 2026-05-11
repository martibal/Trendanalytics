#!/usr/bin/env python3
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
import hashlib
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


def _stable_revision_id(chain: str, date_str: str) -> int:
    """Deterministic revision_id for historical rows."""
    h = hashlib.sha256(f"{chain}:{date_str}".encode()).hexdigest()
    return int(h[:8], 16) % 100_000_000


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
    from api.regime_engine import compute_regime, reconcile_regime_with_scorecard

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
            preliminary_regime = reconcile_regime_with_scorecard(preliminary_regime, preliminary_scorecard)

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
            regime = reconcile_regime_with_scorecard(regime, scorecard)
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
                "revision_id": _stable_revision_id(chain, asof_iso),
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
