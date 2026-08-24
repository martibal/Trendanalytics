#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Sequence

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from api.analog_engine import AnalogConfig, _build_feature_tables, _prep_gold  # noqa: E402

CHAINS = ("bitcoin", "ethereum", "arbitrum", "base")
PRODUCTION_BASELINE_DAYS = 45
COMPARISON_WINDOWS = (90, 180)
DEFAULT_METRICS = (
    "tx_count_daily",
    "median_tx_fee_native",
    "gas_utilization_pct",
    "avg_block_time_sec",
)


def _load_gold(chain_dir: Path) -> pd.DataFrame:
    rows = []
    for path in sorted(chain_dir.glob("20??-??-??.json")):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if isinstance(obj, dict):
            rows.append(obj)
    return pd.DataFrame(rows)


def _z0_columns(frame: pd.DataFrame, metrics: Sequence[str]) -> list[str]:
    return [f"z0_{m}" for m in metrics if f"z0_{m}" in frame.columns]


def _compare_features(prod: pd.DataFrame, alt: pd.DataFrame, metrics: Sequence[str]) -> dict:
    common = prod.index.intersection(alt.index)
    cols = [c for c in _z0_columns(prod, metrics) if c in alt.columns]
    if len(common) < 30 or not cols:
        return {
            "status": "skipped",
            "reason": "insufficient_common_feature_history",
            "common_days": int(len(common)),
        }

    a = prod.loc[common, cols].to_numpy(dtype=float)
    b = alt.loc[common, cols].to_numpy(dtype=float)
    finite = np.isfinite(a) & np.isfinite(b)
    if not finite.any():
        return {"status": "skipped", "reason": "no_finite_common_features"}

    abs_delta = np.abs(a - b)
    median_abs_delta = float(np.nanmedian(np.where(finite, abs_delta, np.nan)))

    directional = finite & (np.abs(a) >= 0.25) & (np.abs(b) >= 0.25)
    if directional.any():
        agreement = float(np.mean(np.sign(a[directional]) == np.sign(b[directional])))
        directional_points = int(np.sum(directional))
    else:
        agreement = 1.0
        directional_points = 0

    return {
        "status": "ok",
        "common_days": int(len(common)),
        "feature_columns": cols,
        "median_abs_z_delta": round(median_abs_delta, 4),
        "direction_agreement": round(agreement, 4),
        "directional_points": directional_points,
    }


def audit_chain(df: pd.DataFrame, chain: str) -> dict:
    metrics = [
        m
        for m in DEFAULT_METRICS
        if m in df.columns and pd.to_numeric(df[m], errors="coerce").notna().sum() >= 90
    ]
    if not metrics:
        return {"chain": chain, "status": "skipped", "reason": "no_supported_metrics"}

    prepared = _prep_gold(df)
    _, prod = _build_feature_tables(
        prepared,
        metrics,
        AnalogConfig(baseline_window_days=PRODUCTION_BASELINE_DAYS),
    )
    comparisons = {}
    for window in COMPARISON_WINDOWS:
        _, alt = _build_feature_tables(
            prepared,
            metrics,
            AnalogConfig(baseline_window_days=window),
        )
        comparisons[str(window)] = _compare_features(prod, alt, metrics)

    return {
        "chain": chain,
        "status": "ok",
        "metrics": metrics,
        "production_baseline_days": PRODUCTION_BASELINE_DAYS,
        "comparisons": comparisons,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Evaluate the 45-day analog baseline against longer 90/180-day context without changing production methodology."
    )
    parser.add_argument("--published-root", default="data/published/v1")
    parser.add_argument("--min-direction-agreement", type=float, default=0.50)
    parser.add_argument("--report")
    args = parser.parse_args()

    root = Path(args.published_root)
    results = []
    for chain in CHAINS:
        df = _load_gold(root / "gold" / chain)
        if df.empty:
            results.append({"chain": chain, "status": "skipped", "reason": "missing_gold_history"})
            continue
        results.append(audit_chain(df, chain))

    comparable = []
    for chain_result in results:
        for window, comparison in chain_result.get("comparisons", {}).items():
            if comparison.get("status") == "ok":
                comparable.append((chain_result["chain"], window, comparison))

    payload = {
        "purpose": "Longer-baseline robustness context; sensitivity audit only.",
        "production_baseline_days": PRODUCTION_BASELINE_DAYS,
        "comparison_baseline_days": list(COMPARISON_WINDOWS),
        "decision": (
            "Retain the 45-day production baseline. A future baseline change requires "
            "an explicit methodology-version change and reviewed historical replay."
        ),
        "minimum_direction_agreement": args.min_direction_agreement,
        "chains": results,
    }
    text = json.dumps(payload, indent=2, sort_keys=True)
    print(text)
    if args.report:
        report = Path(args.report)
        report.parent.mkdir(parents=True, exist_ok=True)
        report.write_text(text + "\n", encoding="utf-8")

    if not comparable:
        print("BASELINE CONTEXT AUDIT FAILED: no comparable chain histories", file=sys.stderr)
        return 1

    unstable = [
        (chain, window)
        for chain, window, comparison in comparable
        if float(comparison["direction_agreement"]) < args.min_direction_agreement
    ]
    if unstable:
        print(
            "BASELINE CONTEXT AUDIT FAILED: directional agreement below floor: "
            + ", ".join(f"{chain}/{window}d" for chain, window in unstable),
            file=sys.stderr,
        )
        return 1

    print("BASELINE CONTEXT AUDIT PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
