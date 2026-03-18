// src/lib/customThresholds/presets.ts
// Presets for custom threshold overrides (v1).
// These are *overrides* (not full configs). The effective config is:
//   effective = mergeThresholdConfig(DEFAULT, overrides)
//
// Design goals:
// - Deterministic
// - Small/portable objects for localStorage + URL
// - Safe numeric clamping (to avoid invalid states)

import type { ThresholdConfigOverridesV1, ThresholdConfigV1 } from "./schema";
import { THRESHOLD_CONFIG_DEFAULT_V1 } from "./defaults";

function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x));
}

export type ThresholdPresetId = "canonical" | "stricter" | "more_sensitive";

export type ThresholdPreset = {
  id: ThresholdPresetId;
  title: string;
  description: string;
  overrides: ThresholdConfigOverridesV1;
};

export function getCanonicalPreset(
  _base: ThresholdConfigV1 = THRESHOLD_CONFIG_DEFAULT_V1
): ThresholdPreset {
  // Canonical preset: no overrides (use contract/repo defaults).
  // We keep overrides empty to clearly signal "canonical only".
  return {
    id: "canonical",
    title: "Canonical",
    description: "Use canonical contract defaults (no overrides).",
    overrides: {},
  };
}

export function getStricterPreset(
  base: ThresholdConfigV1 = THRESHOLD_CONFIG_DEFAULT_V1
): ThresholdPreset {
  // Stricter = higher confidence gate + tougher extremes + slightly higher eps.
  return {
    id: "stricter",
    title: "Stricter",
    description:
      "Higher confidence gate and stronger extreme thresholds (more conservative switching).",
    overrides: {
      version: "v1",
      gate: {
        confidence_threshold: clamp(base.gate.confidence_threshold + 0.10, 0, 1),
      },
      band: {
        extreme_high: {
          pct: clamp(base.band.extreme_high.pct + 2, 0, 100),
          z: base.band.extreme_high.z + 0.25,
        },
        extreme_low: {
          pct: clamp(base.band.extreme_low.pct - 2, 0, 100),
          z: base.band.extreme_low.z - 0.25,
        },
      },
      trend: { eps: Math.max(0, base.trend.eps + 0.05) },
    },
  };
}

export function getMoreSensitivePreset(
  base: ThresholdConfigV1 = THRESHOLD_CONFIG_DEFAULT_V1
): ThresholdPreset {
  // More sensitive = lower eps (easier to switch) + slightly looser band thresholds + slightly lower gate.
  return {
    id: "more_sensitive",
    title: "More sensitive",
    description: "Lower eps and looser thresholds (more responsive switching).",
    overrides: {
      version: "v1",
      gate: {
        confidence_threshold: clamp(base.gate.confidence_threshold - 0.05, 0, 1),
      },
      band: {
        high: {
          pct: clamp(base.band.high.pct - 3, 0, 100),
          z: base.band.high.z - 0.15,
        },
        low: {
          pct: clamp(base.band.low.pct + 3, 0, 100),
          z: base.band.low.z + 0.15,
        },
      },
      trend: { eps: Math.max(0, base.trend.eps - 0.05) },
    },
  };
}

/**
 * Web5 requirement: export an object with canonicalPreset, stricter, moreSensitive.
 * These are instantiated using the default config (deterministic).
 */
export const canonicalPreset: ThresholdPreset = getCanonicalPreset(
  THRESHOLD_CONFIG_DEFAULT_V1
);
export const stricter: ThresholdPreset = getStricterPreset(
  THRESHOLD_CONFIG_DEFAULT_V1
);
export const moreSensitive: ThresholdPreset = getMoreSensitivePreset(
  THRESHOLD_CONFIG_DEFAULT_V1
);

export const THRESHOLD_PRESETS: {
  canonicalPreset: ThresholdPreset;
  stricter: ThresholdPreset;
  moreSensitive: ThresholdPreset;
} = {
  canonicalPreset,
  stricter,
  moreSensitive,
};

export function getAllPresets(
  base: ThresholdConfigV1 = THRESHOLD_CONFIG_DEFAULT_V1
): ThresholdPreset[] {
  // Keep functional API for call-sites that want a different base.
  return [getCanonicalPreset(base), getStricterPreset(base), getMoreSensitivePreset(base)];
}

export function presetById(
  id: ThresholdPresetId,
  base: ThresholdConfigV1 = THRESHOLD_CONFIG_DEFAULT_V1
): ThresholdPreset {
  if (id === "canonical") return getCanonicalPreset(base);
  if (id === "stricter") return getStricterPreset(base);
  return getMoreSensitivePreset(base);
}