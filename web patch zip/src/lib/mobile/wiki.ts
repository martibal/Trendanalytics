// src/lib/mobile/wiki.ts
// Complete wiki/glossary data for Urd Atlas mobile

export type WikiCategory =
  | "regime"
  | "confidence"
  | "scorecard"
  | "pipeline"
  | "json"
  | "chains"
  | "calculations";

export type WikiEntry = {
  key: string;
  label: string;
  category: WikiCategory;
  basic: string;
  advanced: string;
  fieldPath?: string;
  related?: string[];
};

export const WIKI_ENTRIES: WikiEntry[] = [
  // ── Regime labels ────────────────────────────────────────────────────────
  {
    key: "stable",
    label: "STABLE",
    category: "regime",
    basic: "The chain looks broadly normal. All dimensions are within their own recent historical range. No structural deviation detected.",
    advanced: "STABLE is the default label when Demand, Friction, and Capacity axes are all within Normal bands and the confidence gate is met (≥ 0.40). It does not mean 'nothing is happening' — it means current conditions are not meaningfully outside the chain's own 180-day baseline.",
    fieldPath: "status.label",
    related: ["heating", "congested", "cheap", "regime-label", "confidence-score"],
  },
  {
    key: "heating",
    label: "HEATING",
    category: "regime",
    basic: "Demand is building. Activity is above the chain's recent baseline and the 7-day trend is still pointing upward — sustained, not a single spike.",
    advanced: "HEATING requires both elevated level (Demand axis in High band) AND directional persistence (MA7 running ahead of MA30). Level alone is insufficient. This dual requirement means a one-day spike will not trigger HEATING — the move must be sustained across multiple days.",
    fieldPath: "status.label",
    related: ["stable", "congested", "ma7", "ma30", "persistence-filter"],
  },
  {
    key: "congested",
    label: "CONGESTED",
    category: "regime",
    basic: "The chain is under real pressure. Fees are elevated and blocks are filling up relative to this chain's own normal range. The strongest evidence state.",
    advanced: "CONGESTED is triggered when Capacity or Friction axes are in the Extreme High band, or when there is combined pressure across multiple axes simultaneously. It typically coincides with high z-scores on fee and utilization metrics. Chain-relative — CONGESTED on Arbitrum means Arbitrum is congested relative to its own history.",
    fieldPath: "status.label",
    related: ["heating", "stable", "friction-axis", "capacity-axis", "z-score"],
  },
  {
    key: "cheap",
    label: "CHEAP",
    category: "regime",
    basic: "Fees and demand are materially below this chain's recent norms. The network is lightly loaded and easy to use.",
    advanced: "CHEAP requires both Demand and Friction axes in Low or Extreme Low bands, with MA7 running below MA30 on primary signals. Capacity looks unconstrained. Like all labels, CHEAP is chain-relative — cheap on Ethereum means cheap relative to Ethereum's own history.",
    fieldPath: "status.label",
    related: ["stable", "demand-axis", "friction-axis", "ma7", "ma30"],
  },
  {
    key: "unknown-degraded",
    label: "UNKNOWN / DEGRADED",
    category: "regime",
    basic: "The evidence is not strong enough to support a named label. The model publishes this instead of guessing. A low-confidence state is itself informative.",
    advanced: "UNKNOWN/DEGRADED is published when confidence score falls below the canonical 0.40 gate. Triggered by missing data, coverage gaps, or insufficient signal quality. The model never silently promotes a low-confidence state to a named regime — it always shows the honest state.",
    fieldPath: "status.label",
    related: ["confidence-score", "confidence-gate", "regime-label"],
  },
  {
    key: "regime-label",
    label: "Regime label",
    category: "regime",
    basic: "The daily published classification of a chain's on-chain state. One of: STABLE, HEATING, CONGESTED, CHEAP, or UNKNOWN/DEGRADED. Descriptive only — not a price forecast.",
    advanced: "The regime label is produced by deterministic rules over Demand, Friction, and Capacity evidence, with a confidence gate. The frontend reads status.label as canonical, falling back to regime.label if unavailable. Labels are chain-relative and never imply price direction.",
    fieldPath: "status.label",
    related: ["stable", "heating", "congested", "cheap", "unknown-degraded"],
  },
  {
    key: "chain-relative",
    label: "Chain-relative classification",
    category: "regime",
    basic: "HEATING on Ethereum means Ethereum is running hotter than Ethereum normally does — not hotter than Bitcoin. Each chain is scored against its own history, not a universal benchmark.",
    advanced: "Chain-relative normalization uses each chain's own 180-day rolling baseline for z-score computation. This means labels are comparable within a chain over time, but not directly comparable across chains. ARB CONGESTED and ETH CONGESTED may reflect very different absolute conditions.",
    related: ["z-score", "baseline-180d", "regime-label"],
  },

  // ── Confidence ───────────────────────────────────────────────────────────
  {
    key: "confidence-score",
    label: "Confidence score",
    category: "confidence",
    basic: "A number from 0 to 1 showing how much evidence supports the current label. Higher is stronger. Below 0.40, no named label is published.",
    advanced: "Confidence is a composite of five components: current_row_coverage, recent_metric_coverage, history_depth, recent_density, and freshness_asof. It reflects evidence quality, not forecast probability. It is not the probability that the label will persist.",
    fieldPath: "confidence.confidence_score",
    related: ["confidence-gate", "confidence-components", "unknown-degraded"],
  },
  {
    key: "confidence-gate",
    label: "Confidence gate (0.40)",
    category: "confidence",
    basic: "The minimum confidence score required to publish a named label. Below 0.40, the model publishes UNKNOWN/DEGRADED instead of guessing.",
    advanced: "The canonical publish floor is 0.40. This is a hard gate — it prevents low-evidence states from being presented as confident classifications. The 0.40 threshold is published at /thresholds and versioned in the methodology. It can be inspected in publish_confidence.threshold in the Meta JSON.",
    fieldPath: "publish_confidence.threshold",
    related: ["confidence-score", "unknown-degraded"],
  },
  {
    key: "confidence-bands",
    label: "Confidence bands",
    category: "confidence",
    basic: "Three bands: Good (≥ 0.70), Caution (0.40–0.70), and Degraded (< 0.40). Good means the label is well-supported. Caution means it is still valid but read with care.",
    advanced: "Bands are display conventions, not hard model thresholds (only 0.40 is a hard gate). Good (≥ 0.70) indicates strong evidence across all five confidence components. Caution (0.40–0.70) indicates sufficient evidence but some components are weaker than ideal.",
    related: ["confidence-score", "confidence-gate"],
  },
  {
    key: "confidence-components",
    label: "Confidence components",
    category: "confidence",
    basic: "Five factors that combine into the confidence score: data coverage today, recent coverage, how much history is available, how dense the recent data is, and how fresh the data is.",
    advanced: "The five components are: current_row_coverage (fraction of expected metrics present today), recent_metric_coverage (coverage quality over recent window), history_depth (whether 180-day baseline is sufficient), recent_density (proportion of recent days with published data), and freshness_asof (currency relative to expected cadence).",
    fieldPath: "confidence.components",
    related: ["confidence-score", "lag"],
  },

  // ── Scorecard ─────────────────────────────────────────────────────────────
  {
    key: "scorecard",
    label: "Scorecard",
    category: "scorecard",
    basic: "A breakdown of the chain's current state into three dimensions: Demand, Friction, and Capacity. Each is scored 0–100, where 50 is neutral.",
    advanced: "The scorecard is a descriptive decomposition produced by the regime engine. Each axis aggregates z-scores from its assigned metrics into a composite score normalized to 0–100 with tanh compression. Low confidence pulls scores toward 50 — weak evidence should not produce extreme numbers.",
    fieldPath: "scorecard.dimensions",
    related: ["demand-axis", "friction-axis", "capacity-axis", "confidence-score"],
  },
  {
    key: "demand-axis",
    label: "Demand axis",
    category: "scorecard",
    basic: "How much usage pressure the chain is carrying. High score means the chain is being used more than usual.",
    advanced: "Demand is primarily driven by tx_count_daily and unique_active_addresses. Both metrics must show elevated z-scores and percentiles for Demand to reach a high band. Score is 0–100 where 50 is the chain's historical neutral.",
    fieldPath: "scorecard.dimensions.demand",
    related: ["friction-axis", "capacity-axis", "scorecard", "z-score"],
  },
  {
    key: "friction-axis",
    label: "Friction axis",
    category: "scorecard",
    basic: "How costly or difficult it is to use the chain right now. High friction means elevated fees or high failure rates.",
    advanced: "Friction is driven by median_tx_fee_native and failed_tx_rate (where published). For Bitcoin, fee burden is proxied differently since failed_tx_rate is not applicable. High friction combined with high demand is the primary driver of CONGESTED labels.",
    fieldPath: "scorecard.dimensions.friction",
    related: ["demand-axis", "capacity-axis", "scorecard"],
  },
  {
    key: "capacity-axis",
    label: "Capacity axis",
    category: "scorecard",
    basic: "How constrained the chain is relative to its own range. High capacity score means blocks are nearly full or block production is becoming irregular.",
    advanced: "For EVM chains, gas_utilization_pct is the primary signal. For Bitcoin, avg_block_time_sec instability is used as a capacity proxy. High capacity pressure combined with friction is typically the CONGESTED trigger.",
    fieldPath: "scorecard.dimensions.capacity",
    related: ["demand-axis", "friction-axis", "scorecard"],
  },
  {
    key: "drivers",
    label: "Driver attribution",
    category: "scorecard",
    basic: "The specific metrics driving the current label, ranked by how unusual they are. Shows why the label was assigned, not just what it is.",
    advanced: "Drivers are ranked by z-score magnitude. Each driver row contains: metric name, current value, z_robust, pct_90d (percentile rank), momentum_7d_vs_30d, trend direction, and axis assignment. This is the 'because' layer under the scorecard.",
    fieldPath: "regime.drivers",
    related: ["scorecard", "z-score", "ma7", "ma30"],
  },

  // ── Calculations ─────────────────────────────────────────────────────────
  {
    key: "z-score",
    label: "Robust z-score",
    category: "calculations",
    basic: "A number that shows how far today's reading is from the chain's own recent median. Zero is normal. Positive means above average. Negative means below average.",
    advanced: "Formula: z_robust = (x − median) / (MAD × 1.4826). Uses median and MAD instead of mean and standard deviation, making it resistant to outliers. A single extreme day in the 180-day window will not distort the baseline. The 1.4826 constant makes MAD comparable to standard deviation for normally distributed data.",
    related: ["baseline-180d", "mad", "tanh-compression"],
  },
  {
    key: "mad",
    label: "MAD (Median Absolute Deviation)",
    category: "calculations",
    basic: "A measure of how spread out the data is, resistant to extreme values. Used instead of standard deviation to make the z-score more robust.",
    advanced: "MAD = median(|x_i − median(x)|). It is the median of the absolute deviations from the median. Multiplied by 1.4826 to scale it to be comparable with standard deviation. This makes the robust z-score formula resistant to outliers in the 180-day baseline.",
    related: ["z-score", "baseline-180d"],
  },
  {
    key: "tanh-compression",
    label: "tanh compression",
    category: "calculations",
    basic: "A mathematical function applied to z-scores before they are used in the scorecard. It prevents extreme values from dominating the score while preserving direction.",
    advanced: "The hyperbolic tangent (tanh) compresses raw z-scores to a bounded range. This ensures that a very extreme reading (z = 10) does not overwhelm a moderately elevated reading (z = 2) in the composite scorecard axis score. The sign and relative magnitude are preserved.",
    related: ["z-score", "scorecard"],
  },
  {
    key: "baseline-180d",
    label: "180-day baseline",
    category: "calculations",
    basic: "The 180 most recent daily values for each metric on each chain. This is what today's reading is compared against.",
    advanced: "The rolling 180-day window covers roughly two quarters — long enough for meaningful seasonal variation, short enough to adapt as conditions evolve. Each chain has its own baseline. The window rolls forward daily, so events from 7+ months ago gradually leave the reference set.",
    related: ["z-score", "chain-relative", "persistence-filter"],
  },
  {
    key: "persistence-filter",
    label: "Persistence filter",
    category: "calculations",
    basic: "A rule that requires a signal to last at least 3 consecutive days before it contributes to a regime change. Prevents single-day spikes from changing the label.",
    advanced: "The canonical minimum persistence is 3 days. A band assignment from a single day is insufficient for a regime label change. Combined with MA7 vs MA30 momentum comparison: when MA7 runs ahead of MA30, the signal is directionally confirmed. Labels are deliberately lagging — they confirm persistence before publishing.",
    related: ["ma7", "ma30", "regime-label", "baseline-180d"],
  },
  {
    key: "percentile-rank",
    label: "Percentile rank (90d)",
    category: "calculations",
    basic: "Where today's value sits in the last 90 days of data, as a percentage. 95th percentile means today's value is higher than 95% of the last 90 days.",
    advanced: "Used alongside z-score for band assignment. Both the percentile threshold AND the z-score threshold must be met for a band assignment. This dual-gate reduces false assignments from outliers in either measure. Extreme High requires ≥ 95th percentile AND z ≥ +2.5.",
    fieldPath: "regime.drivers[].pct_90d",
    related: ["z-score", "banding-thresholds"],
  },
  {
    key: "banding-thresholds",
    label: "Banding thresholds",
    category: "calculations",
    basic: "The rules that decide whether a metric is High, Normal, or Low. Both a percentile cutoff AND a z-score cutoff must be met.",
    advanced: "Five bands: Extreme High (≥ 95th pct AND z ≥ +2.5), High (≥ 80th pct AND z ≥ +1.5), Normal (20–80th pct, z −1.5 to +1.5), Low (≤ 20th pct AND z ≤ −1.5), Extreme Low (≤ 5th pct AND z ≤ −2.5). Published at /thresholds and versioned.",
    related: ["z-score", "percentile-rank", "persistence-filter"],
  },
  {
    key: "ma7",
    label: "MA7 (7-day moving average)",
    category: "calculations",
    basic: "The average of the last 7 days for a metric. Shows short-term trend direction and smooths out single-day noise.",
    advanced: "MA7 is published in the Derived JSON as <metric>__ma7. It is the arithmetic mean of the matching Gold field over the preceding 7 days. When MA7 runs ahead of MA30, momentum is positive (HEATING direction). When below, momentum is negative (COOLING direction).",
    fieldPath: "<metric>__ma7",
    related: ["ma30", "persistence-filter", "drivers"],
  },
  {
    key: "ma30",
    label: "MA30 (30-day moving average)",
    category: "calculations",
    basic: "The average of the last 30 days for a metric. Shows the medium-term trend and context for the short-term MA7.",
    advanced: "MA30 is published in the Derived JSON as <metric>__ma30. It is the arithmetic mean of the matching Gold field over the preceding 30 days. The MA7 vs MA30 comparison is the momentum signal used in the persistence filter and driver attribution.",
    fieldPath: "<metric>__ma30",
    related: ["ma7", "persistence-filter", "drivers"],
  },
  {
    key: "determinism-hash",
    label: "Determinism hash",
    category: "calculations",
    basic: "A unique fingerprint for each published label, computed from its exact inputs. Lets you verify that a past label was not changed after publication.",
    advanced: "SHA-256 hash computed from: Gold input values, 180-day baseline used, threshold parameters in effect, and methodology version. Published as regime.determinism_hash in every Meta artifact. Any retroactive reclassification would change the hash — making silent adjustments detectable.",
    fieldPath: "regime.determinism_hash",
    related: ["regime-label", "gold-json", "meta-json"],
  },

  // ── JSON structure ────────────────────────────────────────────────────────
  {
    key: "gold-json",
    label: "Gold JSON",
    category: "json",
    basic: "The raw daily observations — transaction counts, fees, block times, and active addresses. Exactly what the blockchain recorded, in native units.",
    advanced: "Gold is the canonical source layer. Fields include tx_count_daily, median_tx_fee_native, gas_utilization_pct (EVM only), unique_active_addresses, avg_block_time_sec, failed_tx_rate (EVM only), avg_gas_per_tx, and median_gas_price. All downstream Meta and Derived values are built from Gold.",
    fieldPath: "gold/<chain>/<date>.json",
    related: ["meta-json", "derived-json"],
  },
  {
    key: "meta-json",
    label: "Meta JSON",
    category: "json",
    basic: "The main product output. Contains the regime label, confidence score, scorecard, and driver attribution — the full analytical result.",
    advanced: "Meta is the intelligence layer. Key fields: status.label (regime), confidence.confidence_score, scorecard.dimensions (Demand/Friction/Capacity), regime.drivers[], regime.determinism_hash, publish_confidence, profile (chain-specific metric config). Available at meta/<chain>/latest.json.",
    fieldPath: "meta/<chain>/latest.json",
    related: ["gold-json", "derived-json", "regime-label", "scorecard"],
  },
  {
    key: "derived-json",
    label: "Derived JSON",
    category: "json",
    basic: "Smoothed trend series — 7-day and 30-day rolling averages for every Gold metric. Helps separate persistent moves from single-day spikes.",
    advanced: "Derived contains <metric>__ma7 and <metric>__ma30 for every Gold field. Each MA7 value is verifiable as the arithmetic mean of the matching Gold field over the preceding 7 days. Also contains meta_confidence for chart rendering. Available at derived/<chain>/last{N}d.json.",
    fieldPath: "derived/<chain>/last{N}d.json",
    related: ["gold-json", "meta-json", "ma7", "ma30"],
  },

  // ── Pipeline ──────────────────────────────────────────────────────────────
  {
    key: "pipeline",
    label: "Pipeline",
    category: "pipeline",
    basic: "The automated daily process that reads raw blockchain data, runs the classification, and publishes the JSON files. Runs around 09:00 and 21:00 Europe/Oslo.",
    advanced: "Deterministic and idempotent per (chain, date) — rerunning with the same inputs produces the same outputs. Reads from AWS Public Blockchain Data, aggregates daily features (CANON_COLS), computes regime engine output, and publishes Gold, Meta, and Derived artifacts. Each run is versioned by revision_id and methodology_version.",
    related: ["gold-json", "meta-json", "lag", "aws-data"],
  },
  {
    key: "lag",
    label: "Lag / Freshness",
    category: "pipeline",
    basic: "How many days behind the published data is relative to today. BTC and ETH typically show 1-day lag. ARB and BASE intentionally publish with ~7-day lag.",
    advanced: "Lag is computed as the difference between as_of_date and UTC today. It is distinct from confidence — a row can be on schedule (low lag) but still low-confidence. ARB and BASE have an expected 7-day publication cadence by design, not a pipeline failure. Lag fields: confidence.lag_days_vs_utc_today and confidence.lag_days_vs_asof_date.",
    fieldPath: "confidence.lag_days_vs_utc_today",
    related: ["confidence-score", "pipeline", "freshness"],
  },
  {
    key: "freshness",
    label: "Freshness",
    category: "pipeline",
    basic: "Whether the published data is current relative to the expected publication schedule. ON SCHEDULE means data arrived within normal cadence. WARN and FAIL mean it is delayed.",
    advanced: "Freshness states: ON SCHEDULE (lag ≤ expected), SOFT WARNING (lag > expected but < hard fail), HARD FAIL (lag > hard fail threshold), DEGRADED (confidence < 0.40), UNKNOWN. BTC/ETH expected: ~1d, soft: >2d, hard: >4d. ARB/BASE expected: ~7d, soft: >10d, hard: >15d.",
    related: ["lag", "pipeline"],
  },
  {
    key: "aws-data",
    label: "AWS Public Blockchain Data",
    category: "pipeline",
    basic: "The publicly available blockchain dataset that Urd Atlas reads as its data source. Free to access, maintained by AWS and data partners.",
    advanced: "AWS Public Blockchain Data provides parquet-format datasets for BTC, ETH, ARB, BASE, and others via the Registry of Open Data on AWS (registry.opendata.aws/aws-public-blockchain). Maintained in collaboration with SonarX for L2 chains. Urd Atlas does not redistribute this raw data — it sells the analytical layer built on top of it.",
    related: ["gold-json", "pipeline"],
  },

  // ── Chains ────────────────────────────────────────────────────────────────
  {
    key: "bitcoin",
    label: "Bitcoin (BTC)",
    category: "chains",
    basic: "The original peer-to-peer cash network. Uses UTXO model, not EVM. Demand and congestion are read through transaction counts, fees, and block timing.",
    advanced: "BTC does not have EVM gas semantics. gas_utilization_pct, failed_tx_rate, and related EVM fields are intentionally hidden. Capacity is proxied through avg_block_time_sec instability. Fee spikes can be sharp and episodic due to block-space competition.",
    related: ["ethereum", "chain-relative", "capacity-axis"],
  },
  {
    key: "ethereum",
    label: "Ethereum (ETH)",
    category: "chains",
    basic: "The main smart-contract base layer. EVM with gas-based block capacity and EIP-1559 fee mechanics. Richest signal surface of the four chains.",
    advanced: "ETH has the fullest metric profile — all Gold fields are active. Friction is visible through gas_utilization_pct, failed_tx_rate, and median_tx_fee_native. The richer signal surface means the regime engine has more to work with than on BTC or L2s.",
    related: ["bitcoin", "arbitrum", "base", "chain-relative"],
  },
  {
    key: "arbitrum",
    label: "Arbitrum (ARB)",
    category: "chains",
    basic: "An Ethereum L2 optimistic rollup. Transactions go through a sequencer and are settled on Ethereum. Publishes on a ~7-day cadence — this is expected, not a delay.",
    advanced: "ARB hides gas_utilization_pct and failed_tx_rate. Capacity is read from capacity_util_pct and blocktime behaviour. Fee interpretation is two-dimensional: L2 execution cost + L1 settlement cost. 7-day publication lag is part of the normal publication policy.",
    related: ["base", "ethereum", "lag"],
  },
  {
    key: "base",
    label: "Base (BASE)",
    category: "chains",
    basic: "An Ethereum L2 built on the OP Stack by Coinbase. Like Arbitrum, publishes on a ~7-day cadence and has a two-part fee structure.",
    advanced: "Base hides gas_utilization_pct and failed_tx_rate. User transactions include both L2 execution cost and L1 security/publication cost. Low local demand does not guarantee low total fee if parent-chain conditions worsen. 7-day publication lag is expected and normal.",
    related: ["arbitrum", "ethereum", "lag"],
  },
];

export const WIKI_CATEGORIES: { key: WikiCategory; label: string; description: string }[] = [
  { key: "regime", label: "Regime labels", description: "What the labels mean and how they are assigned" },
  { key: "confidence", label: "Confidence & freshness", description: "Evidence quality and data currency" },
  { key: "scorecard", label: "Scorecard & drivers", description: "Demand, Friction, Capacity axes and what drives them" },
  { key: "calculations", label: "Calculations", description: "Formulas, baselines, and statistical methods" },
  { key: "json", label: "JSON structure", description: "Gold, Meta, and Derived file formats" },
  { key: "pipeline", label: "Pipeline & data", description: "How and when data is published" },
  { key: "chains", label: "The four chains", description: "BTC, ETH, ARB, and BASE explained" },
];

export function searchWiki(query: string): WikiEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return WIKI_ENTRIES;
  return WIKI_ENTRIES.filter(
    (e) =>
      e.label.toLowerCase().includes(q) ||
      e.basic.toLowerCase().includes(q) ||
      e.key.toLowerCase().includes(q) ||
      (e.fieldPath && e.fieldPath.toLowerCase().includes(q))
  );
}

export function getWikiEntry(key: string): WikiEntry | undefined {
  return WIKI_ENTRIES.find((e) => e.key === key);
}

export function getWikiByCategory(category: WikiCategory): WikiEntry[] {
  return WIKI_ENTRIES.filter((e) => e.category === category);
}
