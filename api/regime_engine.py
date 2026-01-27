# api/regime_engine.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import math
import pandas as pd
import numpy as np


# ----------------------------
# Deterministic regime engine
# ----------------------------
#
# Goal: stable, explainable labels for weekly decision context:
#   STABLE / HEATING / CONGESTED / CHEAP
#
# Method: per-metric signals using:
#   - percentile bands (90d)
#   - robust z-score (180d, median/MAD)
#   - momentum: 7d vs 30d (mean level difference in robust-z space)
#
# Profiles:
#   - btc
#   - eth_l1
#   - l2
#
# Output includes "drivers": the 2–3 metrics that most contributed to the decision.
# The implementation is deterministic (no randomness; stable sorting w/ tie-breakers).


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


def _median(x: np.ndarray) -> float:
    return float(np.nanmedian(x))


def _mad(x: np.ndarray) -> float:
    med = np.nanmedian(x)
    return float(np.nanmedian(np.abs(x - med)))


def _robust_z(x: np.ndarray, current: float) -> float:
    med = np.nanmedian(x)
    mad = np.nanmedian(np.abs(x - med))
    if not math.isfinite(mad) or mad <= 1e-12:
        return 0.0
    # 0.6745 makes MAD comparable to std for normal data
    return float(0.6745 * (current - med) / mad)


def _percentile_rank(x: np.ndarray, current: float) -> float:
    # Percentile (0..100) of current within x, using <= counting (upper bound).
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

    # momentum: compare mean z over last 7 vs last 30
    m7 = _mean_last(s, 7)
    m30 = _mean_last(s, 30)
    if m7 is None or m30 is None:
        mom = 0.0
    else:
        # compute momentum in robust-z space (deterministic)
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


def _band(pct: float, z: float) -> str:
    # Combine percentile and z into discrete, stable bands.
    # Uses conservative thresholds.
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
        # L2 fees still matter; failed tx rate sometimes exists but can be sparse.
        friction_metrics=("median_tx_fee_native", "failed_tx_rate"),
        # Prefer capacity util if present; otherwise fall back to avg block time
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


def _aggregate_axis(signals: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Determine worst-case band on the axis (HIGH > NORMAL > LOW), and dominant trend.
    if not signals:
        return {"band": "NORMAL", "trend": "FLAT", "signals": []}

    # Determine band severity score
    band_order = {"EXTREME_HIGH": 3, "HIGH": 2, "NORMAL": 1, "LOW": 0, "EXTREME_LOW": -1}
    def band_score(b: str) -> int:
        return band_order.get(b, 1)

    # Choose max severity by absolute distance from NORMAL (prefer EXTREME)
    best = None
    best_score = -999
    for s in signals:
        b = s["band"]
        sc = band_score(b)
        # prioritize extremes and highs for congestion/heat; lows for cheap
        # use absolute magnitude w/ sign
        mag = abs(sc - 1)
        # tie-break: deterministic by metric name
        score_key = (mag, sc, s["metric"])
        if best is None or score_key > best_score:
            pass

    # Compute axis band as max band_score among signals
    max_band = max(signals, key=lambda s: (band_score(s["band"]), s["metric"]))["band"]
    min_band = min(signals, key=lambda s: (band_score(s["band"]), s["metric"]))["band"]

    # Determine trend via average momentum of top-2 magnitude z
    top = sorted(signals, key=lambda s: (abs(float(s.get("z_robust", 0.0))), abs(float(s.get("momentum_7d_vs_30d", s.get("momentum", 0.0)))), s.get("metric","")), reverse=True)[:2]
    mom_avg = float(np.mean([float(t.get("momentum_7d_vs_30d", t.get("momentum", 0.0))) for t in top])) if top else 0.0
    return {
        "band_high": max_band,
        "band_low": min_band,
        "trend": _trend(mom_avg),
        "signals": signals,
    }


def _driver_score(s: Dict[str, Any], weight: float) -> float:
    # Deterministic scalar used for ranking drivers.
    z = float(s.get("z_robust", 0.0))
    pct = float(s.get("pct_90d", 50.0))
    mom = float(s.get("momentum_7d_vs_30d", 0.0))
    pct_dist = abs(pct - 50.0) / 50.0  # 0..1
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
    # Quantitative data-quality gate: if confidence is below threshold, we must not
    # present a definitive regime. Downstream UI/reporting can still show the
    # underlying drivers, but the headline regime becomes UNKNOWN/DEGRADED.
    try:
        cs = float(confidence_score) if confidence_score is not None else None
        if cs is not None and (not math.isfinite(cs)):
            cs = None
    except Exception:
        cs = None

    if cs is not None and cs < float(confidence_threshold):
        return {
            "chain": chain,
            "missing": False,
            "label": "UNKNOWN/DEGRADED",
            "asof_date": asof_date,
            "window_days": window_days,
            "ruleset_id": None,
            "drivers": [],
            "determinism_hash": None,
            "axes": {},
            "gate": {
                "type": "confidence_threshold",
                "threshold": float(confidence_threshold),
                "confidence_score": float(cs),
                "explanation": "Confidence is below the product threshold; regime is withheld to avoid overclaiming.",
            },
        }
    d = _ensure_date(gold_df)
    if d.empty:
        return {"chain": chain, "missing": True, "label": None, "asof_date": asof_date, "window_days": window_days, "ruleset_id": None, "drivers": []}

    ptype = str((profile or {}).get("type") or "eth_l1")
    spec = PROFILE_SPECS.get(ptype, PROFILE_SPECS["eth_l1"])

    demand = []
    for m in spec.demand_metrics:
        sig = _signal_for_metric(d, m)
        if sig:
            sig["band"] = _band(sig["pct_90d"], sig["z_robust"])
            sig["trend"] = _trend(sig["momentum_7d_vs_30d"])
            demand.append(sig)

    friction = []
    for m in spec.friction_metrics:
        sig = _signal_for_metric(d, m)
        if sig:
            sig["band"] = _band(sig["pct_90d"], sig["z_robust"])
            sig["trend"] = _trend(sig["momentum_7d_vs_30d"])
            friction.append(sig)

    capacity = []
    for m in spec.capacity_metrics:
        sig = _signal_for_metric(d, m)
        if sig:
            sig["band"] = _band(sig["pct_90d"], sig["z_robust"])
            sig["trend"] = _trend(sig["momentum_7d_vs_30d"])
            capacity.append(sig)

    # Axis summaries
    ax_d = _aggregate_axis(demand)
    ax_f = _aggregate_axis(friction)
    ax_c = _aggregate_axis(capacity)

    def is_high(b: str) -> bool:
        return b in ("HIGH", "EXTREME_HIGH")
    def is_extreme_high(b: str) -> bool:
        return b == "EXTREME_HIGH"
    def is_low(b: str) -> bool:
        return b in ("LOW", "EXTREME_LOW")

    # Decision table (explicit, ordered)
    label = "STABLE"

    # Congested: capacity pressure + friction are both high (or capacity extreme).
    if is_extreme_high(ax_c["band_high"]) or (is_high(ax_c["band_high"]) and is_high(ax_f["band_high"])):
        label = "CONGESTED"
    # Cheap: low friction + low capacity pressure (per your choice A)
    elif is_low(ax_f["band_low"]) and is_low(ax_c["band_low"]):
        label = "CHEAP"
    # Heating: demand high and trend heating in either demand or capacity or friction.
    elif is_high(ax_d["band_high"]) and (ax_d["trend"] == "HEATING" or ax_c["trend"] == "HEATING" or ax_f["trend"] == "HEATING"):
        label = "HEATING"
    else:
        label = "STABLE"

    # Drivers: rank candidate metrics with weights per axis, but only those supporting the chosen label.
    candidates: List[Tuple[float, Dict[str, Any]]] = []
    for s in demand:
        candidates.append((_driver_score(s, 1.0), {**s, "axis": "demand"}))
    for s in friction:
        candidates.append((_driver_score(s, 1.1), {**s, "axis": "friction"}))
    for s in capacity:
        candidates.append((_driver_score(s, 1.2), {**s, "axis": "capacity"}))

    # Filter candidates to those that "agree" with regime (deterministic, conservative)
    def agrees(s: Dict[str, Any]) -> bool:
        b = s.get("band", "NORMAL")
        tr = s.get("trend", "FLAT")
        if label == "CONGESTED":
            return is_high(b) or tr == "HEATING"
        if label == "CHEAP":
            return is_low(b) or tr == "COOLING"
        if label == "HEATING":
            return is_high(b) or tr == "HEATING"
        return True

    filtered = [c for c in candidates if agrees(c[1])]
    filtered.sort(key=lambda t: (-t[0], str(t[1].get("metric"))))

    drivers = []
    for _, s in filtered[:3]:
        drivers.append({
            "metric": s["metric"],
            "axis": s["axis"],
            "current": s["current"],
            "z_robust": s["z_robust"],
            "pct_90d": s["pct_90d"],
            "trend": s["trend"],
            "momentum_7d_vs_30d": s["momentum_7d_vs_30d"],
        })

    # Determinism hash (stable across rebuilds if data unchanged)
    # We avoid python's hash randomization by hashing a canonical JSON string.
    det_payload = {
        "chain": chain,
        "ruleset_id": spec.ruleset_id,
        "label": label,
        "asof_date": asof_date,
        "drivers": drivers,
    }
    canon = json_dumps_canonical(det_payload)
    det_hash = stable_sha256_12(canon)

    return {
        "chain": chain,
        "missing": False,
        "label": label,
        "asof_date": asof_date,
        "window_days": window_days,
        "ruleset_id": spec.ruleset_id,
        "drivers": drivers,
        "determinism_hash": det_hash,
        "axes": {
            "demand": {"band_high": ax_d["band_high"], "band_low": ax_d["band_low"], "trend": ax_d["trend"]},
            "friction": {"band_high": ax_f["band_high"], "band_low": ax_f["band_low"], "trend": ax_f["trend"]},
            "capacity": {"band_high": ax_c["band_high"], "band_low": ax_c["band_low"], "trend": ax_c["trend"]},
        },
    }


def json_dumps_canonical(obj: Any) -> str:
    import json
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def stable_sha256_12(s: str) -> str:
    import hashlib
    h = hashlib.sha256(s.encode("utf-8")).hexdigest()
    return h[:12]
