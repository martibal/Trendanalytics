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

export default function ThresholdControlsClient(
  props: ThresholdControlsClientProps
) {
  const { initialValues, className } = props;
  const [values, setValues] = useState<ThresholdControlValues>(initialValues);

  const normalizedValues = useMemo<ThresholdControlValues>(() => {
    return {
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
    };
  }, [values]);

  return (
    <div className={className}>
      <ThresholdControls
        values={normalizedValues}
        disabled={false}
        onChange={setValues}
      />

      <div className="mt-6">
        <ThresholdPreview values={normalizedValues} />
      </div>

      <div className="mt-6 rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground">
        Client-side preview only: adjusting these controls does not overwrite
        canonical published methodology, public regime labels, or default API
        outputs.
      </div>
    </div>
  );
}