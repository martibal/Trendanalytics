// src/data/glossary.ts

export type GlossaryLevelText = {
  basic: string;
  advanced: string;
};

export type GlossaryEntry = {
  key: string;
  label: string;
  category:
    | "regime"
    | "confidence"
    | "scorecard"
    | "drivers"
    | "charts"
    | "freshness"
    | "metadata";
  units?: string;
  sourcePath?: string;
  fieldPath?: string;
  description: GlossaryLevelText;
};

function makeEntry(entry: GlossaryEntry): GlossaryEntry {
  return entry;
}

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  makeEntry({
    key: "status.label",
    label: "Regime label",
    category: "regime",
    units: "category",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "status.label",
    description: {
      basic:
        "The regime label is the product's compact description of the chain's current on-chain state. It is descriptive only. It does not predict what happens next and it does not tell the user what to do. Its job is to summarize whether the latest published evidence looks more like stable conditions, heating demand, congestion pressure, cheap conditions, or a degraded / low-confidence state.",
      advanced:
        "The frontend treats status.label as the canonical published regime label and only falls back to regime.label if status.label is unavailable. In the backend, the label is produced by deterministic rules over Demand, Friction, and Capacity evidence, with a confidence gate that can force UNKNOWN/DEGRADED. The UI does not recompute the label. The correct interpretation is therefore 'published classification result', not 'UI opinion' or 'forecast'.",
    },
  }),
  makeEntry({
    key: "regime.value.STABLE",
    label: "STABLE",
    category: "regime",
    units: "regime state",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "status.label",
    description: {
      basic:
        "STABLE means the chain does not currently show a strong enough combination of demand pressure, friction pressure, or cheap-capacity conditions to justify a more extreme label. It does not mean 'nothing is happening'. It means the chain still looks broadly within its normal historical operating range.",
      advanced:
        "In the ruleset, STABLE is the default label when the evidence does not meet CONGESTED, CHEAP, or HEATING conditions and the confidence gate does not force UNKNOWN/DEGRADED. In practice this usually means scorecard dimensions are not far enough from neutral, or the directional evidence is not persistent enough, to support a stronger regime label.",
    },
  }),
  makeEntry({
    key: "regime.value.HEATING",
    label: "HEATING",
    category: "regime",
    units: "regime state",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "status.label",
    description: {
      basic:
        "HEATING means demand looks stronger than usual and the recent direction still points upward. In plain language, activity appears to be building rather than merely producing a single isolated spike.",
      advanced:
        "The regime engine assigns HEATING when Demand is in a high band and at least one relevant axis trend is also HEATING. That means the model is looking for both elevated level and positive short-versus-long momentum. It is therefore stronger than 'high today' but weaker than a fully congested state.",
    },
  }),
  makeEntry({
    key: "regime.value.CONGESTED",
    label: "CONGESTED",
    category: "regime",
    units: "regime state",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "status.label",
    description: {
      basic:
        "CONGESTED means the chain appears to be operating under real capacity pressure. Usage is high enough relative to available throughput that users are more likely to feel the network becoming crowded through higher fees, fuller blocks, slower execution, or more failures.",
      advanced:
        "The ruleset assigns CONGESTED when Capacity is EXTREME_HIGH, or when Capacity is HIGH and Friction is also HIGH. This is intentionally stricter than 'demand is high'. The label is meant to describe a chain where demand is pressing against execution capacity, not merely a chain that is busy.",
    },
  }),
  makeEntry({
    key: "regime.value.CHEAP",
    label: "CHEAP",
    category: "regime",
    units: "regime state",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "status.label",
    description: {
      basic:
        "CHEAP means the chain currently looks easy to use relative to its own history. That usually means friction is low and capacity pressure is low at the same time, so the network appears to have room to spare.",
      advanced:
        "The ruleset assigns CHEAP when both Friction and Capacity are in low bands. This is important: the label is not 'fees are low' in isolation. It is a joint state where the chain looks inexpensive and unconstrained relative to its own historical behavior.",
    },
  }),
  makeEntry({
    key: "regime.value.UNKNOWN_DEGRADED",
    label: "UNKNOWN/DEGRADED",
    category: "regime",
    units: "regime state",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "status.label",
    description: {
      basic:
        "UNKNOWN/DEGRADED means the product does not have enough trustworthy evidence to publish a stronger regime label confidently. The latest data may still be visible for traceability, but the classification itself should be treated as insufficiently supported.",
      advanced:
        "This state is usually triggered by the confidence gate rather than by a separate market condition. In the current model, the published regime becomes UNKNOWN/DEGRADED when combined publish confidence falls below the configured threshold. It is therefore an evidence-quality state, not a fifth economic regime in the same sense as STABLE, HEATING, CONGESTED, or CHEAP.",
    },
  }),
  makeEntry({
    key: "status.one_liner",
    label: "Regime one-liner",
    category: "regime",
    units: "text",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "status.one_liner",
    description: {
      basic:
        "The one-liner is a short human-readable summary of the published regime. It is there to make the page readable at a glance before the user dives into the detail.",
      advanced:
        "This text is pipeline-authored descriptive copy published alongside the regime label. The UI renders it directly and should not be treated as an independent inference layer. It compresses regime, confidence, and chain context into one short sentence.",
    },
  }),
  makeEntry({
    key: "status.color",
    label: "Regime color",
    category: "regime",
    units: "UI token",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "status.color",
    description: {
      basic:
        "This is the published color hint for the regime badge. It helps users separate states visually, but the label itself is what matters.",
      advanced:
        "The UI prefers the published status.color when present and only falls back to local color mapping if needed. Color is presentation, not methodology. It should never be interpreted as extra model output beyond the published regime label.",
    },
  }),
  makeEntry({
    key: "confidence.confidence_score",
    label: "Confidence score",
    category: "confidence",
    units: "0..1",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "confidence.confidence_score",
    description: {
      basic:
        "Confidence tells you how much evidence supports the currently published classification. It is not a prediction score and it is not the probability that the regime is 'true'. A higher value means the current label is backed by more complete data and a clearer internal signal structure.",
      advanced:
        "In the current backend, confidence_score is the geometric mean of data_quality_score and label_confidence_score: sqrt(data_quality_score × label_confidence_score). That means confidence only stays high when both inputs are strong. It should be read as evidence sufficiency for the present classification, not as forecast skill, expected return, or directional conviction.",
    },
  }),
  makeEntry({
    key: "confidence.data_quality_score",
    label: "Data quality score",
    category: "confidence",
    units: "0..1",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "confidence.data_quality_score",
    description: {
      basic:
        "This score asks a simpler question than full confidence: 'Do we have enough complete and recent data to evaluate the chain properly right now?' It is the data sufficiency side of confidence, before the model asks whether the regime itself is internally clear.",
      advanced:
        "The backend computes data_quality_score from five weighted components: current_row_coverage (30%), recent_metric_coverage (20%), recent_density (20%), history_depth (15%), and freshness_asof (15%). The score is clipped to 0..1. This is about data completeness and freshness only; it does not yet judge whether the regime label is sharp or ambiguous.",
    },
  }),
  makeEntry({
    key: "confidence.label_confidence_score",
    label: "Label confidence score",
    category: "confidence",
    units: "0..1",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "confidence.label_confidence_score",
    description: {
      basic:
        "This score measures how clearly the current scorecard and driver evidence support the label that was chosen. It is the signal-clarity side of confidence.",
      advanced:
        "For non-STABLE labels, label confidence mainly depends on scorecard margin and driver support. For STABLE, the model also rewards neutrality, because a stable label should look genuinely close to the chain's own middle ground rather than merely lacking extreme readings. UNKNOWN/DEGRADED maps to zero label confidence.",
    },
  }),
  makeEntry({
    key: "confidence.components.current_row_coverage",
    label: "Current row coverage",
    category: "confidence",
    units: "0..1",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "confidence.components.current_row_coverage",
    description: {
      basic:
        "How much of the latest row's required input data is actually present. A value near 1 means the latest day has the fields the chain is expected to provide.",
      advanced:
        "This is computed from chain-specific required metrics, not from every possible field in the dataset. It answers 'does the latest row contain the inputs this chain needs for classification?' rather than 'is every column in the file populated?'.",
    },
  }),
  makeEntry({
    key: "confidence.components.recent_metric_coverage",
    label: "Recent metric coverage",
    category: "confidence",
    units: "0..1",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "confidence.components.recent_metric_coverage",
    description: {
      basic:
        "The average row-level coverage across the recent trailing window. It tells you whether the last several weeks look consistently complete, not just whether the latest row is complete.",
      advanced:
        "The backend computes recent_metric_coverage as the average of row coverage over the recent trailing window used by the confidence routine. This catches situations where today's row looks complete but the surrounding days are patchy, which would make trends less trustworthy.",
    },
  }),
  makeEntry({
    key: "confidence.components.recent_density",
    label: "Recent density",
    category: "confidence",
    units: "0..1",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "confidence.components.recent_density",
    description: {
      basic:
        "How many actual published days exist in the recent trailing window relative to how many days should ideally be there. It is a direct check for holes in the recent series.",
      advanced:
        "The backend measures recent_density as observed distinct days divided by expected recent days. This is why missing runs or broken daily continuity immediately push data quality down, even if the rows that do exist look individually complete.",
    },
  }),
  makeEntry({
    key: "confidence.components.history_depth",
    label: "History depth",
    category: "confidence",
    units: "0..1",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "confidence.components.history_depth",
    description: {
      basic:
        "How much historical depth is available for the current computation. More history usually makes baselines, percentiles, and unusualness estimates more trustworthy.",
      advanced:
        "In the current backend this is capped at 1.0 once roughly 90 distinct days are available. The score is not trying to reward infinite history forever; it is trying to avoid giving full confidence to a regime that was inferred from a very short local sample.",
    },
  }),
  makeEntry({
    key: "confidence.components.freshness_asof",
    label: "Freshness as-of",
    category: "confidence",
    units: "0..1",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "confidence.components.freshness_asof",
    description: {
      basic:
        "How fresh the row is relative to the chain's normal publishing lag. A chain can still be usable when not perfectly fresh, but confidence should decline when lag becomes unusually large.",
      advanced:
        "Freshness is chain-aware. The backend compares lag against PUBLISH_LAG_DAYS_POLICY for the chain, then applies a soft-to-hard penalty curve. This matters because Base and Arbitrum are allowed more lag than Bitcoin or Ethereum, so the same calendar lag should not automatically mean the same freshness score across chains.",
    },
  }),
  makeEntry({
    key: "confidence.lag_days_vs_asof_date",
    label: "As-of lag days",
    category: "freshness",
    units: "days",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "confidence.lag_days_vs_asof_date",
    description: {
      basic:
        "The lag between the row's own as-of date and the latest source day used for that row. If this is 0, the row and its data date match. If it is larger than 0, the row is being judged using older underlying data.",
      advanced:
        "This is the historically correct lag measure for Track Record-style views. It is different from lag versus today. Using lag_days_vs_asof_date avoids the misleading effect where old historical rows would automatically look stale simply because time has passed since publication.",
    },
  }),
  makeEntry({
    key: "confidence.lag_days_vs_utc_today",
    label: "Lag days vs today",
    category: "freshness",
    units: "days",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "confidence.lag_days_vs_utc_today",
    description: {
      basic:
        "How many days behind the latest published chain data is relative to today. This is useful for current freshness banners, but less useful for interpreting old historical rows.",
      advanced:
        "This field remains useful for current page freshness and operational monitoring. It should not be confused with historical as-of lag. A row from months ago can have a large lag vs today even if it was perfectly fresh when it was published.",
    },
  }),
  makeEntry({
    key: "confidence.missing",
    label: "Confidence missing flag",
    category: "confidence",
    units: "boolean",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "confidence.missing",
    description: {
      basic:
        "This flag tells you whether the confidence layer was incomplete or unavailable for the row. If true, the product should not pretend it knows more than it does.",
      advanced:
        "When true, the UI should avoid presenting the classification as fully supported. The correct design response is visible uncertainty, not UI-side invention or silent substitution.",
    },
  }),
  makeEntry({
    key: "confidence.semantics",
    label: "Confidence semantics",
    category: "confidence",
    units: "text",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "confidence.semantics",
    description: {
      basic:
        "A machine-readable reminder of what the confidence score is supposed to mean. It helps keep the UI honest about the interpretation.",
      advanced:
        "The current semantics string identifies the score as a combination of data quality and label stability. This is important because it prevents the product from drifting into a misleading interpretation such as probability of future success or price direction.",
    },
  }),
  makeEntry({
    key: "scorecard.dimensions.demand.score",
    label: "Demand score",
    category: "scorecard",
    units: "0..100",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.demand.score",
    description: {
      basic:
        "A 0-100 score describing how hot the chain's demand side looks relative to its own history. Around 50 is neutral. Higher means more demand pressure. Lower means quieter conditions.",
      advanced:
        "Demand is built from tx_count_daily, unique_active_addresses, and tx_per_user. The raw component scores are combined and then shrunk back toward 50 according to effective confidence. This means high demand scores require both strong signals and enough confidence to trust them.",
    },
  }),
  makeEntry({
    key: "scorecard.dimensions.friction.score",
    label: "Friction score",
    category: "scorecard",
    units: "0..100",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.friction.score",
    description: {
      basic:
        "A 0-100 score describing how difficult or expensive the chain currently looks to use relative to its own history. Higher means more cost or execution friction. Lower means the chain looks easier to use.",
      advanced:
        "Friction is built from fee_burden_proxy and failed_tx_rate. The important subtlety is that this is not just a fee level. It is a composite pressure view of cost and failure-like strain, expressed relative to the chain's own normal behavior and shrunk toward 50 when confidence is weak.",
    },
  }),
  makeEntry({
    key: "scorecard.dimensions.capacity.score",
    label: "Capacity score",
    category: "scorecard",
    units: "0..100",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.capacity.score",
    description: {
      basic:
        "A 0-100 score describing how tight the chain's capacity conditions look. Higher means the chain appears closer to practical throughput pressure. Lower means more room to spare.",
      advanced:
        "Capacity is built from gas_utilization_pct and blocktime_instability. The product uses 'capacity' to mean pressure on usable execution capacity, not installed theoretical capacity. Like the other dimensions, the final score is pulled toward 50 when effective confidence is low.",
    },
  }),
  makeEntry({
    key: "scorecard.dimensions.*.level",
    label: "Scorecard level",
    category: "scorecard",
    units: "category",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.<axis>.level",
    description: {
      basic:
        "The qualitative band attached to a score, such as low, normal, or high. It makes the numeric score easier to read quickly.",
      advanced:
        "Levels are not separate data; they are categorical interpretations of the underlying 0-100 score. The confidence logic also uses score-versus-level margin, because a label should be more trustworthy when the score sits well inside its assigned band rather than barely touching it.",
    },
  }),
  makeEntry({
    key: "scorecard.dimensions.*.coverage_factor",
    label: "Coverage factor",
    category: "scorecard",
    units: "0..1",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.<axis>.coverage_factor",
    description: {
      basic:
        "Coverage factor tells you how many of an axis's expected components were actually available. A lower value means that axis had to be judged with fewer than the ideal supporting inputs.",
      advanced:
        "Each scorecard dimension has an expected component count: Demand expects 3, Friction expects 2, Capacity expects 2. coverage_factor is used together with overall confidence to form effective_confidence for that axis. This is why a dimension can stay visible but become visibly less assertive when component coverage is incomplete.",
    },
  }),
  makeEntry({
    key: "scorecard.dimensions.*.effective_confidence",
    label: "Effective confidence",
    category: "scorecard",
    units: "0..1",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.<axis>.effective_confidence",
    description: {
      basic:
        "Effective confidence is the amount of confidence that actually reaches a single scorecard axis after taking that axis's coverage into account.",
      advanced:
        "The backend computes effective_confidence as base_confidence × coverage_factor for each dimension. The final displayed score is then moved back toward 50 using this value. That is why low effective confidence does not necessarily delete a score; instead it makes the score less extreme and therefore more conservative.",
    },
  }),
  makeEntry({
    key: "scorecard.notes.interpretation",
    label: "Scorecard interpretation note",
    category: "scorecard",
    units: "text",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "scorecard.notes.interpretation",
    description: {
      basic:
        "A built-in note explaining how to read the scorecard. The core idea is simple: scores are 0-100, 50 is neutral versus the chain's own history, and low confidence pulls scores back toward 50.",
      advanced:
        "This note is important because it encodes the product's central score semantics: chain-relative normalization, 50 as neutral midpoint, and confidence-aware shrinkage. Those three ideas are what stop the scorecard from being mistaken for an absolute cross-chain ranking.",
    },
  }),
  makeEntry({
    key: "regime.drivers[].metric",
    label: "Driver metric",
    category: "drivers",
    units: "metric key",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].metric",
    description: {
      basic:
        "The metric currently standing out enough to be listed as a driver of the published regime. Drivers are the pieces of evidence the model thinks are most relevant right now.",
      advanced:
        "Drivers are filtered and ranked from candidate signals, with axis-specific weighting and label-consistency filtering. The result is a compact, published explanation layer showing which metrics most strongly support the classification.",
    },
  }),
  makeEntry({
    key: "regime.drivers[].axis",
    label: "Driver axis",
    category: "drivers",
    units: "category",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].axis",
    description: {
      basic:
        "Which high-level dimension the driver belongs to: demand, friction, or capacity. This tells you what kind of pressure the metric is describing.",
      advanced:
        "The axis field is part of the published explanation payload and should be interpreted as the metric's role inside the scorecard/regime model, not just a cosmetic tag. It lets advanced users trace local signals back to the dimension-level classification logic.",
    },
  }),
  makeEntry({
    key: "regime.drivers[].trend",
    label: "Driver trend",
    category: "drivers",
    units: "category",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].trend",
    description: {
      basic:
        "The directional reading attached to a driver, such as heating, cooling, or flat. It tells you whether the metric has recently been building, fading, or staying roughly unchanged.",
      advanced:
        "Driver trend is part of the regime-engine signal summary and is used both for explanation and for label-consistency checks. For example, HEATING labels prefer drivers that are either high or still directionally heating rather than merely elevated in isolation.",
    },
  }),
  makeEntry({
    key: "regime.drivers[].z_robust",
    label: "Driver robust z-score",
    category: "drivers",
    units: "z-score",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].z_robust",
    description: {
      basic:
        "This tells you how unusual the metric currently looks relative to its own history. The larger the absolute value, the more exceptional the reading is. 'Robust' means the method tries to be less sensitive to outliers than a naive standard deviation approach.",
      advanced:
        "z_robust is one of the main driver-sorting signals in the UI and in backend support logic. It is especially important because label confidence uses driver signal support. Very small absolute z-scores mean the metric is not standing far from its own baseline; large absolute z-scores mean the metric is contributing unusually strong evidence.",
    },
  }),
  makeEntry({
    key: "regime.drivers[].pct_90d",
    label: "Driver 90d percentile",
    category: "drivers",
    units: "percentile",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].pct_90d",
    description: {
      basic:
        "This shows where today's value sits relative to roughly the last 90 days. For example, a value near 95 means the metric is higher than most days in that recent history; a value near 5 means it is lower than most days.",
      advanced:
        "pct_90d is useful because it complements z_robust. z_robust measures standardized unusualness, while percentile gives a direct rank-based location in the recent distribution. Together they make it easier to see whether a metric is merely above average or genuinely near an edge of the recent sample.",
    },
  }),
  makeEntry({
    key: "regime.drivers[].momentum_7d_vs_30d",
    label: "Driver momentum (7d vs 30d)",
    category: "drivers",
    units: "delta",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].momentum_7d_vs_30d",
    description: {
      basic:
        "This compares a shorter recent average with a slower longer average. Positive values usually mean the metric has been accelerating recently. Negative values usually mean it has been cooling or fading.",
      advanced:
        "Momentum 7d vs 30d is the product's compact short-versus-long directional signal. It matters because many descriptive states should care not only about level but also about whether pressure is still building or easing. This is one of the core ingredients that separates a persistent trend from a one-day spike.",
    },
  }),
  makeEntry({
    key: "regime.drivers[].current",
    label: "Driver current value",
    category: "drivers",
    units: "raw metric unit",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].current",
    description: {
      basic:
        "The raw current value of the driver metric. This is the actual metric reading before it is translated into z-scores, percentiles, or scorecard scores.",
      advanced:
        "Raw current values are crucial for traceability because they let advanced users move from explanation back to the underlying observed number. Correct interpretation depends on the metric's own unit definition, not on the driver wrapper itself.",
    },
  }),
  makeEntry({
    key: "tx_count_daily",
    label: "Daily transaction count",
    category: "drivers",
    units: "transactions per day",
    sourcePath: "/api/v1/files/gold/<chain>/<date>.json",
    fieldPath: "tx_count_daily",
    description: {
      basic:
        "The number of transactions observed on the chain for that day. It is one of the clearest direct activity measures: more transactions usually means more throughput demand, though not all transactions are economically equal.",
      advanced:
        "tx_count_daily feeds the Demand axis. In the scorecard it is log-transformed before standardized scoring so very large absolute chains do not dominate purely because of scale. It should be interpreted alongside active addresses and tx_per_user rather than as a standalone demand truth.",
    },
  }),
  makeEntry({
    key: "unique_active_addresses",
    label: "Unique active addresses",
    category: "drivers",
    units: "addresses per day",
    sourcePath: "/api/v1/files/gold/<chain>/<date>.json",
    fieldPath: "unique_active_addresses",
    description: {
      basic:
        "The number of distinct addresses active on the chain that day. It is a rough breadth-of-participation signal: how wide the usage looks, not just how many transactions occurred.",
      advanced:
        "This metric complements tx_count_daily by adding breadth. A chain can have high transaction count concentrated in fewer actors or high breadth with lower per-address activity. The model therefore treats active addresses as a separate demand component rather than collapsing everything into one count.",
    },
  }),
  makeEntry({
    key: "tx_per_user",
    label: "Transactions per active address",
    category: "drivers",
    units: "transactions per address",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.demand.components.tx_per_user.current",
    description: {
      basic:
        "Transactions per active address is a simple intensity measure: how much activity is occurring per active participant. It helps distinguish broad light usage from concentrated heavy usage.",
      advanced:
        "The backend derives tx_per_user as tx_count_daily divided by unique_active_addresses, with zero denominators treated as missing. It is part of the Demand score because a chain where each active address is doing much more than usual can signal demand pressure even if absolute address count alone does not look extreme.",
    },
  }),
  makeEntry({
    key: "median_tx_fee_native",
    label: "Median transaction fee",
    category: "drivers",
    units: "native units per transaction",
    sourcePath: "/api/v1/files/gold/<chain>/<date>.json",
    fieldPath: "median_tx_fee_native",
    description: {
      basic:
        "The median fee paid per transaction in the chain's native token unit. Median is used instead of average because it is less distorted by a few extreme outliers.",
      advanced:
        "The backend does not use median_tx_fee_native alone as the main friction feature. Instead it helps build fee_burden_proxy by normalizing fee against median transaction value when available. This matters because the same absolute fee can feel very different depending on the typical value being moved.",
    },
  }),
  makeEntry({
    key: "median_tx_value_native",
    label: "Median transaction value",
    category: "drivers",
    units: "native units per transaction",
    sourcePath: "/api/v1/files/gold/<chain>/<date>.json",
    fieldPath: "median_tx_value_native",
    description: {
      basic:
        "The median amount moved per transaction in the chain's native unit. It provides context for how large a typical transfer is, which helps when judging whether a fee is light or heavy relative to the value being moved.",
      advanced:
        "This field becomes especially important when constructing fee_burden_proxy = median_tx_fee_native / median_tx_value_native. Without that normalization, raw fees can overstate friction in contexts where transaction values are also large.",
    },
  }),
  makeEntry({
    key: "fee_burden_proxy",
    label: "Fee burden proxy",
    category: "drivers",
    units: "ratio",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.friction.components.fee_burden_proxy.current",
    description: {
      basic:
        "Fee burden proxy is a normalized fee measure: roughly speaking, how large the typical fee is relative to the typical transaction value. It is meant to reflect how 'heavy' fees feel, not just how high they are in absolute token terms.",
      advanced:
        "The backend computes fee_burden_proxy as median_tx_fee_native divided by median_tx_value_native when both are available. It is then log-transformed and standardized into the Friction dimension. This is a better user-cost proxy than raw fee alone because it makes cost interpretable relative to typical economic activity size.",
    },
  }),
  makeEntry({
    key: "failed_tx_rate",
    label: "Failed transaction rate",
    category: "drivers",
    units: "fraction or percent",
    sourcePath: "/api/v1/files/gold/<chain>/<date>.json",
    fieldPath: "failed_tx_rate",
    description: {
      basic:
        "The share of transactions that failed. Higher values suggest more execution friction or adverse conditions for users trying to get transactions through.",
      advanced:
        "failed_tx_rate feeds the Friction axis directly. In a descriptive product like this, it is useful because it reflects realized user-side difficulty rather than theoretical pressure alone. It should usually be read together with fees and utilization rather than in isolation.",
    },
  }),
  makeEntry({
    key: "gas_utilization_pct",
    label: "Gas utilization",
    category: "drivers",
    units: "percent",
    sourcePath: "/api/v1/files/gold/<chain>/<date>.json",
    fieldPath: "gas_utilization_pct",
    description: {
      basic:
        "Gas utilization shows how full the chain's execution capacity was. Higher utilization usually means the chain was operating closer to its practical limit.",
      advanced:
        "gas_utilization_pct is one of the core Capacity-pressure inputs. It is not exactly the same thing as congestion, but sustained high utilization is one of the clearest signs that the network is becoming tight relative to current demand.",
    },
  }),
  makeEntry({
    key: "avg_block_time_sec",
    label: "Average block time",
    category: "drivers",
    units: "seconds",
    sourcePath: "/api/v1/files/gold/<chain>/<date>.json",
    fieldPath: "avg_block_time_sec",
    description: {
      basic:
        "The average time between blocks. Faster or slower block times are not automatically good or bad; what matters is whether they become unusually unstable relative to the chain's own history.",
      advanced:
        "The current model does not treat raw block time as a simple 'higher is worse' signal. Instead it derives blocktime_instability and feeds that into Capacity pressure. The idea is that unusual disruption in block cadence can be more informative than the raw level by itself, especially across chains with different normal block schedules.",
    },
  }),
  makeEntry({
    key: "blocktime_instability",
    label: "Block time instability",
    category: "drivers",
    units: "derived instability signal",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.capacity.components.blocktime_instability.current",
    description: {
      basic:
        "This is a derived signal showing how unusually unstable block timing has recently been. It focuses on irregularity rather than raw speed.",
      advanced:
        "The backend uses a special instability scoring routine for avg_block_time_sec rather than treating the raw value as a standard monotonic signal. That makes this component a better fit for Capacity pressure, because erratic block production can indicate strain even when average block time alone is not obviously extreme.",
    },
  }),
  makeEntry({
    key: "updated_through",
    label: "Updated through",
    category: "freshness",
    units: "YYYY-MM-DD",
    sourcePath: "/api/v1/files/meta/<chain>/latest.json",
    fieldPath: "updated_through",
    description: {
      basic:
        "The most recent date fully covered by the currently published artifact. Think of it as the latest day the published bundle is actually speaking about.",
      advanced:
        "updated_through is a high-priority as-of field for current page rendering. It matters because global publish time and row-level as-of date are not the same thing. The product should always be explicit about which date an interpretation refers to.",
    },
  }),
  makeEntry({
    key: "dataset.version",
    label: "Dataset version",
    category: "metadata",
    units: "version string",
    sourcePath: "/api/v1/files/dataset.json",
    fieldPath: "version",
    description: {
      basic:
        "The version identifier for the currently published dataset manifest. It helps users and developers know which published release they are looking at.",
      advanced:
        "Dataset version is a publish-level traceability field rather than a per-chain analytics field. It is useful for release management, auditing, and correlating visible output changes with specific published artifact versions.",
    },
  }),
  makeEntry({
    key: "dataset.published_at",
    label: "Dataset published at",
    category: "metadata",
    units: "timestamp",
    sourcePath: "/api/v1/files/dataset.json",
    fieldPath: "published_at",
    description: {
      basic:
        "The timestamp when the current dataset manifest was published. This tells you when the release itself happened, which is different from the dates the underlying chain rows refer to.",
      advanced:
        "This field distinguishes dataset publication time from per-chain updated_through or as-of dates. That distinction is critical for a descriptive historical product, because a dataset can be published today while still describing chain conditions from yesterday or earlier for some chains.",
    },
  }),
  makeEntry({
    key: "dataset.methodology_version",
    label: "Methodology version",
    category: "metadata",
    units: "version string",
    sourcePath: "/api/v1/files/dataset.json",
    fieldPath: "methodology_version",
    description: {
      basic:
        "The currently active methodology version for the published dataset. If this changes, users should assume that at least some explanation, calculation, threshold, or mapping may also have changed.",
      advanced:
        "This is a governance-critical traceability field. It allows users to distinguish output changes caused by new chain conditions from output changes caused by methodological revision. In a transparent descriptive product, that distinction is essential.",
    },
  }),
  makeEntry({
    key: "<metric>__ma7",
    label: "7-day moving average",
    category: "charts",
    units: "same as raw metric",
    sourcePath: "/api/v1/files/derived/<chain>/<date>.json",
    fieldPath: "derived.metrics.<metric>__ma7",
    description: {
      basic:
        "A short moving average used to smooth recent day-to-day noise. It helps show whether the latest direction is still building over roughly the last week instead of reacting to one jagged daily point.",
      advanced:
        "The frontend should read MA7 directly from derived artifacts rather than recomputing it locally. In interpretation terms, MA7 is the product's short-horizon trend smoother and is especially useful when compared with MA30 and raw daily values to separate fresh movement from background volatility.",
    },
  }),
  makeEntry({
    key: "<metric>__ma30",
    label: "30-day moving average",
    category: "charts",
    units: "same as raw metric",
    sourcePath: "/api/v1/files/derived/<chain>/<date>.json",
    fieldPath: "derived.metrics.<metric>__ma30",
    description: {
      basic:
        "A longer moving average used to show slower background trend. It is useful because a chain can look very active over a few days while still being ordinary relative to the last month.",
      advanced:
        "MA30 is the product's slower context line. It is most informative when used with raw daily and MA7 values: daily shows immediate movement, MA7 shows short trend, MA30 shows slower baseline. That layering is one of the core pedagogical ideas of the product.",
    },
  }),
];

export function getGlossaryEntry(key: string): GlossaryEntry | undefined {
  return GLOSSARY_ENTRIES.find((entry) => entry.key === key);
}

export function getGlossaryEntriesByCategory(
  category: GlossaryEntry["category"]
): GlossaryEntry[] {
  return GLOSSARY_ENTRIES.filter((entry) => entry.category === category);
}

export const glossary = Object.fromEntries(
  GLOSSARY_ENTRIES.map((entry) => [
    entry.key,
    {
      label: entry.label,
      category: entry.category,
      basic: entry.description.basic,
      advanced: entry.description.advanced,
      units: entry.units,
      sourcePath: entry.sourcePath,
      fieldPath: entry.fieldPath,
    },
  ])
);

export default GLOSSARY_ENTRIES;
