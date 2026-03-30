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
    accent: "text-slate-400",
    border: "border-white/10 bg-white/5",
    body:
      "Public chain pages, labels, scorecards, drivers, and charts.",
    href: "/chains",
    cta: "Open live surface →",
  },
  {
    name: "Basic",
    price: "$29/mo",
    accent: "text-cyan-200",
    border: "border-cyan-500/25 bg-cyan-500/8",
    body:
      "One chain. Gold, Meta, and Derived JSON. Up to 90 days of history.",
    href: "/sign-up",
    cta: "Start Basic →",
  },
  {
    name: "Pro",
    price: "$79/mo",
    accent: "text-purple-200",
    border: "border-purple-500/25 bg-purple-500/8",
    body:
      "All four chains. Longer history. Built for heavier API and research usage.",
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
    eyebrow: "Gold JSON",
    title: "Measured daily facts",
    bestFor: "Best for: reproducible raw inputs",
    body:
      "Daily chain observations such as activity, fees, addresses, and operating conditions exactly as published.",
  },
  {
    eyebrow: "Meta JSON",
    title: "Daily regime decision",
    bestFor: "Best for: fastest analytical read",
    body:
      "The interpretation layer with label, confidence, scorecard, and ranked drivers. This is the commercial heart of the product.",
  },
  {
    eyebrow: "Derived JSON",
    title: "Trend smoothing and persistence",
    bestFor: "Best for: persistence vs spike detection",
    body:
      "Smoothed moving-average context built from Gold so you can distinguish fading moves from sustained ones.",
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
