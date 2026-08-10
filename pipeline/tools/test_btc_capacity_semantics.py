#!/usr/bin/env python3
import json
import numpy as np
import pandas as pd

from api.regime_engine import compute_regime


def frame(*, fee_last: float, weight_last: float) -> pd.DataFrame:
    n = 90
    x = np.arange(n, dtype=float)
    tx = np.r_[600000.0 + 1000.0 * np.sin(x[:60] / 6.0), np.full(30, 600000.0)]
    active = np.r_[500000.0 + 800.0 * np.cos(x[:60] / 7.0), np.full(30, 500000.0)]
    return pd.DataFrame({
        "date": pd.date_range("2026-05-12", periods=n, freq="D"),
        "tx_count_daily": tx,
        "unique_active_addresses": active,
        "median_tx_fee_native": np.r_[2.0e-6 + 2.0e-7 * np.sin(x[:-1] / 5.0), fee_last],
        "block_weight_utilization_pct": np.r_[0.72 + 0.03 * np.sin(x[:-1] / 4.0), weight_last],
        "avg_block_time_sec": 600.0 + 8.0 * np.sin(x / 9.0),
    })


def evaluate(name: str, df: pd.DataFrame, expected: str) -> None:
    out = compute_regime(
        df,
        chain="bitcoin",
        profile={"type": "btc"},
        asof_date=str(df["date"].iloc[-1].date()),
        confidence_score=1.0,
    )
    assert out["ruleset_id"] == "btc_v2"
    assert "block_weight_utilization_pct" in out["signals"]
    diag = {
        "case": name,
        "expected": expected,
        "actual": out["label"],
        "axes": out["axes"],
        "fee": out["signals"].get("median_tx_fee_native"),
        "block_weight": out["signals"].get("block_weight_utilization_pct"),
        "blocktime_instability": out["signals"].get("blocktime_instability"),
        "drivers": out["drivers"],
    }
    print("[BTC_CAPACITY_DIAG] " + json.dumps(diag, sort_keys=True), flush=True)
    assert out["label"] == expected, f'{name}: expected {expected}, got {out["label"]}'


evaluate("low_fee_high_weight", frame(fee_last=1.0e-8, weight_last=0.999), "STABLE")
evaluate("high_fee_high_weight", frame(fee_last=2.0e-5, weight_last=0.999), "CONGESTED")
evaluate("low_fee_normal_weight", frame(fee_last=1.0e-8, weight_last=0.72), "CHEAP")

print("[BTC_CAPACITY] OK: btc_v2 cheap-veto semantics validated")
