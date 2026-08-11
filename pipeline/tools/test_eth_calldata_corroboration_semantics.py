#!/usr/bin/env python3
import pandas as pd

import api.regime_engine as re


ETH_V2_CORE_DEMAND = ("tx_count_daily", "unique_active_addresses")
ETH_V2_FRICTION = ("median_tx_fee_native", "failed_tx_rate")
ETH_V2_CAPACITY = ("gas_utilization_pct",)
ETH_V2_REJECTED_LABEL_METRICS = {
    "block_gas_utilization_p90",
    "median_block_base_fee_per_gas",
    "median_tx_gas_used",
    "contract_creation_tx_share",
    "eip1559_type2_tx_share",
}


def validate_profile_contract():
    spec = re.PROFILE_SPECS["eth_l1"]
    assert spec.ruleset_id == "eth_l1_v2", spec
    assert spec.demand_metrics == ETH_V2_CORE_DEMAND, spec
    assert spec.friction_metrics == ETH_V2_FRICTION, spec
    assert spec.capacity_metrics == ETH_V2_CAPACITY, spec

    label_metrics = set(spec.demand_metrics + spec.friction_metrics + spec.capacity_metrics)
    leaked = ETH_V2_REJECTED_LABEL_METRICS & label_metrics
    assert not leaked, f"rejected observational metrics leaked into ETH label profile: {sorted(leaked)}"
    assert "nonempty_calldata_share" not in spec.demand_metrics, (
        "calldata must remain supplemental corroboration, not a core Demand metric"
    )
    print("[ETH_CALLDATA] profile contract: eth_l1_v2 core axes locked")


def signal(metric: str, *, band: str = "NORMAL", trend: str = "FLAT"):
    band_values = {
        "NORMAL": (50.0, 0.0),
        "HIGH": (85.0, 1.8),
        "EXTREME_HIGH": (95.0, 3.0),
        "LOW": (15.0, -1.8),
        "EXTREME_LOW": (5.0, -3.0),
    }
    trend_values = {"FLAT": 0.0, "HEATING": 0.30, "COOLING": -0.30}
    pct, z = band_values[band]
    return {
        "metric": metric,
        "current": 1.0,
        "z_robust": z,
        "pct_90d": pct,
        "momentum_7d_vs_30d": trend_values[trend],
        "informative": True,
        "neutralized": False,
        "neutral_reason": None,
    }


def evaluate(name: str, scenario, expected: str):
    original_signal = re._signal_for_metric
    original_instability = re._signal_for_blocktime_instability

    def fake_signal(_df, metric):
        value = scenario.get(metric)
        return dict(value) if value is not None else None

    try:
        re._signal_for_metric = fake_signal
        re._signal_for_blocktime_instability = lambda *args, **kwargs: None
        out = re.compute_regime(
            pd.DataFrame({"date": ["2026-08-09"]}),
            chain="ethereum",
            profile={"type": "eth_l1"},
            asof_date="2026-08-09",
            confidence_score=1.0,
        )
    finally:
        re._signal_for_metric = original_signal
        re._signal_for_blocktime_instability = original_instability

    assert out["ruleset_id"] == "eth_l1_v2", out
    assert out["label"] == expected, f"{name}: expected {expected}, got {out['label']}"
    assert "nonempty_calldata_share" in out["signals"], out
    assert out["signals"]["nonempty_calldata_share"]["axis"] == "demand", out
    assert out["axes"]["demand"]["informative_count"] == 2, out

    rejected_present = ETH_V2_REJECTED_LABEL_METRICS & set(out["signals"])
    assert not rejected_present, (
        f"{name}: rejected observational metrics entered regime signals: {sorted(rejected_present)}"
    )
    print(f"[ETH_CALLDATA] {name}: {out['label']}")


def base(*, core_band="NORMAL", core_trend="FLAT", calldata_trend="FLAT"):
    return {
        "tx_count_daily": signal("tx_count_daily", band=core_band, trend=core_trend),
        "unique_active_addresses": signal("unique_active_addresses", band=core_band, trend=core_trend),
        "nonempty_calldata_share": signal("nonempty_calldata_share", band="NORMAL", trend=calldata_trend),
        "median_tx_fee_native": signal("median_tx_fee_native"),
        "failed_tx_rate": signal("failed_tx_rate"),
        "gas_utilization_pct": signal("gas_utilization_pct"),
    }


validate_profile_contract()
evaluate(
    "baseline_heating_preserved",
    base(core_band="HIGH", core_trend="HEATING", calldata_trend="FLAT"),
    "HEATING",
)
evaluate(
    "new_heating_requires_core_high_and_calldata_heating",
    base(core_band="HIGH", core_trend="FLAT", calldata_trend="HEATING"),
    "HEATING",
)
evaluate(
    "calldata_cannot_heat_without_core_high",
    base(core_band="NORMAL", core_trend="FLAT", calldata_trend="HEATING"),
    "STABLE",
)
evaluate(
    "core_high_alone_without_heating_remains_stable",
    base(core_band="HIGH", core_trend="FLAT", calldata_trend="FLAT"),
    "STABLE",
)

print("[ETH_CALLDATA] OK: eth_l1_v2 methodology contract and corroboration semantics validated")
