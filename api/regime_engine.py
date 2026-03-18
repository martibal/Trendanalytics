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


def _robust_z(x: np.ndarray, current: float) -> float:
    med = np.nanmedian(x)
    mad = np.nanmedian(np.abs(x - med))
    if not math.isfinite(mad) or mad <= 1e-12:
        return 0.0
    # 0.6745 makes MAD comparable to std for normal data
    return float(0.6745 * (current - med) / mad)


def _percentile_rank(x: np.ndarray, current: float) -> float:
    x = x[np.isfinite(x)]
    if x.size == 0:
        return 50.0
    return float((np.sum(x <= current) / x.size) * 100.0)


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

    z = _robust_z(hist180 if hist180.size else s.to_numpy(dtype=float), cur)
    pct = _percentile_rank(hist90 if hist90.size else s.to_numpy(dtype=float), cur)

    m7 = _mean_last(s, 7)
    m30 = _mean_last(s, 30)
    if m7 is None or m30 is None:
        mom = 0.0
    else:
        z7 = _robust_z(hist180 if hist180.size else s.to_numpy(dtype=float), m7)
        z30 = _robust_z(hist180 if hist180.size else s.to_numpy(dtype=float), m30)
        mom = float(z7 - z30)

    return {
        "metric": metric,
        "current": cur,
        "z_robust": float(z),
        "pct_90d": float(pct),
        "momentum_7d_vs_30d": float(mom),
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

    z = _robust_z(hist180 if hist180.size else inst_ra.to_numpy(dtype=float), cur_inst)
    pct = _percentile_rank(hist90 if hist90.size else inst_ra.to_numpy(dtype=float), cur_inst)

    m7 = _mean_last(inst_ra, 7)
    m30 = _mean_last(inst_ra, 30)
    if m7 is None or m30 is None:
        mom = 0.0
    else:
        z7 = _robust_z(hist180 if hist180.size else inst_ra.to_numpy(dtype=float), m7)
        z30 = _robust_z(hist180 if hist180.size else inst_ra.to_numpy(dtype=float), m30)
        mom = float(z7 - z30)

    return {
        "metric": "blocktime_instability",
        "current": float(cur_inst),          # instability value
        "current_raw": float(cur_raw) if cur_raw is not None else None,  # raw seconds
        "z_robust": float(z),
        "pct_90d": float(pct),
        "momentum_7d_vs_30d": float(mom),
        "transform": {
            "type": "instability_proxy",
            "input_metric": col,
            "instability_rolling_median_days": int(instability_rolling_median_days),
            "window_days": int(win),
            "formula": "rolling_mean(|bt - median_30| / median_30)",
        },
    }


def _band(pct: float, z: float) -> str:
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
        ruleset_id="eth_l1_v1",
        demand_metrics=("tx_count_daily", "unique_active_addresses"),
        friction_metrics=("median_tx_fee_native", "failed_tx_rate"),
        capacity_metrics=("gas_utilization_pct", "avg_block_time_sec"),
    ),
    "l2": ProfileSpec(
        profile_type="l2",
        ruleset_id="l2_v1",
        demand_metrics=("tx_count_daily", "unique_active_addresses"),
        friction_metrics=("median_tx_fee_native", "failed_tx_rate"),
        capacity_metrics=("capacity_util_pct", "avg_block_time_sec"),
    ),
    "btc": ProfileSpec(
        profile_type="btc",
        ruleset_id="btc_v1",
        demand_metrics=("tx_count_daily", "unique_active_addresses"),
        friction_metrics=("median_tx_fee_native",),
        capacity_metrics=("avg_block_time_sec",),
    ),
}


SIGNAL_ALIASES_BY_PROFILE: Dict[str, Dict[str, str]] = {
    "btc": {
        "tx_count": "tx_count_daily",
        # IMPORTANT: map scorecard instability component to a matching instability signal (not raw bt)
        "blocktime_instability": "blocktime_instability",
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
    - band_high: strongest *high-side* (HIGH/EXTREME_HIGH). If none => NORMAL.
    - band_low: strongest *low-side* (LOW/EXTREME_LOW). If none => NORMAL.
    """
    if not signals:
        return {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "signals": []}

    # Explicitly enforce contract semantics, even if unexpected bands appear.
    bands = [str(s.get("band", "NORMAL")) for s in signals]

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
        signals,
        key=lambda s: (
            abs(float(s.get("z_robust", 0.0))),
            abs(float(s.get("momentum_7d_vs_30d", s.get("momentum", 0.0)))),
            str(s.get("metric", "")),
        ),
        reverse=True,
    )[:2]
    mom_avg = float(np.mean([float(t.get("momentum_7d_vs_30d", t.get("momentum", 0.0))) for t in top])) if top else 0.0

    return {"band_high": band_high, "band_low": band_low, "trend": _trend(mom_avg), "signals": signals}


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
            sig["band"] = _band(sig["pct_90d"], sig["z_robust"])
            sig["trend"] = _trend(sig["momentum_7d_vs_30d"])
            demand.append(sig)

    friction: List[Dict[str, Any]] = []
    for m in spec.friction_metrics:
        sig = _signal_for_metric(d, m)
        if sig:
            sig["band"] = _band(sig["pct_90d"], sig["z_robust"])
            sig["trend"] = _trend(sig["momentum_7d_vs_30d"])
            friction.append(sig)

    capacity: List[Dict[str, Any]] = []
    for m in spec.capacity_metrics:
        sig = _signal_for_metric(d, m)
        if sig:
            sig["band"] = _band(sig["pct_90d"], sig["z_robust"])
            sig["trend"] = _trend(sig["momentum_7d_vs_30d"])
            capacity.append(sig)

    # Add scorecard-compatible instability signal (if input exists).
    # This DOES NOT change regime logic; it only enriches the evidence surface + mapping.
    inst_sig = _signal_for_blocktime_instability(d, col="avg_block_time_sec", window_days=int(window_days))
    if inst_sig:
        inst_sig["axis"] = "capacity"
        inst_sig["band"] = _band(float(inst_sig["pct_90d"]), float(inst_sig["z_robust"]))
        inst_sig["trend"] = _trend(float(inst_sig["momentum_7d_vs_30d"]))
        # keep it out of axis aggregation arrays unless you explicitly want it (we don't, for now)
        # capacity.append(inst_sig)  # intentionally NOT included to avoid regime changes

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
        }
        # carry optional extras (for transforms)
        if "current_raw" in s:
            out["current_raw"] = s.get("current_raw")
        if "transform" in s:
            out["transform"] = s.get("transform")
        signals[metric] = out

    for s in demand:
        _emit("demand", s)
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

    label = "STABLE"
    if is_extreme_high(ax_c["band_high"]) or (is_high(ax_c["band_high"]) and is_high(ax_f["band_high"])):
        label = "CONGESTED"
    elif is_low(ax_f["band_low"]) and is_low(ax_c["band_low"]):
        label = "CHEAP"
    elif is_high(ax_d["band_high"]) and (ax_d["trend"] == "HEATING" or ax_c["trend"] == "HEATING" or ax_f["trend"] == "HEATING"):
        label = "HEATING"
    else:
        label = "STABLE"

    if is_gated:
        label = "UNKNOWN/DEGRADED"

    candidates: List[Tuple[float, Dict[str, Any]]] = []
    for s in demand:
        candidates.append((_driver_score(s, 1.0), {**s, "axis": "demand"}))
    for s in friction:
        candidates.append((_driver_score(s, 1.1), {**s, "axis": "friction"}))
    for s in capacity:
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
            "demand": {"band_high": ax_d["band_high"], "band_low": ax_d["band_low"], "trend": ax_d["trend"]},
            "friction": {"band_high": ax_f["band_high"], "band_low": ax_f["band_low"], "trend": ax_f["trend"]},
            "capacity": {"band_high": ax_c["band_high"], "band_low": ax_c["band_low"], "trend": ax_c["trend"]},
        },
        "signals": signals,
        "signal_aliases": alias_to_signal,
    }


def json_dumps_canonical(obj: Any) -> str:
    import json
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def stable_sha256_12(s: str) -> str:
    import hashlib
    h = hashlib.sha256(s.encode("utf-8")).hexdigest()
    return h[:12]