# api/confidence_engine.py
from __future__ import annotations

import math
import os
from dataclasses import dataclass
from datetime import date, datetime, timezone, timedelta
from typing import Any, Callable, Dict, Iterable, List, Optional, Sequence, Tuple

import pandas as pd


CONFIDENCE_METHODOLOGY_VERSION = "confidence_v3_l2_capacity_required"
CONFIDENCE_FORMULA = "sqrt(data_quality_score * label_confidence_score)"
DEFAULT_CONFIDENCE_THRESHOLD = 0.40


@dataclass(frozen=True)
class ChainSignalProfile:
    required_for_confidence: Tuple[str, ...]
    structurally_not_applicable: Tuple[str, ...] = ()
    optional_not_penalized: Tuple[str, ...] = ()
    notes: Tuple[str, ...] = ()


CHAIN_SIGNAL_PROFILES: Dict[str, ChainSignalProfile] = {
    "bitcoin": ChainSignalProfile(
        required_for_confidence=(
            "tx_count_daily",
            "block_count_daily",
            "median_tx_fee_native",
            "avg_block_time_sec",
        ),
        structurally_not_applicable=(
            "gas_utilization_pct",
            "failed_tx_rate",
            "median_gas_price",
            "capacity_util_pct",
        ),
        optional_not_penalized=(
            "unique_active_addresses",
            "median_tx_value_native",
            "value_transferred_native",
        ),
        notes=(
            "BTC confidence is based on the BTC evidence surface: transaction activity, fee pressure and block timing.",
            "EVM-only fields are structurally excluded from BTC data-quality scoring.",
            "Value and active-address fields are optional in the current BTC Gold contract and are not used as confidence penalties.",
        ),
    ),
    "ethereum": ChainSignalProfile(
        required_for_confidence=(
            "tx_count_daily",
            "block_count_daily",
            "median_tx_fee_native",
            "failed_tx_rate",
            "gas_utilization_pct",
            "unique_active_addresses",
            "avg_block_time_sec",
        ),
        optional_not_penalized=(
            "median_tx_value_native",
            "value_transferred_native",
        ),
        notes=(
            "Ethereum confidence uses the full ETH L1 evidence surface: demand, fee/friction, execution failures, gas utilization and block timing.",
        ),
    ),
    "arbitrum": ChainSignalProfile(
        required_for_confidence=(
            "tx_count_daily",
            "block_count_daily",
            "median_tx_fee_native",
            "unique_active_addresses",
            "avg_block_time_sec",
            "capacity_util_pct",
        ),
        structurally_not_applicable=(
            "gas_utilization_pct",
            "failed_tx_rate",
        ),
        optional_not_penalized=(
            "median_tx_value_native",
            "value_transferred_native",
        ),
        notes=(
            "Arbitrum confidence is scored against the L2 evidence surface, including capacity utilization, and does not penalize hidden L1-only gas-utilization or failed-tx semantics.",
        ),
    ),
    "base": ChainSignalProfile(
        required_for_confidence=(
            "tx_count_daily",
            "block_count_daily",
            "median_tx_fee_native",
            "unique_active_addresses",
            "avg_block_time_sec",
            "capacity_util_pct",
        ),
        structurally_not_applicable=(
            "gas_utilization_pct",
            "failed_tx_rate",
        ),
        optional_not_penalized=(
            "median_tx_value_native",
            "value_transferred_native",
        ),
        notes=(
            "Base confidence is scored against the L2 evidence surface, including capacity utilization, and does not penalize hidden L1-only gas-utilization or failed-tx semantics.",
        ),
    ),
}


LOGICAL_METRIC_ALIASES: Dict[str, Tuple[str, ...]] = {
    "tx_count_daily": ("tx_count_daily",),
    "block_count_daily": ("block_count_daily",),
    "value_transferred_native": ("value_transferred_native",),
    "median_tx_value_native": ("median_tx_value_native",),
    "median_tx_fee_native": ("median_tx_fee_native", "median_fee_native"),
    "failed_tx_rate": ("failed_tx_rate",),
    "gas_utilization_pct": ("gas_utilization_pct",),
    "unique_active_addresses": ("unique_active_addresses",),
    "avg_block_time_sec": ("avg_block_time_sec", "avg_block_time_s"),
    "capacity_util_pct": ("capacity_util_pct",),
}


PUBLISH_LAG_DAYS_POLICY_DEFAULT = {
    "ethereum": 1,
    "bitcoin": 1,
    "base": 7,
    "arbitrum": 7,
}


def _utc_today() -> date:
    override = os.getenv("CSS_UTC_TODAY", "").strip()
    if override:
        try:
            return date.fromisoformat(override)
        except Exception:
            pass
    now = datetime.now(timezone.utc)
    return date(now.year, now.month, now.day)


def _clamp01(value: Any, default: Optional[float] = 0.0) -> Optional[float]:
    if value is None:
        return default
    try:
        v = float(value)
    except Exception:
        return default
    if not math.isfinite(v):
        return default
    return float(max(0.0, min(1.0, v)))


def _safe_float(value: Any) -> Optional[float]:
    try:
        v = float(value)
    except Exception:
        return None
    if not math.isfinite(v):
        return None
    return float(v)


def _normalize_gold_daily_df(df: Optional[pd.DataFrame]) -> pd.DataFrame:
    if df is None or getattr(df, "empty", True):
        return pd.DataFrame()
    d = df.copy()
    if "date" not in d.columns and "day" in d.columns:
        d = d.rename(columns={"day": "date"})
    if "date" not in d.columns:
        return pd.DataFrame()
    d["date"] = pd.to_datetime(d["date"], errors="coerce").dt.date
    d = d.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
    return d


def _profile_for_chain(chain: str) -> ChainSignalProfile:
    return CHAIN_SIGNAL_PROFILES.get(str(chain).lower(), CHAIN_SIGNAL_PROFILES["ethereum"])


def _logical_metric_value(row: pd.Series, logical_name: str) -> Any:
    for candidate in LOGICAL_METRIC_ALIASES.get(logical_name, (logical_name,)):
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


def _row_metric_coverage(row: pd.Series, chain: str) -> Optional[float]:
    required = _profile_for_chain(chain).required_for_confidence
    if not required:
        return None
    present = 0
    for logical_name in required:
        if _is_present_value(_logical_metric_value(row, logical_name)):
            present += 1
    return float(present / len(required))


def _freshness_factor_asof(
    lag_days: Optional[int],
    chain: str,
    *,
    publish_lag_days_policy: Optional[Dict[str, int]] = None,
) -> Optional[float]:
    if lag_days is None:
        return None
    policy = publish_lag_days_policy or PUBLISH_LAG_DAYS_POLICY_DEFAULT
    expected = int(policy.get(chain, 1))
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


def _date_lag_days(asof: date, latest: date) -> int:
    return int(max(0, (asof - latest).days))


def _lag_vs_utc_today(date_iso: Optional[str]) -> Optional[int]:
    if not date_iso:
        return None
    try:
        d = date.fromisoformat(str(date_iso))
    except Exception:
        return None
    return int((_utc_today() - d).days)


def compute_data_quality_details_v2(
    df: Optional[pd.DataFrame],
    *,
    chain: str,
    gold_status: Optional[Dict[str, Any]] = None,
    asof_date: Optional[str] = None,
    publish_lag_days_policy: Optional[Dict[str, int]] = None,
) -> Dict[str, Any]:
    """Profile-aware data-quality score for the evidence surface actually used.

    This intentionally excludes structurally non-applicable metrics from the denominator.
    It also records which fields were required, optional, and excluded so a higher score is
    auditable rather than cosmetic.
    """
    d = _normalize_gold_daily_df(df)
    profile = _profile_for_chain(chain)

    empty_components = {
        "current_row_coverage": None,
        "recent_metric_coverage": None,
        "recent_density": None,
        "history_depth": None,
        "freshness_asof": None,
        "required_metrics": list(profile.required_for_confidence),
        "structurally_not_applicable": list(profile.structurally_not_applicable),
        "optional_not_penalized": list(profile.optional_not_penalized),
        "profile_notes": list(profile.notes),
    }

    if d.empty:
        return {
            "score": None,
            "updated_through": None,
            "lag_days_vs_asof_date": None,
            "components": empty_components,
            "methodology_version": CONFIDENCE_METHODOLOGY_VERSION,
        }

    if asof_date:
        try:
            target_asof = date.fromisoformat(str(asof_date))
        except Exception:
            target_asof = d.iloc[-1]["date"]
    else:
        target_asof = d.iloc[-1]["date"]

    d = d[d["date"] <= target_asof].copy()
    if d.empty:
        return {
            "score": 0.0,
            "updated_through": asof_date,
            "lag_days_vs_asof_date": None,
            "components": {**empty_components, "reason": "no_rows_on_or_before_asof"},
            "methodology_version": CONFIDENCE_METHODOLOGY_VERSION,
        }

    latest_row = d.iloc[-1]
    latest_date = latest_row["date"]
    updated_through = latest_date.isoformat() if hasattr(latest_date, "isoformat") else str(latest_date)
    lag_days_vs_asof_date = _date_lag_days(target_asof, latest_date)

    current_row_coverage = _row_metric_coverage(latest_row, chain)

    recent_start = target_asof - timedelta(days=29)
    recent_rows = d[d["date"] >= recent_start].copy()
    observed_recent_days = int(recent_rows["date"].nunique()) if not recent_rows.empty else 0
    recent_density = min(1.0, observed_recent_days / 30.0)

    if not recent_rows.empty:
        row_coverages = []
        for _, row in recent_rows.iterrows():
            coverage = _row_metric_coverage(row, chain)
            if isinstance(coverage, (int, float)) and math.isfinite(float(coverage)):
                row_coverages.append(float(coverage))
        recent_metric_coverage = (sum(row_coverages) / len(row_coverages)) if row_coverages else current_row_coverage
    else:
        recent_metric_coverage = current_row_coverage

    # 180 days matches the z-score/percentile context used by regime evidence more closely than 90.
    history_depth = min(1.0, float(d["date"].nunique()) / 180.0)
    freshness_asof = _freshness_factor_asof(
        lag_days_vs_asof_date,
        chain,
        publish_lag_days_policy=publish_lag_days_policy,
    )

    weighted_parts = [
        (current_row_coverage, 0.35),
        (recent_metric_coverage, 0.25),
        (recent_density, 0.15),
        (history_depth, 0.15),
        (freshness_asof, 0.10),
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
            "required_metrics": list(profile.required_for_confidence),
            "structurally_not_applicable": list(profile.structurally_not_applicable),
            "optional_not_penalized": list(profile.optional_not_penalized),
            "profile_notes": list(profile.notes),
            "weights": {
                "current_row_coverage": 0.35,
                "recent_metric_coverage": 0.25,
                "recent_density": 0.15,
                "history_depth": 0.15,
                "freshness_asof": 0.10,
            },
        },
        "methodology_version": CONFIDENCE_METHODOLOGY_VERSION,
    }


def compute_confidence_from_gold_v2(
    df: Optional[pd.DataFrame],
    *,
    chain: str,
    gold_status: Optional[Dict[str, Any]] = None,
    asof_date: Optional[str] = None,
    publish_lag_days_policy: Optional[Dict[str, int]] = None,
) -> Optional[float]:
    details = compute_data_quality_details_v2(
        df,
        chain=chain,
        gold_status=gold_status,
        asof_date=asof_date,
        publish_lag_days_policy=publish_lag_days_policy,
    )
    value = details.get("score")
    return float(value) if isinstance(value, (int, float)) and math.isfinite(float(value)) else None


def _scorecard_dimension(scorecard: Optional[Dict[str, Any]], axis: str) -> Dict[str, Any]:
    if not isinstance(scorecard, dict):
        return {}
    dims = scorecard.get("dimensions")
    if not isinstance(dims, dict):
        return {}
    block = dims.get(axis)
    return block if isinstance(block, dict) else {}


def _dimension_score_raw(scorecard: Optional[Dict[str, Any]], axis: str) -> Optional[float]:
    block = _scorecard_dimension(scorecard, axis)
    direct = _safe_float(block.get("score_raw"))
    if direct is not None:
        return direct
    components = block.get("components")
    if isinstance(components, dict):
        vals: List[float] = []
        for component in components.values():
            if isinstance(component, dict):
                v = _safe_float(component.get("score_raw"))
                if v is not None:
                    vals.append(v)
        if vals:
            return float(sum(vals) / len(vals))
    return _safe_float(block.get("score"))


def _high_margin(score: Optional[float]) -> float:
    if score is None:
        return 0.0
    return _clamp01((float(score) - 67.0) / 33.0) or 0.0


def _low_margin(score: Optional[float]) -> float:
    if score is None:
        return 0.0
    return _clamp01((33.0 - float(score)) / 33.0) or 0.0


def _neutrality(score: Optional[float]) -> float:
    if score is None:
        return 0.0
    return _clamp01(1.0 - abs(float(score) - 50.0) / 17.0) or 0.0


def _axis(regime: Optional[Dict[str, Any]], axis_name: str) -> Dict[str, Any]:
    if not isinstance(regime, dict):
        return {}
    axes = regime.get("axes")
    if not isinstance(axes, dict):
        return {}
    block = axes.get(axis_name)
    return block if isinstance(block, dict) else {}


def _axis_high(regime: Optional[Dict[str, Any]], axis_name: str) -> bool:
    block = _axis(regime, axis_name)
    return str(block.get("band_high") or "NORMAL") in {"HIGH", "EXTREME_HIGH"} and int(block.get("informative_count") or 0) > 0


def _axis_extreme_high(regime: Optional[Dict[str, Any]], axis_name: str) -> bool:
    block = _axis(regime, axis_name)
    return str(block.get("band_high") or "NORMAL") == "EXTREME_HIGH" and int(block.get("informative_count") or 0) > 0


def _axis_low(regime: Optional[Dict[str, Any]], axis_name: str) -> bool:
    block = _axis(regime, axis_name)
    return str(block.get("band_low") or "NORMAL") in {"LOW", "EXTREME_LOW"} and int(block.get("informative_count") or 0) > 0


def _axis_trend_strength(regime: Optional[Dict[str, Any]], axis_name: str, expected: str) -> float:
    block = _axis(regime, axis_name)
    trend = str(block.get("trend") or "FLAT").upper()
    if trend == expected.upper():
        return 1.0
    if trend == "FLAT":
        return 0.35
    return 0.0


def _driver_strength(
    regime: Optional[Dict[str, Any]],
    *,
    axes: Optional[Sequence[str]] = None,
    low_side: bool = False,
    high_side: bool = False,
) -> Optional[float]:
    if not isinstance(regime, dict):
        return None
    raw = regime.get("drivers")
    if not isinstance(raw, list):
        return None

    allowed_axes = {a.lower() for a in axes} if axes else None
    scores: List[float] = []
    for driver in raw:
        if not isinstance(driver, dict):
            continue
        axis = str(driver.get("axis") or "").lower()
        if allowed_axes and axis not in allowed_axes:
            continue
        z = _safe_float(driver.get("z_robust")) or 0.0
        pct = _safe_float(driver.get("pct_90d"))
        mom = _safe_float(driver.get("momentum_7d_vs_30d")) or 0.0
        if low_side and pct is not None and pct > 50 and z > 0:
            continue
        if high_side and pct is not None and pct < 50 and z < 0:
            continue
        z_score = _clamp01(abs(z) / 3.0) or 0.0
        pct_score = _clamp01(abs((pct if pct is not None else 50.0) - 50.0) / 50.0) or 0.0
        mom_score = _clamp01(abs(mom) / 2.0) or 0.0
        scores.append(0.55 * z_score + 0.30 * pct_score + 0.15 * mom_score)

    if not scores:
        return None
    scores.sort(reverse=True)
    return float(sum(scores[:3]) / min(3, len(scores)))


def _rule_margin_for_label(label: str, scorecard: Optional[Dict[str, Any]], regime: Optional[Dict[str, Any]]) -> float:
    label = str(label or "").upper()
    demand_raw = _dimension_score_raw(scorecard, "demand")
    friction_raw = _dimension_score_raw(scorecard, "friction")
    capacity_raw = _dimension_score_raw(scorecard, "capacity")

    if label == "HEATING":
        scorecard_margin = _high_margin(demand_raw)
        axis_margin = 1.0 if (_axis_high(regime, "demand") and _axis_trend_strength(regime, "demand", "HEATING") > 0.9) else 0.0
        return max(scorecard_margin, axis_margin)

    if label == "CONGESTED":
        dual_pressure = min(_high_margin(friction_raw), _high_margin(capacity_raw))
        axis_pressure = 1.0 if ((_axis_high(regime, "friction") and _axis_high(regime, "capacity")) or (_axis_extreme_high(regime, "capacity") and _axis_trend_strength(regime, "capacity", "HEATING") > 0.9)) else 0.0
        return max(dual_pressure, axis_pressure)

    if label == "CHEAP":
        low_friction = _low_margin(friction_raw)
        no_capacity_pressure = 1.0 - _high_margin(capacity_raw)
        axis_margin = 1.0 if (_axis_low(regime, "friction") and not _axis_high(regime, "capacity")) else 0.0
        return max(min(low_friction, no_capacity_pressure), axis_margin)

    if label == "STABLE":
        vals = [_neutrality(v) for v in (demand_raw, friction_raw, capacity_raw) if v is not None]
        if not vals:
            return 0.0
        return float(sum(vals) / len(vals))

    return 0.0


def _axis_coherence_for_label(label: str, scorecard: Optional[Dict[str, Any]], regime: Optional[Dict[str, Any]]) -> float:
    label = str(label or "").upper()
    demand_raw = _dimension_score_raw(scorecard, "demand")
    friction_raw = _dimension_score_raw(scorecard, "friction")
    capacity_raw = _dimension_score_raw(scorecard, "capacity")

    if label == "HEATING":
        # Normal friction/capacity should not punish demand-led heating. Only strong contrary evidence does.
        contrary_cheap = max(_low_margin(friction_raw), 1.0 if _axis_low(regime, "friction") else 0.0)
        contrary_congestion = min(_high_margin(friction_raw), _high_margin(capacity_raw))
        return _clamp01(1.0 - max(contrary_cheap * 0.55, contrary_congestion * 0.70)) or 0.0

    if label == "CONGESTED":
        contrary_low_friction = max(_low_margin(friction_raw), 1.0 if _axis_low(regime, "friction") else 0.0)
        return _clamp01(1.0 - contrary_low_friction) or 0.0

    if label == "CHEAP":
        contrary_high_capacity = max(_high_margin(capacity_raw), 1.0 if _axis_high(regime, "capacity") else 0.0)
        contrary_high_friction = max(_high_margin(friction_raw), 1.0 if _axis_high(regime, "friction") else 0.0)
        return _clamp01(1.0 - max(contrary_high_capacity, contrary_high_friction)) or 0.0

    if label == "STABLE":
        vals = [demand_raw, friction_raw, capacity_raw]
        max_extreme = 0.0
        for v in vals:
            if v is None:
                continue
            max_extreme = max(max_extreme, abs(float(v) - 50.0) / 50.0)
        return _clamp01(1.0 - max_extreme) or 0.0

    return 0.0


def _stable_no_strong_driver_score(regime: Optional[Dict[str, Any]]) -> float:
    strength = _driver_strength(regime)
    if strength is None:
        return 1.0
    return _clamp01(1.0 - strength) or 0.0


def _persistence_score(regime: Optional[Dict[str, Any]]) -> Optional[float]:
    if not isinstance(regime, dict):
        return None
    for key in ("latest_label_run_days", "label_run_days", "persistence_days"):
        value = _safe_float(regime.get(key))
        if value is not None:
            return _clamp01(value / 7.0)
    # The current daily META build context does not always have prior-label state available.
    # Return None so the component is documented but not included in the weighted denominator.
    return None


def _weighted_score(parts: Sequence[Tuple[str, Optional[float], float]]) -> Tuple[Optional[float], Dict[str, Any]]:
    num = 0.0
    den = 0.0
    detail: Dict[str, Any] = {"weights": {}, "used": {}}
    for name, value, weight in parts:
        detail["weights"][name] = weight
        if isinstance(value, (int, float)) and math.isfinite(float(value)):
            v = _clamp01(value)
            if v is not None:
                detail["used"][name] = v
                num += float(v) * float(weight)
                den += float(weight)
        else:
            detail["used"][name] = None
    if den <= 0:
        return None, detail
    return _clamp01(num / den), detail


def compute_label_confidence_details_v2(
    scorecard: Optional[Dict[str, Any]],
    regime: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    label = "UNKNOWN/DEGRADED"
    if isinstance(regime, dict):
        label = str(regime.get("label") or "UNKNOWN/DEGRADED").upper().strip()

    if label in {"", "UNKNOWN/DEGRADED"}:
        return {
            "score": 0.0,
            "label": "UNKNOWN/DEGRADED",
            "methodology_version": CONFIDENCE_METHODOLOGY_VERSION,
            "components": {
                "reason": "unknown_or_degraded_label_has_zero_label_confidence",
                "candidate_label": None,
            },
        }

    rule_margin = _rule_margin_for_label(label, scorecard, regime)
    axis_coherence = _axis_coherence_for_label(label, scorecard, regime)
    persistence = _persistence_score(regime)

    if label == "HEATING":
        driver_strength = _driver_strength(regime, axes=("demand",), high_side=True)
        trend_strength = _axis_trend_strength(regime, "demand", "HEATING")
        score, detail = _weighted_score(
            (
                ("rule_margin", rule_margin, 0.35),
                ("driver_strength", driver_strength, 0.25),
                ("trend_strength", trend_strength, 0.20),
                ("axis_coherence", axis_coherence, 0.10),
                ("persistence_score", persistence, 0.10),
            )
        )
    elif label == "CONGESTED":
        driver_strength = _driver_strength(regime, axes=("friction", "capacity"), high_side=True)
        severity_margin = max(_high_margin(_dimension_score_raw(scorecard, "friction")), _high_margin(_dimension_score_raw(scorecard, "capacity")))
        score, detail = _weighted_score(
            (
                ("rule_margin", rule_margin, 0.35),
                ("driver_strength", driver_strength, 0.25),
                ("axis_coherence", axis_coherence, 0.20),
                ("severity_margin", severity_margin, 0.10),
                ("persistence_score", persistence, 0.10),
            )
        )
    elif label == "CHEAP":
        driver_strength = _driver_strength(regime, axes=("friction",), low_side=True)
        no_capacity_pressure = 1.0 - _high_margin(_dimension_score_raw(scorecard, "capacity"))
        score, detail = _weighted_score(
            (
                ("rule_margin", rule_margin, 0.35),
                ("driver_strength", driver_strength, 0.25),
                ("low_capacity_or_no_pressure_support", no_capacity_pressure, 0.20),
                ("axis_coherence", axis_coherence, 0.10),
                ("persistence_score", persistence, 0.10),
            )
        )
    else:  # STABLE and any future neutral-style label
        neutrality_vals = [
            _neutrality(_dimension_score_raw(scorecard, "demand")),
            _neutrality(_dimension_score_raw(scorecard, "friction")),
            _neutrality(_dimension_score_raw(scorecard, "capacity")),
        ]
        neutrality_score = sum(neutrality_vals) / len(neutrality_vals)
        no_strong_driver_score = _stable_no_strong_driver_score(regime)
        score, detail = _weighted_score(
            (
                ("neutrality_score", neutrality_score, 0.45),
                ("no_strong_driver_score", no_strong_driver_score, 0.25),
                ("axis_coherence", axis_coherence, 0.20),
                ("persistence_score", persistence, 0.10),
            )
        )

    components = {
        **detail,
        "candidate_label": label,
        "uses_score_raw": True,
        "uses_confidence_degraded_display_score": False,
        "persistence_source": "regime_label_history" if persistence is not None else "not_available_in_daily_meta_build_context",
        "scorecard_raw_scores": {
            "demand": _dimension_score_raw(scorecard, "demand"),
            "friction": _dimension_score_raw(scorecard, "friction"),
            "capacity": _dimension_score_raw(scorecard, "capacity"),
        },
        "regime_axes": {
            "demand": _axis(regime, "demand"),
            "friction": _axis(regime, "friction"),
            "capacity": _axis(regime, "capacity"),
        },
    }

    return {
        "score": float(score) if isinstance(score, (int, float)) and math.isfinite(float(score)) else None,
        "label": label,
        "methodology_version": CONFIDENCE_METHODOLOGY_VERSION,
        "components": components,
    }


def compute_label_clarity_v2(
    scorecard: Optional[Dict[str, Any]],
    regime: Optional[Dict[str, Any]],
) -> Optional[float]:
    details = compute_label_confidence_details_v2(scorecard, regime)
    score = details.get("score")
    return float(score) if isinstance(score, (int, float)) and math.isfinite(float(score)) else None


def build_confidence_payload_v2(
    df: Optional[pd.DataFrame],
    *,
    chain: str,
    gold_status: Optional[Dict[str, Any]] = None,
    scorecard: Optional[Dict[str, Any]] = None,
    regime: Optional[Dict[str, Any]] = None,
    asof_date: Optional[str] = None,
    publish_lag_days_policy: Optional[Dict[str, int]] = None,
    confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
) -> Dict[str, Any]:
    data_details = compute_data_quality_details_v2(
        df,
        chain=chain,
        gold_status=gold_status,
        asof_date=asof_date,
        publish_lag_days_policy=publish_lag_days_policy,
    )
    data_quality_score = data_details.get("score")
    label_details = compute_label_confidence_details_v2(scorecard, regime)
    label_confidence_score = label_details.get("score")

    if isinstance(data_quality_score, (int, float)) and math.isfinite(float(data_quality_score)):
        if isinstance(label_confidence_score, (int, float)) and math.isfinite(float(label_confidence_score)):
            confidence_score = _clamp01(math.sqrt(float(data_quality_score) * float(label_confidence_score)))
        else:
            confidence_score = float(data_quality_score)
    else:
        confidence_score = None

    updated_through = data_details.get("updated_through")
    effective_date = updated_through or asof_date
    candidate_label = label_details.get("label")
    gated = bool(
        isinstance(confidence_score, (int, float))
        and math.isfinite(float(confidence_score))
        and float(confidence_score) < float(confidence_threshold)
    )

    data_components = data_details.get("components") if isinstance(data_details.get("components"), dict) else {}
    label_components = label_details.get("components") if isinstance(label_details.get("components"), dict) else {}

    # Backward compatible flat component keys plus explicit nested components.
    components = {
        "current_row_coverage": data_components.get("current_row_coverage"),
        "recent_metric_coverage": data_components.get("recent_metric_coverage"),
        "recent_density": data_components.get("recent_density"),
        "history_depth": data_components.get("history_depth"),
        "freshness_asof": data_components.get("freshness_asof"),
        "data_quality": data_components,
        "label_confidence": label_components,
    }

    return {
        "chain": chain,
        "missing": confidence_score is None,
        "date": effective_date,
        "asof_date": asof_date,
        "updated_through": updated_through,
        "methodology_version": CONFIDENCE_METHODOLOGY_VERSION,
        "formula": CONFIDENCE_FORMULA,
        "confidence_score": confidence_score,
        "data_quality_score": float(data_quality_score) if isinstance(data_quality_score, (int, float)) and math.isfinite(float(data_quality_score)) else None,
        "label_confidence_score": float(label_confidence_score) if isinstance(label_confidence_score, (int, float)) and math.isfinite(float(label_confidence_score)) else None,
        "candidate_label": {
            "label": candidate_label,
            "label_confidence_score": float(label_confidence_score) if isinstance(label_confidence_score, (int, float)) and math.isfinite(float(label_confidence_score)) else None,
            "withheld_by_confidence_gate": gated,
            "threshold": float(confidence_threshold),
            "components": label_components,
        },
        "lag_days_vs_asof_date": data_details.get("lag_days_vs_asof_date"),
        "lag_days_vs_utc_today": _lag_vs_utc_today(str(effective_date)) if effective_date else None,
        "semantics": "combined_profile_aware_data_quality_and_label_specific_evidence",
        "source": "gold_history_scorecard_regime_evidence",
        "components": components,
    }


def compute_confidence_snapshot_from_gold_v2(
    df: Optional[pd.DataFrame],
    *,
    chain: str,
    gold_status: Optional[Dict[str, Any]] = None,
    asof_date: Optional[date] = None,
    publish_lag_days_policy: Optional[Dict[str, int]] = None,
) -> Dict[str, Any]:
    target_asof = asof_date.isoformat() if hasattr(asof_date, "isoformat") else None
    details = compute_data_quality_details_v2(
        df,
        chain=chain,
        gold_status=gold_status,
        asof_date=target_asof,
        publish_lag_days_policy=publish_lag_days_policy,
    )
    score = details.get("score")
    updated_through = details.get("updated_through") or target_asof
    return {
        "chain": chain,
        "missing": score is None,
        "date": target_asof,
        "asof_date": target_asof,
        "confidence_score": float(score) if isinstance(score, (int, float)) and math.isfinite(float(score)) else None,
        "lag_days_vs_asof_date": details.get("lag_days_vs_asof_date"),
        "lag_days_vs_utc_today": _lag_vs_utc_today(str(updated_through)) if updated_through else None,
        "semantics": "profile_aware_data_quality_asof_date",
        "source": "gold_snapshot",
        "methodology_version": CONFIDENCE_METHODOLOGY_VERSION,
        "components": details.get("components") or {},
    }
