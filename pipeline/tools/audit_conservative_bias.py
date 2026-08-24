#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from api.regime_engine import compute_regime  # noqa: E402


def _constant_history(days: int = 220) -> pd.DataFrame:
    dates = pd.date_range("2026-01-01", periods=days, freq="D")
    return pd.DataFrame(
        {
            "date": dates,
            "tx_count_daily": np.full(days, 100_000.0),
            "unique_active_addresses": np.full(days, 80_000.0),
            "median_tx_fee_native": np.full(days, 0.001),
            "failed_tx_rate": np.zeros(days),
            "gas_utilization_pct": np.full(days, 0.50),
            "avg_block_time_sec": np.full(days, 12.0),
        }
    )


def main() -> int:
    history = _constant_history()
    profile = {"type": "eth_l1"}

    high_conf = compute_regime(
        history,
        chain="ethereum",
        profile=profile,
        confidence_score=0.90,
        confidence_threshold=0.40,
    )
    low_conf = compute_regime(
        history,
        chain="ethereum",
        profile=profile,
        confidence_score=0.20,
        confidence_threshold=0.40,
    )

    failures: list[str] = []
    if high_conf.get("label") != "STABLE":
        failures.append(
            "constant/low-information history must remain STABLE at sufficient evidence score"
        )
    axes = high_conf.get("axes") or {}
    if any(int((axes.get(axis) or {}).get("informative_count") or 0) != 0 for axis in ("demand", "friction", "capacity")):
        failures.append("non-informative constant signals must not count as informative axis evidence")
    if low_conf.get("label") != "UNKNOWN/DEGRADED":
        failures.append("below-threshold evidence score must withhold the regime label")
    gate = low_conf.get("gate") or {}
    if gate.get("status") != "gated":
        failures.append("withheld regime must expose gate.status=gated")

    payload = {
        "purpose": "Executable conservative-bias invariants for regime publication.",
        "invariants": {
            "low_variance_neutralizes": high_conf.get("label") == "STABLE",
            "non_informative_axes_zero": all(
                int((axes.get(axis) or {}).get("informative_count") or 0) == 0
                for axis in ("demand", "friction", "capacity")
            ),
            "low_evidence_withholds_label": low_conf.get("label") == "UNKNOWN/DEGRADED",
            "withholding_is_explicit": gate.get("status") == "gated",
        },
        "failures": failures,
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    if failures:
        for failure in failures:
            print("CONSERVATIVE-BIAS AUDIT: " + failure, file=sys.stderr)
        return 1
    print("CONSERVATIVE-BIAS AUDIT PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
