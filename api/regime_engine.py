# api/regime_engine.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import math
import pandas as pd
import numpy as np


def _safe_num(x: Any) -> Optional[float]:
    try:
        v = float(x)
        if math.isfinite(v):
            return v
        return None
    except Exception:
        return None


def _ensure_date(df: pd.DataFrame) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame()
    d = df.copy()
    if "date" not in d.columns and "day" in d.columns:
        d = d.rename(columns={"day": "date"})
    if "date" not in d.columns:
        return pd.DataFrame()
    d["date"] = pd.to_datetime(d["date"], errors="coerce")
    d = d.dropna(subset=["date"]).sort_values("date")
    return d


def _finite_values(x: np.ndarray) -> np.ndarray:
    try:
        arr = np.asarray(x, dtype=float)
    except Exception:
        arr = np.array([], dtype=float)
    return arr[np.isfinite(arr)]


def _series_is_informative(x: np.ndarray, *, min_points: int = 30, eps: float = 1e-12) -> bool:
    """Return whether a historical distribution can safely drive a regime label.

    This prevents the old failure mode where constant L2 fields such as
    avg_block_time_sec=2.0 or failed_tx_rate=0.0 received pct_90d=100 and
    therefore triggered EXTREME_HIGH / CONGESTED. Constant or near-constant
    series are retained in the evidence surface but are neutralized for regime
    classification.
    """
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


def _robust_z(x: np.ndarray, current: float) -> float:
    vals = _finite_values(x)
    if vals.size == 0:
        return 0.0
    med = float(np.nanmedian(vals))
    mad = float(np.nanmedian(np.abs(vals - med)))
    if not math.isfinite(mad) or mad <= 1e-12:
        sd = float(np.nanstd(vals))
        if not math.isfinite(sd) or sd <= 1e-12:
            return 0.0
        return float((current - med) / sd)
    # 0.6745 makes MAD comparable to std for normal data
    return float(0.6745 * (current - med) / mad)


def _percentile_rank(x: np.ndarray, current: float) -> float:
    vals = _finite_values(x)
    if vals.size == 0:
        return 50.0
    if not _series_is_informative(vals, min_points=min(30, max(1, vals.size))):
        return 50.0

    # Mid-rank percentile: ties get half weight. Constant series therefore
    # cannot become pct_90d=100 by construction.
    less = float(np.sum(vals < current))
    equal = float(np.sum(vals == current))
    pct = ((less + 0.5 * equal) / float(vals.size)) * 100.0
    return float(max(0.0, min(100.0, pct)))


def _window_values(s: pd.Series, n: int) -> np.ndarray:
    if s is None or s.empty:
        return np.array([], dtype=float)
    v = pd.to_numeric(s, errors="coerce").to_numpy(dtype=float)
    v = v[np.isfinite(v)]
    if v.size == 0:
        return v
    return v[-n:] if v.size >= n else v


def _mean_last(s: pd.Series, n: int) -> Optional[float]:
    v = _window_values(s, n)
    if v.size == 0:
        return None
    return float(np.mean(v))


def _signal_for_metric(d: pd.DataFrame, metric: str) -> Optional[Dict[str, Any]]:
    if metric not in d.columns:
        return None

    s = pd.to_numeric(d[metric], errors="coerce")
    cur = _safe_num(s.iloc[-1])
    if cur is None:
        return None

    hist180 = _window_values(s, 180)
    hist90 = _window_values(s, 90)
    full = _window_values(s, max(len(s), 1))
    baseline_for_stats = hist180 if hist180.size else full
    baseline_for_pct = hist90 if hist90.size else full

    informative = _series_is_informative(baseline_for_pct)

    if informative:
        z = _robust_z(baseline_for_stats, cur)
        pct = _percentile_rank(baseline_for_pct, cur)
        m7 = _mean_last(s, 7)
        m30 = _mean_last(s, 30)
        if m7 is None or m30 is None:
            mom = 0.0
        else:
            z7 = _robust_z(baseline_for_stats, m7)
            z30 = _robust_z(baseline_for_stats, m30)
            mom = float(z7 - z30)
    else:
        z = 0.0
        pct = 50.0
        mom = 0.0

    return {
        "metric": metric,
        "current": cur,
        "z_robust": float(z),
        "pct_90d": float(pct),
        "momentum_7d_vs_30d": float(mom),
        "informative": bool(informative),
        "neutralized": bool(not informative),
        "neutral_reason": None if informative else "low_variance_or_insufficient_distribution",
    }

def _signal_for_blocktime_instability(
    d: pd.DataFrame,
    *,
    col: str = "avg_block_time_sec",
    window_days: int = 7,
    instability_rolling_median_days: int = 30,
) -> Optional[Dict[str, Any]]:
    """
    Scorecard-compatible instability proxy:

    inst(t) = |bt(t) - median_30(t)| / median_30(t)
    then rolling-mean over window_days.

    IMPORTANT:
    - "current_raw" is the raw block time (seconds) at as-of.
    - "current" is the *instability* value at as-of (rolling mean).
    - z/pct/momentum are computed on the instability series (not raw bt).
    """
    if d.empty or "date" not in d.columns or col not in d.columns:
        return None

    bt = pd.to_numeric(d[col], errors="coerce")
    if bt.dropna().empty:
        return None

    # rolling median baseline for instability
    med30 = bt.rolling(
        instability_rolling_median_days,
        min_periods=max(10, instability_rolling_median_days // 2),
    ).median()
    denom = med30.replace({0.0: np.nan})
    inst = (bt - med30).abs() / denom

    # smooth over window_days
    win = int(window_days) if int(window_days) > 0 else 7
    inst_ra = inst.rolling(win, min_periods=max(3, win // 2)).mean()

    cur_inst = _safe_num(inst_ra.iloc[-1])
    cur_raw = _safe_num(bt.iloc[-1])

    # if we can't compute the instability point, do not emit a misleading signal
    if cur_inst is None:
        return None

    hist180 = _window_values(inst_ra, 180)
    hist90 = _window_values(inst_ra, 90)
    full = _window_values(inst_ra, max(len(inst_ra), 1))
    baseline_for_stats = hist180 if hist180.size else full
    baseline_for_pct = hist90 if hist90.size else full
    informative = _series_is_informative(baseline_for_pct)

    if informative:
        z = _robust_z(baseline_for_stats, cur_inst)
        pct = _percentile_rank(baseline_for_pct, cur_inst)
        m7 = _mean_last(inst_ra, 7)
        m30 = _mean_last(inst_ra, 30)
        if m7 is None or m30 is None:
            mom = 0.0
        else:
            z7 = _robust_z(baseline_for_stats, m7)
            z30 = _robust_z(baseline_for_stats, m30)
            mom = float(z7 - z30)
    else:
        z = 0.0
        pct = 50.0
        mom = 0.0

    return {
        "metric": "blocktime_instability",
        "current": float(cur_inst),          # instability value
        "current_raw": float(cur_raw) if cur_raw is not None else None,  # raw seconds
        "z_robust": float(z),
        "pct_90d": float(pct),
        "momentum_7d_vs_30d": float(mom),
        "informative": bool(informative),
        "neutralized": bool(not informative),
        "neutral_reason": None if informative else "low_variance_or_insufficient_distribution",
        "transform": {
            "type": "instability_proxy",
            "input_metric": col,
            "instability_rolling_median_days": int(instability_rolling_median_days),
            "window_days": int(win),
            "formula": "rolling_mean(|bt - median_30| / median_30)",
        },
    }


def _band(pct: float, z: float, *, informative: bool = True) -> str:
    if not informative:
        return "NORMAL"
    if pct >= 90.0 or z >= 2.5:
        return "EXTREME_HIGH"
    if pct >= 80.0 or z >= 1.5:
        return "HIGH"
    if pct <= 10.0 or z <= -2.5:
        return "EXTREME_LOW"
    if pct <= 20.0 or z <= -1.5:
        return "LOW"
    return "NORMAL"


def _trend(mom: float, eps: float = 0.15) -> str:
    if mom >= eps:
        return "HEATING"
    if mom <= -eps:
        return "COOLING"
    return "FLAT"


@dataclass(frozen=True)
class ProfileSpec:
    profile_type: str
    ruleset_id: str
    demand_metrics: Tuple[str, ...]
    friction_metrics: Tuple[str, ...]
    capacity_metrics: Tuple[str, ...]


PROFILE_SPECS: Dict[str, ProfileSpec] = {
    "eth_l1": ProfileSpec(
        profile_type="eth_l1",
        ruleset_id="eth_l1_v2",
        demand_metrics=("tx_count_daily", "unique_active_addresses"),
        friction_metrics=("median_tx_fee_native", "failed_tx_rate"),
        capacity_metrics=("gas_utilization_pct",),
    ),
    "l2": ProfileSpec(
        profile_type="l2",
        ruleset_id="l2_v1",
        demand_metrics=("tx_count_daily", "unique_active_addresses"),
        friction_metrics=("median_tx_fee_native",),
        capacity_metrics=("capacity_util_pct",),
    ),
    "btc": ProfileSpec(
        profile_type="btc",
        ruleset_id="btc_v2",
        demand_metrics=("tx_count_daily", "unique_active_addresses"),
        friction_metrics=("median_tx_fee_native",),
        capacity_metrics=("block_weight_utilization_pct",),
    ),
}


SIGNAL_ALIASES_BY_PROFILE: Dict[str, Dict[str, str]] = {
    "btc": {
        "tx_count": "tx_count_daily",
        # IMPORTANT: map scorecard instability component to a matching instability signal (not raw bt)
        "blocktime_instability": "blocktime_instability",
        "block_weight_utilization": "block_weight_utilization_pct",
        "fee_burden_proxy": "median_tx_fee_native",
    },
    "eth_l1": {
        "tx_count": "tx_count_daily",
        "active_addresses": "unique_active_addresses",
        "fee_burden_proxy": "median_tx_fee_native",
        "failed_tx_rate": "failed_tx_rate",
        "utilization": "gas_utilization_pct",
        "blocktime_instability": "blocktime_instability",
    },
    "l2": {
        "tx_count": "tx_count_daily",
        "active_addresses": "unique_active_addresses",
        "fee_burden_proxy": "median_tx_fee_native",
        "failed_tx_rate": "failed_tx_rate",
        "utilization": "capacity_util_pct",
        "blocktime_instability": "blocktime_instability",
    },
}


def _aggregate_axis(signals: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Contract semantics:
    - Non-informative signals remain visible but cannot drive high/low bands.
    - band_high: strongest informative high-side (HIGH/EXTREME_HIGH). If none => NORMAL.
    - band_low: strongest informative low-side (LOW/EXTREME_LOW). If none => NORMAL.
    """
    if not signals:
        return {
            "band_high": "NORMAL",
            "band_low": "NORMAL",
            "trend": "FLAT",
            "signals": [],
            "informative_count": 0,
        }

    informative = [s for s in signals if bool(s.get("informative", True))]
    if not informative:
        return {
            "band_high": "NORMAL",
            "band_low": "NORMAL",
            "trend": "FLAT",
            "signals": signals,
            "informative_count": 0,
        }

    bands = [str(s.get("band", "NORMAL")) for s in informative]

    if "EXTREME_HIGH" in bands:
        band_high = "EXTREME_HIGH"
    elif "HIGH" in bands:
        band_high = "HIGH"
    else:
        band_high = "NORMAL"

    if "EXTREME_LOW" in bands:
        band_low = "EXTREME_LOW"
    elif "LOW" in bands:
        band_low = "LOW"
    else:
        band_low = "NORMAL"

    top = sorted(
        informative,
        key=lambda s: (
            abs(float(s.get("z_robust", 0.0))),
            abs(float(s.get("momentum_7d_vs_30d", s.get("momentum", 0.0)))),
            str(s.get("metric", "")),
        ),
        reverse=True,
    )[:2]
    mom_avg = float(np.mean([float(t.get("momentum_7d_vs_30d", t.get("momentum", 0.0))) for t in top])) if top else 0.0

    return {
        "band_high": band_high,
        "band_low": band_low,
        "trend": _trend(mom_avg),
        "signals": signals,
        "informative_count": len(informative),
    }

def _driver_score(s: Dict[str, Any], weight: float) -> float:
    z = float(s.get("z_robust", 0.0))
    pct = float(s.get("pct_90d", 50.0))
    mom = float(s.get("momentum_7d_vs_30d", 0.0))
    pct_dist = abs(pct - 50.0) / 50.0
    return float(weight * (abs(z) + 0.75 * pct_dist + 0.50 * abs(mom)))


def compute_regime(
    gold_df: pd.DataFrame,
    *,
    chain: str,
    profile: Dict[str, Any],
    asof_date: Optional[str] = None,
    window_days: int = 7,
    confidence_score: Optional[float] = None,
    confidence_threshold: float = 0.40,
) -> Dict[str, Any]:
    try:
        cs = float(confidence_score) if confidence_score is not None else None
        if cs is not None and (not math.isfinite(cs)):
            cs = None
    except Exception:
        cs = None

    is_gated = cs is not None and cs < float(confidence_threshold)

    d = _ensure_date(gold_df)
    if d.empty:
        return {
            "chain": chain,
            "missing": True,
            "label": None,
            "asof_date": asof_date,
            "window_days": window_days,
            "ruleset_id": None,
            "drivers": [],
        }

    ptype = str((profile or {}).get("type") or "eth_l1")
    spec = PROFILE_SPECS.get(ptype, PROFILE_SPECS["eth_l1"])

    demand: List[Dict[str, Any]] = []
    for m in spec.demand_metrics:
        sig = _signal_for_metric(d, m)
        if sig:
            sig["band"] = _band(sig["pct_90d"], sig["z_robust"], informative=bool(sig.get("informative", True)))
            sig["trend"] = _trend(sig["momentum_7d_vs_30d"])
            demand.append(sig)

    calldata_sig: Optional[Dict[str, Any]] = None
    if spec.profile_type == "eth_l1":
        calldata_sig = _signal_for_metric(d, "nonempty_calldata_share")
        if calldata_sig:
            calldata_sig["band"] = _band(
                calldata_sig["pct_90d"],
                calldata_sig["z_robust"],
                informative=bool(calldata_sig.get("informative", True)),
            )
            calldata_sig["trend"] = _trend(calldata_sig["momentum_7d_vs_30d"])

    friction: List[Dict[str, Any]] = []
    for m in spec.friction_metrics:
        sig = _signal_for_metric(d, m)
        if sig:
            sig["band"] = _band(sig["pct_90d"], sig["z_robust"], informative=bool(sig.get("informative", True)))
            sig["trend"] = _trend(sig["momentum_7d_vs_30d"])
            friction.append(sig)

    capacity: List[Dict[str, Any]] = []
    for m in spec.capacity_metrics:
        sig = _signal_for_metric(d, m)
        if sig:
            sig["band"] = _band(sig["pct_90d"], sig["z_robust"], informative=bool(sig.get("informative", True)))
            sig["trend"] = _trend(sig["momentum_7d_vs_30d"])
            capacity.append(sig)

    # Add scorecard-compatible instability signal (if input exists).
    # This DOES NOT change regime logic; it only enriches the evidence surface + mapping.
    inst_sig = _signal_for_blocktime_instability(d, col="avg_block_time_sec", window_days=int(window_days))
    if inst_sig:
        inst_sig["axis"] = "capacity"
        inst_sig["band"] = _band(float(inst_sig["pct_90d"]), float(inst_sig["z_robust"]), informative=bool(inst_sig.get("informative", True)))
        inst_sig["trend"] = _trend(float(inst_sig["momentum_7d_vs_30d"]))
        # Use instability, not raw block time, as the capacity signal.
        # Non-informative instability is neutralized by _aggregate_axis.
        capacity.append(inst_sig)

    # Full evidence surface
    signals: Dict[str, Any] = {}

    def _emit(axis: str, s: Dict[str, Any]) -> None:
        metric = str(s["metric"])
        out = {
            "axis": axis,
            "current": s.get("current"),
            "pct_90d": s.get("pct_90d"),
            "z_robust": s.get("z_robust"),
            "momentum_7d_vs_30d": s.get("momentum_7d_vs_30d"),
            "informative": bool(s.get("informative", True)),
            "neutralized": bool(s.get("neutralized", False)),
            "neutral_reason": s.get("neutral_reason"),
        }
        # carry optional extras (for transforms)
        if "current_raw" in s:
            out["current_raw"] = s.get("current_raw")
        if "transform" in s:
            out["transform"] = s.get("transform")
        signals[metric] = out

    for s in demand:
        _emit("demand", s)
    if calldata_sig:
        _emit("demand", calldata_sig)
    for s in friction:
        _emit("friction", s)
    for s in capacity:
        _emit("capacity", s)
    if inst_sig:
        _emit("capacity", inst_sig)

    ax_d = _aggregate_axis(demand)
    ax_f = _aggregate_axis(friction)
    ax_c = _aggregate_axis(capacity)

    def is_high(b: str) -> bool:
        return b in ("HIGH", "EXTREME_HIGH")

    def is_extreme_high(b: str) -> bool:
        return b == "EXTREME_HIGH"

    def is_low(b: str) -> bool:
        return b in ("LOW", "EXTREME_LOW")

    demand_high = is_high(ax_d["band_high"]) and int(ax_d.get("informative_count", 0)) > 0
    friction_high = is_high(ax_f["band_high"]) and int(ax_f.get("informative_count", 0)) > 0
    friction_low = is_low(ax_f["band_low"]) and int(ax_f.get("informative_count", 0)) > 0
    capacity_high = is_high(ax_c["band_high"]) and int(ax_c.get("informative_count", 0)) > 0
    capacity_low = is_low(ax_c["band_low"]) and int(ax_c.get("informative_count", 0)) > 0
    capacity_extreme = is_extreme_high(ax_c["band_high"]) and int(ax_c.get("informative_count", 0)) > 0

    label = "STABLE"
    if spec.profile_type == "btc":
        # BTC cheap-veto semantics: high blockspace use can veto CHEAP, but
        # CONGESTED still requires simultaneous Friction and Capacity pressure.
        if friction_high and capacity_high:
            label = "CONGESTED"
        elif friction_low and not capacity_high:
            label = "CHEAP"
        elif demand_high and ax_d["trend"] == "HEATING":
            label = "HEATING"
        else:
            label = "STABLE"
    elif spec.profile_type == "eth_l1":
        # ETH v2 preserve-baseline corroboration semantics:
        # - existing congestion/cheap/core-demand HEATING behavior is unchanged;
        # - calldata is supplemental Demand evidence only;
        # - calldata can create a new HEATING label only when core Demand is
        #   already HIGH/EXTREME_HIGH and calldata trend is HEATING.
        calldata_heating = bool(
            calldata_sig
            and bool(calldata_sig.get("informative", True))
            and calldata_sig.get("trend") == "HEATING"
        )
        if (friction_high and capacity_high) or (capacity_extreme and ax_c["trend"] == "HEATING"):
            label = "CONGESTED"
        elif friction_low and (capacity_low or not capacity_high):
            label = "CHEAP"
        elif demand_high and ax_d["trend"] == "HEATING":
            label = "HEATING"
        elif demand_high and calldata_heating:
            label = "HEATING"
        else:
            label = "STABLE"
    elif (friction_high and capacity_high) or (capacity_extreme and ax_c["trend"] == "HEATING"):
        label = "CONGESTED"
    elif friction_low and (capacity_low or not capacity_high):
        label = "CHEAP"
    elif demand_high and ax_d["trend"] == "HEATING":
        label = "HEATING"
    else:
        label = "STABLE"

    if is_gated:
        label = "UNKNOWN/DEGRADED"

    candidates: List[Tuple[float, Dict[str, Any]]] = []
    for s in demand:
        if bool(s.get("informative", True)):
            candidates.append((_driver_score(s, 1.0), {**s, "axis": "demand"}))
    if calldata_sig and bool(calldata_sig.get("informative", True)):
        candidates.append((_driver_score(calldata_sig, 1.0), {**calldata_sig, "axis": "demand"}))
    for s in friction:
        if bool(s.get("informative", True)):
            candidates.append((_driver_score(s, 1.1), {**s, "axis": "friction"}))
    for s in capacity:
        if bool(s.get("informative", True)):
            candidates.append((_driver_score(s, 1.2), {**s, "axis": "capacity"}))

    def agrees(s: Dict[str, Any]) -> bool:
        b = s.get("band", "NORMAL")
        tr = s.get("trend", "FLAT")
        if label == "UNKNOWN/DEGRADED":
            return True
        if label == "CONGESTED":
            return is_high(b) or tr == "HEATING"
        if label == "CHEAP":
            return is_low(b) or tr == "COOLING"
        if label == "HEATING":
            return is_high(b) or tr == "HEATING"
        return True

    filtered = [c for c in candidates if agrees(c[1])]
    filtered.sort(key=lambda t: (-t[0], str(t[1].get("metric"))))

    drivers: List[Dict[str, Any]] = []
    for _, s in filtered[:3]:
        drivers.append(
            {
                "metric": s["metric"],
                "axis": s["axis"],
                "current": s["current"],
                "z_robust": s["z_robust"],
                "pct_90d": s["pct_90d"],
                "trend": s["trend"],
                "momentum_7d_vs_30d": s["momentum_7d_vs_30d"],
                "informative": bool(s.get("informative", True)),
            }
        )

    det_hash: Optional[str] = None
    if not is_gated:
        det_payload = {
            "chain": chain,
            "ruleset_id": spec.ruleset_id,
            "label": label,
            "asof_date": asof_date,
            "drivers": drivers,
        }
        canon = json_dumps_canonical(det_payload)
        det_hash = stable_sha256_12(canon)

    aliases = SIGNAL_ALIASES_BY_PROFILE.get(spec.profile_type, {})
    alias_to_signal: Dict[str, str] = {}
    for alias_key, signal_key in aliases.items():
        if signal_key in signals:
            alias_to_signal[str(alias_key)] = str(signal_key)

    return {
        "chain": chain,
        "missing": False,
        "label": label,
        "asof_date": asof_date,
        "window_days": window_days,
        "ruleset_id": spec.ruleset_id,
        "drivers": drivers,
        "determinism_hash": det_hash,
        "gate": {
            "type": "confidence_threshold",
            "threshold": float(confidence_threshold),
            "confidence_score": float(cs) if cs is not None else None,
            "status": "ok" if not is_gated else "gated",
            "explanation": (
                "Confidence is below the product threshold; regime is withheld to avoid overclaiming."
                if is_gated
                else "OK"
            ),
        },
        "axes": {
            "demand": {"band_high": ax_d["band_high"], "band_low": ax_d["band_low"], "trend": ax_d["trend"], "informative_count": ax_d.get("informative_count", 0)},
            "friction": {"band_high": ax_f["band_high"], "band_low": ax_f["band_low"], "trend": ax_f["trend"], "informative_count": ax_f.get("informative_count", 0)},
            "capacity": {"band_high": ax_c["band_high"], "band_low": ax_c["band_low"], "trend": ax_c["trend"], "informative_count": ax_c.get("informative_count", 0)},
        },
        "methodology_notes": [
            "Non-informative low-variance distributions are neutralized before band aggregation.",
            "Raw block time is not used directly for congestion; blocktime_instability is used instead.",
            *(
                ["Ethereum calldata activity is supplemental Demand evidence: it does not alter the core Demand axis and can create HEATING only when core Demand is already HIGH/EXTREME_HIGH and calldata trend is HEATING."]
                if spec.profile_type == "eth_l1"
                else []
            ),
        ],
        "signals": signals,
        "signal_aliases": alias_to_signal,
    }


def _scorecard_dimension_score(scorecard: Dict[str, Any], axis: str) -> Optional[float]:
    try:
        v = (((scorecard or {}).get("dimensions") or {}).get(axis) or {}).get("score")
        if v is None:
            return None
        f = float(v)
        if math.isfinite(f):
            return f
    except Exception:
        pass
    return None


def _scorecard_dimension_level(scorecard: Dict[str, Any], axis: str) -> Optional[str]:
    try:
        v = (((scorecard or {}).get("dimensions") or {}).get(axis) or {}).get("level")
        if v is not None:
            return str(v)
    except Exception:
        pass
    return None


def _scorecard_regime_support(scorecard: Dict[str, Any], label: str) -> Tuple[bool, Dict[str, Any], str]:
    """Return whether the public scorecard supports a regime label.

    Newer scorecards expose scorecard.regime_support. For backward
    compatibility we also evaluate dimension scores/levels directly.
    """
    support = (scorecard or {}).get("regime_support") or {}
    details = support.get("details") or {
        "demand": {
            "score": _scorecard_dimension_score(scorecard, "demand"),
            "level": _scorecard_dimension_level(scorecard, "demand"),
        },
        "friction": {
            "score": _scorecard_dimension_score(scorecard, "friction"),
            "level": _scorecard_dimension_level(scorecard, "friction"),
        },
        "capacity": {
            "score": _scorecard_dimension_score(scorecard, "capacity"),
            "level": _scorecard_dimension_level(scorecard, "capacity"),
        },
    }

    if label == "CONGESTED":
        if support.get("congested_supported") is True:
            return True, details, "scorecard.regime_support.congested_supported"
        friction_score = details.get("friction", {}).get("score")
        capacity_score = details.get("capacity", {}).get("score")
        friction_level = details.get("friction", {}).get("level")
        capacity_level = details.get("capacity", {}).get("level")
        ok = (
            (friction_score is not None and float(friction_score) >= 67.0 and capacity_score is not None and float(capacity_score) >= 67.0)
            or (friction_level == "High" and capacity_level == "Tight")
        )
        return bool(ok), details, "CONGESTED requires friction and capacity support."

    if label == "CHEAP":
        if support.get("cheap_supported") is True:
            return True, details, "scorecard.regime_support.cheap_supported"
        friction_score = details.get("friction", {}).get("score")
        capacity_score = details.get("capacity", {}).get("score")
        friction_level = details.get("friction", {}).get("level")
        capacity_level = details.get("capacity", {}).get("level")
        friction_low = (friction_score is not None and float(friction_score) <= 33.0) or friction_level == "Low"
        capacity_tight = (capacity_score is not None and float(capacity_score) >= 67.0) or capacity_level == "Tight"
        return bool(friction_low and not capacity_tight), details, "CHEAP requires low friction and no tight capacity."

    if label == "HEATING":
        if support.get("heating_supported") is True:
            return True, details, "scorecard.regime_support.heating_supported"
        demand_score = details.get("demand", {}).get("score")
        demand_level = details.get("demand", {}).get("level")
        ok = (demand_score is not None and float(demand_score) >= 67.0) or demand_level == "High"
        return bool(ok), details, "HEATING requires demand support."

    return True, details, "ok"


def _regime_axis_support(regime: Dict[str, Any], label: str) -> Tuple[bool, Dict[str, Any], str]:
    axes = (regime or {}).get("axes") or {}
    d = axes.get("demand") or {}
    f = axes.get("friction") or {}
    c = axes.get("capacity") or {}

    def high(axis: Dict[str, Any]) -> bool:
        return str(axis.get("band_high")) in {"HIGH", "EXTREME_HIGH"} and int(axis.get("informative_count") or 0) > 0

    def extreme_high(axis: Dict[str, Any]) -> bool:
        return str(axis.get("band_high")) == "EXTREME_HIGH" and int(axis.get("informative_count") or 0) > 0

    def low(axis: Dict[str, Any]) -> bool:
        return str(axis.get("band_low")) in {"LOW", "EXTREME_LOW"} and int(axis.get("informative_count") or 0) > 0

    def heating(axis: Dict[str, Any]) -> bool:
        return str(axis.get("trend")) == "HEATING"

    details = {"demand": d, "friction": f, "capacity": c}

    if label == "CONGESTED":
        ok = bool((high(f) and high(c)) or (extreme_high(c) and heating(c)))
        return ok, details, "regime axes require informative friction/capacity support."
    if label == "CHEAP":
        ok = bool(low(f) and not high(c))
        return ok, details, "regime axes require informative low friction and no high capacity pressure."
    if label == "HEATING":
        core_demand_support = bool(high(d) and heating(d))
        calldata = ((regime.get("signals") or {}).get("nonempty_calldata_share") or {})
        eth_calldata_support = bool(
            str(regime.get("ruleset_id") or "") == "eth_l1_v2"
            and high(d)
            and bool(calldata.get("informative", False))
            and str(calldata.get("trend") or "") == "HEATING"
        )
        ok = bool(core_demand_support or eth_calldata_support)
        return ok, details, "regime axes require core demand HEATING support or the ETH v2 supplemental calldata HEATING rule."
    return True, details, "ok"


def reconcile_regime_with_scorecard(regime: Dict[str, Any], scorecard: Dict[str, Any]) -> Dict[str, Any]:
    """Keep public labels and the public scorecard epistemically aligned.

    The previous safety patch degraded many legitimate non-STABLE labels because
    the scorecard was not profile-aware. The scorecard is now profile-aware and
    exposes explicit regime_support flags. This function therefore only degrades
    a non-STABLE label when BOTH conditions hold:
      1) the profile-aware public scorecard does not support the label, and
      2) the regime axis facts do not independently support the label.

    UNKNOWN/DEGRADED is never upgraded. STABLE is left unchanged.
    """
    if not isinstance(regime, dict):
        return regime

    label = str(regime.get("label") or "STABLE")
    if label in ("UNKNOWN/DEGRADED", "STABLE"):
        out = dict(regime)
        out.setdefault("sanity", {"status": "ok", "adjusted": False})
        return out

    scorecard_ok, scorecard_details, scorecard_reason = _scorecard_regime_support(scorecard, label)
    axis_ok, axis_details, axis_reason = _regime_axis_support(regime, label)

    out = dict(regime)
    if scorecard_ok or axis_ok:
        out["sanity"] = {
            "status": "ok",
            "adjusted": False,
            "support_basis": "scorecard" if scorecard_ok else "regime_axes",
            "scorecard_support": scorecard_details,
            "axis_support": axis_details,
            "support_reason": scorecard_reason if scorecard_ok else axis_reason,
        }
        return out

    previous_label = label
    out["label"] = "STABLE"
    out["determinism_hash"] = stable_sha256_12(json_dumps_canonical({
        "chain": out.get("chain"),
        "ruleset_id": out.get("ruleset_id"),
        "label": "STABLE",
        "asof_date": out.get("asof_date"),
        "sanity_adjusted_from": previous_label,
    }))
    out["drivers"] = []
    out["sanity"] = {
        "status": "adjusted",
        "adjusted": True,
        "from_label": previous_label,
        "to_label": "STABLE",
        "reason": f"{scorecard_reason} {axis_reason}",
        "scorecard_support": scorecard_details,
        "axis_support": axis_details,
    }
    return out


def json_dumps_canonical(obj: Any) -> str:
    import json
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def stable_sha256_12(s: str) -> str:
    import hashlib
    h = hashlib.sha256(s.encode("utf-8")).hexdigest()
    return h[:12]