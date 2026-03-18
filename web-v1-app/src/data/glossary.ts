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

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    key: "status.label",
    label: "Regime label",
    category: "regime",
    units: "category",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "status.label",
    description: {
      basic: "The published descriptive label for the chain’s current operating state.",
      advanced:
        "Rendered from meta.status.label, with fallback to regime.label when needed. The frontend does not recompute this value.",
    },
  },
  {
    key: "status.one_liner",
    label: "Regime one-liner",
    category: "regime",
    units: "text",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "status.one_liner",
    description: {
      basic: "A short descriptive summary of the current chain context.",
      advanced:
        "Published alongside the regime label and rendered directly in chain and landing views without UI-side inference.",
    },
  },
  {
    key: "status.color",
    label: "Regime color",
    category: "regime",
    units: "UI token",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "status.color",
    description: {
      basic: "A published color hint used to style the regime badge.",
      advanced:
        "Used as the first-priority source for RegimeBadge styling. If missing or inconsistent, deterministic fallback mapping is applied in the UI.",
    },
  },
  {
    key: "confidence.confidence_score",
    label: "Confidence score",
    category: "confidence",
    units: "0..1",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "confidence.confidence_score",
    description: {
      basic: "A published score describing how reliable the current descriptive regime view is.",
      advanced:
        "Read directly from meta.confidence.confidence_score. UI banding such as Good/Caution/Degraded is presentation-only and does not alter the underlying score.",
    },
  },
  {
    key: "confidence.lag_days_vs_utc_today",
    label: "Lag days",
    category: "freshness",
    units: "days",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "confidence.lag_days_vs_utc_today",
    description: {
      basic: "How many days behind the latest published chain data is relative to today.",
      advanced:
        "Used by StalenessBar and freshness indicators. If missing, lag may be inferred from published as-of dates using deterministic fallback logic.",
    },
  },
  {
    key: "confidence.missing",
    label: "Confidence missing flag",
    category: "confidence",
    units: "boolean",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "confidence.missing",
    description: {
      basic: "A flag indicating confidence-related data may be incomplete.",
      advanced:
        "When true, the UI should treat the confidence layer cautiously and avoid pretending the signal is fully supported.",
    },
  },
  {
    key: "regime.label",
    label: "Regime label fallback",
    category: "regime",
    units: "category",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "regime.label",
    description: {
      basic: "Fallback regime label when the newer status.label field is unavailable.",
      advanced:
        "Used only as a deterministic fallback. The preferred field in the UI contract is status.label.",
    },
  },
  {
    key: "regime.asof_date",
    label: "Regime as-of date",
    category: "freshness",
    units: "YYYY-MM-DD",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "regime.asof_date",
    description: {
      basic: "The published date the regime assessment refers to.",
      advanced:
        "Used as one of the fallback date fields for per-chain freshness and as-of rendering.",
    },
  },
  {
    key: "regime.window_days",
    label: "Regime window days",
    category: "regime",
    units: "days",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "regime.window_days",
    description: {
      basic: "The published historical window used by the regime calculation.",
      advanced:
        "Displayed for traceability and audit context. It is not recomputed in the frontend.",
    },
  },
  {
    key: "regime.determinism_hash",
    label: "Determinism hash",
    category: "metadata",
    units: "hash",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "regime.determinism_hash",
    description: {
      basic: "A compact identifier for the exact deterministic ruleset that produced the published output.",
      advanced:
        "Useful for auditability when methodology or scoring logic changes. The UI displays it but does not interpret it.",
    },
  },
  {
    key: "regime.drivers[].metric",
    label: "Driver metric",
    category: "drivers",
    units: "metric key",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].metric",
    description: {
      basic: "The metric currently standing out enough to be listed as a driver.",
      advanced:
        "This is a published metric key and should map to glossary/tooling definitions elsewhere in the app.",
    },
  },
  {
    key: "regime.drivers[].axis",
    label: "Driver axis",
    category: "drivers",
    units: "category",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].axis",
    description: {
      basic: "Which high-level dimension the driver belongs to, such as demand, friction, or capacity.",
      advanced:
        "Rendered directly from the published axis value; no UI-side reclassification is applied.",
    },
  },
  {
    key: "regime.drivers[].trend",
    label: "Driver trend",
    category: "drivers",
    units: "category",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].trend",
    description: {
      basic: "The published directional trend label associated with the driver.",
      advanced:
        "A descriptive field used in driver tables and current-anomaly summaries; it is not inferred by the UI.",
    },
  },
  {
    key: "regime.drivers[].z_robust",
    label: "Driver robust z-score",
    category: "drivers",
    units: "z-score",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].z_robust",
    description: {
      basic: "How unusually high or low a driver is relative to its historical behavior.",
      advanced:
        "Used for deterministic sorting in driver views via abs(z_robust). The frontend displays the published value only.",
    },
  },
  {
    key: "regime.drivers[].pct_90d",
    label: "Driver 90d percentile",
    category: "drivers",
    units: "percent",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].pct_90d",
    description: {
      basic: "Where the current driver value sits relative to roughly the last 90 days.",
      advanced:
        "Published as a 0–100 percentile-style field. The UI adds formatting only, such as a percent suffix.",
    },
  },
  {
    key: "regime.drivers[].momentum_7d_vs_30d",
    label: "Driver momentum (7d vs 30d)",
    category: "drivers",
    units: "delta",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].momentum_7d_vs_30d",
    description: {
      basic: "A short-versus-long comparison showing whether the driver has recently accelerated or slowed.",
      advanced:
        "Published directly in meta drivers. The UI may format sign/highlight thresholds but does not recalculate momentum.",
    },
  },
  {
    key: "regime.drivers[].current",
    label: "Driver current value",
    category: "drivers",
    units: "raw metric unit",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "regime.drivers[].current",
    description: {
      basic: "The current raw value for the driver metric.",
      advanced:
        "Displayed for context next to trend/z/percentile fields. Correct interpretation depends on the metric’s own unit definition.",
    },
  },
  {
    key: "scorecard.dimensions.demand.score",
    label: "Demand score",
    category: "scorecard",
    units: "0..100",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.demand.score",
    description: {
      basic: "A published 0–100 score describing the current demand-side state for the chain.",
      advanced:
        "Rendered directly in ScoreGauge. The frontend does not compute or rescale this score.",
    },
  },
  {
    key: "scorecard.dimensions.friction.score",
    label: "Friction score",
    category: "scorecard",
    units: "0..100",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.friction.score",
    description: {
      basic: "A published 0–100 score describing current friction conditions such as congestion or fee-related pressure.",
      advanced:
        "Shown in the Friction gauge using the published value only.",
    },
  },
  {
    key: "scorecard.dimensions.capacity.score",
    label: "Capacity score",
    category: "scorecard",
    units: "0..100",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.capacity.score",
    description: {
      basic: "A published 0–100 score describing the chain’s current capacity-side conditions.",
      advanced:
        "Displayed directly in the Capacity gauge. Missing values should remain visibly unavailable rather than invented.",
    },
  },
  {
    key: "scorecard.dimensions.*.level",
    label: "Scorecard level",
    category: "scorecard",
    units: "category",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.<axis>.level",
    description: {
      basic: "A published qualitative label that accompanies a scorecard score.",
      advanced:
        "Used as supporting text in the UI next to the corresponding gauge or score.",
    },
  },
  {
    key: "scorecard.dimensions.*.coverage_factor",
    label: "Coverage factor",
    category: "scorecard",
    units: "0..1",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.<axis>.coverage_factor",
    description: {
      basic: "A published indicator of how complete the supporting data is for a given scorecard axis.",
      advanced:
        "Shown as a supporting advanced field. It is not recomputed in the UI.",
    },
  },
  {
    key: "scorecard.dimensions.*.effective_confidence",
    label: "Effective confidence",
    category: "scorecard",
    units: "0..1",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "scorecard.dimensions.<axis>.effective_confidence",
    description: {
      basic: "A published confidence-like value specific to an individual scorecard axis.",
      advanced:
        "Used for advanced traceability. The frontend only displays the value that was published.",
    },
  },
  {
    key: "scorecard.notes.interpretation",
    label: "Scorecard interpretation note",
    category: "scorecard",
    units: "text",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "scorecard.notes.interpretation",
    description: {
      basic: "A published short interpretation note explaining the current scorecard in plain language.",
      advanced:
        "This is pipeline-authored documentation-like text, not UI-generated commentary.",
    },
  },
  {
    key: "updated_through",
    label: "Updated through",
    category: "freshness",
    units: "YYYY-MM-DD",
    sourcePath: "/public/data/published/v1/meta/<chain>/latest.json",
    fieldPath: "updated_through",
    description: {
      basic: "The most recent date fully covered by the currently published artifact.",
      advanced:
        "Used as the first-priority as-of date on landing and chain pages when present.",
    },
  },
  {
    key: "dataset.version",
    label: "Dataset version",
    category: "metadata",
    units: "version string",
    sourcePath: "/public/data/published/v1/dataset.json",
    fieldPath: "version",
    description: {
      basic: "The version identifier for the currently published dataset manifest.",
      advanced:
        "Used for release traceability at dataset scope rather than per-chain scope.",
    },
  },
  {
    key: "dataset.published_at",
    label: "Dataset published at",
    category: "metadata",
    units: "timestamp",
    sourcePath: "/public/data/published/v1/dataset.json",
    fieldPath: "published_at",
    description: {
      basic: "The timestamp when the current dataset manifest was published.",
      advanced:
        "Useful for distinguishing global publish time from per-chain as-of dates.",
    },
  },
  {
    key: "dataset.methodology_version",
    label: "Methodology version",
    category: "metadata",
    units: "version string",
    sourcePath: "/public/data/published/v1/dataset.json",
    fieldPath: "methodology_version",
    description: {
      basic: "The currently active methodology version for the published dataset.",
      advanced:
        "Used for auditability across About, API Docs, Track Record, and methodology archive views.",
    },
  },
  {
    key: "<metric>__ma7",
    label: "7-day moving average",
    category: "charts",
    units: "same as raw metric",
    sourcePath: "/public/data/published/v1/derived/<chain>/<date>.json",
    fieldPath: "derived.metrics.<metric>__ma7",
    description: {
      basic: "A published short moving average used to smooth recent daily variation.",
      advanced:
        "Read from derived files only. The frontend must not compute this on its own.",
    },
  },
  {
    key: "<metric>__ma30",
    label: "30-day moving average",
    category: "charts",
    units: "same as raw metric",
    sourcePath: "/public/data/published/v1/derived/<chain>/<date>.json",
    fieldPath: "derived.metrics.<metric>__ma30",
    description: {
      basic: "A published longer moving average used to show slower trend context.",
      advanced:
        "Read directly from derived artifacts. Used alongside raw and MA7 in charts.",
    },
  },
];

export function getGlossaryEntry(key: string): GlossaryEntry | undefined {
  return GLOSSARY_ENTRIES.find((entry) => entry.key === key);
}

export function getGlossaryEntriesByCategory(
  category: GlossaryEntry["category"]
): GlossaryEntry[] {
  return GLOSSARY_ENTRIES.filter((entry) => entry.category === category);
}