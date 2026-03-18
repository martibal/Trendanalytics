// src/lib/customThresholds/evaluate.ts
// Custom regime evaluation from canonical META evidence + user overrides.
//
// IMPORTANT
// - This is descriptive-only evaluation.
// - It does NOT change canonical published artifacts.
// - It reads canonical evidence surfaces (primarily meta.regime.signals / drivers)
//   and produces a deterministic "custom" label + explanation.
//
// High-level approach (v1):
// 1) Gate: if confidence is missing or < confidence_threshold => "INSUFFICIENT_DATA"
// 2) Aggregate axis evidence from canonical signals/drivers into three axes:
//    - demand, friction, capacity
// 3) Convert evidence into an axis score, then map to a label:
//    - demand high -> HEATING (more demand pressure)
//    - friction high -> CONGESTED (execution cost/failure pressure)
//    - capacity low -> CHEAP (excess headroom / low pressure)
//    - otherwise -> STABLE
//
// This intentionally mirrors the site’s canonical labels (STABLE/HEATING/CONGESTED/CHEAP)
// while letting power users test alternative thresholds.

import type { MetaFile } from "@/lib/types";
import type { ThresholdConfigOverridesV1, ThresholdConfigV1 } from "./schema";
import { mergeThresholdConfig } from "./merge";
import { THRESHOLD_CONFIG_DEFAULT_V1 } from "./defaults";

export type CustomRegimeLabel = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "INSUFFICIENT_DATA";

export type CustomRegimeReason = {
  axis: "demand" | "friction" | "capacity" | "unknown";
  metric: string;
  pct_90d: number | null; // normalized 0..100
  z_robust: number | null;
  momentum_7d_vs_30d: number | null;
  evidence: "EXTREME_HIGH" | "HIGH" | "TYPICAL" | "LOW" | "EXTREME_LOW";
  notes: string[];
};

export type CustomRegimeResult = {
  label: CustomRegimeLabel;

  // Deterministic effective config used (merged + normalized)
  config_effective: ThresholdConfigV1;

  // Gate surface
  gate: {
    status: "OK" | "INSUFFICIENT_DATA";
    confidence_score: number | null;
    threshold_used: number;
    reason:
      | "ok"
      | "missing_meta"
      | "missing_confidence"
      | "confidence_below_threshold";
  };

  // Explanation surface (top reasons)
  reasons: CustomRegimeReason[];

  // Optional: axis scores in [-inf, inf] scale (descriptive only)
  axis_scores: {
    demand: number | null;
    friction: number | null;
    capacity: number | null;
  };
};

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  if (Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function getNumber(v: unknown): number | null {
  return isFiniteNumber(v) ? v : null;
}

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v : null;
}

function normalizePctTo0_100(pct: unknown): number | null {
  // Defensive: pct may be 0..1 or 0..100 depending on publisher.
  const n = getNumber(pct);
  if (n === null) return null;

  // If it looks like 0..1, scale to 0..100.
  if (n >= 0 && n <= 1.5) return Math.max(0, Math.min(100, n * 100));
  return Math.max(0, Math.min(100, n));
}

type CanonicalSignal = {
  key: string; // metric key
  axis: "demand" | "friction" | "capacity" | "unknown";
  pct_90d: number | null; // 0..100
  z_robust: number | null;
  momentum_7d_vs_30d: number | null;
};

function pickAxisFromKey(metricKey: string): CanonicalSignal["axis"] {
  const k = metricKey.toLowerCase();

  // Demand
  if (k.includes("tx_count") || k.includes("active_addresses") || k.includes("unique_active") || k.includes("value_transferred")) {
    return "demand";
  }

  // Friction
  if (k.includes("fee") || k.includes("failed_tx") || k.includes("failure") || k.includes("revert")) {
    return "friction";
  }

  // Capacity / headroom
  if (k.includes("utilization") || k.includes("block_time") || k.includes("gas_used") || k.includes("block_utilization")) {
    return "capacity";
  }

  return "unknown";
}

function readConfidenceScore(meta: MetaFile | null): number | null {
  if (!meta) return null;
  const c = (meta as any)?.confidence?.confidence_score;
  return getNumber(c);
}

function readSignals(meta: MetaFile | null): CanonicalSignal[] {
  if (!meta) return [];

  // Prefer meta.regime.signals (metric-keyed object), fall back to regime.drivers (array)
  const regime = asRecord((meta as any)?.regime);
  if (!regime) return [];

  const signals = asRecord(regime["signals"]);
  const out: CanonicalSignal[] = [];

  if (signals) {
    for (const [key, raw] of Object.entries(signals)) {
      const r = asRecord(raw);
      if (!r) continue;

      const pct = normalizePctTo0_100(r["pct_90d"] ?? r["pct"] ?? r["percentile"]);
      const z = getNumber(r["z_robust"] ?? r["z"]);
      const mom = getNumber(r["momentum_7d_vs_30d"] ?? r["mom_7d_30d"] ?? r["momentum"]);

      out.push({
        key,
        axis: pickAxisFromKey(key),
        pct_90d: pct,
        z_robust: z,
        momentum_7d_vs_30d: mom,
      });
    }
    return out;
  }

  const drivers = Array.isArray(regime["drivers"]) ? (regime["drivers"] as unknown[]) : [];
  for (const d of drivers) {
    const r = asRecord(d);
    if (!r) continue;

    const metric = getString(r["metric"]) ?? "unknown_metric";
    const axisRaw = getString(r["axis"]);
    const axis =
      axisRaw === "demand" || axisRaw === "friction" || axisRaw === "capacity"
        ? axisRaw
        : pickAxisFromKey(metric);

    const pct = normalizePctTo0_100(r["pct_90d"]);
    const z = getNumber(r["z_robust"]);
    const mom = getNumber(r["momentum_7d_vs_30d"]);

    out.push({
      key: metric,
      axis,
      pct_90d: pct,
      z_robust: z,
      momentum_7d_vs_30d: mom,
    });
  }

  return out;
}

type EvidenceBand = "EXTREME_HIGH" | "HIGH" | "TYPICAL" | "LOW" | "EXTREME_LOW";

function evidenceBandFromSignal(sig: CanonicalSignal, cfg: ThresholdConfigV1): EvidenceBand {
  const pct = sig.pct_90d;
  const z = sig.z_robust;

  // If we lack both, treat as typical but will downrank in scoring.
  if (pct === null && z === null) return "TYPICAL";

  const highPct = cfg.band.high.pct;
  const highZ = cfg.band.high.z;
  const xHighPct = cfg.band.extreme_high.pct;
  const xHighZ = cfg.band.extreme_high.z;

  const lowPct = cfg.band.low.pct;
  const lowZ = cfg.band.low.z;
  const xLowPct = cfg.band.extreme_low.pct;
  const xLowZ = cfg.band.extreme_low.z;

  const highHit =
    (pct !== null && pct >= highPct) || (z !== null && z >= highZ);
  const xHighHit =
    (pct !== null && pct >= xHighPct) || (z !== null && z >= xHighZ);

  const lowHit =
    (pct !== null && pct <= lowPct) || (z !== null && z <= lowZ);
  const xLowHit =
    (pct !== null && pct <= xLowPct) || (z !== null && z <= xLowZ);

  if (xHighHit) return "EXTREME_HIGH";
  if (xLowHit) return "EXTREME_LOW";
  if (highHit) return "HIGH";
  if (lowHit) return "LOW";
  return "TYPICAL";
}

function bandScore(b: EvidenceBand): number {
  // Symmetric scores around 0; extreme evidence counts more.
  if (b === "EXTREME_HIGH") return +2;
  if (b === "HIGH") return +1;
  if (b === "LOW") return -1;
  if (b === "EXTREME_LOW") return -2;
  return 0;
}

function momentumBonus(mom: number | null, eps: number): number {
  // Momentum bonus is small and controlled by eps:
  // - If momentum indicates "rising" (positive), add a small positive; if falling, small negative.
  // - eps makes it harder to move the score meaningfully.
  if (mom === null || !Number.isFinite(mom)) return 0;
  const scaled = mom / Math.max(eps, 1e-6);
  // Clamp to prevent runaway in edge cases
  const clamped = Math.max(-1, Math.min(1, scaled));
  return clamped * 0.25;
}

function computeAxisScores(signals: CanonicalSignal[], cfg: ThresholdConfigV1): {
  demand: number | null;
  friction: number | null;
  capacity: number | null;
  reasons: CustomRegimeReason[];
} {
  const byAxis: Record<"demand" | "friction" | "capacity", CanonicalSignal[]> = {
    demand: [],
    friction: [],
    capacity: [],
  };

  for (const s of signals) {
    if (s.axis === "demand" || s.axis === "friction" || s.axis === "capacity") byAxis[s.axis].push(s);
  }

  const reasons: CustomRegimeReason[] = [];

  function scoreAxis(axis: "demand" | "friction" | "capacity"): number | null {
    const xs = byAxis[axis];
    if (!xs.length) return null;

    // Rank by absolute evidence strength (bandScore), then include momentum as tie-break.
    const scored = xs
      .map((sig) => {
        const band = evidenceBandFromSignal(sig, cfg);
        const base = bandScore(band);
        const bonus = momentumBonus(sig.momentum_7d_vs_30d, cfg.trend.eps);
        // If we lack both pct and z, strongly downrank
        const missingPenalty = sig.pct_90d === null && sig.z_robust === null ? 0.5 : 0;
        const total = base + bonus - missingPenalty;

        return { sig, band, total, base, bonus };
      })
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    const top = scored.slice(0, 3);

    for (const t of top) {
      reasons.push({
        axis,
        metric: t.sig.key,
        pct_90d: t.sig.pct_90d,
        z_robust: t.sig.z_robust,
        momentum_7d_vs_30d: t.sig.momentum_7d_vs_30d,
        evidence: t.band,
        notes: [
          `band_score=${t.base}`,
          `momentum_bonus=${t.bonus.toFixed(3)}`,
          `eps=${cfg.trend.eps}`,
        ],
      });
    }

    // Axis score: mean of top evidence totals (keeps deterministic and stable).
    const denom = top.length || 1;
    const sum = top.reduce((acc, x) => acc + x.total, 0);
    return sum / denom;
  }

  return {
    demand: scoreAxis("demand"),
    friction: scoreAxis("friction"),
    capacity: scoreAxis("capacity"),
    reasons,
  };
}

function labelFromAxisScores(scores: {
  demand: number | null;
  friction: number | null;
  capacity: number | null;
}): CustomRegimeLabel {
  // If all are null, we cannot interpret.
  const allNull = scores.demand === null && scores.friction === null && scores.capacity === null;
  if (allNull) return "INSUFFICIENT_DATA";

  // Pick the axis with the strongest absolute signal.
  const entries: Array<[keyof typeof scores, number]> = [];
  if (scores.demand !== null) entries.push(["demand", scores.demand]);
  if (scores.friction !== null) entries.push(["friction", scores.friction]);
  if (scores.capacity !== null) entries.push(["capacity", scores.capacity]);

  entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const [axis, val] = entries[0];

  // Map strongest axis evidence to canonical-like label semantics.
  // Positive demand => HEATING
  if (axis === "demand" && val > 0.5) return "HEATING";

  // Positive friction => CONGESTED
  if (axis === "friction" && val > 0.5) return "CONGESTED";

  // Capacity is inverted: "low pressure" tends to show as LOW/EXTREME_LOW -> negative score
  if (axis === "capacity" && val < -0.5) return "CHEAP";

  return "STABLE";
}

export function evaluateCustomRegime(args: {
  meta: MetaFile | null;
  overrides?: ThresholdConfigOverridesV1 | null;
  baseConfig?: ThresholdConfigV1;
}): CustomRegimeResult {
  const base = args.baseConfig ?? THRESHOLD_CONFIG_DEFAULT_V1;
  const cfg = mergeThresholdConfig(args.overrides ?? null, base);

  // Gate
  if (!args.meta) {
    return {
      label: "INSUFFICIENT_DATA",
      config_effective: cfg,
      gate: {
        status: "INSUFFICIENT_DATA",
        confidence_score: null,
        threshold_used: cfg.gate.confidence_threshold,
        reason: "missing_meta",
      },
      reasons: [],
      axis_scores: { demand: null, friction: null, capacity: null },
    };
  }

  const c = readConfidenceScore(args.meta);
  if (c === null) {
    return {
      label: "INSUFFICIENT_DATA",
      config_effective: cfg,
      gate: {
        status: "INSUFFICIENT_DATA",
        confidence_score: null,
        threshold_used: cfg.gate.confidence_threshold,
        reason: "missing_confidence",
      },
      reasons: [],
      axis_scores: { demand: null, friction: null, capacity: null },
    };
  }

  if (c < cfg.gate.confidence_threshold) {
    return {
      label: "INSUFFICIENT_DATA",
      config_effective: cfg,
      gate: {
        status: "INSUFFICIENT_DATA",
        confidence_score: c,
        threshold_used: cfg.gate.confidence_threshold,
        reason: "confidence_below_threshold",
      },
      reasons: [],
      axis_scores: { demand: null, friction: null, capacity: null },
    };
  }

  const signals = readSignals(args.meta);
  const { demand, friction, capacity, reasons } = computeAxisScores(signals, cfg);
  const label = labelFromAxisScores({ demand, friction, capacity });

  // Keep reasons stable: sort by absolute impact and take top 6
  const sortedReasons = reasons
    .slice()
    .sort((a, b) => {
      const aScore = bandScore(a.evidence) + momentumBonus(a.momentum_7d_vs_30d, cfg.trend.eps);
      const bScore = bandScore(b.evidence) + momentumBonus(b.momentum_7d_vs_30d, cfg.trend.eps);
      return Math.abs(bScore) - Math.abs(aScore);
    })
    .slice(0, 6);

  return {
    label,
    config_effective: cfg,
    gate: {
      status: "OK",
      confidence_score: c,
      threshold_used: cfg.gate.confidence_threshold,
      reason: "ok",
    },
    reasons: sortedReasons,
    axis_scores: { demand, friction, capacity },
  };
}