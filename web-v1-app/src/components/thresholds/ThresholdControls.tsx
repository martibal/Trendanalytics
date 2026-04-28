// src/components/thresholds/ThresholdControls.tsx
"use client";

import type { ChangeEvent } from "react";

export type ThresholdControlValues = {
  confidence_threshold: number;
  min_persist_days: number;
  high_pct: number;
  high_z: number;
  extreme_high_pct: number;
  extreme_high_z: number;
  low_pct: number;
  low_z: number;
  extreme_low_pct: number;
  extreme_low_z: number;
};

export type ThresholdControlsProps = {
  values: ThresholdControlValues;
  disabled?: boolean;
  onChange: (next: ThresholdControlValues) => void;
  className?: string;
};

type SliderRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  description: string;
  onChange: (next: number) => void;
};

function SliderRow(props: SliderRowProps) {
  const { label, value, min, max, step, disabled, description, onChange } = props;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(Number(event.target.value));
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
        </div>

        <div className="rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
          {value}
        </div>
      </div>

      <div className="mt-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          className="w-full accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={label}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function updateValue(
  values: ThresholdControlValues,
  key: keyof ThresholdControlValues,
  nextValue: number
): ThresholdControlValues {
  return {
    ...values,
    [key]: nextValue,
  };
}

export default function ThresholdControls(props: ThresholdControlsProps) {
  const { values, disabled = false, onChange, className } = props;

  return (
    <section
      className={[
        "rounded-2xl border p-6",
        className ?? "",
      ].join(" ")}
      aria-label="Threshold controls"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Threshold controls</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Interactive threshold inputs for future custom-threshold workflows. These controls are
            descriptive UI only until explicitly wired into a custom-output flow.
          </p>
        </div>

        {disabled ? (
          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-amber-300">
            Display only
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-emerald-300">
            Interactive
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SliderRow
          label="confidence_threshold"
          value={values.confidence_threshold}
          min={0}
          max={1}
          step={0.01}
          disabled={disabled}
          description="Minimum descriptive confidence required before canonical interpretation should be treated as eligible."
          onChange={(next) => onChange(updateValue(values, "confidence_threshold", next))}
        />

        <SliderRow
          label="min_persist_days"
          value={values.min_persist_days}
          min={1}
          max={30}
          step={1}
          disabled={disabled}
          description="Minimum persistence window used to distinguish short-lived noise from more durable state."
          onChange={(next) => onChange(updateValue(values, "min_persist_days", next))}
        />

        <SliderRow
          label="high_pct"
          value={values.high_pct}
          min={50}
          max={99}
          step={1}
          disabled={disabled}
          description="Percentile threshold for high-band classification."
          onChange={(next) => onChange(updateValue(values, "high_pct", next))}
        />

        <SliderRow
          label="high_z"
          value={values.high_z}
          min={0}
          max={5}
          step={0.1}
          disabled={disabled}
          description="Robust z-score threshold for high-band classification."
          onChange={(next) => onChange(updateValue(values, "high_z", next))}
        />

        <SliderRow
          label="extreme_high_pct"
          value={values.extreme_high_pct}
          min={50}
          max={100}
          step={1}
          disabled={disabled}
          description="Percentile threshold for extreme-high classification."
          onChange={(next) => onChange(updateValue(values, "extreme_high_pct", next))}
        />

        <SliderRow
          label="extreme_high_z"
          value={values.extreme_high_z}
          min={0}
          max={8}
          step={0.1}
          disabled={disabled}
          description="Robust z-score threshold for extreme-high classification."
          onChange={(next) => onChange(updateValue(values, "extreme_high_z", next))}
        />

        <SliderRow
          label="low_pct"
          value={values.low_pct}
          min={0}
          max={50}
          step={1}
          disabled={disabled}
          description="Percentile threshold for low-band classification."
          onChange={(next) => onChange(updateValue(values, "low_pct", next))}
        />

        <SliderRow
          label="low_z"
          value={values.low_z}
          min={-5}
          max={0}
          step={0.1}
          disabled={disabled}
          description="Robust z-score threshold for low-band classification."
          onChange={(next) => onChange(updateValue(values, "low_z", next))}
        />

        <SliderRow
          label="extreme_low_pct"
          value={values.extreme_low_pct}
          min={0}
          max={50}
          step={1}
          disabled={disabled}
          description="Percentile threshold for extreme-low classification."
          onChange={(next) => onChange(updateValue(values, "extreme_low_pct", next))}
        />

        <SliderRow
          label="extreme_low_z"
          value={values.extreme_low_z}
          min={-8}
          max={0}
          step={0.1}
          disabled={disabled}
          description="Robust z-score threshold for extreme-low classification."
          onChange={(next) => onChange(updateValue(values, "extreme_low_z", next))}
        />
      </div>

      <div className="mt-6 rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground">
        Governance note: these controls do not overwrite canonical published outputs and must remain
        clearly separated from the default public regime layer.
      </div>
    </section>
  );
}