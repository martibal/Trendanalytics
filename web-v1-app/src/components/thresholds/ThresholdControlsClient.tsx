// src/components/thresholds/ThresholdControlsClient.tsx
"use client";

import { useMemo, useState } from "react";
import ThresholdControls, {
  type ThresholdControlValues,
} from "@/components/thresholds/ThresholdControls";
import ThresholdPreview from "@/components/thresholds/ThresholdPreview";

export type ThresholdControlsClientProps = {
  initialValues: ThresholdControlValues;
  className?: string;
};

function valuesEqual(a: ThresholdControlValues, b: ThresholdControlValues): boolean {
  return (Object.keys(a) as Array<keyof ThresholdControlValues>).every(
    (k) => a[k] === b[k],
  );
}

export default function ThresholdControlsClient({
  initialValues,
  className,
}: ThresholdControlsClientProps) {
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

  function handleReset() {
    setValues(initialValues);
  }

  return (
    <div
      className={[
        className ?? "",
        "[&_section]:border-[#9db8d4]",
        "[&_section]:bg-[#e7f1fb]",
        "[&_section]:text-[#0a1d3a]",
        "[&_section_h2]:font-black",
        "[&_section_h2]:tracking-[-0.02em]",
        "[&_section_h2]:text-[#0d2447]",
        "[&_section_p]:text-[#27476f]",
        "[&_.rounded-xl.border]:border-[#9db8d4]",
        "[&_.rounded-xl.border]:bg-[#dceaf8]",
        "[&_.rounded-xl.border]:text-[#0a1d3a]",
        "[&_.rounded-xl.border_.text-foreground]:text-[#0d2447]",
        "[&_.rounded-xl.border_.text-muted-foreground]:text-[#27476f]",
        "[&_.text-muted-foreground]:text-[#27476f]",
        "[&_.text-foreground]:text-[#0d2447]",
        "[&_input[type='range']]:accent-[#0d2447]",
      ].join(" ")}
    >
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <ThresholdControls
            values={normalizedValues}
            disabled={false}
            onChange={setValues}
          />

          {isCustom ? (
            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-xl border border-[#9db8d4] bg-[#dceaf8] px-4 py-2.5 text-sm font-bold text-[#0d2447] transition hover:border-[#6f96bd] hover:bg-[#cfe0f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Reset to canonical defaults
            </button>
          ) : null}
        </div>

        <ThresholdPreview values={normalizedValues} isCustom={isCustom} />
      </div>

      <div className="mt-6 rounded-xl border border-[#9db8d4] bg-[#dceaf8] p-4 text-xs font-medium leading-6 text-[#27476f]">
        Client-side preview only: adjusting these controls does not overwrite
        canonical published methodology, public regime labels, or default API
        outputs. All changes are local to your browser session.
      </div>
    </div>
  );
}