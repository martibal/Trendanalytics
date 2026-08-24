# Threshold calibration and sensitivity note

**Methodology version covered:** `1.1` / `confidence_v3_l2_capacity_required`  
**Purpose:** Record why the current thresholds exist, separate engineering priors from empirically calibrated quantities, and define the sensitivity audit used before methodology changes are accepted.

## Scope and interpretation

Urd Atlas is a descriptive classification system. The values below are current engineering thresholds used to convert chain-relative evidence into a daily regime label or to control the strength of historical analog matching. Unless a row is explicitly marked **empirically calibrated**, the value should be treated as a transparent engineering prior whose stability must be tested against nearby alternatives.

The threshold-sensitivity audit is intentionally different from an outcome backtest. A stable label distribution under ±20% perturbations shows that a result is not being created by one knife-edge cutoff. It does **not** establish predictive validity, economic value, or a calibrated probability of correctness.

Run:

```bash
python pipeline/tools/audit_threshold_sensitivity.py \
  --published-root data/published/v1 \
  --output-json reports/threshold-sensitivity.json \
  --output-csv reports/threshold-sensitivity.csv
```

The audit reclassifies the already-published regime evidence surface so it can test threshold stability without changing canonical history.

---

## 1. Regime band thresholds

The regime engine scores each informative signal using both an empirical 90-day percentile rank and a robust z-score built from recent history.

| Band | Percentile rule | Robust-z rule | Current rationale | Calibration status |
| --- | ---: | ---: | --- | --- |
| `EXTREME_HIGH` | `pct >= 90` | `z >= 2.5` | Captures either an observation in the top empirical decile or a very large robust-scale deviation. Under a normal approximation, `z=2.5` is around the 99.4th one-sided percentile, so the z-side is deliberately stricter than the empirical-rank side. | Engineering prior; sensitivity-tested, not outcome-calibrated |
| `HIGH` | `pct >= 80` | `z >= 1.5` | Provides a less extreme elevated band while preserving a clear separation from the neutral centre. A normal `z=1.5` is around the 93.3rd one-sided percentile. | Engineering prior; sensitivity-tested, not outcome-calibrated |
| `LOW` | `pct <= 20` | `z <= -1.5` | Symmetric low-side counterpart to `HIGH`. | Engineering prior; sensitivity-tested, not outcome-calibrated |
| `EXTREME_LOW` | `pct <= 10` | `z <= -2.5` | Symmetric low-side counterpart to `EXTREME_HIGH`. | Engineering prior; sensitivity-tested, not outcome-calibrated |

### Why percentile and robust z-score use OR

The two measures answer different questions.

- The percentile asks where the current value sits inside the observed recent distribution.
- The robust z-score asks how far the current value sits from the recent median relative to robust scale.

On-chain distributions are often skewed, heavy-tailed, discrete, or compressed for long periods. Requiring both tests to fire would systematically miss values that are clearly unusual in empirical rank but do not produce a large robust z-score, and it would also miss large scale deviations when the empirical rank is compressed by ties or an unusual distribution shape. The `OR` rule therefore treats either form of strong chain-relative evidence as sufficient to enter a band.

Disagreement is expected in skewed distributions and is not hidden. The published Meta evidence surface contains `pct_90d` and `z_robust` for each signal, and `audit_threshold_sensitivity.py` reports how often those two views imply different bands. If disagreement becomes operationally important, the next schema-compatible extension should add explicit `percentile_band`, `robust_z_band`, and `band_disagreement` fields rather than changing the label rule silently.

### Momentum threshold

`_trend()` uses `epsilon = 0.15` on `momentum_7d_vs_30d`.

The quantity is already expressed on the robust-z scale, so `0.15` is intended as a dead-zone around zero: small differences between the 7-day and 30-day context remain `FLAT`, while a material positive or negative difference becomes `HEATING` or `COOLING`. The value is an engineering prior. The sensitivity audit evaluates `0.12` and `0.18` independently.

---

## 2. Confidence / evidence-strength thresholds

### Final combined score

Current formula:

```text
sqrt(data_quality_score * label_confidence_score)
```

The geometric mean is deliberate because it penalizes a weak component more strongly than an arithmetic mean. A high label-specific score cannot fully compensate for poor data quality, and pristine data quality cannot fully compensate for ambiguous label evidence.

This score is an **evidence-strength / reliability score**, not a calibrated probability that a label is correct.

### Publication gate

Current gate: `0.40`.

Below the gate, the normal regime label is withheld as `UNKNOWN/DEGRADED`. The threshold is conservative by design: the product prefers a visible abstention to publishing a weakly supported regime. The value is currently an engineering prior rather than an empirically calibrated error-probability boundary.

The sensitivity audit evaluates `0.32` and `0.48` independently and reports the resulting change in the published label distribution.

### Data-quality weights

`compute_data_quality_details_v2()` currently uses:

| Component | Weight | Reason for inclusion |
| --- | ---: | --- |
| current-row coverage | 0.35 | The observation being classified must contain the evidence surface required by the chain profile. |
| recent metric coverage | 0.25 | A complete current row is less trustworthy when the recent context is sparse or repeatedly missing required metrics. |
| recent density | 0.15 | Penalizes gaps in the recent daily time series. |
| history depth | 0.15 | Rewards enough history to support the robust historical context used by the classifier. |
| freshness vs. chain policy | 0.10 | Penalizes data that is stale relative to the chain-specific publication-lag policy. |

The weights sum to one and intentionally put 60% of the mass on present/recent evidence coverage. They are engineering weights; they have not been fit to a labelled external truth set.

### Label-specific weights

Current label-confidence construction is deliberately different by regime:

| Label | Components and weights |
| --- | --- |
| `HEATING` | rule margin 0.35; driver strength 0.25; trend strength 0.20; axis coherence 0.10; persistence 0.10 |
| `CONGESTED` | rule margin 0.35; driver strength 0.25; axis coherence 0.20; severity margin 0.10; persistence 0.10 |
| `CHEAP` | rule margin 0.35; driver strength 0.25; low-capacity/no-pressure support 0.20; axis coherence 0.10; persistence 0.10 |
| `STABLE` | neutrality 0.45; no-strong-driver support 0.25; axis coherence 0.20; persistence 0.10 |

The driver-strength helper combines absolute robust-z evidence (0.55), empirical-percentile distance from 50 (0.30), and momentum magnitude (0.15). These values encode the design priority that scale deviation carries the most weight while rank and directional persistence add corroboration.

None of these weights should be described publicly as calibrated probabilities. Any future change to the weights requires a methodology-version change plus a before/after sensitivity report.

---

## 3. Analog-engine configuration

The analog engine is descriptive historical matching. Its thresholds affect which historical days receive weight; they do not turn the output into a forecast.

| Parameter | Current value | Rationale | Status |
| --- | ---: | --- | --- |
| `baseline_window_days` | 45 | Gives the rolling robust-z transform enough local history while remaining responsive to changing operating conditions. | Engineering prior |
| `lookback_days_max` | 1200 | Caps candidate history so the analog set remains operationally relevant and bounded in compute. | Engineering prior |
| `exclude_last_days` | 14 | Explicit look-ahead/leakage guard around the current observation. | Structural safeguard |
| `bucket_bins_z` | `(-1, 1)` | Coarse low/mid/high state buckets before KNN refinement. | Engineering prior |
| `bucket_bins_trend` | `0.15` | Mirrors the small dead-zone concept used elsewhere for directional context. | Engineering prior |
| `bucket_bins_conf` | `(0.35, 0.70)` | Separates weak, middle, and strong internal analog evidence without implying statistical confidence intervals. | Engineering prior |
| `k_analogs` | 50 | Balances sample breadth against similarity; small enough to avoid turning the result into an unconditional historical average. | Engineering prior |
| `min_bucket_size` | 30 | Requires a minimum sample before a strict bucket is trusted; otherwise filters relax progressively. | Engineering prior |
| `tau_distance` | 2.0 | Controls how quickly Euclidean-distance weight decays; values around two robust-z units retain non-zero influence without flattening the weighting. | Engineering prior |
| `regime_penalty` | 0.75 | Adds a meaningful but non-dominant penalty when the coarse analog regime differs. | Engineering prior |
| `recency_half_life_days` | 180 | Gives recent analogs more weight while keeping older matching days in the descriptive distribution. | Engineering prior |
| `delta_threshold_z` | 0.5 | Defines a practically visible forward movement on the robust-z scale for descriptive up/down/flat frequencies. | Engineering prior |
| strength / consistency mix | `0.65 / 0.35` | Gives current deviation more weight than 7-day persistence while still requiring consistency to raise the internal analog evidence score. | Engineering prior |
| tanh scale | `2.2` | Compresses unbounded raw strength into 0–1 without claiming probabilistic calibration. | Engineering prior |

### Required follow-up for analog distance

The current `_select_knn()` uses Euclidean distance after robust z-scaling. Because some blockchain metrics are correlated, Mahalanobis or another covariance-aware alternative must be A/B tested before claiming that Euclidean distance is optimal. Until that test exists, Euclidean distance is retained for its transparency, numerical stability, and predictable behaviour when sample size is limited.

---

## 4. Sensitivity acceptance rule

A threshold change is not accepted merely because it "looks better" on current data. Every proposed change must produce a report containing, per chain:

1. number of evaluated days;
2. baseline label distribution;
3. perturbed label distribution;
4. share of days whose label changes;
5. transition counts such as `STABLE -> HEATING`;
6. percentile-vs-robust-z disagreement rate;
7. a note explaining any material asymmetry across chains.

The default audit varies one threshold family at a time by ±20%. If a proposed methodology change falls outside that range, the report must include the actual proposed value as an additional scenario.

There is currently no universal numeric "pass" threshold for change rate. The report is evidence for review, not an automated optimiser. A change that materially alters one chain while leaving the others stable requires chain-specific explanation before release.

---

## 5. What this note does and does not establish

This document closes the transparency gap around why the current values exist and makes their engineering status explicit. The accompanying sensitivity audit measures local threshold robustness.

It does **not** claim that the regime labels have been calibrated against an external ground-truth label set, and it does not turn the confidence/evidence score into a probability. A later external validation programme should define independent historical episodes or another objective target before any claim such as "0.8 means 80% correct" can be made.
