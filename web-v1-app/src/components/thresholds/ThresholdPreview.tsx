"use client";

import { ThresholdControlValues } from "./ThresholdControls";

export default function ThresholdPreview({
  values,
  isCustom = false,
}: {
  values: ThresholdControlValues;
  isCustom?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-[#9db8d4] bg-[#e7f1fb] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-[#0d2447]">
            Threshold preview
          </h2>

          <p className="mt-2 text-sm text-[#27476f]">
            Human-readable preview of threshold logic.
          </p>
        </div>

        {isCustom ? (
          <span className="rounded-full border border-[#9db8d4] bg-[#dceaf8] px-3 py-1 text-xs font-bold text-[#0d2447]">
            Custom
          </span>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-[#9db8d4] bg-[#dceaf8] p-4 text-[#0d2447]">
          <strong>Confidence gate</strong>
          <div className="mt-1 text-sm text-[#27476f]">
            Below {values.confidence_threshold}
          </div>
        </div>

        <div className="rounded-xl border border-[#9db8d4] bg-[#dceaf8] p-4 text-[#0d2447]">
          <strong>Persistence rule</strong>
          <div className="mt-1 text-sm text-[#27476f]">
            {values.min_persist_days} days
          </div>
        </div>

        <div className="rounded-xl border border-[#9db8d4] bg-[#dceaf8] p-4 text-[#0d2447]">
          <strong>High band</strong>
          <div className="mt-1 text-sm text-[#27476f]">
            pct ≥ {values.high_pct}, z ≥ {values.high_z}
          </div>
        </div>

        <div className="rounded-xl border border-[#9db8d4] bg-[#dceaf8] p-4 text-[#0d2447]">
          <strong>Extreme high</strong>
          <div className="mt-1 text-sm text-[#27476f]">
            pct ≥ {values.extreme_high_pct}, z ≥ {values.extreme_high_z}
          </div>
        </div>

        <div className="rounded-xl border border-[#9db8d4] bg-[#dceaf8] p-4 text-[#0d2447]">
          <strong>Low band</strong>
          <div className="mt-1 text-sm text-[#27476f]">
            pct ≤ {values.low_pct}, z ≤ {values.low_z}
          </div>
        </div>

        <div className="rounded-xl border border-[#9db8d4] bg-[#dceaf8] p-4 text-[#0d2447]">
          <strong>Extreme low</strong>
          <div className="mt-1 text-sm text-[#27476f]">
            pct ≤ {values.extreme_low_pct}, z ≤ {values.extreme_low_z}
          </div>
        </div>
      </div>
    </section>
  );
}