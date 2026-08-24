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

from api.analog_engine import AnalogConfig, _bucket_filter_with_fallback, _build_feature_tables, _candidate_index, _prep_gold  # noqa: E402

CHAINS = ("bitcoin", "ethereum", "arbitrum", "base")
DEFAULT_METRICS = ("tx_count_daily", "median_tx_fee_native", "gas_utilization_pct", "avg_block_time_sec")


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


def _feature_columns(cand: pd.DataFrame, metrics: Sequence[str]) -> list[str]:
    cols: list[str] = []
    for metric in metrics:
        for prefix in ("z0_", "zabs7_", "trend7_"):
            name = f"{prefix}{metric}"
            if name in cand.columns:
                cols.append(name)
    return cols


def _distances(cand: pd.DataFrame, cur: pd.Series, cols: list[str]) -> tuple[np.ndarray, np.ndarray]:
    x = cand[cols].to_numpy(dtype=float)
    y = cur[cols].to_numpy(dtype=float)
    diff = x - y
    euclidean = np.sqrt(np.nanmean(diff * diff, axis=1))

    cov = np.cov(x, rowvar=False)
    if np.ndim(cov) == 0:
        cov = np.array([[float(cov)]], dtype=float)
    ridge = max(float(np.trace(cov)) / max(cov.shape[0], 1), 1.0) * 1e-6
    inv_cov = np.linalg.pinv(cov + np.eye(cov.shape[0]) * ridge)
    mahalanobis = np.sqrt(np.maximum(0.0, np.einsum("ij,jk,ik->i", diff, inv_cov, diff)))
    return euclidean, mahalanobis


def _top_indices(values: np.ndarray, k: int) -> set[int]:
    finite = np.flatnonzero(np.isfinite(values))
    if finite.size == 0:
        return set()
    order = finite[np.argsort(values[finite])[: min(k, finite.size)]]
    return set(int(i) for i in order)


def audit_chain(df: pd.DataFrame, chain: str, sample_dates: int, k: int) -> dict:
    metrics = [m for m in DEFAULT_METRICS if m in df.columns and pd.to_numeric(df[m], errors="coerce").notna().sum() >= 60]
    if not metrics:
        return {"chain": chain, "status": "skipped", "reason": "no_supported_metrics"}

    prepared = _prep_gold(df)
    cfg = AnalogConfig(k_analogs=k)
    _, features = _build_feature_tables(prepared, metrics, cfg)
    if len(features) < 80:
        return {"chain": chain, "status": "skipped", "reason": "insufficient_feature_history", "feature_days": int(len(features))}

    eligible = list(features.index)[-max(sample_dates * 3, sample_dates):]
    picks = eligible[:: max(1, len(eligible) // sample_dates)][:sample_dates]
    overlaps: list[float] = []
    cases = []

    for as_of in picks:
        candidates = _candidate_index(features.index, as_of, cfg)
        if len(candidates) < max(20, k):
            continue
        current = features.loc[as_of]
        bucketed, note = _bucket_filter_with_fallback(features.loc[candidates], current, cfg)
        cols = _feature_columns(bucketed, metrics)
        if len(bucketed) < 10 or not cols:
            continue
        eu, mh = _distances(bucketed, current, cols)
        top_eu = _top_indices(eu, k)
        top_mh = _top_indices(mh, k)
        denom = max(1, min(len(top_eu), len(top_mh)))
        overlap = len(top_eu & top_mh) / denom
        overlaps.append(overlap)
        cases.append({"as_of": str(as_of), "candidate_days": int(len(bucketed)), "feature_count": len(cols), "top_k_overlap": round(overlap, 4), "bucket": note})

    if not overlaps:
        return {"chain": chain, "status": "skipped", "reason": "no_comparable_cases"}

    return {
        "chain": chain,
        "status": "ok",
        "metrics": metrics,
        "cases": cases,
        "median_top_k_overlap": round(float(np.median(overlaps)), 4),
        "minimum_top_k_overlap": round(float(np.min(overlaps)), 4),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare the production robust-Euclidean analog ranking with a regularised Mahalanobis alternative.")
    parser.add_argument("--published-root", default="data/published/v1")
    parser.add_argument("--sample-dates", type=int, default=6)
    parser.add_argument("--k", type=int, default=30)
    parser.add_argument("--min-median-overlap", type=float, default=0.15)
    parser.add_argument("--report")
    args = parser.parse_args()

    root = Path(args.published_root)
    results = []
    for chain in CHAINS:
        df = _load_gold(root / "gold" / chain)
        if df.empty:
            results.append({"chain": chain, "status": "skipped", "reason": "missing_gold_history"})
            continue
        results.append(audit_chain(df, chain, args.sample_dates, args.k))

    comparable = [r for r in results if r.get("status") == "ok"]
    payload = {
        "method_under_test": "robust_euclidean_on_z_scale",
        "comparison_method": "regularised_mahalanobis",
        "purpose": "sensitivity audit only; this does not switch the production analog metric",
        "minimum_required_median_overlap": args.min_median_overlap,
        "chains": results,
    }
    text = json.dumps(payload, indent=2, sort_keys=True)
    print(text)
    if args.report:
        path = Path(args.report)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text + "\n", encoding="utf-8")

    if not comparable:
        print("ANALOG-DISTANCE AUDIT: no comparable chain histories found", file=sys.stderr)
        return 1
    unstable = [r for r in comparable if float(r["median_top_k_overlap"]) < args.min_median_overlap]
    if unstable:
        print("ANALOG-DISTANCE AUDIT FAILED: extreme ranking instability detected: " + ", ".join(r["chain"] for r in unstable), file=sys.stderr)
        return 1
    print("ANALOG-DISTANCE AUDIT PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
