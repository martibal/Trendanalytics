
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd


# -----------------------------
# Public API (engine)
# -----------------------------
@dataclass(frozen=True)
class AnalogConfig:
    """
    Configuration for analog search + conditional forward distributions.

    Design goals:
      - No "advice": output is historical conditional frequencies/distributions.
      - Robust: uses median/MAD-based z-scores and soft similarity with bucket fallback.
      - Transparent: all thresholds and transforms are explicit and can be documented in the wiki.
    """
    baseline_window_days: int = 45
    lookback_days_max: int = 1200              # how far back we consider analog candidates
    exclude_last_days: int = 14                # prevent leakage from very recent history
    bucket_bins_z: Tuple[float, float] = (-1.0, 1.0)     # z buckets: <=low, mid, >=high
    bucket_bins_trend: float = 0.15            # trend bucket in z/day (robust slope threshold)
    bucket_bins_conf: Tuple[float, float] = (0.35, 0.70) # confidence buckets (low/mid/high)
    k_analogs: int = 50
    min_bucket_size: int = 30                  # if bucket too small, relax bucket filters
    tau_distance: float = 2.0                  # softness for distance weighting exp(-d^2/tau^2)
    regime_penalty: float = 0.75               # add-on to distance when regime differs
    recency_half_life_days: int = 180          # time decay half-life for weighting analogs
    delta_threshold_z: float = 0.5             # definition for "moves meaningfully" in z units


DEFAULT_METRICS = (
    "tx_count_daily",
    "median_tx_fee_native",
    "gas_utilization_pct",
    "avg_block_time_sec",
)


def compute_analogs_and_forward_stats(
    gold_df: pd.DataFrame,
    as_of: Optional[str] = None,
    horizons: Sequence[int] = (1, 3, 7, 14),
    metrics: Sequence[str] = DEFAULT_METRICS,
    cfg: AnalogConfig = AnalogConfig(),
) -> Dict[str, Any]:
    """
    Main entry point.

    Parameters
    ----------
    gold_df:
      Daily gold dataframe for ONE chain, containing at minimum:
        - date column (datetime-like or YYYY-MM-DD strings)
        - some subset of metrics (DEFAULT_METRICS)
    as_of:
      Date (YYYY-MM-DD) for which we compute "current" state. If None -> latest date in gold_df.
    horizons:
      Forward horizons in days.
    metrics:
      Metrics to include (if present). Missing metrics are ignored.
    cfg:
      AnalogConfig.

    Returns
    -------
    Dict payload:
      - as_of (date)
      - used_metrics
      - state (features + buckets)
      - analogs (top K with distance, weights)
      - forward_stats per horizon, per metric (quantiles + probabilities)
      - diagnostics (coverage, sample sizes, fallback path taken)
    """
    df = _prep_gold(gold_df)
    if df.empty:
        return {"error": "empty_gold_df"}

    as_of_day = _resolve_as_of(df, as_of)
    horizons = sorted({int(h) for h in horizons if int(h) > 0})
    used_metrics = [m for m in metrics if m in df.columns]

    if not used_metrics:
        return {"error": "no_supported_metrics_in_gold_df", "available_columns": list(df.columns)}

    # Build z-score table + per-day features for all eligible days
    z_tbl, feat_tbl = _build_feature_tables(df, used_metrics, cfg)

    if as_of_day not in feat_tbl.index:
        return {
            "error": "as_of_not_eligible_for_features",
            "as_of": str(as_of_day),
            "note": "Not enough history before as_of to compute baseline/trend/confidence.",
        }

    current = feat_tbl.loc[as_of_day]
    current_state = _state_to_dict(current, used_metrics, cfg)

    # Candidate days (past, within lookback, excluding last N days for leakage)
    candidates = _candidate_index(feat_tbl.index, as_of_day, cfg)

    # Bucket filter with fallback relaxation
    cand1, bucket_note = _bucket_filter_with_fallback(feat_tbl.loc[candidates], current, cfg)

    # KNN refinement (soft distance)
    analogs_df = _select_knn(cand1, current, used_metrics, cfg)

    # Compute forward conditional outcomes
    forward = _compute_forward_stats(z_tbl, analogs_df, used_metrics, as_of_day, horizons, cfg)

    return {
        "as_of": str(as_of_day),
        "used_metrics": used_metrics,
        "state": current_state,
        "analogs": analogs_df.to_dict(orient="records"),
        "forward_stats": forward,
        "diagnostics": {
            "total_feature_days": int(len(feat_tbl)),
            "candidate_days": int(len(candidates)),
            "bucket_candidate_days": int(len(cand1)),
            "bucket_note": bucket_note,
            "k_requested": int(cfg.k_analogs),
            "k_returned": int(len(analogs_df)),
            "exclude_last_days": int(cfg.exclude_last_days),
            "lookback_days_max": int(cfg.lookback_days_max),
        },
        "disclaimer": (
            "This output is descriptive historical context (conditional frequencies/distributions) based on on-chain metrics. "
            "It is not financial advice and carries no guarantee of future outcomes."
        ),
        "method": _method_summary(cfg),
    }


# -----------------------------
# Internals
# -----------------------------
def _prep_gold(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    if "date" not in out.columns:
        raise ValueError("gold_df must contain a 'date' column")
    out["date"] = pd.to_datetime(out["date"], errors="coerce")
    out = out.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
    out["day"] = out["date"].dt.date
    out = out.set_index("day", drop=True)
    return out


def _resolve_as_of(df: pd.DataFrame, as_of: Optional[str]) -> date:
    if as_of:
        d = pd.to_datetime(as_of, errors="raise").date()
        return d
    return df.index.max()


def _build_feature_tables(
    df: pd.DataFrame,
    metrics: Sequence[str],
    cfg: AnalogConfig,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Returns:
      z_tbl: index=day, columns=z_<metric>
      feat_tbl: index=day, columns include z0_* , zabs7_* , trend7_* , confidence, regime
    """
    # Rolling robust z-scores for each metric
    z_cols = {}
    for m in metrics:
        z_cols[m] = _rolling_robust_z(df[m].astype(float), cfg.baseline_window_days)

    z_tbl = pd.DataFrame({f"z_{m}": z_cols[m] for m in metrics}, index=df.index)

    # Features for matching
    feat = pd.DataFrame(index=df.index)

    # Day-0 z for each metric
    for m in metrics:
        feat[f"z0_{m}"] = z_tbl[f"z_{m}"]

    # 7d mean abs z for each metric (varighet)
    for m in metrics:
        feat[f"zabs7_{m}"] = z_tbl[f"z_{m}"].abs().rolling(7, min_periods=5).mean()

    # 7d robust trend: median daily delta of z (a simple, robust slope proxy)
    for m in metrics:
        dz = z_tbl[f"z_{m}"].diff()
        feat[f"trend7_{m}"] = dz.rolling(7, min_periods=5).median()

    # Confidence (chain-level) – derived from existing logic: strength + consistency then tanh map.
    strength = feat[[f"z0_{m}" for m in metrics]].abs().mean(axis=1)
    consistency = feat[[f"zabs7_{m}" for m in metrics]].mean(axis=1)
    raw = 0.65 * strength + 0.35 * consistency
    feat["confidence_0_1"] = np.tanh(raw / 2.2)

    # A simple discrete regime label (for penalty/bucketing)
    # Use activity + fee as primary drivers if present; otherwise average abs z.
    primary = []
    if f"z0_tx_count_daily" in feat.columns:
        primary.append(f"z0_tx_count_daily")
    if f"z0_median_tx_fee_native" in feat.columns:
        primary.append(f"z0_median_tx_fee_native")
    if primary:
        p = feat[primary].mean(axis=1)
    else:
        p = strength

    feat["regime"] = np.where(p >= 0.8, "EXPANSION", np.where(p <= -0.8, "CONTRACTION", "STABLE"))

    # Eligibility: must have baseline window for z + 7d windows for trend/abs and enough non-nan.
    needed_cols = [c for c in feat.columns if c.startswith(("z0_", "zabs7_", "trend7_"))]
    feat = feat.dropna(subset=needed_cols, how="any")

    # Keep only recent lookback window (but include as_of). We'll filter candidates later.
    return z_tbl, feat


def _rolling_robust_z(s: pd.Series, window: int) -> pd.Series:
    """
    Robust z using rolling median/MAD with scaling 1.4826.

    z_t = (x_t - median(window)) / (1.4826 * MAD(window))
    """
    x = s.copy()

    def mad(a: np.ndarray) -> float:
        med = np.nanmedian(a)
        return float(np.nanmedian(np.abs(a - med)))

    med = x.rolling(window, min_periods=max(10, window // 3)).median()
    mad_raw = x.rolling(window, min_periods=max(10, window // 3)).apply(lambda a: mad(a), raw=True)
    scale = 1.4826 * mad_raw

    # Avoid division by zero: if MAD is 0, z becomes NaN for that point (engine will exclude via dropna)
    z = (x - med) / scale.replace({0.0: np.nan})
    return z


def _candidate_index(idx: pd.Index, as_of_day: date, cfg: AnalogConfig) -> List[date]:
    as_of_ts = pd.Timestamp(as_of_day)
    min_day = (as_of_ts - pd.Timedelta(days=cfg.lookback_days_max)).date()
    max_day = (as_of_ts - pd.Timedelta(days=cfg.exclude_last_days)).date()
    cand = [d for d in idx if min_day <= d <= max_day]
    return cand


def _bucketize_z(z: float, bins: Tuple[float, float]) -> str:
    lo, hi = bins
    if z <= lo:
        return "LOW"
    if z >= hi:
        return "HIGH"
    return "MID"


def _bucketize_trend(tr: float, thr: float) -> str:
    if tr <= -thr:
        return "DOWN"
    if tr >= thr:
        return "UP"
    return "FLAT"


def _bucketize_conf(c: float, bins: Tuple[float, float]) -> str:
    lo, hi = bins
    if c <= lo:
        return "LOW"
    if c >= hi:
        return "HIGH"
    return "MID"


def _bucket_filter_with_fallback(
    cand_feat: pd.DataFrame,
    cur: pd.Series,
    cfg: AnalogConfig,
) -> Tuple[pd.DataFrame, str]:
    """
    Apply a progressively relaxed bucket filter to ensure enough analog candidates.
    """
    # Primary bucket dimensions: fee_z0 (if present), activity_z0 (if present), confidence, and regime.
    dims = []

    if "z0_median_tx_fee_native" in cand_feat.columns:
        dims.append(("fee", lambda s: _bucketize_z(float(s["z0_median_tx_fee_native"]), cfg.bucket_bins_z)))
    if "z0_tx_count_daily" in cand_feat.columns:
        dims.append(("tx", lambda s: _bucketize_z(float(s["z0_tx_count_daily"]), cfg.bucket_bins_z)))

    dims.append(("conf", lambda s: _bucketize_conf(float(s["confidence_0_1"]), cfg.bucket_bins_conf)))

    # Trend bucket on fee if available, else on the mean trend
    if "trend7_median_tx_fee_native" in cand_feat.columns:
        dims.append(("trend_fee", lambda s: _bucketize_trend(float(s["trend7_median_tx_fee_native"]), cfg.bucket_bins_trend)))

    cur_keys = {name: fn(cur) for name, fn in dims}

    def apply_keys(df: pd.DataFrame, keys: Dict[str, str]) -> pd.DataFrame:
        keep = df
        for name, fn in dims:
            key = keys[name]
            series = df.apply(lambda r: fn(r), axis=1)
            keep = keep[series == key]
        return keep

    # Level 0: strict buckets
    out0 = apply_keys(cand_feat, cur_keys)
    if len(out0) >= cfg.min_bucket_size:
        return out0, f"bucket=strict ({cur_keys})"

    # Level 1: drop trend bucket
    keys1 = dict(cur_keys)
    if "trend_fee" in keys1:
        keys1.pop("trend_fee", None)
        dims1 = [(n, f) for (n, f) in dims if n != "trend_fee"]
    else:
        dims1 = dims

    def apply_keys_dims(df: pd.DataFrame, keys: Dict[str, str], dims_use):
        keep = df
        for name, fn in dims_use:
            series = df.apply(lambda r: fn(r), axis=1)
            keep = keep[series == keys[name]]
        return keep

    out1 = apply_keys_dims(cand_feat, keys1, dims1)
    if len(out1) >= cfg.min_bucket_size:
        return out1, f"bucket=relaxed_drop_trend ({keys1})"

    # Level 2: keep only confidence bucket
    conf_key = _bucketize_conf(float(cur["confidence_0_1"]), cfg.bucket_bins_conf)
    out2 = cand_feat[cand_feat["confidence_0_1"].apply(lambda v: _bucketize_conf(float(v), cfg.bucket_bins_conf)) == conf_key]
    if len(out2) >= cfg.min_bucket_size:
        return out2, f"bucket=relaxed_conf_only (conf={conf_key})"

    # Level 3: no buckets (return all candidates)
    return cand_feat, "bucket=fallback_all_candidates"


def _select_knn(
    cand_feat: pd.DataFrame,
    cur: pd.Series,
    metrics: Sequence[str],
    cfg: AnalogConfig,
) -> pd.DataFrame:
    """
    Select top-K analogs by soft distance, return a table with:
      day, distance, weight, regime, confidence, and key feature diffs
    """
    # Build numeric feature vectors for distance (keep dimensionality modest)
    num_cols = []
    for m in metrics:
        for prefix in ("z0_", "zabs7_", "trend7_"):
            c = f"{prefix}{m}"
            if c in cand_feat.columns:
                num_cols.append(c)

    if not num_cols:
        raise ValueError("No numeric features available for analog distance.")

    X = cand_feat[num_cols].to_numpy(dtype=float)
    y = cur[num_cols].to_numpy(dtype=float)

    # Robust Euclidean distance on z-scale
    diff = X - y
    d = np.sqrt(np.nanmean(diff * diff, axis=1))

    # Regime penalty (optional)
    cur_reg = str(cur.get("regime", ""))
    reg = cand_feat.get("regime", pd.Series(index=cand_feat.index, data=""))
    reg_pen = np.where(reg.astype(str).to_numpy() == cur_reg, 0.0, float(cfg.regime_penalty))
    d = d + reg_pen

    # Pick top K
    order = np.argsort(d)
    k = min(cfg.k_analogs, len(order))
    keep_idx = order[:k]

    days = cand_feat.index.to_numpy()[keep_idx]
    dist = d[keep_idx]

    # Soft weights: distance + recency decay
    w_dist = np.exp(-(dist * dist) / (cfg.tau_distance * cfg.tau_distance))

    # Recency: newer analogs weigh more (but still descriptive)
    as_of_day = cur.name  # index label is day
    age_days = np.array([(pd.Timestamp(as_of_day) - pd.Timestamp(dd)).days for dd in days], dtype=float)
    half = float(cfg.recency_half_life_days)
    # convert half-life to exp decay: exp(-ln2 * age/half)
    w_time = np.exp(-math.log(2.0) * age_days / max(1.0, half))

    w = w_dist * w_time
    w_sum = float(np.sum(w)) if np.sum(w) > 0 else 1.0
    w = w / w_sum

    out = cand_feat.loc[days].copy()
    out.insert(0, "day", out.index.astype(str))
    out["distance"] = dist
    out["weight"] = w

    # Provide a compact "why similar" explanation: top 6 smallest absolute diffs in z0 features
    z0_cols = [c for c in num_cols if c.startswith("z0_")]
    if z0_cols:
        diffs = np.abs(out[z0_cols].to_numpy(dtype=float) - y[[num_cols.index(c) for c in z0_cols]])
        # For each row choose top-3 closest dimensions
        closest = []
        for row in diffs:
            idxs = np.argsort(row)[:3]
            closest.append([z0_cols[i] for i in idxs])
        out["closest_features"] = closest
    else:
        out["closest_features"] = [[] for _ in range(len(out))]

    # Reduce payload size: keep only relevant columns
    keep_cols = ["day", "distance", "weight", "regime", "confidence_0_1", "closest_features"] + num_cols
    keep_cols = [c for c in keep_cols if c in out.columns]
    out = out[keep_cols].sort_values("distance", ascending=True).reset_index(drop=True)
    return out


def _compute_forward_stats(
    z_tbl: pd.DataFrame,
    analogs_df: pd.DataFrame,
    metrics: Sequence[str],
    as_of_day: date,
    horizons: Sequence[int],
    cfg: AnalogConfig,
) -> Dict[str, Any]:
    """
    For each horizon H and metric M:
      - distribution of delta z: z(t+H)-z(t)
      - quantiles (P10/P50/P90) and weighted probabilities of move up/down beyond threshold.
    """
    out: Dict[str, Any] = {"horizons": list(horizons), "metrics": list(metrics), "by_horizon": {}}

    # Build mapping from analog day -> weight
    w_map = {r["day"]: float(r["weight"]) for r in analogs_df.to_dict(orient="records")}
    analog_days = [pd.to_datetime(d).date() for d in w_map.keys()]
    weights = np.array([w_map[str(d)] if str(d) in w_map else w_map.get(d.isoformat(), 0.0) for d in analog_days], dtype=float)
    if weights.sum() <= 0:
        weights = np.ones(len(analog_days), dtype=float) / max(1, len(analog_days))
    else:
        weights = weights / weights.sum()

    for H in horizons:
        horizon_block: Dict[str, Any] = {"horizon_days": int(H), "metrics": {}}

        for m in metrics:
            z_col = f"z_{m}"
            if z_col not in z_tbl.columns:
                continue

            # Collect deltas for analogs where t+H exists
            deltas = []
            w = []
            for d, ww in zip(analog_days, weights):
                d2 = (pd.Timestamp(d) + pd.Timedelta(days=H)).date()
                if d in z_tbl.index and d2 in z_tbl.index:
                    z0 = z_tbl.loc[d, z_col]
                    z1 = z_tbl.loc[d2, z_col]
                    if pd.notna(z0) and pd.notna(z1):
                        deltas.append(float(z1 - z0))
                        w.append(float(ww))

            if not deltas:
                horizon_block["metrics"][m] = {
                    "n": 0,
                    "note": "No analogs had data for this horizon (t+H missing).",
                }
                continue

            deltas_arr = np.array(deltas, dtype=float)
            w_arr = np.array(w, dtype=float)
            w_arr = w_arr / w_arr.sum()

            q10, q50, q90 = _weighted_quantiles(deltas_arr, w_arr, [0.10, 0.50, 0.90])

            thr = float(cfg.delta_threshold_z)
            p_up = float(np.sum(w_arr[deltas_arr >= +thr]))
            p_down = float(np.sum(w_arr[deltas_arr <= -thr]))
            p_flat = float(1.0 - p_up - p_down)

            horizon_block["metrics"][m] = {
                "n": int(len(deltas_arr)),
                "delta_threshold_z": thr,
                "quantiles": {"p10": q10, "p50": q50, "p90": q90},
                "probability": {"up": p_up, "down": p_down, "flat": p_flat},
            }

        out["by_horizon"][str(H)] = horizon_block

    return out


def _weighted_quantiles(values: np.ndarray, weights: np.ndarray, qs: Sequence[float]) -> List[float]:
    """
    Weighted quantiles with values/weights arrays.
    """
    order = np.argsort(values)
    v = values[order]
    w = weights[order]
    cdf = np.cumsum(w)
    res = []
    for q in qs:
        q = float(q)
        idx = np.searchsorted(cdf, q, side="left")
        idx = min(max(idx, 0), len(v) - 1)
        res.append(float(v[idx]))
    return res


def _state_to_dict(cur: pd.Series, metrics: Sequence[str], cfg: AnalogConfig) -> Dict[str, Any]:
    st: Dict[str, Any] = {
        "confidence_0_1": float(cur["confidence_0_1"]),
        "regime": str(cur.get("regime", "")),
        "buckets": {
            "confidence": _bucketize_conf(float(cur["confidence_0_1"]), cfg.bucket_bins_conf),
        },
    }
    if "z0_median_tx_fee_native" in cur.index:
        st["buckets"]["fee_z0"] = _bucketize_z(float(cur["z0_median_tx_fee_native"]), cfg.bucket_bins_z)
    if "z0_tx_count_daily" in cur.index:
        st["buckets"]["tx_z0"] = _bucketize_z(float(cur["z0_tx_count_daily"]), cfg.bucket_bins_z)
    if "trend7_median_tx_fee_native" in cur.index:
        st["buckets"]["trend_fee"] = _bucketize_trend(float(cur["trend7_median_tx_fee_native"]), cfg.bucket_bins_trend)

    for m in metrics:
        for p in ("z0_", "zabs7_", "trend7_"):
            k = f"{p}{m}"
            if k in cur.index and pd.notna(cur[k]):
                st[k] = float(cur[k])
    return st


def _method_summary(cfg: AnalogConfig) -> Dict[str, Any]:
    return {
        "baseline": {
            "window_days_T": cfg.baseline_window_days,
            "location": "rolling median",
            "scale": "rolling MAD scaled by 1.4826",
            "z_formula": "z = (x - median) / (1.4826 * MAD)",
        },
        "state_vector": "z0_* + zabs7_* + trend7_* + confidence_0_1 (+ regime label)",
        "buckets": {
            "z_bins": list(cfg.bucket_bins_z),
            "trend_abs_threshold": cfg.bucket_bins_trend,
            "confidence_bins": list(cfg.bucket_bins_conf),
            "fallback": [
                "strict buckets",
                "drop trend bucket",
                "confidence only",
                "all candidates",
            ],
        },
        "similarity": {
            "distance": "robust euclidean on z-scale + optional regime penalty",
            "distance_soft_weight": f"exp(-d^2/{cfg.tau_distance}^2)",
            "recency_weight": f"exp(-ln2 * age_days / {cfg.recency_half_life_days})",
            "k": cfg.k_analogs,
        },
        "forward_outcomes": {
            "horizons_days": "configurable",
            "delta_metric": "delta z = z(t+H)-z(t)",
            "probability_threshold": cfg.delta_threshold_z,
            "summary": "weighted quantiles and probabilities (up/down/flat)",
        },
        "transparency_note": (
            "Engine returns sample sizes (N) and quantiles; interpretation should always account for N and era effects."
        ),
    }
