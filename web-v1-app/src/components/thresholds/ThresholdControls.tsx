"use client";

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

type Props = {
  values: ThresholdControlValues;
  disabled?: boolean;
  onChange: (v: ThresholdControlValues) => void;
};

function ControlCard({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
}: any) {
  return (
    <div className="rounded-2xl border border-[#9db8d4] bg-[#dceaf8] p-5">
      <div className="text-sm font-black text-[#0d2447]">{label}</div>
      <p className="mt-2 text-sm text-[#27476f]">{description}</p>

      {/* VALUE (NO DARK PILL) */}
      <div className="mt-4 text-sm font-black text-[#0d2447]">
        {value}
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-4 w-full accent-[#0d2447]"
      />

      <div className="mt-2 flex justify-between text-xs text-[#5c7aa3]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function ThresholdControls({
  values,
  onChange,
}: Props) {
  return (
    <section className="rounded-2xl border border-[#9db8d4] bg-[#e7f1fb] p-6">
      <h2 className="text-lg font-black text-[#0d2447]">
        Threshold controls
      </h2>

      <p className="mt-2 text-sm text-[#27476f]">
        Interactive threshold inputs for future custom-threshold workflows.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ControlCard
          label="confidence_threshold"
          description="Minimum confidence required"
          value={values.confidence_threshold}
          min={0}
          max={1}
          step={0.01}
          onChange={(v: number) =>
            onChange({ ...values, confidence_threshold: v })
          }
        />

        <ControlCard
          label="min_persist_days"
          description="Persistence window"
          value={values.min_persist_days}
          min={1}
          max={30}
          step={1}
          onChange={(v: number) =>
            onChange({ ...values, min_persist_days: v })
          }
        />

        <ControlCard
          label="high_pct"
          description="High percentile threshold"
          value={values.high_pct}
          min={50}
          max={99}
          step={1}
          onChange={(v: number) =>
            onChange({ ...values, high_pct: v })
          }
        />

        <ControlCard
          label="high_z"
          description="High z-score"
          value={values.high_z}
          min={0}
          max={5}
          step={0.1}
          onChange={(v: number) =>
            onChange({ ...values, high_z: v })
          }
        />

        <ControlCard
          label="extreme_high_pct"
          description="Extreme high percentile"
          value={values.extreme_high_pct}
          min={50}
          max={100}
          step={1}
          onChange={(v: number) =>
            onChange({ ...values, extreme_high_pct: v })
          }
        />

        <ControlCard
          label="extreme_high_z"
          description="Extreme high z-score"
          value={values.extreme_high_z}
          min={0}
          max={8}
          step={0.1}
          onChange={(v: number) =>
            onChange({ ...values, extreme_high_z: v })
          }
        />

        <ControlCard
          label="low_pct"
          description="Low percentile threshold"
          value={values.low_pct}
          min={0}
          max={50}
          step={1}
          onChange={(v: number) =>
            onChange({ ...values, low_pct: v })
          }
        />

        <ControlCard
          label="low_z"
          description="Low z-score"
          value={values.low_z}
          min={-5}
          max={0}
          step={0.1}
          onChange={(v: number) =>
            onChange({ ...values, low_z: v })
          }
        />

        <ControlCard
          label="extreme_low_pct"
          description="Extreme low percentile"
          value={values.extreme_low_pct}
          min={0}
          max={50}
          step={1}
          onChange={(v: number) =>
            onChange({ ...values, extreme_low_pct: v })
          }
        />

        <ControlCard
          label="extreme_low_z"
          description="Extreme low z-score"
          value={values.extreme_low_z}
          min={-8}
          max={0}
          step={0.1}
          onChange={(v: number) =>
            onChange({ ...values, extreme_low_z: v })
          }
        />
      </div>
    </section>
  );
}