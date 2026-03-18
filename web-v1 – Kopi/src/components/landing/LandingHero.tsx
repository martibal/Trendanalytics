// src/components/landing/LandingHero.tsx
"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import clsx from "clsx";

import useSWR from "swr";

import type { MetaFile, ChainId } from "@/lib/types";
import { useLandingHero } from "@/lib/data";
import { InfoBox } from "@/components/info-boxes/InfoBox";
import { RegimeBadge } from "@/components/ui/RegimeBadge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from "recharts";

type Verdict = "LIKELY_NOISE" | "MIXED" | "STRUCTURAL_SHIFT" | "INSUFFICIENT_DATA";

const CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

// Landing-only descriptive gate explanation (UI contract; provider swapped later)
// NOTE: canonical per-chain gate threshold is preferred from published meta: meta.regime.gate.threshold
// UI fallback only (nødventil): used only if meta.regime.gate.threshold is missing/invalid
const UI_FALLBACK_CONF_GATE_THRESHOLD = 0.45;

async function fetcherOrNull<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Persistence definition for landing (descriptive, explainable):
 * - Compute robust band from the selected horizon slice:
 *   q25, median, q75 => IQR = q75-q25
 * - Define elevated threshold = median + (k * IQR)
 * - Then summarize persistence in the last 7d / 30d:
 *   share elevated + longest streak + current streak
 */
const ELEVATION_IQR_MULT = 1.0;

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function chainTitle(chain: ChainId): string {
  if (chain === "bitcoin") return "Bitcoin";
  if (chain === "ethereum") return "Ethereum";
  if (chain === "arbitrum") return "Arbitrum";
  return "Base";
}

function chainTagline(chain: ChainId): string {
  if (chain === "bitcoin") return "Settlement-focused L1 · non-EVM profile";
  if (chain === "ethereum") return "General-purpose EVM L1 · fees + activity mix";
  if (chain === "arbitrum") return "EVM L2 rollup · sequencer + bridge dynamics";
  return "EVM L2 rollup · ecosystem growth + usage shifts";
}

function verdictTone(v: Verdict): string {
  if (v === "LIKELY_NOISE") return "border-ui-ok/25 bg-ui-ok/10 text-ui-ok";
  if (v === "STRUCTURAL_SHIFT") return "border-ui-warn/25 bg-ui-warn/10 text-ui-warn";
  if (v === "MIXED") return "border-ui-accent/25 bg-ui-accent/10 text-ui-accent";
  return "border-ui-border bg-ui-bg/20 text-ui-muted";
}

function verdictLabel(v: Verdict): string {
  if (v === "LIKELY_NOISE") return "Likely noise";
  if (v === "STRUCTURAL_SHIFT") return "Structural shift";
  if (v === "MIXED") return "Mixed / transitional";
  return "Insufficient data";
}

function confLabel(conf01: number): "High" | "Medium" | "Low" {
  if (conf01 >= 0.75) return "High";
  if (conf01 >= 0.45) return "Medium";
  return "Low";
}

function fmtISODate(iso: string): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  return d.length === 10 ? d : iso;
}

function fmtNum(x: unknown, digits = 2): string {
  if (!isFiniteNumber(x)) return "—";
  return x.toFixed(digits);
}

function fmtPct01(x: unknown): string {
  if (!isFiniteNumber(x)) return "—";
  const v = x > 1.5 ? x : x * 100;
  return `${Math.round(v)}%`;
}

function Pill({
  children,
  tone,
  title,
}: {
  children: React.ReactNode;
  tone?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-mono",
        tone ? tone : "border-ui-border bg-ui-bg/10 text-ui-muted"
      )}
    >
      {children}
    </span>
  );
}

function SmallBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={clsx(
        "rounded-full border px-3 py-1 text-[11px] font-mono transition",
        active
          ? "border-ui-border-soft bg-ui-surface2 text-ui-text"
          : "border-ui-border bg-ui-bg/10 text-ui-muted hover:text-ui-text hover:border-ui-border-soft"
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function pctile(xs: number[], p: number): number {
  if (xs.length === 0) return NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  const i = (sorted.length - 1) * p;
  const i0 = Math.floor(i);
  const i1 = Math.ceil(i);
  if (i0 === i1) return sorted[i0]!;
  const w = i - i0;
  return sorted[i0]! * (1 - w) + sorted[i1]! * w;
}

function robustBand(scores: number[]) {
  if (!scores.length) {
    return {
      ok: false as const,
      q25: NaN,
      q50: NaN,
      q75: NaN,
      iqr: NaN,
      elevatedThreshold: NaN,
    };
  }

  const q25 = pctile(scores, 0.25);
  const q50 = pctile(scores, 0.5);
  const q75 = pctile(scores, 0.75);
  const iqr = q75 - q25;
  const elevatedThreshold = q50 + ELEVATION_IQR_MULT * iqr;

  return { ok: true as const, q25, q50, q75, iqr, elevatedThreshold };
}

function computePersistence(scores: number[], elevatedThreshold: number | null) {
  if (!scores.length || !isFiniteNumber(elevatedThreshold)) {
    return { share: NaN, longest: 0, current: 0 };
  }

  const flags = scores.map((s) => isFiniteNumber(s) && s >= elevatedThreshold);
  const share = flags.length ? flags.filter(Boolean).length / flags.length : NaN;

  let longest = 0;
  let run = 0;
  for (const f of flags) {
    if (f) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = flags.length - 1; i >= 0; i -= 1) {
    if (flags[i]) current += 1;
    else break;
  }

  return { share, longest, current };
}

function sliceForHorizon<T extends { date: string }>(
  series: T[],
  horizon: 7 | 30 | 90 | 180 | 365
): T[] {
  if (!Array.isArray(series) || series.length === 0) return [];
  return series.slice(Math.max(0, series.length - horizon));
}
type LandingDriver = {
  axis: string;
  metric: string;
  pct_90d: unknown;
  z_robust: unknown;
  momentum_7d_vs_30d: unknown;
  trend: "rising" | "falling" | "flat";
  why: string;
  what: string;
};

type LandingWindow = {
  windowLabel: "1d" | "7d" | "30d";
  summary: string;
  score: number; // 0..100 UI index
  momentum: number; // -1..1 descriptive
};

type LandingHistoryPoint = { date: string; score: number; conf: number };

type LandingChainUI = {
  chain: ChainId;
  verdict: Verdict;
  regimeLabel: string;
  asofISO: string;
  lagDays: number;
  lagLabel: string;
  confidence01: number;
  gateThreshold?: number;
  gateStatus?: string;
  missingMeta?: boolean;
  missingConfidence?: boolean;

  windows: LandingWindow[];
  history: LandingHistoryPoint[];
  drivers: LandingDriver[];

  chainWhat: string;
  chainWhyMetrics: string[];
};

const LANDING_MOCK: Record<ChainId, LandingChainUI> = {
  bitcoin: {
    chain: "bitcoin",
    verdict: "LIKELY_NOISE",
    regimeLabel: "STABLE",
    asofISO: "2026-02-26",
    lagDays: 1,
    lagLabel: "Daily",
    confidence01: 0.86,
    windows: [
      { windowLabel: "1d", summary: "Small deviation within recent distribution.", score: 52, momentum: 0.02 },
      { windowLabel: "7d", summary: "Sustained level remains near historical median.", score: 49, momentum: -0.03 },
      { windowLabel: "30d", summary: "Baseline stable; no persistent shift detected.", score: 51, momentum: 0.0 },
    ],
    history: Array.from({ length: 90 }).map((_, i) => {
      const day = 90 - i;
      const date = new Date(Date.UTC(2026, 1, 26));
      date.setUTCDate(date.getUTCDate() - day);
      const d = date.toISOString().slice(0, 10);
      const score = 50 + Math.sin(i / 9) * 3 + Math.cos(i / 17) * 2;
      return { date: d, score: Math.round(score * 10) / 10, conf: 0.86 };
    }),
    drivers: [
      {
        axis: "fees",
        metric: "fees_usd_proxy",
        pct_90d: 0.55,
        z_robust: 0.42,
        momentum_7d_vs_30d: 0.08,
        trend: "flat",
        what: "A settlement-demand proxy via fee pressure (not price).",
        why: "Captures persistent demand changes vs transient spikes.",
      },
      {
        axis: "activity",
        metric: "active_entities_proxy",
        pct_90d: 0.48,
        z_robust: -0.1,
        momentum_7d_vs_30d: -0.04,
        trend: "flat",
        what: "A participation proxy using robust entity/activity signals.",
        why: "Differentiates broad participation shifts from isolated events.",
      },
      {
        axis: "mempool",
        metric: "mempool_pressure_proxy",
        pct_90d: 0.51,
        z_robust: 0.05,
        momentum_7d_vs_30d: 0.02,
        trend: "flat",
        what: "A congestion-pressure proxy using mempool and confirmation dynamics.",
        why: "Helps detect structural congestion regimes without price.",
      },
    ],
    chainWhat:
      "Bitcoin is a settlement-oriented L1 with a non-EVM execution model. Many EVM-centric activity metrics do not apply.",
    chainWhyMetrics: [
      "Bitcoin&rsquos primary regime signals are fee pressure, congestion proxies, and broad participation patterns.",
      "We avoid EVM-native constructs (gas, contract calls) and use Bitcoin-specific proxies instead.",
    ],
  },
  ethereum: {
    chain: "ethereum",
    verdict: "MIXED",
    regimeLabel: "HEATING",
    asofISO: "2026-02-26",
    lagDays: 1,
    lagLabel: "Daily",
    confidence01: 0.63,
    windows: [
      { windowLabel: "1d", summary: "Recent move is notable but not yet persistent.", score: 58, momentum: 0.1 },
      { windowLabel: "7d", summary: "Short-term direction upward vs 30d baseline.", score: 62, momentum: 0.18 },
      { windowLabel: "30d", summary: "Baseline elevated, but dispersion remains moderate.", score: 57, momentum: 0.05 },
    ],
    history: Array.from({ length: 180 }).map((_, i) => {
      const day = 180 - i;
      const date = new Date(Date.UTC(2026, 1, 26));
      date.setUTCDate(date.getUTCDate() - day);
      const d = date.toISOString().slice(0, 10);
      const score = 52 + i * 0.03 + Math.sin(i / 11) * 4;
      return { date: d, score: Math.round(score * 10) / 10, conf: 0.63 };
    }),
    drivers: [
      {
        axis: "fees",
        metric: "gas_fee_pressure",
        pct_90d: 0.79,
        z_robust: 1.55,
        momentum_7d_vs_30d: 0.34,
        trend: "rising",
        what: "A demand proxy capturing fee pressure as usage competes for blockspace.",
        why: "Fee pressure is a durable signal of demand regimes (not price).",
      },
      {
        axis: "activity",
        metric: "contract_interactions_proxy",
        pct_90d: 0.66,
        z_robust: 0.88,
        momentum_7d_vs_30d: 0.21,
        trend: "rising",
        what: "A usage proxy capturing contract-level interactions and active patterns.",
        why: "Broad activity persistence differentiates regime change from spikes.",
      },
      {
        axis: "stability",
        metric: "reorg_stability_proxy",
        pct_90d: 0.41,
        z_robust: -0.22,
        momentum_7d_vs_30d: -0.03,
        trend: "flat",
        what: "A stability proxy capturing chain health and settlement consistency.",
        why: "Helps interpret whether high demand coincides with structural strain.",
      },
    ],
    chainWhat:
      "Ethereum is a general-purpose EVM L1 where demand, capacity, and friction signals interplay (fees, activity composition, settlement).",
    chainWhyMetrics: [
      "Fee pressure and activity persistence are core signals for demand regimes.",
      "Capacity and friction proxies help differentiate sustainable shifts from transient spikes.",
      ],
  },
  arbitrum: {
    chain: "arbitrum",
    verdict: "INSUFFICIENT_DATA",
    regimeLabel: "WITHHELD",
    asofISO: "2026-02-19",
    lagDays: 8,
    lagLabel: "Weekly-ish",
    confidence01: 0.31,
    windows: [
      { windowLabel: "1d", summary: "Data is visible, but classification label is withheld due to low confidence.", score: 54, momentum: 0.01 },
      { windowLabel: "7d", summary: "Short-term context appears slightly elevated but needs more stable coverage.", score: 59, momentum: 0.09 },
      { windowLabel: "30d", summary: "Baseline ambiguous; persistence uncertain under current freshness constraints.", score: 55, momentum: 0.03 },
    ],
    history: Array.from({ length: 120 }).map((_, i) => {
      const day = 120 - i;
      const date = new Date(Date.UTC(2026, 1, 26));
      date.setUTCDate(date.getUTCDate() - day);
      const d = date.toISOString().slice(0, 10);
      const score = 54 + Math.sin(i / 10) * 5;
      return { date: d, score: Math.round(score * 10) / 10, conf: 0.31 };
    }),
    drivers: [
      {
        axis: "fees",
        metric: "l2_fee_pressure_proxy",
        pct_90d: 0.58,
        z_robust: 0.31,
        momentum_7d_vs_30d: 0.07,
        trend: "flat",
        what: "A rollup fee-pressure proxy (not price).",
        why: "Captures persistent changes in demand for rollup throughput.",
      },
      {
        axis: "bridge",
        metric: "bridge_flow_proxy",
        pct_90d: 0.62,
        z_robust: 0.5,
        momentum_7d_vs_30d: 0.12,
        trend: "rising",
        what: "A bridge-activity proxy reflecting cross-domain movement patterns.",
        why: "Can signal structural shifts in L2 usage composition.",
      },
      {
        axis: "activity",
        metric: "l2_active_entities_proxy",
        pct_90d: 0.49,
        z_robust: -0.05,
        momentum_7d_vs_30d: 0.02,
        trend: "flat",
        what: "A participation proxy for L2 usage breadth.",
        why: "Separates broad adoption shifts from isolated events.",
      },
    ],
    chainWhat:
      "Arbitrum is an EVM L2 rollup with distinct dynamics (sequencer, bridge, and rollup-specific throughput).",
    chainWhyMetrics: [
      "Bridge + fee pressure capture structural usage shifts unique to L2s.",
      "Freshness/coverage can lag; labels are withheld when confidence is insufficient.",
    ],
  },
  base: {
    chain: "base",
    verdict: "INSUFFICIENT_DATA",
    regimeLabel: "WITHHELD",
    asofISO: "2026-02-19",
    lagDays: 8,
    lagLabel: "Weekly-ish",
    confidence01: 0.28,
    windows: [
      { windowLabel: "1d", summary: "Data is visible, but classification label is withheld due to low confidence.", score: 56, momentum: 0.03 },
      { windowLabel: "7d", summary: "Context elevated; persistence evaluation limited by freshness.", score: 63, momentum: 0.16 },
      { windowLabel: "30d", summary: "Baseline rising but uncertain under current coverage constraints.", score: 58, momentum: 0.07 },
    ],
    history: Array.from({ length: 120 }).map((_, i) => {
      const day = 120 - i;
      const date = new Date(Date.UTC(2026, 1, 26));
      date.setUTCDate(date.getUTCDate() - day);
      const d = date.toISOString().slice(0, 10);
      const score = 56 + i * 0.02 + Math.sin(i / 12) * 4;
      return { date: d, score: Math.round(score * 10) / 10, conf: 0.28 };
    }),
    drivers: [
      {
        axis: "fees",
        metric: "l2_fee_pressure_proxy",
        pct_90d: 0.71,
        z_robust: 1.02,
        momentum_7d_vs_30d: 0.25,
        trend: "rising",
        what: "A rollup fee-pressure proxy capturing demand vs throughput.",
        why: "Sustained fee pressure is a durable demand regime signal.",
      },
      {
        axis: "activity",
        metric: "l2_contract_interactions_proxy",
        pct_90d: 0.69,
        z_robust: 0.95,
        momentum_7d_vs_30d: 0.19,
        trend: "rising",
        what: "A usage proxy capturing contract-level interactions on Base.",
        why: "Persistent activity indicates structural adoption shifts.",
      },
      {
        axis: "bridge",
        metric: "bridge_flow_proxy",
        pct_90d: 0.6,
        z_robust: 0.44,
        momentum_7d_vs_30d: 0.11,
        trend: "rising",
        what: "A bridge-activity proxy reflecting L2 onboarding flows.",
        why: "Can signal structural demand shifts in new L2 ecosystems.",
      },
    ],
    chainWhat:
      "Base is an EVM L2 rollup with rapidly evolving ecosystem dynamics; freshness/coverage can lag in early stages.",
    chainWhyMetrics: [
      "Demand proxies (fees/activity) help detect sustained adoption shifts.",
      "Bridge + throughput context help separate bursts from persistent regimes.",
    ],
  },
};

function Sparkline({ data }: { data: { date: string; score: number }[] }) {
  const stroke = "hsl(var(--ui-accent))";

  return (
    <div className="h-[34px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={[0, 100]} />
          <Line type="monotone" dataKey="score" stroke={stroke} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function OverviewCard({
  ui,
  active,
  onClick,
}: {
  ui: LandingChainUI;
  active?: boolean;
  onClick: () => void;
}) {
  const confTxt = confLabel(ui.confidence01);
  const gateThr = isFiniteNumber(ui.gateThreshold) ? ui.gateThreshold : UI_FALLBACK_CONF_GATE_THRESHOLD;
  const confBelowGate = ui.confidence01 < gateThr;

  // Use last 60 points for sparkline if available (works for all chains)
  const spark = ui.history.slice(Math.max(0, ui.history.length - 60)).map((p) => ({ date: p.date, score: p.score }));

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "ui-lift text-left rounded-lg border p-4",
        active
          ? "border-ui-border-soft bg-ui-surface2"
          : "border-ui-border bg-ui-bg/10 hover:border-ui-border-soft hover:bg-ui-bg/15"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Chain</div>
          <div className="mt-1 text-sm font-semibold text-ui-text">{chainTitle(ui.chain)}</div>
          <div className="mt-1 text-[11px] text-ui-faint">{chainTagline(ui.chain)}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Pill tone={verdictTone(ui.verdict)} title="Landing verdict (descriptive classification)">
            {verdictLabel(ui.verdict)}
          </Pill>
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold text-ui-faint">Canonical</span>
            <RegimeBadge label={ui.regimeLabel} />
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-ui-border bg-ui-bg/10 p-2.5">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-ui-faint">As-of</div>
          <div className="mt-1 font-mono text-[11px] text-ui-muted">{fmtISODate(ui.asofISO)}</div>
          <div className="mt-1 text-[10px] text-ui-faint">
            {ui.lagLabel} · lag {ui.lagDays}d
          </div>
        </div>
        <div className="rounded-md border border-ui-border bg-ui-bg/10 p-2.5">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-ui-faint">Confidence</div>
          <div className="mt-1 text-[11px] text-ui-muted">
            <span className="font-mono text-ui-text">{fmtNum(ui.confidence01, 2)}</span>{" "}
            <span className="text-ui-faint">({confTxt})</span>
          </div>
          <div className="mt-1 text-[10px] text-ui-faint">
            Gate {fmtNum(gateThr, 2)} · {confBelowGate ? "withheld" : "pass"}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-ui-border bg-ui-bg/10 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-ui-faint">
            Context score sparkline
          </div>
          <div className="text-[10px] text-ui-faint">~60d</div>
        </div>
        <div className="mt-2">
          <Sparkline data={spark} />
        </div>
        <div className="mt-1 text-[10px] text-ui-faint">Descriptive context level; not a forecast and not advice.</div>
      </div>

      <div className="mt-3 text-[11px] text-ui-faint">
        <span className="text-ui-muted">
          {ui.drivers.slice(0, 2).map((d, i) => (
            <span key={`${d.axis}:${d.metric}`}>
              {i ? " · " : ""}
              <span className="font-mono">{d.axis}</span>:{d.metric}
            </span>
          ))}
        </span>
      </div>
    </button>
  );
}

export default function LandingHero() {
  const [selectedChain, setSelectedChain] = useState<ChainId>("bitcoin");
  const [historyHorizon, setHistoryHorizon] = useState<7 | 30 | 90 | 180 | 365>(90);

  const hero = useLandingHero(selectedChain);

  const metaLatest = useSWR<MetaFile | null>(
    `/data/published/v1/meta/${selectedChain}/latest.json`,
    fetcherOrNull,
    { revalidateOnFocus: false }
  );

  const metaHistory = useSWR<MetaFile[] | null>(
    `/data/published/v1/meta/${selectedChain}/last${historyHorizon}d.json`,
    fetcherOrNull,
    { revalidateOnFocus: false }
  );

  // Cross-chain latest meta snapshots for the market-state matrix.
  const metaLatestBTC = useSWR<MetaFile | null>(`/data/published/v1/meta/bitcoin/latest.json`, fetcherOrNull, {
    revalidateOnFocus: false,
  });
  const metaLatestETH = useSWR<MetaFile | null>(`/data/published/v1/meta/ethereum/latest.json`, fetcherOrNull, {
    revalidateOnFocus: false,
  });
  const metaLatestARB = useSWR<MetaFile | null>(`/data/published/v1/meta/arbitrum/latest.json`, fetcherOrNull, {
    revalidateOnFocus: false,
  });
  const metaLatestBASE = useSWR<MetaFile | null>(`/data/published/v1/meta/base/latest.json`, fetcherOrNull, {
    revalidateOnFocus: false,
  });

  const ui = useMemo(() => {
    const base = LANDING_MOCK[selectedChain];

    const m = metaLatest.data ?? null;
    const gateThr =
      typeof (m as any)?.regime?.gate?.threshold === "number"
        ? (m as any).regime.gate.threshold
        : UI_FALLBACK_CONF_GATE_THRESHOLD;
    const gateStatus = typeof (m as any)?.regime?.gate?.status === "string" ? (m as any).regime.gate.status : undefined;

    const conf01 =
      typeof (m as any)?.confidence?.confidence_score === "number"
        ? (m as any).confidence.confidence_score
        : base.confidence01;
    const lagDays =
      typeof (m as any)?.confidence?.lag_days_vs_utc_today === "number"
        ? (m as any).confidence.lag_days_vs_utc_today
        : base.lagDays;

    const missingMeta = (m as any)?.missing === true;
    const missingConfidence = (m as any)?.confidence?.missing === true;

    const gateActive = conf01 < gateThr;

    const canonicalLabel = typeof (m as any)?.regime?.label === "string" ? (m as any).regime.label : base.regimeLabel;

    const shouldWithhold = !m || missingMeta || missingConfidence || gateStatus !== "ok" || gateActive;

    const verdict: Verdict = shouldWithhold
      ? "INSUFFICIENT_DATA"
      : canonicalLabel === "STABLE"
        ? "LIKELY_NOISE"
        : canonicalLabel === "CONGESTED"
          ? "STRUCTURAL_SHIFT"
          : "MIXED";

    const regimeLabel = shouldWithhold ? "WITHHELD" : canonicalLabel;

    // History series: prefer published meta window; fallback to mock.
    const hist = Array.isArray(metaHistory.data)
      ? metaHistory.data
          .map((d) => {
            const dims = (d as any)?.scorecard?.dimensions;
            const scores = [dims?.demand?.score, dims?.capacity?.score, dims?.friction?.score].filter(isFiniteNumber);
            const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : NaN;
            const conf = (d as any)?.confidence?.confidence_score;
            return {
              date: typeof (d as any)?.date === "string" ? (d as any).date : "",
              score,
              conf: typeof conf === "number" ? conf : conf01,
            } as LandingHistoryPoint;
          })
          .filter((p) => !!p.date)
      : base.history;

    // Drivers: prefer published drivers; fallback to mock drivers.
    const publishedDrivers = Array.isArray((m as any)?.regime?.drivers) ? (m as any).regime.drivers : null;
    const drivers: LandingDriver[] = publishedDrivers
      ? publishedDrivers.map((dr: any) => {
          const metric = typeof dr?.metric === "string" ? dr.metric : "—";
          const axis = typeof dr?.axis === "string" ? dr.axis : "—";

          const fallback = base.drivers.find((x) => x.metric === metric);

          return {
            axis,
            metric,
            pct_90d: dr?.pct_90d,
            z_robust: dr?.z_robust,
            momentum_7d_vs_30d: dr?.momentum_7d_vs_30d,
            trend: (dr?.trend as any) ?? "flat",
            what: fallback?.what ?? "—",
            why: fallback?.why ?? "—",
          };
        })
      : base.drivers;

    return {
      ...base,
      verdict,
      regimeLabel,
      asofISO: typeof (m as any)?.date === "string" ? (m as any).date : base.asofISO,
      lagDays,
      lagLabel: "Daily",
      confidence01: conf01,
      gateThreshold: gateThr,
      gateStatus,
      missingMeta,
      missingConfidence,
      history: hist,
      drivers,
      // Windows remain landing-only summaries for now (until landing/lastXd.json is published).
    };
  }, [selectedChain, metaLatest.data, metaHistory.data]);

  const conf = ui.confidence01;
  const confTxt = confLabel(conf);
  const gateThreshold = isFiniteNumber(ui.gateThreshold) ? ui.gateThreshold : UI_FALLBACK_CONF_GATE_THRESHOLD;
  const confBelowGate = conf < gateThreshold;
  const publishedAsofMeta = hero.data?.asof?.meta ?? null;

  const history = useMemo(() => sliceForHorizon(ui.history, historyHorizon), [ui.history, historyHorizon]);

  const seriesScores = useMemo(() => history.map((p) => p.score).filter(isFiniteNumber), [history]);
  const band = useMemo(() => robustBand(seriesScores), [seriesScores]);

  const persistence7 = useMemo(() => {
    const window = seriesScores.slice(Math.max(0, seriesScores.length - 7));
    return computePersistence(window, band.ok ? band.elevatedThreshold : null);
  }, [seriesScores, band]);

  const persistence30 = useMemo(() => {
    const window = seriesScores.slice(Math.max(0, seriesScores.length - 30));
    return computePersistence(window, band.ok ? band.elevatedThreshold : null);
  }, [seriesScores, band]);

  // Theme-safe chart colors using CSS vars (avoids "invisible line" in dark palette)
  const strokePrimary = "hsl(var(--ui-accent))";
  const bandFill = "hsl(var(--ui-surface2))";
  const elevatedFill = "hsl(var(--ui-warn))";

  return (
    <section className="mt-10">
      {/* HERO TOP */}
      <div className="mb-8">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
          Price-agnostic trend context
        </div>

        <h1 className="mt-3 text-balance font-display text-[40px] font-light leading-[1.07] text-ui-text md:text-[48px]">
          Regime shift or noise?
          <span className="block text-ui-muted">A deterministic on-chain context layer.</span>
        </h1>

        <p className="mt-4 max-w-3xl text-pretty text-[14px] leading-[1.75] text-ui-muted">
          This platform summarizes whether recent changes are consistent with a persistent regime shift or more likely transient
          noise &mdash; using transparent, explainable statistics. No prices, no forecasts, no advice.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Pill title="Descriptive context only">Descriptive-only</Pill>
          <Pill title="No price series or price-derived indicators">No prices</Pill>
          <Pill title="No forecasting or recommendations">No advice</Pill>
          <Pill title="All metrics documented with what/how/why/value">Explainable</Pill>
          <Pill title="Confidence gating prevents over-interpretation">Gated</Pill>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-xs text-ui-faint">
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains">
            Explore all chains →
          </Link>
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/methodology/regime">
            How the verdict is computed →
          </Link>
          <Link className="underline underline-offset-4 hover:text-ui-text" href="/wiki">
            Metric dictionary →
          </Link>
        </div>
      </div>

      {/* MAIN PANEL */}
      <div className="ui-card p-6 md:p-7">
        {/* CROSS-CHAIN SNAPSHOT */}
        <div className="mb-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
                Cross-chain snapshot (30-second understanding)
              </div>
              <div className="mt-1 text-sm text-ui-muted">
                Scan verdict + canonical regime + as-of/lag + confidence gate across chains. Sparklines show the context score trend.
              </div>
            </div>
            <Pill title="Canonical per-chain gate threshold is published in meta.regime.gate.threshold; we fall back to a UI default if missing">
              Gate {fmtNum(gateThreshold, 2)}
            </Pill>
          </div>

          {/* 30-second reading guide: makes snapshot usable without clicking */}
          <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/10 p-5">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
              How to read this in 30 seconds
            </div>

            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="ui-inset p-4">
                <div className="text-sm font-semibold text-ui-text">1) Verdict (descriptive)</div>
                <div className="mt-2 text-sm text-ui-muted">
                  The verdict is a descriptive classification: whether recent conditions look more persistent (structural shift) or more transient (noise),
                  relative to the chain&apos;s own history. It is not a forecast and not advice.
                </div>
              </div>

              <div className="ui-inset p-4">
                <div className="text-sm font-semibold text-ui-text">2) Gate (confidence / freshness)</div>
                <div className="mt-2 text-sm text-ui-muted">
                  When confidence is below <span className="font-mono text-ui-text">{fmtNum(gateThreshold, 2)}</span>, the label is withheld
                  (&quot;Insufficient data&quot;). The data and charts remain visible; the UI refuses to overstate certainty.
                </div>
              </div>

              <div className="ui-inset p-4">
                <div className="text-sm font-semibold text-ui-text">3) Persistence</div>
                <div className="mt-2 text-sm text-ui-muted">
                  Noise vs regime is mostly about persistence. We show 7d and 30d persistence summaries of the context score relative to a robust
                  threshold (median + IQR multiple) computed from the visible horizon.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {CHAINS.map((c) => (
              <OverviewCard key={c} ui={c === selectedChain ? ui : LANDING_MOCK[c]} active={c === selectedChain} onClick={() => setSelectedChain(c)} />
            ))}
          </div>

          {/* Cross-chain market state (one-glance matrix; no clicking required) */}
          <div className="mt-5 rounded-2xl border border-ui-border bg-ui-bg/10 p-5">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
              Cross-chain market state (canonical)
            </div>
            <div className="mt-2 text-sm text-ui-muted">
              Pulled from <span className="font-mono">meta/&lt;chain&gt;/latest.json</span>: regime label + axis trends + gate + lag.
              Snapshot cards are still clickable for detail, but this matrix is the &ldquo;whole market&rdquo; at a glance.
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-ui-faint">
                  <tr>
                    <th className="py-2 pr-3">Chain</th>
                    <th className="py-2 pr-3">Regime</th>
                    <th className="py-2 pr-3">Demand</th>
                    <th className="py-2 pr-3">Capacity</th>
                    <th className="py-2 pr-3">Friction</th>
                    <th className="py-2 pr-3">Confidence</th>
                    <th className="py-2 pr-3">Gate</th>
                    <th className="py-2 pr-3">Lag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ui-border">
                  {[
                    { chain: "bitcoin" as const, meta: metaLatestBTC.data },
                    { chain: "ethereum" as const, meta: metaLatestETH.data },
                    { chain: "arbitrum" as const, meta: metaLatestARB.data },
                    { chain: "base" as const, meta: metaLatestBASE.data },
                  ].map(({ chain, meta }) => {
                    const axes = (meta as any)?.regime?.axes;
                    const gate = (meta as any)?.regime?.gate;
                    const confScore = (meta as any)?.confidence?.confidence_score;
                    const lagDays = (meta as any)?.confidence?.lag_days_vs_utc_today;

                    return (
                      <tr key={chain} className="align-top">
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            className={clsx(
                              "font-semibold hover:underline",
                              chain === selectedChain ? "text-ui-text" : "text-ui-link"
                            )}
                            onClick={() => setSelectedChain(chain)}
                          >
                            {chainTitle(chain)}
                          </button>
                        </td>
                        <td className="py-2 pr-3 font-mono text-[12px] text-ui-text">{(meta as any)?.regime?.label ?? "—"}</td>
                        <td className="py-2 pr-3 font-mono text-[12px] text-ui-muted">{axes?.demand?.trend ?? "—"}</td>
                        <td className="py-2 pr-3 font-mono text-[12px] text-ui-muted">{axes?.capacity?.trend ?? "—"}</td>
                        <td className="py-2 pr-3 font-mono text-[12px] text-ui-muted">{axes?.friction?.trend ?? "—"}</td>
                        <td className="py-2 pr-3 font-mono text-[12px] text-ui-muted">{fmtNum(confScore, 2)}</td>
                        <td className="py-2 pr-3 font-mono text-[12px] text-ui-muted">
                          {gate?.status ?? "—"}
                          {typeof gate?.threshold === "number" ? ` @ ${fmtNum(gate.threshold, 2)}` : ""}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[12px] text-ui-muted">
                          {typeof lagDays === "number" ? `${lagDays}d` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SELECTED CHAIN HEADER */}
        <div className="rounded-lg border border-ui-border bg-ui-bg/10 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Selected chain</div>
              <div className="text-lg font-semibold text-ui-text">{chainTitle(selectedChain)}</div>
              <div className="text-sm text-ui-muted">{chainTagline(selectedChain)}</div>

              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={verdictTone(ui.verdict)}>
                  <span className="mr-2 text-ui-faint">Verdict</span>
                  {verdictLabel(ui.verdict)}
                </Pill>

                <span className="inline-flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-ui-faint">Canonical</span>
                  <RegimeBadge label={ui.regimeLabel} />
                </span>

                {confBelowGate ? (
                  <Pill title="Confidence gate active: classification label withheld (data still shown)">
                    <span className="text-ui-faint mr-2">Gate</span>
                    below {fmtNum(gateThreshold, 2)}
                  </Pill>
                ) : (
                  <Pill title="Confidence gate not active for this snapshot">
                    <span className="text-ui-faint mr-2">Gate</span>
                    pass
                  </Pill>
                )}
              </div>

              <div className="text-sm text-ui-muted">
                {ui.verdict === "INSUFFICIENT_DATA"
                  ? "Classification label is withheld when confidence or freshness is insufficient. The chart and persistence summaries below still show descriptive context; the gate blocks the label, not the data."
                  : "Verdict summarizes whether recent movement looks persistent vs transient within the historical reference."}
              </div>

              {ui.verdict === "INSUFFICIENT_DATA" ? (
                <div className="mt-3 rounded-lg border border-ui-border bg-ui-bg/10 p-4">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
                    Why withheld (canonical gate breakdown)
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="ui-inset p-3">
                      <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-ui-faint">Gate status</div>
                      <div className="mt-1 text-[11px] text-ui-muted">
                        <span className="font-mono text-ui-text">{ui.gateStatus ?? "—"}</span>
                      </div>
                      <div className="mt-1 text-[10px] text-ui-faint">
                        threshold <span className="font-mono">{fmtNum(gateThreshold, 3)}</span>
                      </div>
                    </div>

                    <div className="ui-inset p-3">
                      <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-ui-faint">Confidence score</div>
                      <div className="mt-1 text-[11px] text-ui-muted">
                        <span className="font-mono text-ui-text">{fmtNum(conf, 3)}</span>
                        <span className="text-ui-faint"> · {confBelowGate ? "below gate" : "pass"}</span>
                      </div>
                      <div className="mt-1 text-[10px] text-ui-faint">
                        lag <span className="font-mono">{ui.lagDays}d</span>
                      </div>
                    </div>

                    <div className="ui-inset p-3">
                      <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-ui-faint">Coverage / missing</div>
                      <div className="mt-1 text-[11px] text-ui-muted">
                        meta.missing = <span className="font-mono text-ui-text">{String(ui.missingMeta ?? "—")}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-ui-muted">
                        confidence.missing = <span className="font-mono text-ui-text">{String(ui.missingConfidence ?? "—")}</span>
                      </div>
                    </div>

                    <div className="ui-inset p-3">
                      <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-ui-faint">Data remains visible</div>
                      <div className="mt-1 text-[11px] text-ui-muted">
                        The withholding applies to the classification label only. Time series and driver stats remain fully descriptive.
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 md:w-[340px]">
              <div className="ui-inset p-3">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">As-of</div>
                <div className="mt-1 font-mono text-xs text-ui-muted">{fmtISODate(ui.asofISO)}</div>
              </div>
              <div className="ui-inset p-3">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
                  Confidence / freshness
                </div>
                <div className="mt-1 text-xs text-ui-muted">
                  <span className="font-mono text-ui-text">{fmtNum(conf, 2)}</span>{" "}
                  <span className="text-ui-faint">({confTxt})</span>
                  <div className="mt-1 text-[11px] text-ui-faint">
                    {ui.lagLabel} · lag {ui.lagDays}d
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-ui-border bg-ui-bg/10 px-4 py-3 text-[11px] text-ui-faint">
            Guardrails: descriptive-only · no prices · missing values render as gaps (null), never zeros. Published meta as-of:{" "}
            {publishedAsofMeta ? fmtISODate(publishedAsofMeta) : "—"}.
          </div>
        </div>

        {/* 1d/7d/30d triptych */}
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          {ui.windows.map((w) => (
            <div key={w.windowLabel} className="ui-inset p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
                  Window {w.windowLabel}
                </div>
                <Pill title="Descriptive score (0–100) used for UI summarization only">
                  Score <span className="ml-2 text-ui-text">{Math.round(w.score)}</span>
                </Pill>
              </div>

              <div className="mt-2 text-sm text-ui-muted">{w.summary}</div>

              <div className="mt-3 text-[11px] text-ui-faint">
                Momentum (7 vs 30):{" "}
                <span className="font-mono text-ui-muted">{fmtNum(w.momentum, 2)}</span>{" "}
                <span className="text-ui-faint">· descriptive</span>
              </div>
            </div>
          ))}
        </div>

        {/* History chart + explanation + persistence */}
        <div className="mt-6 ui-inset p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
                Context score history (hover for values)
              </div>

              <div className="text-sm text-ui-muted">
                <span className="text-ui-text">What this is:</span> a single, descriptive 0–100 index summarizing how unusual current
                on-chain conditions are versus this chain&apos;s own historical reference. It aggregates the chain&apos;s selected drivers
                using robust statistics (not price).
              </div>

              <div className="text-sm text-ui-muted">
                <span className="text-ui-text">Why it matters for noise vs shift:</span> the operational difference is persistence.
                A one-day spike that reverts is noise context; sustained elevation across 7–30 days is persistent context.
              </div>

              <div className="mt-3">
                <InfoBox
                  title="What the 0–100 context score is"
                  basic="On landing we define the context score as the mean of the published scorecard axis scores (demand, capacity, friction), each on a 0–100 scale. These axis scores are computed in the pipeline from a fixed per-chain signal set using robust statistics and short-vs-long momentum; they are not price and not forecasts."
                  advanced={`Source of truth is published meta JSON (meta/<chain>/latest.json and meta/<chain>/lastXd.json). The confidence gate is canonical per chain: regime.gate.threshold = ${fmtNum(gateThreshold, 2)}, compared to confidence.confidence_score. When the gate fails, we still show the score history and drivers but withhold the classification label.`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-ui-muted">Horizon:</span>
                <SmallBtn active={historyHorizon === 7} onClick={() => setHistoryHorizon(7)}>
                  7d
                </SmallBtn>
                <SmallBtn active={historyHorizon === 30} onClick={() => setHistoryHorizon(30)}>
                  30d
                </SmallBtn>
                <SmallBtn active={historyHorizon === 90} onClick={() => setHistoryHorizon(90)}>
                  90d
                </SmallBtn>
                <SmallBtn active={historyHorizon === 180} onClick={() => setHistoryHorizon(180)}>
                  180d
                </SmallBtn>
                <SmallBtn active={historyHorizon === 365} onClick={() => setHistoryHorizon(365)}>
                  365d
                </SmallBtn>
              </div>
            </div>

            <div className="min-w-[260px] rounded-lg border border-ui-border bg-ui-bg/10 p-4">
              <div className="text-xs font-semibold text-ui-text">Persistence (landing-only descriptive aid)</div>
              <div className="mt-1 text-[11px] text-ui-muted">
                Elevated threshold = median + {fmtNum(ELEVATION_IQR_MULT, 1)}×IQR, computed from the visible horizon.
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-md border border-ui-border bg-ui-bg/10 p-3">
                  <div className="text-[10px] font-mono text-ui-faint">last 7d</div>
                  <div className="mt-1 text-sm font-mono text-ui-text">{fmtPct01(persistence7.share)}</div>
                  <div className="mt-1 text-[11px] text-ui-muted">
                    longest {persistence7.longest} · current {persistence7.current}
                  </div>
                </div>

                <div className="rounded-md border border-ui-border bg-ui-bg/10 p-3">
                  <div className="text-[10px] font-mono text-ui-faint">last 30d</div>
                  <div className="mt-1 text-sm font-mono text-ui-text">{fmtPct01(persistence30.share)}</div>
                  <div className="mt-1 text-[11px] text-ui-muted">
                    longest {persistence30.longest} · current {persistence30.current}
                  </div>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-ui-faint">
                Gate note: when confidence is below {fmtNum(gateThreshold, 2)}, classification label is withheld even if persistence is high.
              </div>
            </div>
          </div>

          <div className="mt-4 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <XAxis dataKey="date" hide />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: any) => [fmtNum(v, 1), "context"]}
                  labelFormatter={(l: any) => `date ${l}`}
                />
                <ReferenceArea y1={band.q25} y2={band.q75} fill={bandFill} fillOpacity={0.35} />
                <ReferenceArea y1={band.ok ? band.elevatedThreshold : 0} y2={100} fill={elevatedFill} fillOpacity={0.05} />
                <Line type="monotone" dataKey="score" stroke={strokePrimary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 text-[11px] text-ui-faint">
            Caveats: not price, not a forecast, not advice. When confidence/freshness is below {fmtNum(gateThreshold, 2)}, the chart
            remains visible but the classification label is withheld.
          </div>
        </div>

        {/* Drivers */}
        <div className="mt-6 ui-inset p-4">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Top drivers (canonical)</div>
          <div className="mt-2 text-sm text-ui-muted">
            These drivers come from <span className="font-mono">meta.regime.drivers</span>. <span className="font-mono">pct_90d</span> is treated as a
            0–100 percentile (if the published contract is 0..1, it is scaled to % in formatting).
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-ui-faint">
                <tr>
                  <th className="py-2 pr-3">Axis</th>
                  <th className="py-2 pr-3">Metric</th>
                  <th className="py-2 pr-3">pct_90d</th>
                  <th className="py-2 pr-3">z_robust</th>
                  <th className="py-2 pr-3">mom(7d vs 30d)</th>
                  <th className="py-2 pr-3">Trend</th>
                  <th className="py-2 pr-3">What</th>
                  <th className="py-2 pr-3">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {ui.drivers.map((d, i) => (
                  <tr key={`${d.axis}:${d.metric}:${i}`} className="align-top">
                    <td className="py-2 pr-3 font-mono text-[12px] text-ui-muted">{d.axis}</td>
                    <td className="py-2 pr-3 font-mono text-[12px] text-ui-text">{d.metric}</td>
                    <td className="py-2 pr-3 font-mono text-[12px] text-ui-muted">{fmtPct01(d.pct_90d)}</td>
                    <td className="py-2 pr-3 font-mono text-[12px] text-ui-muted">{fmtNum(d.z_robust, 2)}</td>
                    <td className="py-2 pr-3 font-mono text-[12px] text-ui-muted">{fmtNum(d.momentum_7d_vs_30d, 2)}</td>
                    <td className="py-2 pr-3 font-mono text-[12px] text-ui-muted">{d.trend}</td>
                    <td className="py-2 pr-3 text-[12px] text-ui-muted">{d.what}</td>
                    <td className="py-2 pr-3 text-[12px] text-ui-muted">{d.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-[11px] text-ui-faint">
            If you need exact keys, see <span className="font-mono">meta/latest.json</span> (regime.drivers, scorecard.dimensions, confidence, gate).
          </div>
        </div>
      </div>
    </section>
  );
}