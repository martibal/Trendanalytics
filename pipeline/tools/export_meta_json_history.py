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
import os
import datetime as dt
import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd


def _parse_date(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


def _confidence_asof(
    *,
    chain: str,
    day: dt.date,
    gold_df: pd.DataFrame,
    gold_status: Dict[str, Any],
    load_conf_series,
    compute_conf_from_gold,
    compute_lag_days,
) -> Dict[str, Any]:
    """Return a confidence dict as-of 'day'.

    Prefers confidence series if present; otherwise derives a conservative proxy from GOLD.
    """
    conf_score: Optional[float] = None
    conf_date: Optional[str] = None

    try:
        cdf = load_conf_series(chain, "daily")
    except Exception:
        cdf = pd.DataFrame()

    if cdf is not None and not cdf.empty:
        if "date" in cdf.columns:
            cdf = cdf.copy()
            cdf["date"] = pd.to_datetime(cdf["date"], errors="coerce").dt.date
            cdf = cdf.dropna(subset=["date"]).sort_values("date")
            cdf = cdf[cdf["date"] <= day]
            if not cdf.empty:
                row = cdf.iloc[-1]
                v = row.get("confidence_score")
                conf_score = float(v) if v is not None else None
                conf_date = row["date"].isoformat() if hasattr(row["date"], "isoformat") else None

    if conf_score is None:
        # Derive from gold slice up to day
        d = gold_df.copy()
        if "date" not in d.columns and "day" in d.columns:
            d = d.rename(columns={"day": "date"})
        if "date" in d.columns:
            d["date"] = pd.to_datetime(d["date"], errors="coerce").dt.date
            d = d.dropna(subset=["date"]).sort_values("date")
            d = d[d["date"] <= day]
        conf_score = compute_conf_from_gold(d, chain=chain, gold_status=gold_status)
        conf_date = day.isoformat()

    return {
        "chain": chain,
        "missing": conf_score is None,
        "date": conf_date or day.isoformat(),
        "confidence_score": float(conf_score) if conf_score is not None else None,
        "lag_days_vs_utc_today": compute_lag_days(conf_date or day.isoformat()),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Repo root (main folder)")
    ap.add_argument("--out-root", required=True, help="Output root for meta json (main/data/calculated/meta)")
    ap.add_argument("--start", required=True, help="Start date YYYY-MM-DD (inclusive)")
    ap.add_argument("--force", action="store_true", help="Overwrite existing files")
    ap.add_argument("--mode", default=os.environ.get("CSS_PIPELINE_MODE","incremental"), choices=["incremental","rebuild"], help="incremental=preserve existing day files; rebuild=overwrite history")
    ap.add_argument("--windows", default="7,30,90,180,365", help="Comma-separated window sizes to materialize as lastXd.json")
    args = ap.parse_args()

    mode = str(args.mode)
    windows = tuple(int(x) for x in str(args.windows).split(",") if x.strip())
    force = bool(args.force) or (mode == "rebuild")

    repo_root = Path(args.root).resolve()
    out_root = Path(args.out_root).resolve()
    start = _parse_date(args.start)

    # Ensure repo_root is importable
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

    # Late imports after sys.path adjustment
    from api.main import (  # noqa: WPS433 (intentional runtime import)
        SUPPORTED_CHAINS,
        PUBLISH_LAG_DAYS_POLICY,
        _load_gold_df,
        _load_gold_status,
        _load_confidence_series,
        _compute_confidence_from_gold,
        _compute_lag_days,
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
        last_iso = _last_gold_date_iso(df)
        if not last_iso:
            continue
        end = _parse_date(last_iso)

        # Normalize df dates once
        d = df.copy()
        if "date" not in d.columns and "day" in d.columns:
            d = d.rename(columns={"day": "date"})
        if "date" in d.columns:
            d["date"] = pd.to_datetime(d["date"], errors="coerce").dt.date
            d = d.dropna(subset=["date"]).sort_values("date")

        ch_out = out_root / chain
        ch_out.mkdir(parents=True, exist_ok=True)

        cur = start
        while cur <= end:
            out_file = ch_out / f"{cur.isoformat()}.json"
            if out_file.exists() and not force:
                cur += dt.timedelta(days=1)
                continue

            slice_df = d[d["date"] <= cur]
            profile = get_chain_profile(chain)
            conf = _confidence_asof(
                chain=chain,
                day=cur,
                gold_df=d,
                gold_status=gs,
                load_conf_series=_load_confidence_series,
                compute_conf_from_gold=_compute_confidence_from_gold,
                compute_lag_days=_compute_lag_days,
            )
            conf_score = conf.get("confidence_score")

            scorecard = compute_market_scorecard(slice_df, chain=chain, confidence_score=conf_score, window_days=7)
            scorecard = dict(scorecard)
            scorecard["asof_date"] = cur.isoformat()

            regime = compute_regime(
                slice_df,
                chain=chain,
                profile=profile,
                asof_date=cur.isoformat(),
                window_days=7,
                confidence_score=conf_score,
                confidence_threshold=CONFIDENCE_THRESHOLD,
            )
            status = _status_from_regime_and_scorecard(regime, scorecard)

            obj: Dict[str, Any] = {
                "chain": chain,
                "missing": False,
                "profile": profile,
                "gold_status": gs,
                "confidence": conf,
                "scorecard": scorecard,
                "regime": regime,
                "updated_through": cur.isoformat(),
                "publish_lag_days_policy": PUBLISH_LAG_DAYS_POLICY.get(chain, 1),
                "tier_used": "standard",
                "status": status,
            }

            out_file.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")
            cur += dt.timedelta(days=1)


        # Always refresh latest.json and materialized windows (views)
        try:
            # Discover available day files (YYYY-MM-DD.json)
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
                (ch_out / "latest.json").write_text(json.dumps(latest_obj, ensure_ascii=False, indent=2), encoding="utf-8")

                for n in windows:
                    if n <= 0:
                        continue
                    slice_paths = day_paths[-n:]
                    payload = [json.loads(p.read_text(encoding="utf-8")) for p in slice_paths]
                    (ch_out / f"last{n}d.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass

if __name__ == "__main__":
    main()
