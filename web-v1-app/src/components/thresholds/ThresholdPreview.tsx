// src/components/thresholds/ThresholdPreview.tsx
"use client";

import type { ThresholdControlValues } from "./ThresholdControls";

export type ThresholdPreviewProps = {
  values: ThresholdControlValues;
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

export default function ThresholdPreview(props: ThresholdPreviewProps) {
  const { values, className } = props;
  const rows = buildPreviewRows(values);

  return (
    <section
      className={[
        "rounded-2xl border p-6",
        className ?? "",
      ].join(" ")}
      aria-label="Threshold preview"
    >
      <div>
        <h2 className="text-lg font-semibold">Threshold preview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Human-readable preview of the current threshold control state. This preview is descriptive
          only and does not replace canonical published methodology.
        </p>
      </div>

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