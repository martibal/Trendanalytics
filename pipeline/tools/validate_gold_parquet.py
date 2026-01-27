#!/usr/bin/env python3
"""
validate_gold_parquet.py

Production "MÅ"-gate for gold Parquet quality before serving/publishing.

Checks (strict mode fails on any FATAL):
- Gold parquet exists per supported chain
- Latest date freshness within per-chain policy (BTC/ETH default T-1, L2 default T-7)
- No duplicate dates
- Date monotonicity (sorted) and no gaps larger than allowed (warn only)
- Metric sanity ranges (block time, gas utilization, failed tx rate)
- Detects the known "avg_block_time_sec nanosecond bug" (implausibly tiny values)

Exit codes:
0 OK
2 FAIL (strict or fatal findings)

Usage:
python tools/validate_gold_parquet.py --gold-root "D:\\css\\full\\prod\\gold" --strict
"""
from __future__ import annotations

import argparse
import math
import sys
from dataclasses import dataclass
from datetime import date, datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

SUPPORTED_CHAINS = ["ethereum", "bitcoin", "base", "arbitrum"]

@dataclass(frozen=True)
class Finding:
    severity: str  # FATAL | WARN | INFO
    chain: str
    message: str

def _utc_today() -> date:
    now = datetime.now(timezone.utc)
    return date(now.year, now.month, now.day)

def _parse_iso_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()

def _env_int(name: str, default: int) -> int:
    import os
    try:
        return int(os.getenv(name, str(default)))
    except Exception:
        return default

def policy_lag_days(chain: str) -> int:
    if chain in ("bitcoin", "ethereum"):
        return _env_int("PUBLISH_LAG_BTC_ETH_DAYS", 1)
    if chain in ("base", "arbitrum"):
        return _env_int("PUBLISH_LAG_L2_DAYS", 7)
    return _env_int("PUBLISH_LAG_DAYS_POLICY", 3)

def read_gold(gold_root: Path, chain: str) -> pd.DataFrame:
    p = gold_root / f"{chain}.parquet"
    if not p.exists():
        raise FileNotFoundError(str(p))
    df = pd.read_parquet(p)
    if "date" not in df.columns:
        raise ValueError(f"{p} missing 'date'")
    # normalize to string yyyy-mm-dd
    if pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = df["date"].dt.date.astype(str)
    else:
        df["date"] = df["date"].astype(str)
    return df.sort_values("date")

def is_finite_number(x: Any) -> bool:
    return isinstance(x, (int, float)) and (not isinstance(x, bool)) and math.isfinite(float(x))

def validate_chain(df: pd.DataFrame, chain: str, *, strict_freshness: bool) -> List[Finding]:
    out: List[Finding] = []
    if df.empty:
        out.append(Finding("FATAL", chain, "gold parquet has 0 rows"))
        return out

    dates = df["date"].tolist()
    if len(set(dates)) != len(dates):
        out.append(Finding("FATAL", chain, "duplicate dates detected"))

    latest = dates[-1]
    try:
        upd = _parse_iso_date(latest)
        age_days = (_utc_today() - upd).days
        lag = policy_lag_days(chain)
        if age_days > lag:
            # Freshness is a first-class transparency signal, but should not necessarily
            # hard-fail local rebuilds when no newer raw days exist. Treat as WARN by
            # default and allow strict mode to fail-closed.
            sev = "FATAL" if strict_freshness else "WARN"
            out.append(Finding(sev, chain, f"freshness breach: latest={latest} age_days={age_days} policy={lag}"))
    except Exception as e:
        out.append(Finding("FATAL", chain, f"cannot parse latest date '{latest}': {e}"))

    # Optional gap check (WARN)
    try:
        dts = [_parse_iso_date(d) for d in dates]
        gaps = []
        for a,b in zip(dts, dts[1:]):
            delta = (b-a).days
            if delta > 1:
                gaps.append((a,b,delta))
        if gaps:
            worst = max(gaps, key=lambda x: x[2])
            out.append(Finding("WARN", chain, f"date gaps detected (max gap {worst[2]} days between {worst[0]} and {worst[1]})"))
    except Exception:
        pass

    # Metric sanity rules
    def check_range(col: str, mn: float, mx: float, fatal: bool = True) -> None:
        if col not in df.columns:
            return
        s = df[col]
        vals = [float(x) for x in s.tolist() if is_finite_number(x)]
        if not vals:
            return
        vmin, vmax = min(vals), max(vals)
        if vmin < mn or vmax > mx:
            sev = "FATAL" if fatal else "WARN"
            out.append(Finding(sev, chain, f"{col} out of range: min={vmin} max={vmax} expected [{mn},{mx}]"))

    # avg_block_time_sec expectations
    if chain == "bitcoin":
        check_range("avg_block_time_sec", 30.0, 3600.0, fatal=True)
    elif chain == "ethereum":
        check_range("avg_block_time_sec", 0.5, 60.0, fatal=True)
        check_range("gas_utilization_pct", 0.0, 1.0, fatal=True)
        check_range("failed_tx_rate", 0.0, 1.0, fatal=True)
    elif chain in ("base","arbitrum"):
        check_range("avg_block_time_sec", 0.001, 60.0, fatal=True)

    # Known nanosecond bug detection (implausibly tiny positive)
    if "avg_block_time_sec" in df.columns:
        tiny = df["avg_block_time_sec"].apply(lambda x: is_finite_number(x) and float(x) > 0 and float(x) < 1e-6)
        if bool(tiny.any()):
            out.append(Finding("FATAL", chain, "avg_block_time_sec contains implausibly tiny values (<1e-6). Likely unit bug."))

    return out

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--gold-root", required=True, help="Path to prod/gold directory containing <chain>.parquet")
    ap.add_argument("--strict", action="store_true", help="Fail-closed: treat freshness breaches as FATAL and fail on any WARN as well")
    args = ap.parse_args()

    gold_root = Path(args.gold_root).resolve()
    findings: List[Finding] = []

    for c in SUPPORTED_CHAINS:
        try:
            df = read_gold(gold_root, c)
            findings.extend(validate_chain(df, c, strict_freshness=args.strict))
        except Exception as e:
            findings.append(Finding("FATAL", c, f"cannot read gold parquet: {e}"))

    fatals = [f for f in findings if f.severity == "FATAL"]
    warns = [f for f in findings if f.severity == "WARN"]

    for f in findings:
        print(f"[{f.severity}] {f.chain}: {f.message}")

    if fatals:
        return 2
    if args.strict and warns:
        return 2
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
