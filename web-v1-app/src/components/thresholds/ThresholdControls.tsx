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
    <div className="rounded-2xl border border-[#9db8d4] bg-[#dcecf9] p-4 text-[#0a1d3a] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[#061b3a]">{label}</div>
          <div className="mt-2 text-xs leading-5 text-[#173b66]">{description}</div>
        </div>

        <div className="rounded-full border border-[#0d2447] bg-[#0d2447] px-3 py-1 text-xs font-semibold text-white shadow-sm">
          {value}
        </div>
      </div>

      <div className="mt-5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          className="w-full accent-[#0d2447] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={label}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-[#173b66]">
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
        "rounded-3xl border border-[#9db8d4] bg-[#e7f1fb] p-6 text-[#0a1d3a] shadow-sm",
        className ?? "",
      ].join(" ")}
      aria-label="Threshold controls"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#061b3a]">Threshold controls</h2>
          <p className="mt-1 text-sm leading-6 text-[#27476f]">
            Interactive threshold inputs for future custom-threshold workflows. These controls are
            descriptive UI only until explicitly wired into a custom-output flow.
          </p>
        </div>

        {disabled ? (
          <span className="inline-flex items-center rounded-full border border-amber-500 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
            Display only
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-emerald-500 bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-900">
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

      <div className="mt-6 rounded-2xl border border-[#9db8d4] bg-[#eef6ff] p-4 text-xs leading-5 text-[#27476f]">
        Governance note: these controls do not overwrite canonical published outputs and must remain
        clearly separated from the default public regime layer.
      </div>
    </section>
  );
}
