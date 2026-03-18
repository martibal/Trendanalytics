// // src/lib/customThresholds/defaults.ts
// // Canonical defaults + deterministic merge logic for custom threshold overrides.
// // This mirrors contract.json threshold_config_default (v1) and provides safe merging.

// import type { ThresholdConfigOverridesV1, ThresholdConfigV1, BandThreshold } from "./schema";

// function isFiniteNumber(x: unknown): x is number {
//   return typeof x === "number" && Number.isFinite(x);
// }

// function clamp(x: number, lo: number, hi: number): number {
//   return Math.min(hi, Math.max(lo, x));
// }

// function mergeBand(base: BandThreshold, patch?: Partial<BandThreshold>): BandThreshold {
//   if (!patch) return base;
//   const pct = isFiniteNumber(patch.pct) ? clamp(patch.pct, 0, 100) : base.pct;
//   const z = isFiniteNumber(patch.z) ? patch.z : base.z;
//   return { pct, z };
// }

// /**
//  * This is the *product* default (v1).
//  * Keep in sync with pipeline/tools/publish_artifacts.py -> contract.json threshold_config_default
//  */
// export const THRESHOLD_CONFIG_DEFAULT_V1: ThresholdConfigV1 = {
//   version: "v1",
//   gate: { confidence_threshold: 0.4 },
//   band: {
//     high: { pct: 80, z: 1.5 },
//     extreme_high: { pct: 90, z: 2.5 },
//     low: { pct: 20, z: -1.5 },
//     extreme_low: { pct: 10, z: -2.5 },
//   },
//   trend: { eps: 0.15 },
// };

// /**
//  * Deterministically apply overrides (no backfill, no heuristics).
//  * - Unknown fields are ignored upstream (schema.ts).
//  * - Values are clamped/sanitized here as an additional guardrail.
//  */
// export function applyThresholdOverridesV1(base: ThresholdConfigV1, overrides?: ThresholdConfigOverridesV1): ThresholdConfigV1 {
//   if (!overrides) return base;

//   const out: ThresholdConfigV1 = {
//     version: "v1",
//     gate: { ...base.gate },
//     band: {
//       high: { ...base.band.high },
//       extreme_high: { ...base.band.extreme_high },
//       low: { ...base.band.low },
//       extreme_low: { ...base.band.extreme_low },
//     },
//     trend: { ...base.trend },
//   };

//   // gate
//   if (overrides.gate && isFiniteNumber(overrides.gate.confidence_threshold)) {
//     out.gate.confidence_threshold = clamp(overrides.gate.confidence_threshold, 0, 1);
//   }

//   // trend
//   if (overrides.trend && isFiniteNumber(overrides.trend.eps)) {
//     out.trend.eps = Math.max(0, overrides.trend.eps);
//   }

//   // band
//   if (overrides.band) {
//     if (overrides.band.high) out.band.high = mergeBand(out.band.high, overrides.band.high);
//     if (overrides.band.extreme_high) out.band.extreme_high = mergeBand(out.band.extreme_high, overrides.band.extreme_high);
//     if (overrides.band.low) out.band.low = mergeBand(out.band.low, overrides.band.low);
//     if (overrides.band.extreme_low) out.band.extreme_low = mergeBand(out.band.extreme_low, overrides.band.extreme_low);
//   }

//   return out;
// }


// src/lib/customThresholds/defaults.ts
// Canonical in-repo fallback defaults for threshold config (v1).
//
// IMPORTANT
// - The *source of truth* is public/data/published/v1/contract.json
// - This file is used only when contract.json is unavailable (offline/dev) or missing fields.
// - Values must be explainable and stable; no hidden heuristics.

import type { ThresholdConfigV1 } from "./schema";

export const THRESHOLD_CONFIG_DEFAULT_V1: ThresholdConfigV1 = {
  version: "v1",

  // Gate controls "Insufficient data" handling at the UI/API layer.
  // If confidence_score is missing OR below this threshold => treat as gated/insufficient.
  gate: {
    confidence_threshold: 0.4,
  },

  // Band thresholds interpret signal evidence (percentile + robust z).
  // Percentiles are expected 0..100 in our custom evaluator (server normalizes defensively).
  // z values are robust z-scores (finite, may be negative).
  band: {
    high: { pct: 80, z: 1.5 },
    extreme_high: { pct: 90, z: 2.5 },

    low: { pct: 20, z: -1.5 },
    extreme_low: { pct: 10, z: -2.5 },
  },

  // Trend sensitivity parameter controlling how readily labels switch given evidence changes.
  // Higher eps -> more conservative (requires stronger evidence).
  trend: {
    eps: 0.15,
  },
};