// // src/lib/customThresholds/schema.ts
// // Custom threshold config (v1) used by /api/regime/custom.
// // No external deps (no zod) — lightweight validation + normalization.

// export type ThresholdConfigVersion = "v1";

// export type BandThreshold = {
//   pct: number; // 0..100
//   z: number; // any finite number
// };

// export type ThresholdConfigV1 = {
//   version: "v1";
//   gate: {
//     confidence_threshold: number; // 0..1
//   };
//   band: {
//     high: BandThreshold; // pct>=80 OR z>=1.5
//     extreme_high: BandThreshold; // pct>=90 OR z>=2.5
//     low: BandThreshold; // pct<=20 OR z<=-1.5
//     extreme_low: BandThreshold; // pct<=10 OR z<=-2.5
//   };
//   trend: {
//     eps: number; // >=0 (typically 0.15)
//   };
// };

// export type ThresholdConfig = ThresholdConfigV1;

// export type ThresholdConfigOverridesV1 = Partial<{
//   version: "v1";
//   gate: Partial<ThresholdConfigV1["gate"]>;
//   band: Partial<{
//     high: Partial<BandThreshold>;
//     extreme_high: Partial<BandThreshold>;
//     low: Partial<BandThreshold>;
//     extreme_low: Partial<BandThreshold>;
//   }>;
//   trend: Partial<ThresholdConfigV1["trend"]>;
// }>;

// export type ThresholdConfigOverrides = ThresholdConfigOverridesV1;

// export type ValidationIssue = {
//   path: string;
//   message: string;
// };

// function isObject(x: unknown): x is Record<string, unknown> {
//   return typeof x === "object" && x !== null && !Array.isArray(x);
// }

// function isFiniteNumber(x: unknown): x is number {
//   return typeof x === "number" && Number.isFinite(x);
// }

// function clamp(x: number, lo: number, hi: number): number {
//   return Math.min(hi, Math.max(lo, x));
// }

// function readNumber(obj: Record<string, unknown>, key: string): number | null {
//   const v = obj[key];
//   return isFiniteNumber(v) ? v : null;
// }

// function validateBandThreshold(x: unknown, path: string, issues: ValidationIssue[]) {
//   if (!isObject(x)) {
//     issues.push({ path, message: "Expected object { pct, z }." });
//     return;
//   }

//   const pct = readNumber(x, "pct");
//   const z = readNumber(x, "z");

//   if (pct === null) issues.push({ path: `${path}.pct`, message: "pct must be a finite number." });
//   if (z === null) issues.push({ path: `${path}.z`, message: "z must be a finite number." });

//   if (pct !== null && (pct < 0 || pct > 100)) {
//     issues.push({ path: `${path}.pct`, message: "pct must be within [0, 100]." });
//   }
// }

// export function normalizeAndValidateOverrides(
//   raw: unknown
// ): { ok: true; overrides: ThresholdConfigOverridesV1 } | { ok: false; issues: ValidationIssue[] } {
//   const issues: ValidationIssue[] = [];

//   if (raw == null) {
//     return { ok: true, overrides: {} };
//   }

//   if (!isObject(raw)) {
//     return { ok: false, issues: [{ path: "", message: "config must be an object." }] };
//   }

//   // version (optional)
//   if ("version" in raw) {
//     const v = raw["version"];
//     if (v !== "v1") {
//       issues.push({ path: "config.version", message: 'Only version "v1" is supported.' });
//     }
//   }

//   // gate
//   if ("gate" in raw) {
//     const g = raw["gate"];
//     if (!isObject(g)) {
//       issues.push({ path: "config.gate", message: "gate must be an object." });
//     } else if ("confidence_threshold" in g) {
//       const ct = g["confidence_threshold"];
//       if (!isFiniteNumber(ct)) {
//         issues.push({ path: "config.gate.confidence_threshold", message: "Must be a finite number in [0,1]." });
//       } else if (ct < 0 || ct > 1) {
//         issues.push({ path: "config.gate.confidence_threshold", message: "Must be within [0,1]." });
//       }
//     }
//   }

//   // trend
//   if ("trend" in raw) {
//     const t = raw["trend"];
//     if (!isObject(t)) {
//       issues.push({ path: "config.trend", message: "trend must be an object." });
//     } else if ("eps" in t) {
//       const eps = t["eps"];
//       if (!isFiniteNumber(eps)) {
//         issues.push({ path: "config.trend.eps", message: "eps must be a finite number >= 0." });
//       } else if (eps < 0) {
//         issues.push({ path: "config.trend.eps", message: "eps must be >= 0." });
//       }
//     }
//   }

//   // band
//   if ("band" in raw) {
//     const b = raw["band"];
//     if (!isObject(b)) {
//       issues.push({ path: "config.band", message: "band must be an object." });
//     } else {
//       if ("high" in b) validateBandThreshold(b["high"], "config.band.high", issues);
//       if ("extreme_high" in b) validateBandThreshold(b["extreme_high"], "config.band.extreme_high", issues);
//       if ("low" in b) validateBandThreshold(b["low"], "config.band.low", issues);
//       if ("extreme_low" in b) validateBandThreshold(b["extreme_low"], "config.band.extreme_low", issues);
//     }
//   }

//   if (issues.length > 0) return { ok: false, issues };

//   // Return a cleaned overrides object (only known fields)
//   const out: ThresholdConfigOverridesV1 = {};

//   if (raw["version"] === "v1") out.version = "v1";

//   if (isObject(raw["gate"])) {
//     const g = raw["gate"] as Record<string, unknown>;
//     const ct = readNumber(g, "confidence_threshold");
//     if (ct != null) {
//       out.gate = { confidence_threshold: clamp(ct, 0, 1) };
//     }
//   }

//   if (isObject(raw["trend"])) {
//     const t = raw["trend"] as Record<string, unknown>;
//     const eps = readNumber(t, "eps");
//     if (eps != null) {
//       out.trend = { eps: Math.max(0, eps) };
//     }
//   }

//   if (isObject(raw["band"])) {
//     const b = raw["band"] as Record<string, unknown>;
//     const band: NonNullable<ThresholdConfigOverridesV1["band"]> = {};

//     const copyBand = (key: keyof ThresholdConfigV1["band"]) => {
//       const v = b[key as string];
//       if (!isObject(v)) return;

//       const pct = readNumber(v, "pct");
//       const z = readNumber(v, "z");

//       const obj: Partial<BandThreshold> = {};
//       if (pct != null) obj.pct = clamp(pct, 0, 100);
//       if (z != null) obj.z = z;

//       if (Object.keys(obj).length > 0) {
//         // Type-safe assignment (no @ts-expect-error needed)
//         band[key] = obj;
//       }
//     };

//     copyBand("high");
//     copyBand("extreme_high");
//     copyBand("low");
//     copyBand("extreme_low");

//     if (Object.keys(band).length > 0) out.band = band;
//   }

//   return { ok: true, overrides: out };
// }

// src/lib/customThresholds/schema.ts
// Schema definitions for threshold configuration (v1).
//
// Design goals:
// - Explicit versioning (required for forward compatibility)
// - Clear separation between full config and overrides
// - Narrow, strongly typed surface (no `any`)
// - Compatible with deterministic server-side normalization

// src/lib/customThresholds/schema.ts

/**
 * Threshold configuration schema (v1)
 * Deterministic, explicit, no implicit defaults.
 */

export type ThresholdBandKey = "high" | "extreme_high" | "low" | "extreme_low";

export type ThresholdBand = {
  pct: number; // 0..100
  z: number;   // finite
};

export type ThresholdConfigV1 = {
  version: "v1";

  gate: {
    confidence_threshold: number; // 0..1
  };

  trend: {
    eps: number; // >= 0
  };

  band: {
    high: ThresholdBand;
    extreme_high: ThresholdBand;
    low: ThresholdBand;
    extreme_low: ThresholdBand;
  };
};

/**
 * Overrides are partial by design.
 * Only fields that differ from canonical should be present.
 */
export type ThresholdConfigOverridesV1 = {
  version?: "v1";

  gate?: {
    confidence_threshold?: number;
  };

  trend?: {
    eps?: number;
  };

  band?: {
    high?: Partial<ThresholdBand>;
    extreme_high?: Partial<ThresholdBand>;
    low?: Partial<ThresholdBand>;
    extreme_low?: Partial<ThresholdBand>;
  };
};