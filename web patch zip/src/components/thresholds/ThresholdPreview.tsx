// src/components/thresholds/ThresholdPreview.tsx
"use client";

import type { ThresholdControlValues } from "./ThresholdControls";

export type ThresholdPreviewProps = {
  values: ThresholdControlValues;
  isCustom?: boolean;
  className?: string;
};

type PreviewRow = {
  label: string;
  summary: string;
};

function buildPreviewRows(values: ThresholdControlValues): PreviewRow[] {
  return [
    {
      label: "Confidence gate",
      summary: `Canonical interpretation becomes cautionary below confidence_score ${values.confidence_threshold.toFixed(2)}.`,
    },
    {
      label: "Persistence rule",
      summary: `State is treated as more durable when it persists for at least ${values.min_persist_days} day(s).`,
    },
    {
      label: "High band",
      summary: `High condition when percentile ≥ ${values.high_pct} and robust z-score ≥ ${values.high_z.toFixed(1)}.`,
    },
    {
      label: "Extreme high band",
      summary: `Extreme-high condition when percentile ≥ ${values.extreme_high_pct} and robust z-score ≥ ${values.extreme_high_z.toFixed(1)}.`,
    },
    {
      label: "Low band",
      summary: `Low condition when percentile ≤ ${values.low_pct} and robust z-score ≤ ${values.low_z.toFixed(1)}.`,
    },
    {
      label: "Extreme low band",
      summary: `Extreme-low condition when percentile ≤ ${values.extreme_low_pct} and robust z-score ≤ ${values.extreme_low_z.toFixed(1)}.`,
    },
  ];
}

export default function ThresholdPreview({ values, isCustom = false, className }: ThresholdPreviewProps) {
  const rows = buildPreviewRows(values);

  return (
    <section
      className={["rounded-2xl border p-6", className ?? ""].join(" ")}
      aria-label="Threshold preview"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Threshold preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Human-readable preview of the current threshold state. Descriptive only — does not
            replace canonical published methodology.
          </p>
        </div>

        {/* Prominent Custom (Local) badge — cannot be confused with canonical output */}
        {isCustom ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-400">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Custom (Local) — not canonical
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Canonical defaults
          </span>
        )}
      </div>

      {isCustom && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-400">
          <strong>Local simulation only.</strong> These values are stored in your browser and do not
          affect any published canonical outputs. Refresh or reset to return to canonical defaults.
        </div>
      )}

      <div className="mt-6 grid gap-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border p-4">
            <div className="text-sm font-medium text-foreground">{row.label}</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">{row.summary}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground">
        Preview rule: user-adjusted threshold displays must remain clearly separate from default
        public methodology and must not silently overwrite canonical published outputs.
      </div>
    </section>
  );
}
