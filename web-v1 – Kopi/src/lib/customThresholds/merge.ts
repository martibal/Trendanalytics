// src/lib/customThresholds/merge.ts
// Deterministic merge + normalization for threshold configs (v1).
//
// Flow:
//   effective = normalize( merge(DEFAULT, overrides) )
//
// Design constraints:
// - No hidden heuristics
// - Clamp numeric domains explicitly
// - Never mutate inputs
// - Always return a fully populated ThresholdConfigV1

import type {
  ThresholdBand,
  ThresholdConfigOverridesV1,
  ThresholdConfigV1,
} from "./schema";
import { THRESHOLD_CONFIG_DEFAULT_V1 } from "./defaults";

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function normalizeBand(b: ThresholdBand): ThresholdBand {
  return {
    pct: clamp(b.pct, 0, 100),
    z: isFiniteNumber(b.z) ? b.z : 0,
  };
}

function mergeBand(
  base: ThresholdBand,
  patch?: Partial<ThresholdBand>
): ThresholdBand {
  if (!patch) return normalizeBand(base);

  const pct = isFiniteNumber(patch.pct) ? patch.pct : base.pct;
  const z = isFiniteNumber(patch.z) ? patch.z : base.z;

  return normalizeBand({ pct, z });
}

export function mergeThresholdConfig(
  overrides?: ThresholdConfigOverridesV1 | null,
  base: ThresholdConfigV1 = THRESHOLD_CONFIG_DEFAULT_V1
): ThresholdConfigV1 {
  const o = overrides && typeof overrides === "object" ? overrides : {};

  const gateThreshold = isFiniteNumber(o.gate?.confidence_threshold)
    ? clamp(o.gate!.confidence_threshold!, 0, 1)
    : base.gate.confidence_threshold;

  const eps = isFiniteNumber(o.trend?.eps)
    ? Math.max(0, o.trend!.eps!)
    : base.trend.eps;

  const bandPatch = o.band ?? {};

  const high = mergeBand(base.band.high, bandPatch.high);
  const extremeHigh = mergeBand(base.band.extreme_high, bandPatch.extreme_high);
  const low = mergeBand(base.band.low, bandPatch.low);
  const extremeLow = mergeBand(base.band.extreme_low, bandPatch.extreme_low);

  return {
    version: "v1",
    gate: {
      confidence_threshold: gateThreshold,
    },
    band: {
      high,
      extreme_high: extremeHigh,
      low,
      extreme_low: extremeLow,
    },
    trend: {
      eps,
    },
  };
}