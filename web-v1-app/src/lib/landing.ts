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
    title: "Transaction timing context",
    body:
      "Check whether network conditions look stable, heating, congested, or cheap before you route larger activity through a chain.",
  },
] as const;

export const landingPlans = [
  {
    name: "Free",
    price: "$0",
    accent: "text-slate-300",
    border: "border-white/10 bg-white/5",
    body: "Readable web surface for all supported chains.",
    detail: "Public chain pages, labels, scorecards, drivers, and charts. No subscriber JSON access.",
    href: "/chains",
    cta: "Open live surface →",
  },
  {
    name: "Basic",
    price: "$29/mo",
    accent: "text-cyan-200",
    border: "border-cyan-500/25 bg-cyan-500/8",
    body: "One chain with subscriber JSON access and 90-day history.",
    detail: "Gold, Meta, and Derived JSON for one chain. Built for focused monitoring, research, and downstream use.",
    href: "/sign-up",
    cta: "Start Basic →",
  },
  {
    name: "Pro",
    price: "$79/mo",
    accent: "text-purple-200",
    border: "border-purple-500/25 bg-purple-500/8",
    body: "All four chains with subscriber JSON access and 365-day history.",
    detail: "Gold, Meta, and Derived JSON across Bitcoin, Ethereum, Arbitrum, and Base. Best fit for heavier API and research usage.",
    href: "/sign-up",
    cta: "Start Pro →",
  },
] as const;

export const trustCards = [
  {
    eyebrow: "Methodology",
    title: "How the model decides",
    body:
      "Read the full logic for regime classification, confidence, freshness, and thresholds.",
    href: "/methodology",
  },
  {
    eyebrow: "Track record",
    title: "How the surface has evolved",
    body:
      "Inspect historical labels, transitions, and confidence over time.",
    href: "/track-record",
  },
  {
    eyebrow: "Schema",
    title: "What every field contains",
    body:
      "See Gold, Meta, and Derived fields documented in full.",
    href: "/api-docs/schema",
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
      "Exactly what the blockchain recorded each day — in native units, unmodified. The authoritative source that Meta and Derived are built from. Independently verifiable against any chain explorer.",
    bestFor: "Best for: reproducible raw inputs, independent verification, custom feature engineering.",
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
      "The full analytical output — regime label, confidence score, three-axis scorecard (Demand / Friction / Capacity), and a ranked driver set with z-scores, percentiles, and momentum. This is the commercial heart of the product.",
    bestFor: "Best for: regime research, confidence-gated signals, driver attribution, backtesting.",
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
      "7-day and 30-day rolling averages for every Gold metric. Useful for distinguishing brief spikes from sustained structural shifts. Independently verifiable: any MA7 value is the arithmetic mean of the matching Gold field over the preceding 7 days.",
    bestFor: "Best for: trend charting, spike vs persistence detection, momentum context.",
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
    title: "Chains",
    body: "Open the live chain pages and inspect the current surface for each supported network.",
    href: "/chains",
  },
  {
    title: "Track Record",
    body: "Review prior labels, transitions, and confidence history on the published surface.",
    href: "/track-record",
  },
  {
    title: "Methodology",
    body: "Read the framework, thresholds, and interpretation boundaries in full.",
    href: "/methodology",
  },
  {
    title: "API Docs",
    body: "See schemas, files, and access structure for subscribers and downstream consumers.",
    href: "/api-docs",
  },
] as const;
