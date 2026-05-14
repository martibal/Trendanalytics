"use client";

import { ThresholdControlValues } from "./ThresholdControls";

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-row grid-cols-[1fr_auto] py-4">
      <span className="text-[var(--ink)] font-medium text-sm">{label}</span>
      <span className="font-mono text-[12px] text-[var(--ink2)] text-right">{value}</span>
    </div>
  );
}

export default function ThresholdPreview({
  values,
  isCustom = false,
}: {
  values: ThresholdControlValues;
  isCustom?: boolean;
}) {
  return (
    <section aria-label="Threshold preview">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="eyebrow mb-3">Threshold preview</div>
          <p className="text-sm text-[var(--ink2)]">
            Human-readable summary of the current threshold configuration.
          </p>
        </div>
        {isCustom && (
          <span className="ua-vf-tab is-active flex-shrink-0">Custom</span>
        )}
      </div>

      <PreviewRow label="Confidence gate" value={`Below ${values.confidence_threshold}`} />
      <PreviewRow label="Persistence rule" value={`${values.min_persist_days} days`} />
      <PreviewRow label="High band" value={`pct ≥ ${values.high_pct}, z ≥ ${values.high_z}`} />
      <PreviewRow label="Extreme high" value={`pct ≥ ${values.extreme_high_pct}, z ≥ ${values.extreme_high_z}`} />
      <PreviewRow label="Low band" value={`pct ≤ ${values.low_pct}, z ≤ ${values.low_z}`} />
      <PreviewRow label="Extreme low" value={`pct ≤ ${values.extreme_low_pct}, z ≤ ${values.extreme_low_z}`} />
    </section>
  );
}
