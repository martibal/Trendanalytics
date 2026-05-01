// src/lib/mobile/data.ts
// Mobile data fetching — reads from same published artifacts as desktop

import type { ChainId } from "@/config/chains";

// ── Types ────────────────────────────────────────────────────────────────────

export type MobileChainState = {
  chain: ChainId;
  label: string;
  name: string;
  regimeLabel: string | null;
  confidenceScore: number | null;
  confidenceBand: "Good" | "Caution" | "Degraded" | "Unknown";
  asOf: string | null;
  lagDays: number | null;
  freshnessStatus: "ok" | "warn" | "fail" | "unknown";
  oneLiner: string | null;
  scorecard: {
    demand: { score: number; level: string } | null;
    friction: { score: number; level: string } | null;
    capacity: { score: number; level: string } | null;
  };
  drivers: MobileDriver[];
  determinismHash: string | null;
};

export type MobileDriver = {
  metric: string;
  axis: string;
  current: number | null;
  zRobust: number | null;
  pct90d: number | null;
  trend: string | null;
  momentum: number | null;
};

export type MobileHistoryRow = {
  date: string;
  regimeLabel: string | null;
  confidenceScore: number | null;
  oneLiner: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function mobileBand(
  score: number | null
): "Good" | "Caution" | "Degraded" | "Unknown" {
  if (typeof score !== "number") return "Unknown";
  if (score >= 0.7) return "Good";
  if (score >= 0.4) return "Caution";
  return "Degraded";
}

export function mobileFreshness(
  chain: ChainId,
  lagDays: number | null
): "ok" | "warn" | "fail" | "unknown" {
  if (typeof lagDays !== "number") return "unknown";
  const expected = chain === "arbitrum" || chain === "base" ? 7 : 1;
  const soft = chain === "arbitrum" || chain === "base" ? 10 : 2;
  const hard = chain === "arbitrum" || chain === "base" ? 15 : 4;
  if (lagDays <= expected) return "ok";
  if (lagDays <= soft) return "warn";
  if (lagDays > hard) return "fail";
  return "warn";
}

export function mobileLag(asOf: string | null): number | null {
  if (!asOf) return null;
  const asOfMs = new Date(asOf + "T00:00:00Z").getTime();
  const todayMs = new Date(
    new Date().toISOString().slice(0, 10) + "T00:00:00Z"
  ).getTime();
  const diff = Math.round((todayMs - asOfMs) / 86400000);
  return diff >= 0 ? diff : null;
}

// ── Regime color tokens (matches design-tokens.ts) ──────────────────────────

export const REGIME_COLORS: Record<string, string> = {
  STABLE: "#00FF88",
  HEATING: "#FFD700",
  CONGESTED: "#FF4444",
  CHEAP: "#3B82F6",
  "UNKNOWN/DEGRADED": "#6B7280",
};

export const REGIME_BG: Record<string, string> = {
  STABLE: "rgba(0,255,136,0.12)",
  HEATING: "rgba(255,215,0,0.12)",
  CONGESTED: "rgba(255,68,68,0.12)",
  CHEAP: "rgba(59,130,246,0.12)",
  "UNKNOWN/DEGRADED": "rgba(107,114,128,0.12)",
};

export const CHAIN_COLORS: Record<ChainId, string> = {
  bitcoin: "#F7931A",
  ethereum: "#627EEA",
  arbitrum: "#28A0F0",
  base: "#0052FF",
};

export function regimeColor(label: string | null): string {
  return REGIME_COLORS[label ?? ""] ?? REGIME_COLORS["UNKNOWN/DEGRADED"];
}

export function regimeBg(label: string | null): string {
  return REGIME_BG[label ?? ""] ?? REGIME_BG["UNKNOWN/DEGRADED"];
}

// ── Meta JSON type (minimal, matches published artifact) ─────────────────────

type MetaDriver = {
  axis?: string;
  current?: number;
  metric?: string;
  momentum_7d_vs_30d?: number;
  pct_90d?: number;
  trend?: string;
  z_robust?: number;
};

type MetaJson = {
  date?: string;
  updated_through?: string;
  status?: { label?: string; one_liner?: string };
  regime?: {
    label?: string;
    asof_date?: string;
    drivers?: MetaDriver[];
    determinism_hash?: string;
  };
  confidence?: {
    confidence_score?: number;
    lag_days_vs_utc_today?: number;
    date?: string;
  };
  scorecard?: {
    dimensions?: {
      demand?: { score?: number; level?: string };
      friction?: { score?: number; level?: string };
      capacity?: { score?: number; level?: string };
    };
  };
};

// ── Parse from meta JSON ──────────────────────────────────────────────────────

export function parseMobileChainState(
  chain: ChainId,
  chainLabel: string,
  chainName: string,
  meta: MetaJson | null
): MobileChainState {
  const asOf =
    meta?.date ??
    meta?.updated_through ??
    meta?.regime?.asof_date ??
    null;

  const lagDays = mobileLag(asOf);
  const regimeLabel =
    meta?.status?.label ?? meta?.regime?.label ?? null;
  const confidenceScore =
    typeof meta?.confidence?.confidence_score === "number"
      ? meta.confidence.confidence_score
      : null;

  const drivers: MobileDriver[] = (meta?.regime?.drivers ?? [])
    .slice(0, 3)
    .map((d) => ({
      metric: d.metric ?? "",
      axis: d.axis ?? "",
      current: d.current ?? null,
      zRobust: d.z_robust ?? null,
      pct90d: d.pct_90d ?? null,
      trend: d.trend ?? null,
      momentum: d.momentum_7d_vs_30d ?? null,
    }));

  const dims = meta?.scorecard?.dimensions;

  return {
    chain,
    label: chainLabel,
    name: chainName,
    regimeLabel,
    confidenceScore,
    confidenceBand: mobileBand(confidenceScore),
    asOf,
    lagDays,
    freshnessStatus: mobileFreshness(chain, lagDays),
    oneLiner: meta?.status?.one_liner ?? null,
    scorecard: {
      demand: dims?.demand?.score != null
        ? { score: dims.demand.score, level: dims.demand.level ?? "" }
        : null,
      friction: dims?.friction?.score != null
        ? { score: dims.friction.score, level: dims.friction.level ?? "" }
        : null,
      capacity: dims?.capacity?.score != null
        ? { score: dims.capacity.score, level: dims.capacity.level ?? "" }
        : null,
    },
    drivers,
    determinismHash: meta?.regime?.determinism_hash ?? null,
  };
}
