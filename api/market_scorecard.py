# api/market_scorecard.py
from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import math
import numpy as np
import pandas as pd


# This module computes the public Demand / Friction / Capacity scorecard.
# It is intentionally profile-aware and aligned with api.regime_engine.
# Scores are descriptive, no price inputs are used, and low-variance / missing
# distributions are neutralized instead of being allowed to drive labels.


CHAIN_TYPE_BY_CHAIN = {
    "bitcoin": "btc",
    "ethereum": "eth_l1",
    "base": "l2",
    "arbitrum": "l2",
}


PROFILE_COMPONENTS: Dict[str, Dict[str, List[Tuple[str, float, str]]]] = {
    "btc": {
        "demand": [
            ("tx_count_daily", 1.0, "log1p"),
        ],
        "friction": [
            ("median_tx_fee_native", 1.0, "log1p"),
        ],
        # BTC capacity combines direct blockspace occupancy with block-time
        # instability. High block weight is descriptive capacity pressure and can
        # veto CHEAP, while CONGESTED still requires simultaneous Friction pressure.
        "capacity": [
            ("block_weight_utilization_pct", 1.0, "none"),
            ("blocktime_instability", 0.7, "instability"),
        ],
    },
    "eth_l1": {
        "demand": [
            ("tx_count_daily", 1.0, "log1p"),
            ("unique_active_addresses", 1.0, "log1p"),
            ("tx_per_user", 0.6, "log1p"),
        ],
        "friction": [
            ("median_tx_fee_native", 1.0, "log1p"),
            ("failed_tx_rate", 0.7, "none"),
        ],
        "capacity": [
            ("gas_utilization_pct", 1.0, "none"),
            ("blocktime_instability", 0.3, "instability"),
        ],
    },
    "l2": {
        "demand": [
            ("tx_count_daily", 1.0, "log1p"),
            ("unique_active_addresses", 1.0, "log1p"),
            ("tx_per_user", 0.6, "log1p"),
        ],
        # L2 median_tx_value_native is 0 in the current dataset. A value-normalized
        # fee burden proxy is therefore not methodologically valid for L2. Use the
        # direct median fee distribution instead, aligned with regime_engine.
        "friction": [
            ("median_tx_fee_native", 1.0, "log1p"),
        ],
        # L2 gas_utilization_pct and failed_tx_rate are presentation-hidden for
        # current methodology. Do not use them as public capacity/friction drivers.
        "capacity": [
            ("capacity_util_pct", 1.0, "none"),
        ],
    },
}


def _profile_for_chain(chain: str) -> str:
    return CHAIN_TYPE_BY_CHAIN.get(str(chain).lower(), "eth_l1")


def _to_dt(s: pd.Series) -> pd.Series:
    return pd.to_datetime(s, errors="coerce", utc=True).dt.tz_convert(None)


def _finite_values(x: Any) -> np.ndarray:
    try:
        arr = np.asarray(x, dtype=float)
    except Exception:
        arr = np.array([], dtype=float)
    return arr[np.isfinite(arr)]


def _series_is_informative(x: Any, *, min_points: int = 30, eps: float = 1e-12) -> bool:
    vals = _finite_values(x)
    if vals.size < int(min_points):
        return False
    if np.unique(vals).size <= 1:
        return False
    spread = float(np.nanmax(vals) - np.nanmin(vals))
    if not math.isfinite(spread) or abs(spread) <= eps:
        return False
    med = float(np.nanmedian(vals))
    mad = float(np.nanmedian(np.abs(vals - med)))
    sd = float(np.nanstd(vals))
    return bool((math.isfinite(mad) and mad > eps) or (math.isfinite(sd) and sd > eps))


def _mad(x: np.ndarray) -> float:
    x = _finite_values(x)
    if x.size == 0:
        return float("nan")
    med = float(np.median(x))
    return float(np.median(np.abs(x - med)))


def _robust_z(current: float, baseline: np.ndarray) -> Optional[float]:
    baseline = _finite_values(baseline)
    if baseline.size < 30 or not math.isfinite(current):
        return None
    if not _series_is_informative(baseline):
        return None
    med = float(np.median(baseline))
    mad = _mad(baseline)
    if not math.isfinite(mad) or mad <= 1e-12:
        sd = float(np.std(baseline))
        if not math.isfinite(sd) or sd <= 1e-12:
            return None
        return float((float(current) - med) / sd)
    return float((float(current) - med) / (1.4826 * mad))


def _percentile_rank_midrank(current: float, baseline: np.ndarray) -> Optional[float]:
    vals = _finite_values(baseline)
    if vals.size < 30 or not math.isfinite(current):
        return None
    if not _series_is_informative(vals):
        return None
    less = float(np.sum(vals < current))
    equal = float(np.sum(vals == current))
    pct = ((less + 0.5 * equal) / float(vals.size)) * 100.0
    return float(max(0.0, min(100.0, pct)))


def _z_to_score(z: Optional[float], *, amplitude: float = 40.0, scale: float = 1.5) -> Optional[float]:
    if z is None or not math.isfinite(z):
        return None
    v = 50.0 + amplitude * math.tanh(float(z) / scale)
    return float(max(0.0, min(100.0, v)))


def _clamp01(x: Optional[float]) -> float:
    if x is None:
        return 0.0
    try:
        v = float(x)
    except Exception:
        return 0.0
    if not math.isfinite(v):
        return 0.0
    return float(max(0.0, min(1.0, v)))


def _level(score: Optional[float]) -> str:
    if score is None:
        return "Unknown"
    if score >= 67:
        return "High"
    if score <= 33:
        return "Low"
    return "Normal"


def _capacity_level(score: Optional[float]) -> str:
    if score is None:
        return "Unknown"
    if score >= 67:
        return "Tight"
    if score <= 33:
        return "Slack"
    return "Balanced"


def _rolling_mean(series: pd.Series, window_days: int) -> pd.Series:
    win = max(1, int(window_days))
    return series.rolling(win, min_periods=max(4, win // 2)).mean()


def _prepare_series(df: pd.DataFrame, col: str, *, transform: str = "none") -> pd.Series:
    if col == "tx_per_user":
        if "tx_count_daily" not in df.columns or "unique_active_addresses" not in df.columns:
            return pd.Series(dtype="float64")
        tx = pd.to_numeric(df["tx_count_daily"], errors="coerce")
        aa = pd.to_numeric(df["unique_active_addresses"], errors="coerce").replace({0.0: np.nan})
        s = tx / aa
    elif col == "fee_burden_proxy":
        if "median_tx_fee_native" not in df.columns or "median_tx_value_native" not in df.columns:
            return pd.Series(dtype="float64")
        fee = pd.to_numeric(df["median_tx_fee_native"], errors="coerce")
        val = pd.to_numeric(df["median_tx_value_native"], errors="coerce").replace({0.0: np.nan})
        s = fee / val
    elif col in df.columns:
        s = pd.to_numeric(df[col], errors="coerce")
    else:
        return pd.Series(dtype="float64")

    if transform == "log1p":
        s = s.where(s >= 0)
        s = np.log1p(s)
    return s


def _weekly_component(
    df: pd.DataFrame,
    col: str,
    *,
    window_days: int = 7,
    transform: str = "none",
    baseline_lookback_days: int = 365,
    baseline_exclude_tail_days: int = 14,
) -> Dict[str, Any]:
    if df.empty or "date" not in df.columns:
        return _empty_component(col)

    d = df.copy()
    d["date"] = _to_dt(d["date"])
    d = d.dropna(subset=["date"]).sort_values("date")
    if d.empty:
        return _empty_component(col)

    if transform == "instability":
        return _weekly_instability_component(
            d,
            "avg_block_time_sec",
            public_name=col,
            window_days=window_days,
            baseline_lookback_days=baseline_lookback_days,
            baseline_exclude_tail_days=baseline_exclude_tail_days,
        )

    raw_series = _prepare_series(d, col, transform="none")
    transformed = _prepare_series(d, col, transform=transform)
    if transformed.dropna().empty:
        return _empty_component(col)

    ra = _rolling_mean(transformed, window_days)
    current_t = float(ra.iloc[-1]) if pd.notna(ra.iloc[-1]) else None
    current_raw = float(raw_series.iloc[-1]) if len(raw_series) and pd.notna(raw_series.iloc[-1]) else None
    if current_t is None:
        out = _empty_component(col)
        out["current"] = current_raw
        return out

    end = d["date"].iloc[-1]
    start = end - pd.Timedelta(days=baseline_lookback_days)
    ra_base = ra[(d["date"] >= start)]
    if baseline_exclude_tail_days > 0:
        tail_cut = end - pd.Timedelta(days=baseline_exclude_tail_days)
        ra_base = ra_base[(d["date"] <= tail_cut)]

    baseline = ra_base.to_numpy(dtype="float64", copy=False)
    informative = _series_is_informative(baseline)
    z = _robust_z(float(current_t), baseline) if informative else None
    pct = _percentile_rank_midrank(float(current_t), baseline) if informative else None
    score = _z_to_score(z) if informative else None

    return {
        "current": current_raw,
        "z": z,
        "pct_lookback": pct,
        "score_raw": score,
        "informative": bool(informative),
        "neutralized": bool(not informative),
        "neutral_reason": None if informative else "low_variance_or_insufficient_distribution",
    }


def _weekly_instability_component(
    df: pd.DataFrame,
    col: str,
    *,
    public_name: str,
    window_days: int = 7,
    baseline_lookback_days: int = 365,
    baseline_exclude_tail_days: int = 14,
    instability_rolling_median_days: int = 30,
) -> Dict[str, Any]:
    if df.empty or "date" not in df.columns or col not in df.columns:
        return _empty_component(public_name)

    d = df.copy()
    bt = pd.to_numeric(d[col], errors="coerce")
    if bt.dropna().empty:
        return _empty_component(public_name)

    med30 = bt.rolling(instability_rolling_median_days, min_periods=max(10, instability_rolling_median_days // 2)).median()
    denom = med30.replace({0.0: np.nan})
    inst = (bt - med30).abs() / denom
    ra = _rolling_mean(inst, window_days)

    current = float(ra.iloc[-1]) if pd.notna(ra.iloc[-1]) else None
    current_raw = float(bt.iloc[-1]) if pd.notna(bt.iloc[-1]) else None
    if current is None:
        out = _empty_component(public_name)
        out["current"] = current_raw
        return out

    end = d["date"].iloc[-1]
    start = end - pd.Timedelta(days=baseline_lookback_days)
    ra_base = ra[(d["date"] >= start)]
    if baseline_exclude_tail_days > 0:
        tail_cut = end - pd.Timedelta(days=baseline_exclude_tail_days)
        ra_base = ra_base[(d["date"] <= tail_cut)]

    baseline = ra_base.to_numpy(dtype="float64", copy=False)
    informative = _series_is_informative(baseline)
    z = _robust_z(float(current), baseline) if informative else None
    pct = _percentile_rank_midrank(float(current), baseline) if informative else None
    score = _z_to_score(z) if informative else None

    return {
        "current": current_raw,
        "transformed_current": float(current),
        "z": z,
        "pct_lookback": pct,
        "score_raw": score,
        "informative": bool(informative),
        "neutralized": bool(not informative),
        "neutral_reason": None if informative else "low_variance_or_insufficient_distribution",
        "transform": {
            "type": "instability_proxy",
            "input_metric": col,
            "formula": "rolling_mean(|bt - median_30| / median_30)",
        },
    }


def _empty_component(name: str) -> Dict[str, Any]:
    return {
        "current": None,
        "z": None,
        "pct_lookback": None,
        "score_raw": None,
        "informative": False,
        "neutralized": True,
        "neutral_reason": "missing_or_insufficient_distribution",
    }


def _combine(components: List[Dict[str, Any]], weights: List[float]) -> Tuple[Optional[float], float, int]:
    use = []
    for comp, weight in zip(components, weights):
        score = comp.get("score_raw")
        if score is None:
            continue
        try:
            s = float(score)
            w = float(weight)
        except Exception:
            continue
        if math.isfinite(s) and math.isfinite(w) and w > 0:
            use.append((s, w))
    if not use:
        return None, 0.0, 0
    wsum = float(sum(w for _, w in use))
    val = float(sum(s * w for s, w in use) / wsum)
    return val, wsum, len(use)


def _degrade(score: Optional[float], eff: float) -> Optional[float]:
    if score is None:
        return None
    return float(50.0 + (float(score) - 50.0) * eff)


def _axis_dimension(
    *,
    axis: str,
    score_raw: Optional[float],
    eff: float,
    coverage: float,
    components: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    score = _degrade(score_raw, eff) if score_raw is not None else 50.0
    level = _capacity_level(score) if axis == "capacity" else _level(score)
    return {
        "score_raw": score_raw,
        "score": score,
        "level": level,
        "effective_confidence": eff,
        "coverage_factor": coverage,
        "components": components,
    }


def _support_from_dimensions(dimensions: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    demand = dimensions.get("demand", {})
    friction = dimensions.get("friction", {})
    capacity = dimensions.get("capacity", {})

    def score(axis: Dict[str, Any]) -> Optional[float]:
        try:
            v = axis.get("score")
            if v is None:
                return None
            f = float(v)
            return f if math.isfinite(f) else None
        except Exception:
            return None

    demand_s = score(demand)
    friction_s = score(friction)
    capacity_s = score(capacity)
    demand_l = str(demand.get("level") or "Unknown")
    friction_l = str(friction.get("level") or "Unknown")
    capacity_l = str(capacity.get("level") or "Unknown")

    demand_high = (demand_s is not None and demand_s >= 67.0) or demand_l == "High"
    friction_high = (friction_s is not None and friction_s >= 67.0) or friction_l == "High"
    friction_low = (friction_s is not None and friction_s <= 33.0) or friction_l == "Low"
    capacity_high = (capacity_s is not None and capacity_s >= 67.0) or capacity_l == "Tight"
    capacity_low = (capacity_s is not None and capacity_s <= 33.0) or capacity_l == "Slack"

    # These are support flags, not recommendations. They are used solely to keep
    # public labels and the public scorecard epistemically aligned.
    return {
        "heating_supported": bool(demand_high),
        "cheap_supported": bool(friction_low and not capacity_high),
        "congested_supported": bool((friction_high and capacity_high) or (friction_high and capacity_s is None) or (capacity_high and friction_s is None)),
        "details": {
            "demand": {"score": demand_s, "level": demand_l},
            "friction": {"score": friction_s, "level": friction_l},
            "capacity": {"score": capacity_s, "level": capacity_l},
        },
    }


def compute_market_scorecard(
    df: pd.DataFrame,
    *,
    chain: str,
    confidence_score: Optional[float],
    window_days: int = 7,
) -> Dict[str, Any]:
    """Compute profile-aware Demand/Friction/Capacity scorecard for one chain."""
    if df is None or df.empty:
        return {
            "chain": chain,
            "missing": True,
            "asof_date": None,
            "window_days": window_days,
            "confidence_score": confidence_score,
        }

    d = df.copy()
    if "date" not in d.columns and "day" in d.columns:
        d = d.rename(columns={"day": "date"})
    if "date" in d.columns:
        d["date"] = _to_dt(d["date"])
        d = d.dropna(subset=["date"]).sort_values("date")
    asof = d["date"].iloc[-1].date().isoformat() if ("date" in d.columns and not d.empty) else None

    profile_type = _profile_for_chain(chain)
    spec = PROFILE_COMPONENTS.get(profile_type, PROFILE_COMPONENTS["eth_l1"])

    component_outputs: Dict[str, Dict[str, Dict[str, Any]]] = {"demand": {}, "friction": {}, "capacity": {}}
    component_scores: Dict[str, List[Dict[str, Any]]] = {"demand": [], "friction": [], "capacity": []}
    component_weights: Dict[str, List[float]] = {"demand": [], "friction": [], "capacity": []}

    for axis in ("demand", "friction", "capacity"):
        for metric, weight, transform in spec.get(axis, []):
            comp = _weekly_component(d, metric, window_days=window_days, transform=transform)
            component_outputs[axis][metric] = comp
            component_scores[axis].append(comp)
            component_weights[axis].append(weight)

    demand_raw, _demand_wsum, demand_used = _combine(component_scores["demand"], component_weights["demand"])
    friction_raw, _friction_wsum, friction_used = _combine(component_scores["friction"], component_weights["friction"])
    capacity_raw, _capacity_wsum, capacity_used = _combine(component_scores["capacity"], component_weights["capacity"])

    expected = {
        axis: max(1, len(spec.get(axis, [])))
        for axis in ("demand", "friction", "capacity")
    }
    cov_d = demand_used / expected["demand"] if expected["demand"] else 0.0
    cov_f = friction_used / expected["friction"] if expected["friction"] else 0.0
    cov_c = capacity_used / expected["capacity"] if expected["capacity"] else 0.0

    base_conf = _clamp01(confidence_score)
    # Coverage affects how aggressively scores move away from 50, but a valid
    # single-component profile (BTC/L2 friction) must not be diluted by missing
    # metrics from another chain profile.
    eff_d = base_conf * cov_d
    eff_f = base_conf * cov_f
    eff_c = base_conf * cov_c

    dimensions = {
        "demand": _axis_dimension(
            axis="demand",
            score_raw=demand_raw,
            eff=eff_d,
            coverage=cov_d,
            components=component_outputs["demand"],
        ),
        "friction": _axis_dimension(
            axis="friction",
            score_raw=friction_raw,
            eff=eff_f,
            coverage=cov_f,
            components=component_outputs["friction"],
        ),
        "capacity": _axis_dimension(
            axis="capacity",
            score_raw=capacity_raw,
            eff=eff_c,
            coverage=cov_c,
            components=component_outputs["capacity"],
        ),
    }

    support = _support_from_dimensions(dimensions)

    return {
        "chain": chain,
        "missing": False,
        "asof_date": asof,
        "window_days": window_days,
        "confidence_score": base_conf,
        "profile_type": profile_type,
        "dimensions": dimensions,
        "regime_support": support,
        "notes": {
            "interpretation": (
                "Scores are 0–100. 50 is neutral vs the chain's own history. "
                "Higher Demand means hotter usage; higher Friction means higher cost/failure; "
                "higher Capacity means tighter capacity pressure. Low confidence pulls scores toward 50. "
                "Scorecard components are profile-aware and aligned with regime classification."
            )
        },
    }
