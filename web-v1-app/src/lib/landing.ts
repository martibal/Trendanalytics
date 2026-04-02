export const heroTagline =
  "On-chain noise looks identical to structural shifts - until you run the numbers properly.";

export const heroBodyParagraphs = [
  "Separating a real regime shift from a three-day spike requires daily aggregation, robust z-score baselines, confidence gating, and enough historical depth to know what 'unusual' actually means for each chain.",
  "That pipeline - AWS ingestion, daily aggregation, z-score baselines, confidence gating, artifact publishing, and historical storage - takes weeks to build and needs ongoing maintenance across four chains with different data models. TrendAnalytics runs it daily and delivers the output as documented Gold, Meta, and Derived JSON you can pull directly into your own workflow.",
] as const;

export const heroPipelineEyebrow = "WHAT THE PIPELINE DOES";
export const heroPipelineTitle = "What makes the numbers meaningful.";
export const heroPipelineBody =
  "The regime labels and confidence scores are only meaningful because of what happens before them. Each step exists to make the output trustworthy rather than just fast.";

export const heroPipelinePoints = [
  {
    title: "Daily aggregation across four chains",
    body: "Raw AWS Public Blockchain Data pulled, cleaned, and aggregated to canonical daily Gold metrics - the same inputs every downstream calculation depends on.",
  },
  {
    title: "Robust z-score baselines, not simple averages",
    body: "MAD-based standardisation so heavy-tailed on-chain distributions do not produce misleading signals. Each metric is scored against its own chain-specific recent history.",
  },
  {
    title: "Confidence gating before any label is published",
    body: "A composite evidence-quality score gates every label. Below 0.40, no regime label is published - the system says UNKNOWN/DEGRADED rather than guess.",
  },
  {
    title: "Versioned artifacts with determinism hashes",
    body: "Every published label is anchored to a hash of its inputs and methodology version. Retroactive reclassification is detectable. The track record is auditable.",
  },
] as const;

export const landingProofChips = [
  { label: "Coverage", value: "4 chains" },
  { label: "Outputs", value: "Gold · Meta · Derived" },
  { label: "Interpretation", value: "No price or signals" },
  { label: "Delivery", value: "Published daily" },
] as const;

export const landingUseCases = [
  {
    title: "Research and market context",
    body:
      "Use regime labels, drivers, and confidence to frame what is happening on each chain without rebuilding the whole interpretation layer yourself.",
  },
  {
    title: "API-first downstream analysis",
    body:
      "Pull Gold, Meta, and Derived JSON directly into your own workflows, dashboards, or internal notebooks.",
  },
  {
    title: "Regime-conditioned research without the baseline work",
    body:
      "Use the published z-scores, percentiles, confidence bands, and driver attribution as inputs to your own models - without computing the baselines yourself from raw chain data.",
  },
] as const;

export const landingPlans = [
  {
    name: "Free",
    price: "$0",
    tierTag: "Public site",
    accent: "text-slate-300",
    border: "border-white/10 bg-white/5",
    body: "Readable web surface across the published product.",
    detail:
      "Track record, status, methodology, glossary, thresholds, and schema reference. The public site reads the same published artifacts subscribers receive - but without API access or raw file download.",
    href: "/track-record",
    cta: "Open public surface →",
  },
  {
    name: "Basic",
    price: "$29/mo",
    tierTag: "1 chain · 90d JSON",
    accent: "text-cyan-200",
    border: "border-cyan-500/25 bg-cyan-500/8",
    body: "One chain with subscriber JSON access and 90-day history.",
    detail:
      "Gold, Meta, and Derived JSON for one chain. Built for focused monitoring, research, and downstream use.",
    href: "/sign-up",
    cta: "Start Basic →",
  },
  {
    name: "Pro",
    price: "$79/mo",
    tierTag: "4 chains · 365d JSON",
    accent: "text-purple-200",
    border: "border-purple-500/25 bg-purple-500/8",
    body: "All four chains with subscriber JSON access and 365-day history.",
    detail:
      "Gold, Meta, and Derived JSON across Bitcoin, Ethereum, Arbitrum, and Base. Best fit for heavier API and research usage.",
    href: "/sign-up",
    cta: "Start Pro →",
  },
] as const;

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
      "Exactly what the blockchain recorded each day - in native units, unmodified. The authoritative source that Meta and Derived are built from. Independently verifiable against any chain explorer.",
    bestFor:
      "Best for: reproducible raw inputs, independent verification, custom feature engineering.",
    fields: [
      { key: "tx_count_daily", note: "Daily transaction count" },
      { key: "median_tx_fee_native", note: "Typical cost per transaction" },
      { key: "gas_utilization_pct", note: "Block fullness - ETH L1 only" },
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
      "The full analytical output - regime label, confidence score, three-axis scorecard (Demand / Friction / Capacity), and a ranked driver set with z-scores, percentiles, and momentum. This is the commercial heart of the product.",
    bestFor:
      "Best for: regime research, confidence-gated signals, driver attribution, backtesting.",
    fields: [
      { key: "status.label", note: "STABLE / HEATING / CONGESTED / CHEAP" },
      { key: "confidence.confidence_score", note: "Evidence quality, 0-1" },
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
      "7-day and 30-day rolling averages for every Gold metric. Useful for distinguishing brief spikes from sustained structural shifts. Independently verifiable: any MA7 value is the arithmetic mean of the matching Gold field over the preceding 7 days.",
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

export const exploreCards = [
  {
    title: "Track Record",
    body: "Inspect historical labels, transitions, and confidence over time.",
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
