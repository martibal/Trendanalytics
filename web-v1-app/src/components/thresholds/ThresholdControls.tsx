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

function SliderRow({ label, value, min, max, step, disabled, description, onChange }: SliderRowProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(Number(e.target.value));
  }

  return (
    <div className="border-b border-[var(--line)] py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] font-medium tracking-[.12em] uppercase text-[var(--gold)]">
            {label}
          </div>
          <p className="mt-2 text-sm leading-5 text-[var(--ink2)] max-w-sm">
            {description}
          </p>
        </div>
        <div className="font-mono text-[13px] font-medium text-[var(--ink)] bg-[var(--surface2)] border border-[var(--line2)] rounded-[var(--radius-sm)] px-3 py-1 flex-shrink-0">
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
          className="w-full accent-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={label}
        />
      </div>

      <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-[var(--ink3)]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function updateValue(
  values: ThresholdControlValues,
  key: keyof ThresholdControlValues,
  nextValue: number,
): ThresholdControlValues {
  return { ...values, [key]: nextValue };
}

export default function ThresholdControls({ values, disabled = false, onChange, className }: ThresholdControlsProps) {
  return (
    <section
      className={className}
      aria-label="Threshold controls"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <div className="eyebrow mb-3">Threshold controls</div>
          <p className="text-sm leading-6 text-[var(--ink2)] max-w-lg">
            Interactive threshold inputs for custom-threshold workflows. These controls are
            descriptive UI only until explicitly wired into a custom-output flow.
          </p>
        </div>
        {disabled ? (
          <span className="ua-vf-tab">Display only</span>
        ) : (
          <span className="ua-vf-tab is-active">Interactive</span>
        )}
      </div>

      <SliderRow label="confidence_threshold" value={values.confidence_threshold} min={0} max={1} step={0.01} disabled={disabled} description="Minimum descriptive confidence required before canonical interpretation should be treated as eligible." onChange={(n) => onChange(updateValue(values, "confidence_threshold", n))} />
      <SliderRow label="min_persist_days" value={values.min_persist_days} min={1} max={30} step={1} disabled={disabled} description="Minimum persistence window used to distinguish short-lived noise from more durable state." onChange={(n) => onChange(updateValue(values, "min_persist_days", n))} />
      <SliderRow label="high_pct" value={values.high_pct} min={50} max={99} step={1} disabled={disabled} description="Percentile threshold for high-band classification." onChange={(n) => onChange(updateValue(values, "high_pct", n))} />
      <SliderRow label="high_z" value={values.high_z} min={0} max={5} step={0.1} disabled={disabled} description="Robust z-score threshold for high-band classification." onChange={(n) => onChange(updateValue(values, "high_z", n))} />
      <SliderRow label="extreme_high_pct" value={values.extreme_high_pct} min={50} max={100} step={1} disabled={disabled} description="Percentile threshold for extreme-high classification." onChange={(n) => onChange(updateValue(values, "extreme_high_pct", n))} />
      <SliderRow label="extreme_high_z" value={values.extreme_high_z} min={0} max={8} step={0.1} disabled={disabled} description="Robust z-score threshold for extreme-high classification." onChange={(n) => onChange(updateValue(values, "extreme_high_z", n))} />
      <SliderRow label="low_pct" value={values.low_pct} min={0} max={50} step={1} disabled={disabled} description="Percentile threshold for low-band classification." onChange={(n) => onChange(updateValue(values, "low_pct", n))} />
      <SliderRow label="low_z" value={values.low_z} min={-5} max={0} step={0.1} disabled={disabled} description="Robust z-score threshold for low-band classification." onChange={(n) => onChange(updateValue(values, "low_z", n))} />
      <SliderRow label="extreme_low_pct" value={values.extreme_low_pct} min={0} max={50} step={1} disabled={disabled} description="Percentile threshold for extreme-low classification." onChange={(n) => onChange(updateValue(values, "extreme_low_pct", n))} />
      <SliderRow label="extreme_low_z" value={values.extreme_low_z} min={-8} max={0} step={0.1} disabled={disabled} description="Robust z-score threshold for extreme-low classification." onChange={(n) => onChange(updateValue(values, "extreme_low_z", n))} />

      <p className="mt-6 font-mono text-[10px] text-[var(--ink3)] tracking-[.08em]">
        Governance note: these controls do not overwrite canonical published outputs and must
        remain clearly separated from the default public regime layer.
      </p>
    </section>
  );
}
