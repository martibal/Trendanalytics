#!/usr/bin/env python3
from __future__ import annotations

import pandas as pd

from api.confidence_engine import (
    CHAIN_SIGNAL_PROFILES,
    CONFIDENCE_METHODOLOGY_VERSION,
    compute_data_quality_details_v2,
)


def frame(*, missing_latest_capacity: bool) -> pd.DataFrame:
    dates = pd.date_range("2026-01-01", periods=180, freq="D")
    rows = []
    for i, day in enumerate(dates):
        rows.append(
            {
                "date": day.date(),
                "tx_count_daily": 1000 + i,
                "block_count_daily": 500 + i,
                "median_tx_fee_native": 0.000001,
                "unique_active_addresses": 900 + i,
                "avg_block_time_sec": 2.0,
                "capacity_util_pct": 0.75,
            }
        )
    if missing_latest_capacity:
        rows[-1]["capacity_util_pct"] = None
    return pd.DataFrame(rows)


def main() -> int:
    assert CONFIDENCE_METHODOLOGY_VERSION == "confidence_v3_l2_capacity_required"

    for chain in ("arbitrum", "base"):
        required = CHAIN_SIGNAL_PROFILES[chain].required_for_confidence
        assert "capacity_util_pct" in required, (chain, required)

        complete = compute_data_quality_details_v2(
            frame(missing_latest_capacity=False),
            chain=chain,
            asof_date="2026-06-29",
        )
        missing = compute_data_quality_details_v2(
            frame(missing_latest_capacity=True),
            chain=chain,
            asof_date="2026-06-29",
        )

        assert complete["score"] == 1.0, (chain, complete)
        assert missing["score"] is not None and missing["score"] < 1.0, (chain, missing)
        assert missing["components"]["current_row_coverage"] == 5 / 6, (chain, missing)
        assert "capacity_util_pct" in missing["components"]["required_metrics"], (chain, missing)

    print("OK: L2 capacity utilization is required by confidence semantics")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
