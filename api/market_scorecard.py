# api/market_scorecard.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import math
import numpy as np
import pandas as pd


# NOTE:
# This module computes "market utility" signals (Demand / Friction / Capacity) using ONLY
# the available gold fields (no price data).
#
# Scores are produced on a 0–100 scale. 50 is "neutral vs history".
# We also apply confidence degradation: low confidence pulls scores toward 50.


def _to_dt(s: pd.Series) -> pd.Series:
    return pd.to_datetime(s, errors="coerce", utc=True).dt.tz_convert(None)


def _mad(x: np.ndarray) -> float:
    x = x[np.isfinite(x)]
    if x.size == 0:
        return float("nan")
    med = float(np.median(x))
    return float(np.median(np.abs(x - med)))


def _robust_z(current: float, baseline: np.ndarray) -> Optional[float]:
    baseline = baseline[np.isfinite(baseline)]
    if baseline.size < 30 or not math.isfinite(current):
        return None
    med = float(np.median(baseline))
    mad = _mad(baseline)
    if not math.isfinite(mad) or mad == 0.0:
        # Fallback: if MAD is 0, std can still carry signal (e.g., very flat series with occasional change)
        sd = float(np.std(baseline))
        if sd == 0.0 or not math.isfinite(sd):
            return 0.0
        return (float(current) - med) / sd
    return (float(current) - med) / (1.4826 * mad)


def _z_to_score(z: Optional[float], *, amplitude: float = 40.0, scale: float = 1.5) -> Optional[float]:
    if z is None or not math.isfinite(z):
        return None
    # Smooth bounded mapping: z=0 -> 50; large |z| saturates toward 0/100.
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
    # Capacity is interpreted as "capacity pressure".
    if score is None:
        return "Unknown"
    if score >= 67:
        return "Tight"
    if score <= 33:
        return "Slack"
    return "Balanced"


def _rolling_mean(series: pd.Series, window_days: int) -> pd.Series:
    return series.rolling(window_days, min_periods=max(4, window_days // 2)).mean()


def _prepare_series(
    df: pd.DataFrame,
    col: str,
    *,
    transform: str = "none",
) -> pd.Series:
    if col not in df.columns:
        return pd.Series(dtype="float64")
    s = pd.to_numeric(df[col], errors="coerce")
    if transform == "log1p":
        s = s.where(s >= 0)
        s = np.log1p(s)
    return s


def _weekly_z_and_score(
    df: pd.DataFrame,
    col: str,
    *,
    window_days: int = 7,
    transform: str = "none",
    baseline_lookback_days: int = 365,
    baseline_exclude_tail_days: int = 14,
) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    # Returns: (current_value (original units), z, score_raw)
    if df.empty or "date" not in df.columns:
        return None, None, None

    d = df[["date", col]].copy() if col in df.columns else df[["date"]].copy()
    d["date"] = _to_dt(d["date"])
    d = d.dropna(subset=["date"]).sort_values("date")
    if col not in d.columns:
        return None, None, None

    raw = pd.to_numeric(d[col], errors="coerce")
    if raw.dropna().empty:
        return None, None, None

    s = _prepare_series(d, col, transform=transform)
    ra = _rolling_mean(s, window_days)

    # Current "weekly" value (rolling mean on latest date)
    current_t = float(ra.iloc[-1]) if pd.notna(ra.iloc[-1]) else None
    current_raw = float(raw.iloc[-1]) if pd.notna(raw.iloc[-1]) else None
    if current_t is None:
        return current_raw, None, None

    # Baseline: rolling values over lookback, excluding the most recent tail to avoid overlap.
    end = d["date"].iloc[-1]
    start = end - pd.Timedelta(days=baseline_lookback_days)
    ra_base = ra[(d["date"] >= start)]
    # exclude tail
    if baseline_exclude_tail_days > 0:
        tail_cut = end - pd.Timedelta(days=baseline_exclude_tail_days)
        ra_base = ra_base[(d["date"] <= tail_cut)]

    baseline = ra_base.to_numpy(dtype="float64", copy=False)
    z = _robust_z(float(current_t), baseline)
    score = _z_to_score(z)
    return current_raw, z, score


def _weekly_instability_z_and_score(
    df: pd.DataFrame,
    col: str,
    *,
    window_days: int = 7,
    baseline_lookback_days: int = 365,
    baseline_exclude_tail_days: int = 14,
    instability_rolling_median_days: int = 30,
) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    # Blocktime stability proxy: weekly mean of |bt - rolling_median_30| / rolling_median_30
    if df.empty or "date" not in df.columns or col not in df.columns:
        return None, None, None
    d = df[["date", col]].copy()
    d["date"] = _to_dt(d["date"])
    d = d.dropna(subset=["date"]).sort_values("date")
    bt = pd.to_numeric(d[col], errors="coerce")
    if bt.dropna().empty:
        return None, None, None

    med30 = bt.rolling(instability_rolling_median_days, min_periods=max(10, instability_rolling_median_days // 2)).median()
    denom = med30.replace({0.0: np.nan})
    inst = (bt - med30).abs() / denom
    ra = _rolling_mean(inst, window_days)

    current = float(ra.iloc[-1]) if pd.notna(ra.iloc[-1]) else None
    if current is None:
        return float(bt.iloc[-1]) if pd.notna(bt.iloc[-1]) else None, None, None

    end = d["date"].iloc[-1]
    start = end - pd.Timedelta(days=baseline_lookback_days)
    ra_base = ra[(d["date"] >= start)]
    if baseline_exclude_tail_days > 0:
        tail_cut = end - pd.Timedelta(days=baseline_exclude_tail_days)
        ra_base = ra_base[(d["date"] <= tail_cut)]
    baseline = ra_base.to_numpy(dtype="float64", copy=False)

    z = _robust_z(float(current), baseline)
    score = _z_to_score(z)
    # Report current raw blocktime (seconds) as a user-facing anchor.
    current_raw = float(bt.iloc[-1]) if pd.notna(bt.iloc[-1]) else None
    return current_raw, z, score


def _combine(scores: List[Optional[float]], weights: List[float]) -> Tuple[Optional[float], float, int]:
    use = [(s, w) for s, w in zip(scores, weights) if s is not None and math.isfinite(float(s)) and w > 0]
    if not use:
        return None, 0.0, 0
    wsum = float(sum(w for _, w in use))
    val = float(sum(float(s) * w for s, w in use) / wsum) if wsum > 0 else None
    return val, wsum, len(use)


def compute_market_scorecard(
    df: pd.DataFrame,
    *,
    chain: str,
    confidence_score: Optional[float],
    window_days: int = 7,
) -> Dict[str, Any]:
    """Compute Demand/Friction/Capacity (pressure) scorecard for one chain.

    Returns a dict suitable for API serialization.
    """
    if df is None or df.empty:
        return {
            "chain": chain,
            "missing": True,
            "asof_date": None,
            "window_days": window_days,
            "confidence_score": confidence_score,
        }

    # As-of date
    d = df.copy()
    if "date" not in d.columns and "day" in d.columns:
        d = d.rename(columns={"day": "date"})
    if "date" in d.columns:
        d["date"] = _to_dt(d["date"])
        d = d.dropna(subset=["date"]).sort_values("date")
    asof = d["date"].iloc[-1].date().isoformat() if ("date" in d.columns and not d.empty) else None

    # Derived series
    # Demand
    tx_raw, tx_z, tx_score = _weekly_z_and_score(d, "tx_count_daily", window_days=window_days, transform="log1p")
    addr_raw, addr_z, addr_score = _weekly_z_and_score(d, "unique_active_addresses", window_days=window_days, transform="log1p")

    tx_per_user = None
    if "tx_count_daily" in d.columns and "unique_active_addresses" in d.columns:
        tx = pd.to_numeric(d["tx_count_daily"], errors="coerce")
        aa = pd.to_numeric(d["unique_active_addresses"], errors="coerce").replace({0.0: np.nan})
        tpu = tx / aa
        d = d.copy()
        d["tx_per_user"] = tpu
        tpu_raw, tpu_z, tpu_score = _weekly_z_and_score(d, "tx_per_user", window_days=window_days, transform="log1p")
        tx_per_user = {"current": tpu_raw, "z": tpu_z, "score_raw": tpu_score}
    else:
        tx_per_user = {"current": None, "z": None, "score_raw": None}

    # Friction
    # Fee burden proxy: median fee / median value (native units). This is a value-normalized friction measure.
    if "median_tx_fee_native" in d.columns and "median_tx_value_native" in d.columns:
        fee = pd.to_numeric(d["median_tx_fee_native"], errors="coerce")
        val = pd.to_numeric(d["median_tx_value_native"], errors="coerce").replace({0.0: np.nan})
        fb = fee / val
        d = d.copy()
        d["fee_burden_proxy"] = fb
        fb_raw, fb_z, fb_score = _weekly_z_and_score(d, "fee_burden_proxy", window_days=window_days, transform="log1p")
    else:
        fb_raw, fb_z, fb_score = None, None, None

    fail_raw, fail_z, fail_score = _weekly_z_and_score(d, "failed_tx_rate", window_days=window_days, transform="none")

    # Capacity (pressure)
    util_raw, util_z, util_score = _weekly_z_and_score(d, "gas_utilization_pct", window_days=window_days, transform="none")
    bt_raw, bt_z, bt_score = _weekly_instability_z_and_score(d, "avg_block_time_sec", window_days=window_days)

    # Combine into dimensions
    demand_scores = [tx_score, addr_score, tx_per_user["score_raw"]]
    demand_w = [1.0, 1.0, 0.8]
    demand_raw, demand_wsum, demand_used = _combine(demand_scores, demand_w)

    friction_scores = [fb_score, fail_score]
    friction_w = [1.0, 0.7]
    friction_raw, friction_wsum, friction_used = _combine(friction_scores, friction_w)

    capacity_scores = [util_score, bt_score]
    capacity_w = [1.0, 0.8]
    capacity_raw, capacity_wsum, capacity_used = _combine(capacity_scores, capacity_w)

    # Coverage factors (availability of core inputs)
    # Expected component counts per dimension:
    expected = {"demand": 3, "friction": 2, "capacity": 2}
    cov_d = demand_used / expected["demand"] if expected["demand"] else 0.0
    cov_f = friction_used / expected["friction"] if expected["friction"] else 0.0
    cov_c = capacity_used / expected["capacity"] if expected["capacity"] else 0.0

    base_conf = _clamp01(confidence_score)
    eff_d = base_conf * cov_d
    eff_f = base_conf * cov_f
    eff_c = base_conf * cov_c

    def degrade(score: Optional[float], eff: float) -> Optional[float]:
        if score is None:
            return None
        return float(50.0 + (float(score) - 50.0) * eff)

    demand = {
        "score_raw": demand_raw,
        "score": degrade(demand_raw, eff_d) if demand_raw is not None else 50.0,
        "level": _level(degrade(demand_raw, eff_d) if demand_raw is not None else 50.0),
        "effective_confidence": eff_d,
        "coverage_factor": cov_d,
        "components": {
            "tx_count": {"current": tx_raw, "z": tx_z, "score_raw": tx_score},
            "active_addresses": {"current": addr_raw, "z": addr_z, "score_raw": addr_score},
            "tx_per_user": tx_per_user,
        },
    }

    friction = {
        "score_raw": friction_raw,
        "score": degrade(friction_raw, eff_f) if friction_raw is not None else 50.0,
        "level": _level(degrade(friction_raw, eff_f) if friction_raw is not None else 50.0),
        "effective_confidence": eff_f,
        "coverage_factor": cov_f,
        "components": {
            "fee_burden_proxy": {"current": fb_raw, "z": fb_z, "score_raw": fb_score},
            "failed_tx_rate": {"current": fail_raw, "z": fail_z, "score_raw": fail_score},
        },
    }

    capacity = {
        "score_raw": capacity_raw,
        "score": degrade(capacity_raw, eff_c) if capacity_raw is not None else 50.0,
        "level": _capacity_level(degrade(capacity_raw, eff_c) if capacity_raw is not None else 50.0),
        "effective_confidence": eff_c,
        "coverage_factor": cov_c,
        "components": {
            "utilization": {"current": util_raw, "z": util_z, "score_raw": util_score},
            "blocktime_instability": {"current": bt_raw, "z": bt_z, "score_raw": bt_score},
        },
    }

    return {
        "chain": chain,
        "missing": False,
        "asof_date": asof,
        "window_days": window_days,
        "confidence_score": base_conf,
        "dimensions": {
            "demand": demand,
            "friction": friction,
            "capacity": capacity,
        },
        "notes": {
            "interpretation": "Scores are 0–100. 50 is neutral vs the chain's own history. Higher Demand means hotter usage; higher Friction means higher cost/failure; higher Capacity means tighter capacity (pressure). Low confidence pulls scores toward 50."
        },
    }
