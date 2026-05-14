// src/components/thresholds/ThresholdControlsClient.tsx
"use client";

import { useMemo, useState } from "react";
import ThresholdControls, { type ThresholdControlValues } from "@/components/thresholds/ThresholdControls";
import ThresholdPreview from "@/components/thresholds/ThresholdPreview";

export type ThresholdControlsClientProps = {
  initialValues: ThresholdControlValues;
  className?: string;
};

function valuesEqual(a: ThresholdControlValues, b: ThresholdControlValues): boolean {
  return (Object.keys(a) as Array<keyof ThresholdControlValues>).every((k) => a[k] === b[k]);
}

export default function ThresholdControlsClient({ initialValues, className }: ThresholdControlsClientProps) {
  const [values, setValues] = useState<ThresholdControlValues>(initialValues);

  const normalizedValues = useMemo<ThresholdControlValues>(
    () => ({
      ...values,
      confidence_threshold: Number(values.confidence_threshold.toFixed(2)),
      min_persist_days: Math.round(values.min_persist_days),
      high_pct: Math.round(values.high_pct),
      high_z: Number(values.high_z.toFixed(1)),
      extreme_high_pct: Math.round(values.extreme_high_pct),
      extreme_high_z: Number(values.extreme_high_z.toFixed(1)),
      low_pct: Math.round(values.low_pct),
      low_z: Number(values.low_z.toFixed(1)),
      extreme_low_pct: Math.round(values.extreme_low_pct),
      extreme_low_z: Number(values.extreme_low_z.toFixed(1)),
    }),
    [values],
  );

  const isCustom = !valuesEqual(normalizedValues, initialValues);

  return (
    <div className={className}>
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        <div>
          <ThresholdControls
            values={normalizedValues}
            disabled={false}
            onChange={setValues}
          />
          {isCustom && (
            <button
              type="button"
              onClick={() => setValues(initialValues)}
              className="btn-ghost w-full mt-4"
            >
              Reset to canonical defaults
            </button>
          )}
        </div>
        <ThresholdPreview values={normalizedValues} isCustom={isCustom} />
      </div>

      <p className="mt-8 font-mono text-[10px] text-[var(--ink3)] tracking-[.08em] border-t border-[var(--line)] pt-5">
        Client-side preview only: adjusting these controls does not overwrite canonical published
        methodology, public regime labels, or default API outputs. All changes are local to your
        browser session.
      </p>
    </div>
  );
}
