// ─── Hero — centre column ──────────────────────────────────────────────────────

export const heroTagline =
  "The on-chain fee environment, classified.";

export const heroSubline =
  "Every day, the pipeline reads raw transaction data from BTC, ETH, ARB, and BASE — scores each metric against a 180-day chain-relative baseline — and publishes one regime label per chain. Not a chart. Not a price feed. A structured, auditable classification of whether the network is behaving normally or something has structurally shifted.";

export const heroBodyParagraphs = [] as const;

export const heroSalesPunch = [
  "The JSON output — not just the charts.",
  "Subscribers get Gold, Meta, and Derived JSON via API daily — ready to plug into notebooks, models, and dashboards. No pipeline to build or maintain.",
] as const;

export const heroFaqPrompt =
  "Need the exact thresholds, classification rules, and confidence definitions?";

// ─── Trust anchor ──────────────────────────────────────────────────────────────

export const trustAnchor = {
  since: "December 2024",
  sinceShort: "Dec 2024",
  daysLabel: "400+ days of published history",
  chainsLabel: "4 chains · published daily · no gaps",
  auditLabel: "Every label hash-anchored to its inputs",
  confidenceLabel: "Confidence gate: below 0.40 → UNKNOWN/DEGRADED, not a weak label",
} as const;

// ─── Regime definitions ────────────────────────────────────────────────────────

export const regimeDefinitions = [
  {
    label: "STABLE",
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
    dot: "bg-emerald-400",
    oneliner: "All dimensions within historical norms",
    definition:
      "Transaction volume, fees, and block utilization are all within this chain's normal 180-day range. No structural deviation detected across Demand, Friction, or Capacity.",
  },
  {
    label: "HEATING",
    color: "text-yellow-300",
    border: "border-yellow-500/20",
    bg: "bg-yellow-500/5",
    dot: "bg-yellow-300",
    oneliner: "Demand trending above historical baseline",
    definition:
      "Demand is elevated and at least one axis shows a HEATING trend — 7-day momentum is running materially ahead of the 30-day average. Sustained shift, not a single-day spike.",
  },
  {
    label: "CONGESTED",
    color: "text-red-400",
    border: "border-red-500/20",
    bg: "bg-red-500/5",
    dot: "bg-red-400",
    oneliner: "Sustained pressure across multiple dimensions",
    definition:
      "Capacity pressure is extreme, or both Capacity and Friction are simultaneously elevated. Block space is tight and fees are significantly above this chain's own historical range.",
  },
  {
    label: "CHEAP",
    color: "text-blue-400",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
    dot: "bg-blue-400",
    oneliner: "Fees and demand below historical baseline",
    definition:
      "Both Friction and Capacity are running low relative to the chain's 180-day history. The network is lightly loaded — fees materially below what is normal for this chain.",
  },
] as const;

// ─── How it works ─────────────────────────────────────────────────────────────

export const howItWorksSteps = [
  {
    step: "01",
    title: "Raw data ingested daily",
    body: "Transaction counts, fees, block times, gas utilization, and active addresses — assembled into Gold JSON in native units, unmodified and independently verifiable against any chain explorer.",
  },
  {
    step: "02",
    title: "Scored against 180-day chain history",
    body: "Every metric is z-scored against that chain's own rolling 180-day baseline. A persistence filter using 7-day vs 30-day momentum separates structural shifts from single-day noise.",
  },
  {
    step: "03",
    title: "Label published with confidence gate",
    body: "If confidence ≥ 0.40, the model publishes STABLE, HEATING, CONGESTED, or CHEAP — with a SHA-256 determinism hash tied to the exact inputs. Below threshold: UNKNOWN/DEGRADED. Never a weak label presented as strong.",
  },
] as const;

// ─── Proof chips ───────────────────────────────────────────────────────────────

export const landingProofChips = [
  { label: "Chains", value: "BTC · ETH · ARB · BASE" },
  { label: "Baseline window", value: "180-day rolling" },
  { label: "Published since", value: "Dec 2024" },
  { label: "Cadence", value: "Daily" },
] as const;

// ─── Left panel — differentiation ─────────────────────────────────────────────

export const heroPipelineEyebrow = "WHAT MAKES IT DIFFERENT";
export const heroPipelineTitle = "Raw numbers are available everywhere. Context isn't.";
export const heroPipelineBody =
  "Any block explorer shows today's fee. What it cannot tell you: whether that number is high or low relative to what this specific chain has been doing for the past six months — and whether the pressure is structural or just noise.";

export const heroPipelinePoints = [
  {
    title: "Chain-relative, not universal",
    body: "Every metric is scored against that chain's own 180-day rolling history. HEATING on Ethereum means Ethereum is running hotter than Ethereum usually does — not hotter than Bitcoin.",
  },
  {
    title: "Persistence filter built in",
    body: "7-day vs 30-day momentum separates structural shifts from spikes. Single-day anomalies don't move the label.",
  },
  {
    title: "Confidence gate — no weak labels",
    body: "Below the 0.40 threshold the model publishes UNKNOWN/DEGRADED, not a label built on thin evidence. You always know the strength of what you're reading.",
  },
  {
    title: "Hash-anchored audit trail",
    body: "Every label is SHA-256 anchored to its exact inputs and methodology version. The track record reflects what was actually published — not reconstructed.",
  },
] as const;

// ─── Right panel — use cases ───────────────────────────────────────────────────

export const heroActionEyebrow = "WHO USES IT AND FOR WHAT";
export const heroActionTitle = "What this data is used for.";

export const heroActionItems = [
  {
    label: "Regime conditioning in quant research",
    detail: "Split return or volatility series by STABLE, HEATING, and CONGESTED periods using status.label. Z-scores, percentiles, and driver rankings pre-computed in Meta JSON.",
  },
  {
    label: "Fee environment classification",
    detail: "Distinguish a structural fee shift from a single-day spike — with a confidence score and three-axis attribution across Demand, Friction, and Capacity.",
  },
  {
    label: "Multi-chain regime monitoring",
    detail: "One API call per chain per day. BTC, ETH, ARB, and BASE — structured, consistent, no stitching together explorer data.",
  },
  {
    label: "Backtesting over 400 days of history",
    detail: "Published daily since December 2024. Every label has a determinism hash — verify exactly what the model published on any past date.",
  },
  {
    label: "L2 cost environment tracking",
    detail: "Daily CHEAP or CONGESTED classification for Arbitrum and Base with confidence score and driver attribution.",
  },
  {
    label: "Structured data without pipeline overhead",
    detail: "Gold, Meta, and Derived JSON delivered via API. Plug into notebooks or downstream models — no infrastructure to build.",
  },
  {
    label: "Independent verification",
    detail: "Every Gold field is in native units, verifiable against any chain explorer. Meta and Derived are built from Gold — the full chain is traceable.",
  },
] as const;

// ─── Use cases (Plans.tsx) ────────────────────────────────────────────────────

export const landingUseCases = [
  {
    title: "Quant research and regime conditioning",
    body: "Use status.label from Meta JSON to condition analysis on network state — splitting data by STABLE, HEATING, and CONGESTED periods. Z-scores, percentiles, and driver rankings pre-computed.",
  },
  {
    title: "Structured daily data without pipeline overhead",
    body: "Gold, Meta, and Derived JSON published daily, delivered via authenticated API. Plug directly into notebooks, dashboards, or downstream models — no data pipeline to build or maintain.",
  },
  {
    title: "400+ days of auditable history",
    body: "Published daily since December 2024. Every label carries a determinism hash tied to its exact inputs — the track record shows what was actually published, not reconstructed after the fact.",
  },
] as const;

// ─── Plans ────────────────────────────────────────────────────────────────────

export const landingPlans = [
  {
    name: "Free",
    price: "$0",
    tierTag: "Public surface",
    accent: "text-slate-300",
    border: "border-white/10 bg-white/5",
    body: "Full web surface — no API access.",
    detail:
      "Track record, status, methodology, glossary, thresholds, and schema reference. The same published artifacts subscribers receive — readable on-site, not downloadable.",
    bestFor: "Best for: exploring the product before subscribing.",
    href: "/track-record",
    cta: "Open public surface →",
  },
  {
    name: "Basic",
    price: "$29/mo",
    tierTag: "1 chain · 90d · JSON",
    accent: "text-cyan-200",
    border: "border-cyan-500/25 bg-cyan-500/8",
    body: "One chain. API access. 90-day history.",
    detail:
      "Gold, Meta, and Derived JSON for one chain of your choice — BTC, ETH, ARB, or BASE. Delivered daily via authenticated API.",
    bestFor: "Best for: focused monitoring or single-chain research.",
    href: "/sign-up",
    cta: "Start Basic →",
  },
  {
    name: "Pro",
    price: "$79/mo",
    tierTag: "4 chains · 365d · JSON",
    accent: "text-purple-200",
    border: "border-purple-500/25 bg-purple-500/8",
    body: "All four chains. API access. 365-day history.",
    detail:
      "Gold, Meta, and Derived JSON across BTC, ETH, ARB, and BASE. Up to 365 days of history. Built for heavier research, multi-chain analysis, and API usage.",
    bestFor: "Best for: multi-chain research, backtesting, and production pipelines.",
    href: "/sign-up",
    cta: "Start Pro →",
  },
] as const;

// ─── Trust cards ──────────────────────────────────────────────────────────────

export const trustCards = [
  {
    eyebrow: "Methodology",
    title: "How the model decides",
    body: "Read the full logic for regime classification, confidence, freshness, and thresholds.",
    href: "/methodology",
  },
  {
    eyebrow: "Track record",
    title: "How the surface has evolved",
    body: "Inspect historical labels, transitions, and confidence over time.",
    href: "/track-record",
  },
  {
    eyebrow: "Schema",
    title: "What every field contains",
    body: "See Gold, Meta, and Derived fields documented in full.",
    href: "/api-docs/schema",
  },
] as const;

// ─── JSON layers ──────────────────────────────────────────────────────────────

export const jsonLayers = [
  {
    eyebrow: "Gold",
    title: "Raw daily observations",
    schemaHref: "/api-docs/schema#gold",
    accentColor: "text-yellow-300",
    borderColor: "border-yellow-500/20",
    bgColor: "bg-yellow-500/5",
    dotColor: "text-yellow-500/50",
    description:
      "Exactly what the blockchain recorded each day — in native units, unmodified. The authoritative source that Meta and Derived are built from. Independently verifiable against any chain explorer.",
    bestFor:
      "Best for: reproducible raw inputs, independent verification, custom feature engineering.",
    fields: [
      { key: "tx_count_daily", note: "Daily transaction count" },
      { key: "median_tx_fee_native", note: "Typical cost per transaction" },
      { key: "gas_utilization_pct", note: "Block fullness — ETH L1 only" },
      { key: "unique_active_addresses", note: "Breadth of daily participation" },
      { key: "avg_block_time_sec", note: "Block cadence, chain-relative" },
    ],
    moreCount: 5,
  },
  {
    eyebrow: "Meta",
    title: "Regime intelligence",
    schemaHref: "/api-docs/schema#meta",
    accentColor: "text-purple-300",
    borderColor: "border-purple-500/20",
    bgColor: "bg-purple-500/5",
    dotColor: "text-purple-500/50",
    description:
      "The full analytical output — regime label, confidence score, three-axis scorecard (Demand / Friction / Capacity), and a ranked driver set with z-scores, percentiles, and momentum. The commercial core of the product.",
    bestFor:
      "Best for: regime research, confidence-gated analysis, driver attribution, backtesting.",
    fields: [
      { key: "status.label", note: "STABLE / HEATING / CONGESTED / CHEAP" },
      { key: "confidence.confidence_score", note: "Evidence quality, 0–1" },
      { key: "scorecard.dimensions.*", note: "Demand · Friction · Capacity scores" },
      { key: "regime.drivers[]", note: "Top signals with z-score and percentile" },
      { key: "regime.determinism_hash", note: "Reproducibility fingerprint" },
    ],
    moreCount: 20,
  },
  {
    eyebrow: "Derived",
    title: "Smoothed trend series",
    schemaHref: "/api-docs/schema#derived",
    accentColor: "text-blue-300",
    borderColor: "border-blue-500/20",
    bgColor: "bg-blue-500/5",
    dotColor: "text-blue-500/50",
    description:
      "7-day and 30-day rolling averages for every Gold metric. Independently verifiable: any MA7 value is the arithmetic mean of the matching Gold field over the preceding 7 days.",
    bestFor:
      "Best for: trend charting, spike vs persistence detection, momentum context.",
    fields: [
      { key: "<metric>__ma7", note: "7-day rolling mean of any Gold field" },
      { key: "<metric>__ma30", note: "30-day rolling mean of any Gold field" },
      { key: "derived.meta_confidence", note: "Confidence overlay for chart rendering" },
    ],
    moreCount: 0,
  },
] as const;

// ─── Explore cards ────────────────────────────────────────────────────────────

export const exploreCards = [
  {
    title: "Track Record",
    body: "Inspect historical labels, transitions, and confidence — published daily since December 2024.",
    href: "/track-record",
  },
  {
    title: "Methodology",
    body: "Read the full classification logic, thresholds, and interpretation boundaries.",
    href: "/methodology",
  },
  {
    title: "JSON Schema",
    body: "See every field in Gold, Meta, and Derived documented before you subscribe.",
    href: "/api-docs/schema",
  },
  {
    title: "API Docs",
    body: "Endpoints, authentication, and file delivery contract for subscribers.",
    href: "/api-docs",
  },
] as const;

export type JsonExampleKey =
  | "gold-good"
  | "gold-degraded"
  | "meta-good"
  | "meta-degraded"
  | "derived-good"
  | "derived-degraded";

export type JsonExample = {
  key: JsonExampleKey;
  chain: string;
  date: string;
  confidenceLevel: "good" | "degraded";
  layer: "gold" | "meta" | "derived";
  explanation: string;
  data: string;
};

const goldGoodPayload = {
  "avg_block_time_sec": 12.058626465661643,
  "block_count_daily": 7165.0,
  "chain": "ethereum",
  "date": "2025-08-12",
  "failed_tx_rate": 0.014789235436467778,
  "gas_utilization_pct": 0.5052421135488959,
  "median_tx_fee_native": 80780205950910.0,
  "median_tx_value_native": 0.0,
  "tx_count_daily": 1740117.0,
  "unique_active_addresses": 677196.0,
  "value_transferred_native": 4.1827483952552236e+24
} as const;
const goldDegradedPayload = {
  "avg_block_time_sec": 12.080548175080407,
  "block_count_daily": 7152.0,
  "chain": "ethereum",
  "date": "2025-11-04",
  "failed_tx_rate": 0.012024446795495155,
  "gas_utilization_pct": 0.5054221479083215,
  "median_tx_fee_native": 103422352015903.0,
  "median_tx_value_native": 0.0,
  "tx_count_daily": 1613463.0,
  "unique_active_addresses": 574858.0,
  "value_transferred_native": 3.6988279271930865e+24
} as const;
const metaGoodPayload = {
  "chain": "ethereum",
  "confidence": {
    "asof_date": "2025-08-12",
    "chain": "ethereum",
    "components": {
      "current_row_coverage": 1.0,
      "freshness_asof": 1.0,
      "history_depth": 1.0,
      "recent_density": 1.0,
      "recent_metric_coverage": 1.0
    },
    "confidence_score": 0.8536845020779187,
    "data_quality_score": 1.0,
    "date": "2025-08-12",
    "label_confidence_score": 0.7287772290880239,
    "lag_days_vs_asof_date": 0,
    "lag_days_vs_utc_today": 226,
    "missing": false,
    "semantics": "combined_data_quality_and_label_stability",
    "source": "gold_history",
    "updated_through": "2025-08-12"
  },
  "data_confidence": {
    "components": {
      "current_row_coverage": 1.0,
      "freshness_asof": 1.0,
      "history_depth": 1.0,
      "recent_density": 1.0,
      "recent_metric_coverage": 1.0
    },
    "confidence_score": 1.0,
    "date": "2025-08-12",
    "lag_days_vs_asof_date": 0,
    "lag_days_vs_utc_today": 226,
    "missing": false,
    "semantics": "data_quality_and_history_coverage_only"
  },
  "date": "2025-08-12",
  "gold_status": {
    "chain": "ethereum",
    "features_lag_days_vs_utc_today": null,
    "features_last_date": "2026-03-25",
    "missing": false,
    "note": "Fallback status derived from gold JSON (no pipeline ml_status present)."
  },
  "methodology_version": "1.0",
  "missing": false,
  "profile": {
    "capacity_proxy": [
      "gas_utilization_pct"
    ],
    "chain": "ethereum",
    "hidden_metrics": [],
    "id": "eth_l1",
    "label": "ETH L1",
    "note": null,
    "type": "eth_l1"
  },
  "publish_confidence": {
    "confidence_score": 0.8536845020779187,
    "eligible": true,
    "missing": false,
    "reason": "combined_confidence_threshold",
    "threshold": 0.4
  },
  "publish_lag_days_policy": 1,
  "regime": {
    "asof_date": "2025-08-12",
    "axes": {
      "capacity": {
        "band_high": "NORMAL",
        "band_low": "NORMAL",
        "trend": "FLAT"
      },
      "demand": {
        "band_high": "EXTREME_HIGH",
        "band_low": "NORMAL",
        "trend": "HEATING"
      },
      "friction": {
        "band_high": "NORMAL",
        "band_low": "NORMAL",
        "trend": "COOLING"
      }
    },
    "chain": "ethereum",
    "determinism_hash": "d0cf28749488",
    "drivers": [
      {
        "axis": "demand",
        "current": 1740117.0,
        "metric": "tx_count_daily",
        "momentum_7d_vs_30d": 0.7011721309463859,
        "pct_90d": 92.22222222222223,
        "trend": "HEATING",
        "z_robust": 2.8577233749049102
      },
      {
        "axis": "demand",
        "current": 677196.0,
        "metric": "unique_active_addresses",
        "momentum_7d_vs_30d": 0.5023508421394824,
        "pct_90d": 96.66666666666667,
        "trend": "HEATING",
        "z_robust": 2.5196774596007603
      }
    ],
    "gate": {
      "confidence_score": 0.8536845020779187,
      "explanation": "OK",
      "status": "ok",
      "threshold": 0.4,
      "type": "confidence_threshold"
    },
    "label": "HEATING",
    "missing": false,
    "ruleset_id": "eth_l1_v1",
    "signal_aliases": {
      "active_addresses": "unique_active_addresses",
      "blocktime_instability": "blocktime_instability",
      "failed_tx_rate": "failed_tx_rate",
      "fee_burden_proxy": "median_tx_fee_native",
      "tx_count": "tx_count_daily",
      "utilization": "gas_utilization_pct"
    },
    "signals": {
      "avg_block_time_sec": {
        "axis": "capacity",
        "current": 12.058626465661643,
        "momentum_7d_vs_30d": 0.0,
        "pct_90d": 63.33333333333333,
        "z_robust": 0.0
      },
      "blocktime_instability": {
        "axis": "capacity",
        "current": 0.0006392037346124935,
        "current_raw": 12.058626465661643,
        "momentum_7d_vs_30d": 0.0,
        "pct_90d": 57.77777777777777,
        "transform": {
          "formula": "rolling_mean(|bt - median_30| / median_30)",
          "input_metric": "avg_block_time_sec",
          "instability_rolling_median_days": 30,
          "type": "instability_proxy",
          "window_days": 7
        },
        "z_robust": 0.0
      },
      "failed_tx_rate": {
        "axis": "friction",
        "current": 0.014789235436467778,
        "momentum_7d_vs_30d": 0.12677933415144282,
        "pct_90d": 36.666666666666664,
        "z_robust": -0.450604354941162
      },
      "gas_utilization_pct": {
        "axis": "capacity",
        "current": 0.5052421135488959,
        "momentum_7d_vs_30d": -0.11549496124383551,
        "pct_90d": 68.88888888888889,
        "z_robust": -0.47691477218132466
      },
      "median_tx_fee_native": {
        "axis": "friction",
        "current": 80780205950910.0,
        "momentum_7d_vs_30d": -1.1398487490770095,
        "pct_90d": 46.666666666666664,
        "z_robust": 0.4036482359916051
      },
      "tx_count_daily": {
        "axis": "demand",
        "current": 1740117.0,
        "momentum_7d_vs_30d": 0.7011721309463859,
        "pct_90d": 92.22222222222223,
        "z_robust": 2.8577233749049102
      },
      "unique_active_addresses": {
        "axis": "demand",
        "current": 677196.0,
        "momentum_7d_vs_30d": 0.5023508421394824,
        "pct_90d": 96.66666666666667,
        "z_robust": 2.5196774596007603
      }
    },
    "window_days": 7
  },
  "scorecard": {
    "asof_date": "2025-08-12",
    "chain": "ethereum",
    "confidence_score": 0.8536845020779187,
    "dimensions": {
      "capacity": {
        "components": {
          "blocktime_instability": {
            "current": 12.058626465661643,
            "score_raw": 61.84506873422899,
            "z": 0.4579029797619891
          },
          "utilization": {
            "current": 0.5052421135488959,
            "score_raw": 36.86467098900042,
            "z": -0.5115224696318135
          }
        },
        "coverage_factor": 1.0,
        "effective_confidence": 0.8536845020779187,
        "level": "Balanced",
        "score": 48.26451915399022,
        "score_raw": 47.96706998687979
      },
      "demand": {
        "components": {
          "active_addresses": {
            "current": 677196.0,
            "score_raw": 88.4084697293421,
            "z": 2.922926974513614
          },
          "tx_count": {
            "current": 1740117.0,
            "score_raw": 89.31985715118842,
            "z": 3.569205700368199
          },
          "tx_per_user": {
            "current": 2.5695913738415466,
            "score_raw": 53.9351771694827,
            "z": 0.14804801102785028
          }
        },
        "coverage_factor": 1.0,
        "effective_confidence": 0.8536845020779187,
        "level": "High",
        "score": 74.65820994298929,
        "score_raw": 78.88445307718453
      },
      "friction": {
        "components": {
          "failed_tx_rate": {
            "current": 0.014789235436467778,
            "score_raw": 38.959337240661014,
            "z": -0.4250474565972333
          },
          "fee_burden_proxy": {
            "current": null,
            "score_raw": null,
            "z": null
          }
        },
        "coverage_factor": 0.5,
        "effective_confidence": 0.42684225103895934,
        "level": "Normal",
        "score": 45.28737865484174,
        "score_raw": 38.959337240661014
      }
    },
    "missing": false,
    "notes": {
      "interpretation": "Scores are 0–100. 50 is neutral vs the chain's own history. Higher Demand means hotter usage; higher Friction means higher cost/failure; higher Capacity means tighter capacity (pressure). Low confidence pulls scores toward 50."
    },
    "window_days": 7
  },
  "status": {
    "color": "yellow",
    "label": "HEATING",
    "one_liner": "Demand: High; Friction: Normal; Capacity: Balanced"
  },
  "tier_used": "standard",
  "updated_through": "2025-08-12"
} as const;
const metaDegradedPayload = {
  "chain": "ethereum",
  "confidence": {
    "asof_date": "2025-11-04",
    "chain": "ethereum",
    "components": {
      "current_row_coverage": 1.0,
      "freshness_asof": 1.0,
      "history_depth": 1.0,
      "recent_density": 1.0,
      "recent_metric_coverage": 1.0
    },
    "confidence_score": 0.34877851148655953,
    "data_quality_score": 1.0,
    "date": "2025-11-04",
    "label_confidence_score": 0.12164645007478014,
    "lag_days_vs_asof_date": 0,
    "lag_days_vs_utc_today": 142,
    "missing": false,
    "semantics": "combined_data_quality_and_label_stability",
    "source": "gold_history",
    "updated_through": "2025-11-04"
  },
  "data_confidence": {
    "components": {
      "current_row_coverage": 1.0,
      "freshness_asof": 1.0,
      "history_depth": 1.0,
      "recent_density": 1.0,
      "recent_metric_coverage": 1.0
    },
    "confidence_score": 1.0,
    "date": "2025-11-04",
    "lag_days_vs_asof_date": 0,
    "lag_days_vs_utc_today": 142,
    "missing": false,
    "semantics": "data_quality_and_history_coverage_only"
  },
  "date": "2025-11-04",
  "gold_status": {
    "chain": "ethereum",
    "features_lag_days_vs_utc_today": null,
    "features_last_date": "2026-03-25",
    "missing": false,
    "note": "Fallback status derived from gold JSON (no pipeline ml_status present)."
  },
  "methodology_version": "1.0",
  "missing": false,
  "profile": {
    "capacity_proxy": [
      "gas_utilization_pct"
    ],
    "chain": "ethereum",
    "hidden_metrics": [],
    "id": "eth_l1",
    "label": "ETH L1",
    "note": null,
    "type": "eth_l1"
  },
  "publish_confidence": {
    "confidence_score": 0.34877851148655953,
    "eligible": false,
    "missing": false,
    "reason": "combined_confidence_threshold",
    "threshold": 0.4
  },
  "publish_lag_days_policy": 1,
  "regime": {
    "asof_date": "2025-11-04",
    "axes": {
      "capacity": {
        "band_high": "NORMAL",
        "band_low": "NORMAL",
        "trend": "FLAT"
      },
      "demand": {
        "band_high": "NORMAL",
        "band_low": "NORMAL",
        "trend": "FLAT"
      },
      "friction": {
        "band_high": "EXTREME_HIGH",
        "band_low": "NORMAL",
        "trend": "FLAT"
      }
    },
    "chain": "ethereum",
    "determinism_hash": null,
    "drivers": [
      {
        "axis": "friction",
        "current": 103422352015903.0,
        "metric": "median_tx_fee_native",
        "momentum_7d_vs_30d": 0.07262191911569033,
        "pct_90d": 100.0,
        "trend": "FLAT",
        "z_robust": 1.465966579673499
      },
      {
        "axis": "friction",
        "current": 0.012024446795495155,
        "metric": "failed_tx_rate",
        "momentum_7d_vs_30d": -0.23842975096231,
        "pct_90d": 23.333333333333332,
        "trend": "COOLING",
        "z_robust": -0.8609030074846238
      },
      {
        "axis": "capacity",
        "current": 12.080548175080407,
        "metric": "avg_block_time_sec",
        "momentum_7d_vs_30d": -0.1862651821801795,
        "pct_90d": 66.66666666666666,
        "trend": "COOLING",
        "z_robust": 0.5297419541722035
      }
    ],
    "gate": {
      "confidence_score": 0.34877851148655953,
      "explanation": "Confidence is below the product threshold; regime is withheld to avoid overclaiming.",
      "status": "gated",
      "threshold": 0.4,
      "type": "confidence_threshold"
    },
    "label": "UNKNOWN/DEGRADED",
    "missing": false,
    "ruleset_id": "eth_l1_v1",
    "signal_aliases": {
      "active_addresses": "unique_active_addresses",
      "blocktime_instability": "blocktime_instability",
      "failed_tx_rate": "failed_tx_rate",
      "fee_burden_proxy": "median_tx_fee_native",
      "tx_count": "tx_count_daily",
      "utilization": "gas_utilization_pct"
    },
    "signals": {
      "avg_block_time_sec": {
        "axis": "capacity",
        "current": 12.080548175080407,
        "momentum_7d_vs_30d": -0.1862651821801795,
        "pct_90d": 66.66666666666666,
        "z_robust": 0.5297419541722035
      },
      "blocktime_instability": {
        "axis": "capacity",
        "current": 0.0009192052194445043,
        "current_raw": 12.080548175080407,
        "momentum_7d_vs_30d": -0.07177808988010975,
        "pct_90d": 32.22222222222222,
        "transform": {
          "formula": "rolling_mean(|bt - median_30| / median_30)",
          "input_metric": "avg_block_time_sec",
          "instability_rolling_median_days": 30,
          "type": "instability_proxy",
          "window_days": 7
        },
        "z_robust": -0.09442243125160599
      },
      "failed_tx_rate": {
        "axis": "friction",
        "current": 0.012024446795495155,
        "momentum_7d_vs_30d": -0.23842975096231,
        "pct_90d": 23.333333333333332,
        "z_robust": -0.8609030074846238
      },
      "gas_utilization_pct": {
        "axis": "capacity",
        "current": 0.5054221479083215,
        "momentum_7d_vs_30d": -0.0023795647184010615,
        "pct_90d": 58.88888888888889,
        "z_robust": 0.3480901994352972
      },
      "median_tx_fee_native": {
        "axis": "friction",
        "current": 103422352015903.0,
        "momentum_7d_vs_30d": 0.07262191911569033,
        "pct_90d": 100.0,
        "z_robust": 1.465966579673499
      },
      "tx_count_daily": {
        "axis": "demand",
        "current": 1613463.0,
        "momentum_7d_vs_30d": 0.04288384300247211,
        "pct_90d": 45.55555555555556,
        "z_robust": 0.5161932197171137
      },
      "unique_active_addresses": {
        "axis": "demand",
        "current": 574858.0,
        "momentum_7d_vs_30d": -0.0658288114322205,
        "pct_90d": 34.44444444444444,
        "z_robust": 0.16863690074103949
      }
    },
    "window_days": 7
  },
  "scorecard": {
    "asof_date": "2025-11-04",
    "chain": "ethereum",
    "confidence_score": 0.34877851148655953,
    "dimensions": {
      "capacity": {
        "components": {
          "blocktime_instability": {
            "current": 12.080548175080407,
            "score_raw": 68.3567900427035,
            "z": 0.7439129565210729
          },
          "utilization": {
            "current": 0.5054221479083215,
            "score_raw": 64.85540067827476,
            "z": 0.5850431323288934
          }
        },
        "coverage_factor": 1.0,
        "effective_confidence": 0.34877851148655953,
        "level": "Balanced",
        "score": 55.72400425639857,
        "score_raw": 66.41157372913197
      },
      "demand": {
        "components": {
          "active_addresses": {
            "current": 574858.0,
            "score_raw": 62.74580788099202,
            "z": 0.4952077119306761
          },
          "tx_count": {
            "current": 1613463.0,
            "score_raw": 75.01849401575316,
            "z": 1.1008914350370613
          },
          "tx_per_user": {
            "current": 2.8067157454536598,
            "score_raw": 73.8901112003366,
            "z": 1.0332984753827341
          }
        },
        "coverage_factor": 1.0,
        "effective_confidence": 0.34877851148655953,
        "level": "Normal",
        "score": 57.08473676494188,
        "score_raw": 70.31299673464802
      },
      "friction": {
        "components": {
          "failed_tx_rate": {
            "current": 0.012024446795495155,
            "score_raw": 19.26646699472856,
            "z": -1.5243881819445757
          },
          "fee_burden_proxy": {
            "current": null,
            "score_raw": null,
            "z": null
          }
        },
        "coverage_factor": 0.5,
        "effective_confidence": 0.17438925574327976,
        "level": "Normal",
        "score": 44.64040205284919,
        "score_raw": 19.26646699472856
      }
    },
    "missing": false,
    "notes": {
      "interpretation": "Scores are 0–100. 50 is neutral vs the chain's own history. Higher Demand means hotter usage; higher Friction means higher cost/failure; higher Capacity means tighter capacity (pressure). Low confidence pulls scores toward 50."
    },
    "window_days": 7
  },
  "status": {
    "color": "gray",
    "label": "UNKNOWN/DEGRADED",
    "one_liner": "Confidence is below the product threshold; regime is withheld to avoid overclaiming."
  },
  "tier_used": "standard",
  "updated_through": "2025-11-04"
} as const;
const derivedGoodPayload = {
  "chain": "ethereum",
  "date": "2025-08-12",
  "derived": {
    "context_blocks": [],
    "meta_confidence": {
      "confidence_score": 7.711569527495757e-11
    },
    "metrics": {
      "avg_block_time_sec__ma30": 12.072070082556527,
      "avg_block_time_sec__ma7": 12.072116490350721,
      "block_count_daily__ma30": 7157.033333333334,
      "block_count_daily__ma7": 7157.0,
      "failed_tx_rate__ma30": 0.014635669531522356,
      "failed_tx_rate__ma7": 0.015062056248866636,
      "gas_utilization_pct__ma30": 0.5048579676459732,
      "gas_utilization_pct__ma7": 0.5046468968849922,
      "median_tx_fee_native__ma30": 87719798531202.14,
      "median_tx_fee_native__ma7": 52378050418979.43,
      "median_tx_value_native__ma30": 333333334.1666667,
      "median_tx_value_native__ma7": 0.0,
      "tx_count_daily__ma30": 1630211.5666666667,
      "tx_count_daily__ma7": 1727235.2857142857,
      "unique_active_addresses__ma30": 614037.1333333333,
      "unique_active_addresses__ma7": 648511.2857142857,
      "value_transferred_native__ma30": 2.5925436483040554e+24,
      "value_transferred_native__ma7": 2.669055256794284e+24
    }
  }
} as const;
const derivedDegradedPayload = {
  "chain": "ethereum",
  "date": "2025-11-04",
  "derived": {
    "context_blocks": [],
    "meta_confidence": {
      "confidence_score": 1.2550948899607163e-05
    },
    "metrics": {
      "avg_block_time_sec__ma30": 12.090947310807223,
      "avg_block_time_sec__ma7": 12.084423335294295,
      "block_count_daily__ma30": 7145.866666666667,
      "block_count_daily__ma7": 7149.714285714285,
      "failed_tx_rate__ma30": 0.01226781756503858,
      "failed_tx_rate__ma7": 0.011532181687100736,
      "gas_utilization_pct__ma30": 0.5058538169642554,
      "gas_utilization_pct__ma7": 0.5058516319858369,
      "median_tx_fee_native__ma30": 37015326251698.336,
      "median_tx_fee_native__ma7": 39570718989883.79,
      "median_tx_value_native__ma30": 0.0,
      "median_tx_value_native__ma7": 0.0,
      "tx_count_daily__ma30": 1536735.9666666666,
      "tx_count_daily__ma7": 1544447.142857143,
      "unique_active_addresses__ma30": 563325.7666666667,
      "unique_active_addresses__ma7": 558485.7142857143,
      "value_transferred_native__ma30": 2.022118979240632e+24,
      "value_transferred_native__ma7": 2.057087132560751e+24
    }
  }
} as const;

export const jsonExamples: Record<JsonExampleKey, JsonExample> = {
  "gold-good": {
    key: "gold-good",
    chain: "ethereum",
    date: "2025-08-12",
    confidenceLevel: "good",
    layer: "gold",
    explanation:
      "This is a real published Ethereum day with high confidence. The source row is complete, the combined confidence score cleared the 0.40 publish threshold, and the same Gold inputs fed the published Meta and Derived artifacts for this date.",
    data: JSON.stringify(goldGoodPayload, null, 2),
  },
  "gold-degraded": {
    key: "gold-degraded",
    chain: "ethereum",
    date: "2025-11-04",
    confidenceLevel: "degraded",
    layer: "gold",
    explanation:
      "This is a real published Ethereum day whose downstream Meta confidence fell below the 0.40 publish threshold. In this actual dataset the Gold row is still complete, so the degraded state comes from low label stability later in the pipeline rather than null fields in Gold.",
    data: JSON.stringify(goldDegradedPayload, null, 2),
  },
  "meta-good": {
    key: "meta-good",
    chain: "ethereum",
    date: "2025-08-12",
    confidenceLevel: "good",
    layer: "meta",
    explanation:
      "This is a real high-confidence Meta artifact. Confidence scored 0.854, the publish gate was eligible, and the product published a named regime label with scorecard context and driver attribution.",
    data: JSON.stringify(metaGoodPayload, null, 2),
  },
  "meta-degraded": {
    key: "meta-degraded",
    chain: "ethereum",
    date: "2025-11-04",
    confidenceLevel: "degraded",
    layer: "meta",
    explanation:
      "This is a real low-confidence Meta artifact. Confidence scored 0.349, below the 0.40 publish threshold, so the published regime became UNKNOWN/DEGRADED. In this real row the evidence surface is still present, but the gate blocks a named publishable regime.",
    data: JSON.stringify(metaDegradedPayload, null, 2),
  },
  "derived-good": {
    key: "derived-good",
    chain: "ethereum",
    date: "2025-08-12",
    confidenceLevel: "good",
    layer: "derived",
    explanation:
      "This is a real published Derived artifact for the same high-confidence Ethereum day. It shows the actual rolling averages the product published for that date, not fabricated example math.",
    data: JSON.stringify(derivedGoodPayload, null, 2),
  },
  "derived-degraded": {
    key: "derived-degraded",
    chain: "ethereum",
    date: "2025-11-04",
    confidenceLevel: "degraded",
    layer: "derived",
    explanation:
      "This is a real published Derived artifact for the same degraded Ethereum day. The moving averages are still published, but the paired Meta artifact for this date fell below the confidence threshold and published as UNKNOWN/DEGRADED.",
    data: JSON.stringify(derivedDegradedPayload, null, 2),
  },
};
