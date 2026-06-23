
// src/app/chains/[chain]/page.tsx
import type { ReactNode } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import MetricLineChart, { type MetricPoint } from "@/components/MetricLineChart";
import RegimeBadge from "@/components/RegimeBadge";
import ChainIcon from "@/components/ChainIcon";
import SourceFreshnessExplainer from "@/components/SourceFreshnessExplainer";
import ScoreGauge from "@/components/ui/ScoreGauge";
import StalenessBar from "@/components/ui/StalenessBar";
import { getChainConfig, type ChainId } from "@/config/chains";
import { getUnitLabel } from "@/config/units";
import { currentDataSource, readStorageObject } from "@/lib/storage";




import "server-only";

type Driver = {
  axis?: "demand" | "friction" | "capacity" | string;
  metric?: string;
  trend?: string;
  z_robust?: number;
  pct_90d?: number;
  momentum_7d_vs_30d?: number;
  current?: number;
};

type MetaLatest = {
  chain?: string;
  date?: string;
  updated_through?: string;
  methodology_version?: string;

  status?: { label?: string; one_liner?: string; color?: string };

  confidence?: {
    confidence_score?: number;
    date?: string;
    lag_days_vs_utc_today?: number;
    missing?: boolean;
    data_quality_score?: number;
    label_confidence_score?: number;
    semantics?: string;
  };

  regime?: {
    label?: string;
    asof_date?: string;
    determinism_hash?: string;
    window_days?: number;
    drivers?: Driver[];
  };

  scorecard?: {
    asof_date?: string;
    window_days?: number;
    confidence_score?: number;
    notes?: { interpretation?: string };
    dimensions?: {
      demand?: {
        score?: number;
        level?: string;
        coverage_factor?: number;
        effective_confidence?: number;
      };
      friction?: {
        score?: number;
        level?: string;
        coverage_factor?: number;
        effective_confidence?: number;
      };
      capacity?: {
        score?: number;
        level?: string;
        coverage_factor?: number;
        effective_confidence?: number;
      };
    };
  };

  profile?: {
    id?: string;
    label?: string;
    note?: string;
    hidden_metrics?: string[];
    type?: string;
  };

  [k: string]: unknown;
};

type LandingHero = {
  display_asof?: string;
  regime_asof?: string;
  asof?: {
    display?: string;
    latest_available?: string;
    gold?: string;
    derived?: string;
    meta?: string;
    meta_actual?: string;
    regime?: string;
  };
};

type ChainBriefLatest = {
  schema?: string;
  brief_status?: string;
  chain?: string;
  window?: {
    kind?: string;
    days?: number;
    start_date?: string;
    end_date?: string;
    updated_through?: string;
    is_intraday?: boolean;
  };
  latest?: {
    label?: string;
    confidence_score?: number;
    status?: string;
  };
  regime_path?: {
    labels?: string[];
    dominant_label?: string;
    dominant_label_days?: number;
    previous_dominant_label?: string;
    previous_dominant_label_days?: number;
    latest_label_run_days?: number;
    label_changes?: number;
    volatility?: string;
  };
  movement?: {
    type?: string;
    transition?: string;
    persistence?: string;
  };
  drivers?: {
    primary_axis?: string;
    demand?: string;
    friction?: string;
    capacity?: string;
  };
  confidence?: {
    latest?: number;
    average_7d?: number;
    direction?: string;
    minimum_7d?: number;
  };
  brief?: {
    headline?: string;
    plain?: string;
    advanced?: string;
  };
  guardrails?: {
    not_intraday?: boolean;
    not_prediction?: boolean;
    not_investment_advice?: boolean;
  };
  provenance?: {
    source_layers?: string[];
    briefs_methodology_version?: string;
    generated_at?: string;
  };
};

type DerivedRow = {
  chain?: string;
  date?: string;
  derived?: {
    metrics?: Record<string, unknown>;
    meta_confidence?: { confidence_score?: number };
    context_blocks?: unknown[];
  };
};

type GoldRow = Record<string, unknown> & { date?: string; chain?: string };

type ChainPageSearchParams = {
  window?: string;
};

type ExplainPair = {
  basic: ReactNode;
  advanced: ReactNode;
};

type ScorecardDimension = {
  score?: number;
  level?: string;
  coverage_factor?: number;
  effective_confidence?: number;
};

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readStorageObject(storagePath);

  if (!result) return null;

  try {
    const raw = new TextDecoder("utf-8").decode(new Uint8Array(result.body));
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}


function landingDisplayAsOf(hero?: LandingHero | null): string | null {
  return hero?.display_asof ?? hero?.asof?.display ?? hero?.asof?.latest_available ?? null;
}

function landingRegimeAsOf(hero?: LandingHero | null): string | null {
  return hero?.regime_asof ?? hero?.asof?.regime ?? hero?.asof?.meta_actual ?? null;
}


function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="code-block inline-block px-2 py-0.5 text-[12px]">
      {children}
    </code>
  );
}

function ModalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .ta-modal {
            display: none;
          }
          .ta-modal:target {
            display: flex;
          }
        `,
      }}
    />
  );
}

function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return (
    <a href={`#${id}`} className="text-link">
      {label} →
    </a>
  );
}

function HeroInfoCard({
  label,
  value,
  children,
}: {
  label: string;
  value: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="fact-item">
      <strong>{label}</strong>
      <div className="mt-2 text-[var(--ink)] font-mono text-[13px] font-medium leading-snug break-words min-h-[28px]">
        {value}
      </div>
      {children ? (
        <div className="mt-2 text-[11px] leading-5 text-[var(--ink3)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function ExplainModal({
  id,
  title,
  subtitle,
  pair,
  traceability,
}: {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  pair: { basic: React.ReactNode; advanced: React.ReactNode };
  traceability?: React.ReactNode;
}) {
  return (
    <div id={id} className="ta-modal fixed inset-0 z-[80] items-center justify-center p-4">
      <a href="#" className="absolute inset-0 bg-[rgba(8,15,26,.84)]" aria-label="Close dialog" />
      <div className="modal-panel relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden">
        <div className="modal-head shrink-0">
          <div>
            <h3 className="ua-h3 text-[var(--ink)]">{title}</h3>
            {subtitle ? <div className="mt-2 text-sm leading-6 text-[var(--ink2)]">{subtitle}</div> : null}
          </div>
          <a href="#" className="btn-ghost h-10 px-3 shrink-0" aria-label="Close dialog">×</a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="border-t-2 border-[var(--c-stable)] pt-4">
              <div className="eyebrow mb-3">Basic</div>
              <div className="text-sm leading-7 text-[var(--ink2)]">{pair.basic}</div>
            </section>
            <details className="border-t-2 border-[var(--gold)] pt-4">
              <summary className="eyebrow cursor-pointer mb-3">Advanced</summary>
              <div className="text-sm leading-7 text-[var(--ink2)]">{pair.advanced}</div>
            </details>
          </div>
          {traceability ? (
            <div className="mt-6 border-t border-[var(--line)] pt-5">
              <div className="eyebrow mb-3">Traceability</div>
              <div className="text-sm leading-7 text-[var(--ink2)]">{traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function fmtDate(d?: string | null) {
  return d ?? "—";
}

function fmtNum(v?: number, digits = 3) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

function fmtScore100(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return v.toFixed(0);
}

function fmtPct0to100(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtBriefScore(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return v.toFixed(3);
}

function prettifySnake(value?: string | null) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function briefWindowLabel(brief?: ChainBriefLatest | null) {
  const start = brief?.window?.start_date;
  const end = brief?.window?.end_date ?? brief?.window?.updated_through;
  if (start && end) return `${start} → ${end}`;
  if (end) return `through ${end}`;
  return "latest published window";
}

function dominantBriefLabel(brief?: ChainBriefLatest | null) {
  const dominant = brief?.regime_path?.dominant_label;
  const days = brief?.regime_path?.dominant_label_days;
  const total = brief?.window?.days;
  if (dominant && typeof days === "number" && typeof total === "number") {
    return `${dominant} · ${days}/${total} days`;
  }
  if (dominant) return dominant;
  return brief?.latest?.label ?? "—";
}

function primaryBriefDriver(brief?: ChainBriefLatest | null) {
  const axis = brief?.drivers?.primary_axis;
  if (!axis) return "No single primary axis published in the latest brief.";
  const axisDetail = brief?.drivers?.[axis as "demand" | "friction" | "capacity"];
  return axisDetail
    ? `${axis}: ${prettifySnake(axisDetail)}`
    : `${axis} is the primary published brief axis.`;
}

function confidenceBand(v?: number) {
  if (typeof v !== "number") return "—";
  if (v >= 0.7) return "Good";
  if (v >= 0.4) return "Caution";
  return "Degraded";
}

function pillClass(kind: "neutral" | "good" | "warn" | "bad") {
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]";
  if (kind === "good") {
    return `${base} border-emerald-300 bg-emerald-50 !text-emerald-800`;
  }
  if (kind === "warn") {
    return `${base} border-amber-300 bg-amber-100 !text-amber-900`;
  }
  if (kind === "bad") {
    return `${base} border-rose-300 bg-rose-100 !text-rose-900`;
  }
  return `${base} border-[#9db8d4] bg-white !text-[#0d2447]`;
}

function confidencePill(v?: number) {
  const b = confidenceBand(v);
  if (b === "Good") return pillClass("good");
  if (b === "Caution") return pillClass("warn");
  if (b === "Degraded") return pillClass("bad");
  return pillClass("neutral");
}

function confidenceNotice(v?: number) {
  const band = confidenceBand(v);

  if (band === "Caution") {
    return {
      tone: "caution" as const,
      title: "Reduced confidence",
      body:
        "Confidence is reduced due to thinner or less internally consistent support. The current label remains visible, but the page is telling you not to lean too heavily on it without checking the rest of the evidence.",
    };
  }

  if (band === "Degraded") {
    return {
      tone: "degraded" as const,
      title: "Degraded confidence",
      body:
        "Confidence is below the canonical gate. That means the current row should be treated as UNKNOWN/DEGRADED even if some visible metrics still look notable.",
    };
  }

  return null;
}

function confidenceNoticeClass(tone: "caution" | "degraded") {
  return tone === "degraded"
    ? "border-[#9db8d4] bg-[#e7f1fb] !text-[#0d2447]"
    : "border-amber-500/30 bg-amber-500/12 !text-[#8a5b00]";
}

function confidenceNoticeMetaClass(tone: "caution" | "degraded") {
  return tone === "degraded" ? "!text-[#0d2447]/85" : "!text-[#8a5b00]";
}

function sortDrivers(drivers: Driver[]) {
  return [...drivers].sort((a, b) => {
    const za = Math.abs(a.z_robust ?? 0);
    const zb = Math.abs(b.z_robust ?? 0);
    return zb - za;
  });
}

function guessMetricKeysForChain(chain: string): string[] {
  switch (chain) {
    case "bitcoin":
      return [
        "tx_count_daily",
        "median_tx_fee_native",
        "avg_block_time_sec",
        "block_count_daily",
      ];
    case "ethereum":
      return [
        "tx_count_daily",
        "median_tx_fee_native",
        "gas_utilization_pct",
        "unique_active_addresses",
      ];
    default:
      return [
        "tx_count_daily",
        "median_tx_fee_native",
        "gas_utilization_pct",
        "avg_block_time_sec",
      ];
  }
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function parseIsoDayToUtcMs(d: unknown): number | null {
  if (typeof d !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, day] = d.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) {
    return null;
  }
  return Date.UTC(y, m - 1, day);
}

function lagDaysFromIsoDay(date?: string): number | null {
  const ms = parseIsoDayToUtcMs(date);
  if (ms === null) return null;
  const now = new Date();
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((todayMs - ms) / 86400000));
}

function utcMsToIsoDay(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDerivedByDate(rows: DerivedRow[]) {
  const m = new Map<string, DerivedRow>();
  for (const r of rows) {
    if (typeof r.date === "string") m.set(r.date, r);
  }
  return m;
}

function buildGoldByDate(rows: GoldRow[]) {
  const m = new Map<string, GoldRow>();
  for (const r of rows) {
    if (typeof r.date === "string") m.set(r.date, r);
  }
  return m;
}

function maxDateMsFromRows<T extends { date?: string }>(rows: T[]): number | null {
  let max: number | null = null;
  for (const r of rows) {
    const ms = parseIsoDayToUtcMs(r.date);
    if (typeof ms !== "number") continue;
    if (max === null || ms > max) max = ms;
  }
  return max;
}

function computeBoundsFromMax(maxMs: number, days: number) {
  const minMs = maxMs - (days - 1) * 24 * 60 * 60 * 1000;
  return { minMs, maxMs };
}

function listDays(bounds: { minMs: number; maxMs: number }): string[] {
  const out: string[] = [];
  for (let ms = bounds.minMs; ms <= bounds.maxMs; ms += 24 * 60 * 60 * 1000) {
    out.push(utcMsToIsoDay(ms));
  }
  return out;
}

function withinBounds(date: string, bounds: { minMs: number; maxMs: number }) {
  const ms = parseIsoDayToUtcMs(date);
  if (ms === null) return false;
  return ms >= bounds.minMs && ms <= bounds.maxMs;
}

function readGoldMetric(row: GoldRow | undefined, metric: string): number | null {
  if (!row) return null;

  const direct = toNumberOrNull(row[metric]);
  if (direct !== null) return direct;

  const nestedCandidates: unknown[] = [];

  const metrics = asRecord(row.metrics);
  if (metrics) nestedCandidates.push(metrics[metric]);

  const gold = asRecord(row.gold);
  const goldMetrics = gold ? asRecord(gold.metrics) : null;
  if (goldMetrics) nestedCandidates.push(goldMetrics[metric]);

  const features = asRecord(row.features);
  if (features) nestedCandidates.push(features[metric]);

  const data = asRecord(row.data);
  if (data) nestedCandidates.push(data[metric]);

  const values = asRecord(row.values);
  if (values) nestedCandidates.push(values[metric]);

  for (const v of nestedCandidates) {
    const n = toNumberOrNull(v);
    if (n !== null) return n;
  }

  return null;
}

function buildObservedDates(params: {
  bounds: { minMs: number; maxMs: number };
  derivedByDate: Map<string, DerivedRow>;
  goldByDate: Map<string, GoldRow>;
}) {
  const { bounds, derivedByDate, goldByDate } = params;
  const set = new Set<string>();

  for (const key of derivedByDate.keys()) {
    if (withinBounds(key, bounds)) set.add(key);
  }

  for (const key of goldByDate.keys()) {
    if (withinBounds(key, bounds)) set.add(key);
  }

  return Array.from(set).sort();
}

function buildChartDataObserved(params: {
  bounds: { minMs: number; maxMs: number };
  derivedByDate: Map<string, DerivedRow>;
  goldByDate: Map<string, GoldRow>;
  metric: string;
}): MetricPoint[] {
  const { bounds, derivedByDate, goldByDate, metric } = params;
  const dates = buildObservedDates({ bounds, derivedByDate, goldByDate });
  const ma7Key = `${metric}__ma7`;
  const ma30Key = `${metric}__ma30`;

  return dates.map((date) => {
    const drow = derivedByDate.get(date);
    const metrics: Record<string, unknown> = drow?.derived?.metrics ?? {};
    const grow = goldByDate.get(date);

    return {
      date,
      value: readGoldMetric(grow, metric),
      ma7: toNumberOrNull(metrics[ma7Key]),
      ma30: toNumberOrNull(metrics[ma30Key]),
    };
  });
}

function normalizeWindow(q?: string): 30 | 90 | 180 | 365 {
  const n = Number(q);
  if (n === 30 || n === 90 || n === 180 || n === 365) return n;
  return 30;
}

function metricParamKey(metric: string): string {
  return "w_" + metric.replace(/[^a-z0-9]/gi, "_");
}

function safeId(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function chainProfileCopy(chainId: ChainId): ExplainPair {
  switch (chainId) {
    case "bitcoin":
      return {
        basic: (
          <>
            <p>
              Bitcoin is the original settlement-focused chain. It does not expose the same
              EVM-style execution and gas fields as Ethereum-like networks, so the site reads BTC
              mainly through transaction throughput, fee pressure, and block-timing context.
            </p>
            <p className="mt-3">
              In plain language: on Bitcoin, pressure often shows up as competition for block space,
              fee changes, and confirmation pacing, rather than smart-contract execution metrics.
            </p>
          </>
        ),
        advanced: (
          <>
            <p>
              BTC is treated as a UTXO-profile chain, so the explanatory surface is intentionally
              different from an EVM chain. The dominant descriptive questions are: how much confirmed
              block-space demand is present, how competitive are fees, and does block production look
              smooth or strained? That is why the page leans on transaction count, median fee, and
              block-time pacing rather than gas-utilization or failed-transaction fields, which do
              not carry the same semantics on Bitcoin.
            </p>
            <p className="mt-3">
              Methodologically, this matters because the same top-line word such as “busy” can arise
              through different observables on different architectures. On Bitcoin, a hotter state
              often manifests as stronger competition for limited block space and less roomy
              confirmation conditions, whereas on Ethereum the same intuition may show up through gas
              usage and execution fees. The chain profile prevents false cross-chain equivalence by
              changing which metrics are even allowed to speak for Demand, Friction, and Capacity.
            </p>
            <p className="mt-3">
              In product terms, BTC Demand tends to lean on confirmed throughput; Friction on fee
              pressure; Capacity on timing/throughput proxies such as average block time. The page is
              therefore not saying “Bitcoin has no capacity model”; it is saying the capacity model is
              proxied through the variables that actually make sense for a UTXO settlement network.
            </p>
          </>
        ),
      };
    case "ethereum":
      return {
        basic: (
          <>
            <p>
              Ethereum is a general-purpose execution chain. That means the page can read it through
              both user activity and execution tightness: transactions, fees, gas usage, and block
              timing all matter.
            </p>
            <p className="mt-3">
              In practice, Ethereum can look busy because more people are using it, because execution
              is tighter, or both at once. That is why the page separates Demand, Friction, and
              Capacity instead of collapsing everything into one number.
            </p>
          </>
        ),
        advanced: (
          <>
            <p>
              ETH L1 exposes a richer execution surface than BTC because the underlying state machine
              prices computational work in gas units. That lets the descriptive layer distinguish
              among throughput, fee burden, and utilization more explicitly. Demand can therefore be
              read from usage metrics such as transaction count; Friction from fee/failure burden; and
              Capacity from utilization and block-pacing fields. The point is not that these are
              independent latent variables in a strict econometric sense, but that the published
              decomposition preserves explanatory resolution that would be lost in one blended number.
            </p>
            <p className="mt-3">
              The advanced way to read ETH is as a constrained execution system: a chain can carry
              high activity while still having moderate Friction if execution remains roomy, or it can
              show only moderate activity while Friction and Capacity already look tight because the
              execution environment is saturated. That distinction follows directly from Ethereum’s
              gas mechanism and transaction model rather than from frontend storytelling.
            </p>
            <p className="mt-3">
              This is why the page keeps chain profile, scorecard, drivers, and charts separate. The
              profile defines which metrics are meaningful; the scorecard compresses them into axis
              scores; the drivers reveal which fields currently dominate; and the charts show the
              time-series shape underneath. The website stays descriptive at every step: it does not
              convert execution pressure into return expectations.
            </p>
          </>
        ),
      };
    default:
      return {
        basic: (
          <>
            <p>
              This is an Ethereum-style L2. The chain is interpreted through usage, fee behavior, and
              execution tightness, but the readings must also be understood in the context of a
              rollup-style network rather than a base-layer chain.
            </p>
            <p className="mt-3">
              In plain language: throughput may look strong while fees stay moderate, or fees may
              change for reasons that are specific to the L2 environment. That is why the site
              explains each metric separately instead of assuming one universal meaning.
            </p>
          </>
        ),
        advanced: (
          <>
            <p>
              Arbitrum and Base are handled as L2 profiles, not as miniature copies of ETH L1. Their
              fee stack has both local execution semantics and parent-chain settlement/security cost,
              so a simple “high fees means the chain is constrained” interpretation is often too naive.
              A visible fee move on an L2 can reflect some combination of local execution demand and
              parent-chain posting cost rather than one single bottleneck.
            </p>
            <p className="mt-3">
              The product therefore uses a profile layer to suppress L1-only signals where they would
              be misleading and to privilege the metrics that remain stable and interpretable on an
              L2. In practice, the page is asking: is the rollup currently carrying unusual demand,
              unusual fee burden, or unusual tightness relative to its own recent history? It is not
              claiming that L2 and L1 values are directly fungible.
            </p>
            <p className="mt-3">
              The advanced reader should think of the L2 page as a constrained descriptive mapping
              under a chain-specific semantic contract. The model preserves comparability at the
              regime/state level while explicitly limiting comparability at the raw-metric level.
            </p>
          </>
        ),
      };
  }
}


function regimeExplanation(label: string): ExplainPair {
  return {
    basic: (
      <>
        <p>
          Regime is the page’s top-line descriptive state. It is meant to answer one fast question:
          what does the chain currently look like relative to its own recent history?
        </p>
        <p className="mt-3">
          <span className="font-medium">Heating</span> means the chain looks hotter than its own recent
          baseline. That usually means stronger activity pressure, tighter conditions, or both, but it
          does not automatically mean the chain is fully constrained.
        </p>
        <p className="mt-3">
          The regime is useful because it gives the user a fast summary before diving into the
          scorecard, drivers, and charts.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The browser does not infer regime. It reads the canonical published label from{" "}
          <InlineCode>meta.status.label</InlineCode>, where the upstream pipeline has already
          combined axis conditions, chain profile rules, and the confidence gate. In other words, the
          visible label is an audited output of the meta layer, not a UI heuristic.
        </p>
        <p className="mt-3">
          The regime vocabulary is a finite state set: STABLE, HEATING, CONGESTED, CHEAP, and
          UNKNOWN/DEGRADED. These states are meant to compress the chain’s location in a three-axis
          space defined by Demand, Friction, and Capacity, with the final label then constrained by
          publish-confidence eligibility. The confidence threshold is therefore part of the state
          machine: if confidence is below the canonical gate, the UI must treat the row as
          UNKNOWN/DEGRADED even when the raw axis pattern might otherwise resemble a named state.
        </p>
        <p className="mt-3">
          The correct technical interpretation is: regime is a deterministic classification over the
          published meta payload, not a probability of future returns and not a recommendation class.
          The current label <span className="font-medium">{label}</span> is a descriptive compression
          of the present chain state conditional on methodology version, chain profile, window, and
          confidence gate.
        </p>
      </>
    ),
  };
}


function confidenceExplanation(conf?: number, dataQuality?: number, labelSupport?: number): ExplainPair {
  const band = confidenceBand(conf);
  return {
    basic: (
      <>
        <p>
          Confidence is the product’s evidence-strength score for the current published label. It does
          not tell you what will happen next. It tells you how well-supported the current descriptive
          reading is by the available published evidence.
        </p>
        <p className="mt-3">
          Higher confidence means the label rests on fuller and more internally consistent support.
          Lower confidence means the page is warning you not to over-read the label.
        </p>
        <p className="mt-3">
          The visible band is <span className="font-medium">{band}</span>. In the current row, the
          published confidence is <span className="font-medium">{fmtNum(conf, 3)}</span>.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Confidence is a published meta-layer quantity in <InlineCode>confidence.confidence_score</InlineCode>.
          The UI never rebuilds it. It is used in two roles at once: first as an evidentiary score
          for how strongly the current descriptive row is supported, and second as a governance gate
          for whether the visible regime may remain a named state or must degrade to
          UNKNOWN/DEGRADED under the canonical threshold contract.
        </p>
        <p className="mt-3">
          In the patched meta files, confidence is conceptually a synthesis of row usability and
          label support. The payload may expose component views such as{" "}
          <InlineCode>data_quality_score</InlineCode> and{" "}
          <InlineCode>label_confidence_score</InlineCode>; in the current row they are{" "}
          <span className="font-medium">{fmtNum(dataQuality, 3)}</span> and{" "}
          <span className="font-medium">{fmtNum(labelSupport, 3)}</span>. The key question confidence
          answers is: “given the currently published row, how much descriptive weight should be placed
          on the label?”.
        </p>
        <p className="mt-3">
          Technically, this is not a confidence interval, not a posterior probability, and not a
          forecast probability. It is a bounded support score on [0,1]. The current product contract
          uses a hard publish gate at 0.40: values below that threshold force degraded semantics,
          while values above it permit named states. The UI bands (Good / Caution / Degraded) are
          presentation tiers layered on top of the scalar. They do not replace the underlying number.
        </p>
        <p className="mt-3">
          The correct advanced reading is to treat confidence as a model-governance and
          interpretability control. Higher confidence indicates fuller published evidence and stronger
          internal support for the current descriptive classification; lower confidence indicates that
          coverage or label support is weak enough that the label should be read defensively. It is
          deliberately orthogonal to freshness: a row may be recent but weakly supported, or older but
          still supported by internally consistent evidence.
        </p>
      </>
    ),
  };
}


function asOfExplanation(asOf?: string | null): ExplainPair {
  return {
    basic: (
      <>
        <p>
          “Data as of” tells you the latest chain-level date behind the visible state. It is one of
          the first things to check before interpreting any label or chart.
        </p>
        <p className="mt-3">
          In plain language: before asking “what does the chain look like?”, first ask “how fresh is
          the row I am looking at?”. The current visible as-of date is{" "}
          <span className="font-medium">{fmtDate(asOf)}</span>.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          As-of is the temporal anchor of the visible row. The page surfaces the latest published date
          from the canonical meta bundle; it does not infer freshness from chart endpoints or browser
          time. In a reproducible system, every descriptive statement must be traceable to a concrete
          observation date, and as-of is that date-level binding.
        </p>
        <p className="mt-3">
          The advanced reason this matters is that a regime label is only meaningful conditional on
          its information set. A label computed on one date and viewed later may be equally
          well-defined, but it is not equally current. This is why the product separates temporal
          recency (as-of and lag) from evidentiary support (confidence): they answer different
          questions and should not be collapsed into one omnibus quality number.
        </p>
        <p className="mt-3">
          In practice, as-of is the date to use when reconciling the visible page against dataset
          manifests, daily published files, and any downstream audit. If a reader cannot pin the
          visible state to a concrete observation date, the state is not operationally traceable.
        </p>
      </>
    ),
  };
}


function lagExplanation(lag?: number): ExplainPair {
  return {
    basic: (
      <>
        <p>
          Observed lag tells you how many days behind today this chain currently is. Lag is shown
          separately from confidence so “old” is not confused with “weakly supported”.
        </p>
        <p className="mt-3">
          The current observed lag is <span className="font-medium">{typeof lag === "number" ? `${lag}d` : "—"}</span>.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Lag is an operational freshness statistic measured in days from the latest published
          observation to “today” in the product’s UTC framing. It is not a reliability score and not
          a confidence penalty by itself. A low-lag row may still be weakly supported; a higher-lag
          row may still be internally coherent. The UI separates these concepts because conflating
          them would hide whether the issue is timeliness or evidentiary strength.
        </p>
        <p className="mt-3">
          Formally, lag answers a scheduling question: how far is the visible row behind the current
          calendar? It should be read relative to the chain’s publish-lag policy, not in isolation.
          For BTC/ETH a 1-day lag is normal; for Base/Arbitrum a materially larger expected lag is
          part of the product contract. So the advanced user should interpret lag as a deviation from
          chain-specific publication cadence, not as a universal freshness threshold.
        </p>
        <p className="mt-3">
          The reason lag belongs on the page is auditability. It makes it explicit whether the state
          is operationally current enough for the user’s purpose. It does not tell you that the label
          is wrong; it tells you whether the label is temporally up to date.
        </p>
      </>
    ),
  };
}


function determinismExplanation(hash?: string, windowDays?: number): ExplainPair {
  return {
    basic: (
      <>
        <p>
          Determinism is the page’s reproducibility handle. It tells a technical reader that the
          visible state belongs to a stable published calculation context, not to a hidden browser-side
          reinterpretation.
        </p>
        <p className="mt-3">
          The hash is a compact identity for that published context. The window-days value shows which
          time window the canonical reading belongs to.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          <InlineCode>regime.determinism_hash</InlineCode> is published for auditability: it is a hash
          over the input data and parameter context used to produce the regime/meta output. The UI does
          not derive it. Its presence is a reproducibility guarantee that the visible classification is
          tied to a specific upstream computational state rather than to local browser logic.
        </p>
        <p className="mt-3">
          In a deterministic publishing pipeline, identical inputs under identical parameters should
          generate identical outputs. The hash is therefore not a user-facing score; it is a compact
          fingerprint of computational identity. If the hash changes while the displayed date, chain,
          and methodology context appear unchanged, a technical reader immediately knows that some
          relevant input or parameterization changed upstream.
        </p>
        <p className="mt-3">
          The accompanying window-days field matters because regime and scorecard are windowed
          objects. A 7-day classification and a 30-day classification can be equally deterministic yet
          refer to different state definitions. So the proper advanced reading is the tuple
          (methodology version, chain profile, window, determinism hash), not the hash alone. Current
          hash: <InlineCode>{hash ?? "—"}</InlineCode>. Current window:{" "}
          <InlineCode>{String(windowDays ?? "—")}</InlineCode>.
        </p>
      </>
    ),
  };
}


function readOrderExplanation(): ExplainPair {
  return {
    basic: (
      <>
        <p>
          The recommended reading order is simple: first check freshness and confidence, then read the
          regime label, then open the scorecard and drivers, and only after that use the charts to put
          the current reading into visible historical context.
        </p>
        <p className="mt-3">
          The point is to stop the user from jumping straight to line movement without first knowing
          whether the row is fresh and how strongly supported the current label is.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          This reading order mirrors the structure of the published data contract. Freshness and
          confidence are gating variables; regime is the compressed state output; scorecard is the
          axis-level decomposition; drivers are the ranked evidence rows; charts are the time-series
          visualization layer. In methodological terms, the page is arranged from contract-level
          validity checks to semantic compression to granular evidence.
        </p>
        <p className="mt-3">
          The advanced reason for this order is to avoid a common analytical error: over-weighting the
          visual salience of a recent line move before establishing whether the visible row is timely,
          publish-eligible, and semantically well-supported. The charts contextualize the state; they
          do not define it.
        </p>
      </>
    ),
  };
}


function scorecardAxisExplanation(axis: "demand" | "friction" | "capacity", dim?: ScorecardDimension): ExplainPair {
  if (axis === "demand") {
    return {
      basic: (
        <>
          <p>
            Demand describes usage pressure: how much on-chain activity the chain currently seems to be
            carrying relative to its own recent history.
          </p>
          <p className="mt-3">
            “Normal” means normal versus this chain’s own recent baseline, not normal versus every
            chain in crypto.
          </p>
          <p className="mt-3">
            The current published score is <span className="font-medium">{fmtScore100(dim?.score)}</span>/100.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            Demand is an axis-level score derived from demand-side metrics after they have already been
            normalized into a comparable signal space upstream. Per the product contract, each
            scorecard dimension is a published scalar on [0,100], with the canonical mapping defined
            as <InlineCode>score = 50 + 40 * tanh(z / 1.5)</InlineCode>, where{" "}
            <InlineCode>z</InlineCode> is the combined dimension signal. This tanh map preserves sign
            and ordering while compressing extremes so one unusual metric does not explode the gauge.
          </p>
          <p className="mt-3">
            The second step is confidence-aware shrinkage toward neutral. The spec explicitly states
            that the mapped score is degraded back toward 50 according to effective support. So the
            visible score says both where Demand currently sits versus recent history and how strongly
            that placement is supported by available evidence. A modest visible value can therefore sit
            on top of a stronger raw z-signal if coverage or confidence is weak.
          </p>
          <p className="mt-3">
            The auxiliary fields matter mathematically: <InlineCode>coverage_factor</InlineCode> is a
            0–1 completeness term for expected evidence on the axis, while{" "}
            <InlineCode>effective_confidence</InlineCode> is the confidence-adjusted support term used
            to avoid over-asserting noisy partial evidence. In the current row, coverage is{" "}
            <span className="font-medium">{fmtNum(dim?.coverage_factor, 3)}</span> and effective
            confidence is <span className="font-medium">{fmtNum(dim?.effective_confidence, 3)}</span>.
          </p>
        </>
      ),
    };
  }

  if (axis === "friction") {
    return {
      basic: (
        <>
          <p>
            Friction describes cost, execution difficulty, or tightness-of-use: how expensive or hard
            the chain currently looks relative to itself.
          </p>
          <p className="mt-3">
            A chain can be busy without looking especially costly, and it can look costly without
            looking maximally busy. That is why Friction is separated from Demand.
          </p>
          <p className="mt-3">
            The current published score is <span className="font-medium">{fmtScore100(dim?.score)}</span>/100.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            Friction uses the same bounded-score contract as the other axes, but the upstream inputs
            are chosen from metrics that speak to cost burden, execution tightness, or failure/fee
            strain rather than raw usage volume. On EVM-style chains this often leans on fee and
            execution semantics; on BTC-style profiles it leans more heavily on fee and pacing
            proxies. The result is still mapped through the same tanh-based score transform so the
            three axes remain visually comparable without pretending they arise from identical raw
            variables.
          </p>
          <p className="mt-3">
            Advanced users should read Friction as an interpretable compressed statistic rather than a
            latent variable estimated by a factor model. It is a deterministic published summary of
            how tight or costly use currently looks relative to recent chain history. The banding to
            Low/Normal/High is thresholding of the mapped score, not a separate classifier.
          </p>
          <p className="mt-3">
            As with Demand, the visible score is modulated by support. Coverage remains{" "}
            <span className="font-medium">{fmtNum(dim?.coverage_factor, 3)}</span> and effective
            confidence remains <span className="font-medium">{fmtNum(dim?.effective_confidence, 3)}</span>.
            If these are low, the score is deliberately shrunk toward the neutral center so the UI
            does not over-interpret weak or partially missing cost evidence.
          </p>
        </>
      ),
    };
  }

  return {
    basic: (
      <>
        <p>
          Capacity describes how constrained or unconstrained the chain currently looks relative to its
          own recent baseline.
        </p>
        <p className="mt-3">
          “Balanced” means balanced versus the chain’s own recent history, not some universal
          network-capacity standard.
        </p>
        <p className="mt-3">
          The current published score is <span className="font-medium">{fmtScore100(dim?.score)}</span>/100.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Capacity answers a different question from Demand. Demand asks how much use is showing up;
          Capacity asks whether the chain looks roomy, balanced, or tight while carrying that use. The
          upstream evidence is therefore profile-dependent: Ethereum-like chains can use utilization
          fields such as block fullness, while Bitcoin-like chains need timing and throughput proxies
          because they do not expose gas-utilization semantics.
        </p>
        <p className="mt-3">
          The published score again follows the canonical bounded transform{" "}
          <InlineCode>50 + 40 * tanh(z / 1.5)</InlineCode>, then degrades toward 50 according to
          effective support. So a Capacity score near 50 should be read as “close to recent baseline
          after support adjustment”, not as an absolute engineering statement that the network is half
          full. The score is explicitly chain-relative.
        </p>
        <p className="mt-3">
          In the current row, coverage is <span className="font-medium">{fmtNum(dim?.coverage_factor, 3)}</span> and
          effective confidence is <span className="font-medium">{fmtNum(dim?.effective_confidence, 3)}</span>.
          These terms matter because capacity evidence is often the most chain-semantic-sensitive axis:
          on BTC it is proxy-based, on L2s it is architecture-specific, and on EVM L1 it can be read
          more directly from utilization. The confidence-aware shrinkage is what keeps those
          differences from being presented with false precision.
        </p>
      </>
    ),
  };
}



function metricReasonExplanation(
  metric: string,
  axis?: string,
  chainId?: ChainId,
  regimeLabel?: string | null
): ExplainPair {

  // ─── tx_count_daily ───────────────────────────────────────────────────────
  if (metric === "tx_count_daily") {
    if (chainId === "bitcoin") {
      return {
        basic: (
          <>
            <p>
              Bitcoin&apos;s transaction count is the clearest available signal for how much demand
              pressure block space is currently under. More confirmed transactions means more
              competition for the limited ~1 MB of block space available per ~10 minutes.
            </p>
            <p className="mt-3">
              {regimeLabel === "HEATING"
                ? "It is shown now because the demand axis is elevated - tx_count_daily is one of the primary inputs driving the current HEATING reading."
                : regimeLabel === "CONGESTED"
                  ? "It is shown now because demand is pressing against capacity. Transaction count is one of the clearest signals of that pressure."
                  : regimeLabel === "CHEAP"
                    ? "It is shown now for context: even in a CHEAP state, knowing whether transaction activity is genuinely low or merely cheap-per-unit matters for reading persistence."
                    : "It is shown because it is always the first metric to check on Bitcoin when judging whether the current state reflects genuine activity or background noise."}
            </p>
          </>
        ),
        advanced: (
          <>
            <p>
              <InlineCode>tx_count_daily</InlineCode> is the primary demand-axis input for the BTC
              profile. It is log-normalised before z-score computation to reduce scale sensitivity.
              On Bitcoin, this field also serves as a partial capacity proxy because block space is
              fixed - more transactions means more block-space demand, which directly connects demand
              and capacity pressure.
            </p>
            <p className="mt-3">
              Source: <InlineCode>gold/bitcoin/last{"{window}"}d.json -&gt; tx_count_daily</InlineCode>.
              Regime axis: <InlineCode>demand</InlineCode>.
            </p>
          </>
        ),
      };
    }
    // ETH / ARB / BASE
    return {
      basic: (
        <>
          <p>
            Transaction count shows how much real execution demand the chain is currently carrying.
            On EVM chains it reflects not just transfers but smart contract interactions, which
            means it is a broader activity signal than on Bitcoin.
          </p>
          <p className="mt-3">
            {regimeLabel === "HEATING"
              ? "It is shown now because demand is elevated - transaction volume is one of the inputs pulling the demand axis into its current HIGH band."
              : regimeLabel === "CONGESTED"
                ? "It is shown now because high demand is interacting with capacity constraints. Transaction count helps show the demand side of that congestion."
                : regimeLabel === "CHEAP"
                  ? "It is shown for context: the current CHEAP state is partly defined by whether demand is genuinely quiet, which transaction count helps confirm."
                  : "It is shown because it is the most direct available signal of current network usage breadth."}
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>tx_count_daily</InlineCode> feeds the demand axis alongside
            <InlineCode>unique_active_addresses</InlineCode>. It is log-normalised before
            z-score computation. On EVM chains it should be read together with
            <InlineCode>gas_utilization_pct</InlineCode> and <InlineCode>failed_tx_rate</InlineCode>
            to distinguish high-volume-but-unconstrained from high-volume-plus-capacity-pressure.
          </p>
        </>
      ),
    };
  }

  // ─── unique_active_addresses ──────────────────────────────────────────────
  if (metric === "unique_active_addresses") {
    return {
      basic: (
        <>
          <p>
            Active addresses show whether current activity is broad or concentrated. A chain can
            have high transaction count driven by a few heavy users, or the same count spread
            across many participants - and those two situations have different implications for
            how durable the current state looks.
          </p>
          <p className="mt-3">
            {regimeLabel === "HEATING"
              ? "It is shown now because broad participation is one of the signals supporting the current HEATING reading - demand looks both elevated and wide."
              : regimeLabel === "CONGESTED"
                ? "It is shown because widespread usage is part of what makes the current congestion genuine rather than a single-actor anomaly."
                : "It is shown to give the participation-breadth context that raw transaction count alone cannot provide."}
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>unique_active_addresses</InlineCode> is a demand-axis complement to
            <InlineCode>tx_count_daily</InlineCode>. The derived
            <InlineCode>tx_per_user</InlineCode> ratio (tx_count / active_addresses) is also used
            in the scorecard as a third demand component where available. The address field has
            known limitations on Bitcoin (UTXO reuse) and is sometimes null on L2s.
          </p>
        </>
      ),
    };
  }

  // ─── median_tx_fee_native ─────────────────────────────────────────────────
  if (metric === "median_tx_fee_native") {
    return {
      basic: (
        <>
          <p>
            The median transaction fee shows what a typical user was paying to transact in the
            chain&apos;s own native units. Fees are one of the most immediate ways users feel
            changes in network pressure - they rise when demand competes with available
            block space or gas.
          </p>
          <p className="mt-3">
            {regimeLabel === "CONGESTED"
              ? "It is shown now because elevated fees are part of the friction that defines the current CONGESTED state. This is one of the direct cost signals supporting that label."
              : regimeLabel === "HEATING"
                ? "It is shown now to show the cost side of the current HEATING state - whether demand pressure is already translating into fee elevation."
                : regimeLabel === "CHEAP"
                  ? "It is shown now because low fees are one of the defining features of the current CHEAP state. This metric is part of what qualifies the chain as cheap to use right now."
                  : "It is shown because fee level is the most direct cost signal available for judging the current operating state."}
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>median_tx_fee_native</InlineCode> is a friction-axis input. On BTC it is
            the primary friction anchor because there is no equivalent to gas-utilisation or
            failed-tx rate. On EVM chains it feeds <InlineCode>fee_burden_proxy</InlineCode>
            (median_fee / median_tx_value) alongside <InlineCode>failed_tx_rate</InlineCode>.
            The median is used rather than mean to reduce outlier sensitivity.
          </p>
        </>
      ),
    };
  }

  // ─── gas_utilization_pct ──────────────────────────────────────────────────
  if (metric === "gas_utilization_pct") {
    return {
      basic: (
        <>
          <p>
            Gas utilisation shows how full EVM blocks are on average. A fully utilised block means
            the chain is operating at its capacity ceiling - every unit of computational space is
            being consumed. A partially utilised block means there is slack.
          </p>
          <p className="mt-3">
            {regimeLabel === "CONGESTED"
              ? "It is shown now because high gas utilisation is one of the central signals defining the current CONGESTED state. The chain is running near its capacity limit."
              : regimeLabel === "HEATING"
                ? "It is shown now to track whether rising demand is beginning to press against block capacity - the transition from HEATING to CONGESTED often shows up here first."
                : regimeLabel === "CHEAP"
                  ? "It is shown now because low utilisation is part of what defines the current CHEAP state. Spare capacity is what makes cheap conditions structurally stable."
                  : "It is shown because block utilisation is the most direct observable measure of how full or empty the chain currently is."}
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>gas_utilization_pct</InlineCode> = mean(gas_used / gas_limit) across all
            blocks for the day. It is the primary capacity-axis input for ETH L1. Under EIP-1559,
            the protocol target is 50% - sustained utilisation above that signals base fee growth;
            sustained near 100% signals a hard capacity ceiling. This field is not published for
            BTC or L2 profiles where the semantics are not equivalent.
          </p>
        </>
      ),
    };
  }

  // ─── avg_block_time_sec ───────────────────────────────────────────────────
  if (metric === "avg_block_time_sec") {
    return {
      basic: (
        <>
          <p>
            Average block time shows how long the network is taking to produce blocks. Persistent
            changes in block timing can signal changes in mining competition (Bitcoin) or validator
            conditions - and erratic timing is often a sign of operating stress.
          </p>
          <p className="mt-3">
            {chainId === "bitcoin"
              ? "On Bitcoin this is especially important because there is no gas utilisation field. Block time is the closest available proxy for whether capacity looks tight or relaxed."
              : "On this chain, block time supplements the gas and fee signals by showing whether block production itself is running smoothly or erratically."}
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>avg_block_time_sec</InlineCode> is used in the capacity axis. It is not
            read as a simple &quot;higher is worse&quot; signal - instead the pipeline derives a
            <InlineCode>blocktime_instability</InlineCode> proxy that measures deviation from the
            chain&apos;s own rolling median. This makes it a stability signal rather than a raw
            speed signal, which is more informative across different chain architectures.
          </p>
          {chainId === "bitcoin" && (
            <p className="mt-3">
              On BTC specifically, this is one of only two visible capacity signals (alongside
              block_count_daily). It therefore carries more weight in the BTC capacity axis than
              it would on an EVM chain with gas utilisation data.
            </p>
          )}
        </>
      ),
    };
  }

  // ─── failed_tx_rate ───────────────────────────────────────────────────────
  if (metric === "failed_tx_rate") {
    return {
      basic: (
        <>
          <p>
            The failed transaction rate shows what share of transactions did not complete
            successfully. A rising failure rate usually means the execution environment is more
            competitive or congested - users are submitting transactions that are outcompeted or
            run out of gas.
          </p>
          <p className="mt-3">
            {regimeLabel === "CONGESTED"
              ? "It is shown now because a higher failure rate is one of the friction signals contributing to the current CONGESTED reading. It shows the human cost of tight conditions."
              : regimeLabel === "CHEAP"
                ? "It is shown for confirmation: a genuinely CHEAP state should also show low failure rates, not just low fees. This metric helps verify that."
                : "It is shown because it is one of the clearest signals of whether current conditions are practically difficult for users - not just expensive, but failure-prone."}
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>failed_tx_rate</InlineCode> is a friction-axis input on EVM chains
            alongside <InlineCode>fee_burden_proxy</InlineCode>. It is not available for Bitcoin
            (no equivalent concept under the UTXO model). On EVM chains, it reflects
            out-of-gas failures, reverts, and other execution failures - all of which are
            user-visible friction signals distinct from fee level alone.
          </p>
        </>
      ),
    };
  }

  // ─── block_count_daily ────────────────────────────────────────────────────
  if (metric === "block_count_daily") {
    return {
      basic: (
        <>
          <p>
            Block count shows how many blocks were produced on this day. For most chains this
            should be stable - persistent changes from the expected rate are more informative
            than the absolute number.
          </p>
          <p className="mt-3">
            {chainId === "bitcoin"
              ? "On Bitcoin the expected rate is roughly 144 blocks per day (~10 min average). Large deviations from this rate point to hash rate changes or difficulty adjustment effects."
              : "On this chain, block count is a throughput-stability signal. Sustained deviation from the normal rate is what matters, not the absolute count."}
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>block_count_daily</InlineCode> feeds the capacity axis as a throughput
            normaliser and as an input to the <InlineCode>blocktime_instability</InlineCode>
            derived signal. It is one of the most stable Gold metrics under normal operating
            conditions, which makes persistent deviations a meaningful signal of network-level
            events.
          </p>
        </>
      ),
    };
  }

  // ─── median_tx_value_native ───────────────────────────────────────────────
  if (metric === "median_tx_value_native") {
    return {
      basic: (
        <>
          <p>
            Median transaction value shows what a typical transfer was worth in native units.
            This matters because the same fee can feel very different depending on how much
            value is being moved - a 0.001 ETH fee on a 0.01 ETH transfer is ten times more
            burdensome than the same fee on a 1 ETH transfer.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>median_tx_value_native</InlineCode> is used as the denominator in
            <InlineCode>fee_burden_proxy = median_tx_fee_native / median_tx_value_native</InlineCode>.
            This normalisation makes fee burden comparable across periods with different typical
            transfer sizes. When median_tx_value is near zero (common when smart contract calls
            dominate), the proxy may not be meaningful and the pipeline handles this via null fallback.
          </p>
        </>
      ),
    };
  }

  // ─── value_transferred_native ─────────────────────────────────────────────
  if (metric === "value_transferred_native") {
    return {
      basic: (
        <>
          <p>
            Total value transferred shows the aggregate economic activity in native units for
            the day. It gives a rough sense of how much the network was being used as a
            value-transfer layer, separate from pure transaction count.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>value_transferred_native</InlineCode> has known interpretation
            limitations: it includes protocol-level movements, contract interactions where
            msg.value is not economically meaningful, and internal transfers. It is published
            in Gold for transparency but is not a primary regime-classification input. Use it
            for trend context rather than as a precise economic volume measure.
          </p>
        </>
      ),
    };
  }

  // ─── Generic fallback — axis-specific but not metric-specific ─────────────
  const axisText: Record<string, string> = {
    demand: "demand pressure - whether the chain is busier than usual relative to its own recent history",
    friction: "operating cost and difficulty - whether using the chain is more costly or error-prone than usual",
    capacity: "capacity tightness - whether the chain looks more constrained than usual relative to its own history",
  };

  const axisDescription = axis && axisText[axis]
    ? axisText[axis]
    : "the current descriptive reading";

  return {
    basic: (
      <>
        <p>
          This metric is shown because it is currently contributing to {axisDescription}.
          A metric appearing here means it is doing real explanatory work in the current
          published row - not just present in the data, but standing out enough to surface.
        </p>
        <p className="mt-3">
          {regimeLabel
            ? `In the context of the current ${regimeLabel} label, this field is part of the evidence layer that supports or qualifies that classification.`
            : "Read it together with the other drivers and scorecard axes rather than in isolation."}
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          Metric <InlineCode>{metric}</InlineCode> on axis <InlineCode>{axis ?? "—"}</InlineCode>.
          The UI surfaces this from <InlineCode>regime.drivers[]</InlineCode> in the published
          meta artifact. Driver ranking is deterministic - this metric currently ranks high enough
          in the published driver set to be surfaced as a visible evidence row.
        </p>
      </>
    ),
  };
}

function chartWhyShownOneLiner(
  metric: string,
  axis?: string,
  regimeLabel?: string | null
): string {
  if (metric === "tx_count_daily")
    return "Primary demand signal - shows how much block-space usage the chain is currently carrying.";
  if (metric === "unique_active_addresses")
    return "Breadth signal - shows whether current activity is broad or concentrated.";
  if (metric === "median_tx_fee_native") {
    if (regimeLabel === "CHEAP") return "Core friction signal - low fees are part of what defines the current CHEAP state.";
    if (regimeLabel === "CONGESTED") return "Core friction signal - elevated fees are part of what defines the current CONGESTED state.";
    return "Core friction signal - the most direct cost indicator available for this chain.";
  }
  if (metric === "gas_utilization_pct") {
    if (regimeLabel === "CONGESTED") return "Capacity signal - high utilisation is central to the current CONGESTED reading.";
    return "Capacity signal - shows how full EVM blocks currently are relative to their limit.";
  }
  if (metric === "avg_block_time_sec")
    return "Capacity proxy - block timing deviation signals whether production is smooth or erratic.";
  if (metric === "failed_tx_rate")
    return "Friction signal - shows whether the execution environment is currently failure-prone.";
  if (metric === "block_count_daily")
    return "Throughput signal - persistent deviation from expected rate points to network-level events.";
  if (axis === "demand") return "Demand signal - contributes to the activity-pressure axis.";
  if (axis === "friction") return "Friction signal - contributes to the cost and difficulty axis.";
  if (axis === "capacity") return "Capacity signal - contributes to the tightness axis.";
  return "This metric is currently doing explanatory work in the published driver set.";
}

function chartReadExplanation(metric: string, windowDays: number, unitLabel?: string): ExplainPair {
  return {
    basic: (
      <>
        <p>
          Read the raw line for day-to-day movement, MA7 for short smoothing, and MA30 for the broader
          recent baseline.
        </p>
        <p className="mt-3">
          On a {windowDays}d view, very short swings often matter less than the direction and shape of
          MA30. Units for this chart are <span className="font-medium">{unitLabel ?? "not specified"}</span>.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The chart is a layered time-series object built from raw gold observations plus derived
          smoothing overlays. By contract, <InlineCode>__ma7</InlineCode> and{" "}
          <InlineCode>__ma30</InlineCode> are arithmetic means over the last 7 and 30 non-null days in
          the derived layer. That means the two moving averages are descriptive smoothers, not
          forecasting models. Their job is to suppress noise and expose local versus broader trend
          structure.
        </p>
        <p className="mt-3">
          The advanced way to read the panel is relationally, not pointwise. Compare four things:
          raw volatility amplitude, whether MA7 is above or below MA30, the slope of MA30, and where
          the current endpoint sits inside the visible historical range. A large raw spike with flat
          MA30 usually means short-lived disturbance; a persistent MA30 slope change is stronger
          evidence of regime-relevant drift.
        </p>
        <p className="mt-3">
          For <InlineCode>{metric}</InlineCode>, the selected window is{" "}
          <InlineCode>{String(windowDays)}</InlineCode> days and the native unit is{" "}
          <InlineCode>{unitLabel ?? "—"}</InlineCode>. Because the series stays in native units,
          cross-metric comparisons should be shape-based rather than level-based unless the units are
          directly comparable. The chart is therefore best used to study persistence, relative
          elevation, and transition timing—not to infer standardized magnitude by eye.
        </p>
      </>
    ),
  };
}


function statExplanation(kind: "z" | "pct" | "mom" | "current", value?: number): ExplainPair {
  if (kind === "z") {
    return {
      basic: (
        <>
          <p>
            Robust z-score tells you how unusual the current reading looks relative to the metric’s own
            recent typical range.
          </p>
          <p className="mt-3">
            Larger absolute values mean the metric stands out more strongly. The current value is{" "}
            <span className="font-medium">{fmtNum(value, 2)}</span>.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>z_robust</InlineCode> is a robust standardized distance. The governing spec
            defines it as <InlineCode>0.6745 * (x - median) / MAD</InlineCode>, where MAD is the
            median absolute deviation. If MAD = 0, the pipeline falls back to a standard z-score; if
            that fallback standard deviation is also 0, the value falls back to 0. This differs
            materially from a plain mean/std z-score because the median/MAD form is less dominated by
            extreme outliers.
          </p>
          <p className="mt-3">
            Interpretation: sign gives direction versus the recent center; magnitude gives unusualness
            versus the recent robust spread. A value around 0 means near recent center; larger
            absolute values mean farther from what has recently been typical. Because it is
            standardized, z_robust is useful for ranking unlike metrics on a common evidence scale
            even when they live in completely different native units.
          </p>
          <p className="mt-3">
            The caveat is that z_robust is still a local statistic, not a structural model. It tells
            you how unusual the current reading is under the recent distributional context. It does
            not tell you causality, persistence probability, or future path.
          </p>
        </>
      ),
    };
  }

  if (kind === "pct") {
    return {
      basic: (
        <>
          <p>
            90-day percentile tells you where today’s reading sits inside the recent 90-day range.
          </p>
          <p className="mt-3">
            High percentile means near the top of recent observations; low percentile means near the
            bottom. The current value is <span className="font-medium">{fmtPct0to100(value)}</span>.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>pct_90d</InlineCode> is a 90-day percentile-rank statistic. The spec defines it
            as the percentile rank of the current value relative to the last 90 days, with a minimum
            of 30 data points required. Statistically, percentile is a positional measure, not a
            distance measure: it tells you where the current observation sits in the ordered recent
            sample, not how many dispersion units away it is from the center.
          </p>
          <p className="mt-3">
            That distinction matters. A percentile of 90 means the current value is above roughly 90%
            of the recent sample, but it does not tell you whether it is only slightly above the 89th
            percentile or dramatically above it. That is why percentile and z_robust are shown
            together: percentile gives rank-in-range; z_robust gives standardized unusualness.
          </p>
          <p className="mt-3">
            Advanced readers should use percentile as an order-statistic view of state location inside
            the recent empirical distribution. It is especially useful when distributions are skewed or
            when raw units are hard to compare visually across metrics.
          </p>
        </>
      ),
    };
  }

  if (kind === "mom") {
    return {
      basic: (
        <>
          <p>
            Momentum (7d vs 30d) compares the short-term signal with the broader recent baseline.
          </p>
          <p className="mt-3">
            Positive values mean the short-term level is running above the longer recent trend; negative
            values mean it is running below it. The current value is{" "}
            <span className="font-medium">{fmtNum(value, 3)}</span>.
          </p>
        </>
      ),
      advanced: (
        <>
          <p>
            <InlineCode>momentum_7d_vs_30d</InlineCode> is defined in the product spec as{" "}
            <InlineCode>z_robust(mean_7d) - z_robust(mean_30d)</InlineCode>. So it is not a raw-return
            calculation and not a percentage slope. It is a difference between two robustly
            standardized local means: one short-horizon (7d), one broader-horizon (30d).
          </p>
          <p className="mt-3">
            The sign therefore indicates short-versus-broader acceleration. Positive values mean the
            recent 7-day state is stronger/hotter than the broader 30-day baseline in standardized
            terms; negative values mean the short-horizon state is cooler/weaker than the broader
            baseline. This gives the user a direction-of-drift statistic that complements level and
            rank statistics.
          </p>
          <p className="mt-3">
            The correct technical reading is dynamic, not static: percentile and z_robust tell you
            where the metric is, while momentum tells you whether the short window is currently
            pulling away from or falling back toward the broader local baseline.
          </p>
        </>
      ),
    };
  }

  return {
    basic: (
      <>
        <p>
          Current value is the visible latest raw reading for this metric in its native units.
        </p>
        <p className="mt-3">
          It is useful because it shows the actual level behind the summaries and classifications.
        </p>
      </>
    ),
    advanced: (
      <>
        <p>
          The current raw value is the direct latest observation carried into the driver row, shown in
          native units with no frontend normalization. It exists for auditability: it lets the reader
          tie the standardized summaries back to an actual quantity measured on the chain.
        </p>
        <p className="mt-3">
          Technically, this number should never be read alone when comparing across metrics. Raw level,
          percentile, z_robust, and momentum answer different statistical questions. The raw value says
          what the latest observed level is; percentile says where that level sits inside the recent
          ordered sample; z_robust says how unusual it is relative to robust spread; momentum says
          whether the short horizon is strengthening or weakening relative to the broader local
          baseline.
        </p>
        <p className="mt-3">
          In other words, current value is the anchor that keeps the driver row empirically grounded,
          while the other columns provide standardized context around that anchor.
        </p>
      </>
    ),
  };
}


function labelForMetric(metric: string) {
  return metric;
}

function topLineMetricNote(chainId: ChainId, metric: string): ReactNode {
  if (chainId === "bitcoin" && metric === "tx_count_daily") {
    return (
      <>
        Confirmed transactions per day are a primary demand signal on Bitcoin because they show how much
        confirmed block-space usage the chain is carrying.
      </>
    );
  }

  if (metric === "median_tx_fee_native") {
    return (
      <>
        Median transaction fee in native units is a direct friction indicator: it helps show how costly
        transacting currently looks on this chain.
      </>
    );
  }

  if (metric === "avg_block_time_sec") {
    return (
      <>
        Average time between blocks is a timing and pacing proxy. It helps the user judge whether the
        chain currently looks smooth, slow, or constrained in block production terms.
      </>
    );
  }

  if (metric === "gas_utilization_pct") {
    return (
      <>
        Gas utilization is a capacity proxy on EVM-style chains. It helps show how full the chain
        currently looks relative to recent norms.
      </>
    );
  }

  return <>This metric is shown because it currently helps explain the chain’s descriptive reading.</>;
}

export default async function ChainPage({
  params,
  searchParams,
}: {
  params: Promise<{ chain: string }>;
  searchParams?: Promise<ChainPageSearchParams>;
}) {
  const { chain } = await params;
  if (!chain) return notFound();

  const cfg = getChainConfig(chain as ChainId);
  if (!cfg) return notFound();

  const chainId = cfg.id;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const requestedWindow = normalizeWindow(resolvedSearchParams?.window);
  const effectiveRequestedWindow = requestedWindow;
  const effectiveWindowDays = effectiveRequestedWindow;

  const metaPath = `meta/${chainId}/latest.json`;
  const heroPath = `landing/${chainId}/hero.json`;
  const goldPath = `gold/${chainId}/last${effectiveWindowDays}d.json`;
  const derivedPath = `derived/${chainId}/last${effectiveWindowDays}d.json`;
  const briefPath = `briefs/chains/${chainId}/latest.json`;

  const [meta, hero, goldPayload, derivedPayload, chainBrief] = await Promise.all([
    readPublishedJson<MetaLatest>(metaPath),
    readPublishedJson<LandingHero>(heroPath),
    readPublishedJson<GoldRow[] | { rows?: GoldRow[] }>(goldPath),
    readPublishedJson<DerivedRow[] | { rows?: DerivedRow[] }>(derivedPath),
    readPublishedJson<ChainBriefLatest>(briefPath),
  ]);

  if (!meta) return notFound();

  const goldRows = Array.isArray(goldPayload)
    ? goldPayload
    : Array.isArray(goldPayload?.rows)
      ? goldPayload.rows
      : [];
  const derivedRows = Array.isArray(derivedPayload)
    ? derivedPayload
    : Array.isArray(derivedPayload?.rows)
      ? derivedPayload.rows
      : [];

  const maxDerived = maxDateMsFromRows(derivedRows);
  const maxGold = maxDateMsFromRows(goldRows);
  const maxFromMeta = parseIsoDayToUtcMs(
    meta.updated_through ??
      meta.regime?.asof_date ??
      meta.scorecard?.asof_date ??
      meta.date
  );
  const maxMs = maxDerived ?? maxGold ?? maxFromMeta;
  if (maxMs === null) return notFound();

  const bounds = computeBoundsFromMax(maxMs, effectiveWindowDays);
  const dayList = listDays(bounds);

  const derivedByDate = buildDerivedByDate(derivedRows);
  const goldByDate = buildGoldByDate(goldRows);

  const missingDays = dayList.filter(
    (d) => !derivedByDate.has(d) || !goldByDate.has(d)
  );
  if (missingDays.length > 0) {
    const dailyResults = await Promise.all(
      missingDays.map(async (d) => {
        const [dr, gr] = await Promise.all([
          derivedByDate.has(d)
            ? Promise.resolve(null)
            : readPublishedJson<DerivedRow>(`derived/${chainId}/${d}.json`),
          goldByDate.has(d)
            ? Promise.resolve(null)
            : readPublishedJson<GoldRow>(`gold/${chainId}/${d}.json`),
        ]);
        return { date: d, derived: dr, gold: gr };
      })
    );

    for (const { date, derived: dr, gold: gr } of dailyResults) {
      if (dr && typeof dr.date === "string") derivedByDate.set(date, dr);
      if (gr && typeof (gr as GoldRow).date === "string") goldByDate.set(date, gr as GoldRow);
    }
  }

  const displayName = meta.profile?.label ?? cfg.name;
  const displayAsOf = landingDisplayAsOf(hero);
  const regimeAsOf =
    landingRegimeAsOf(hero) ??
    meta.regime?.asof_date ??
    meta.scorecard?.asof_date ??
    meta.date ??
    meta.confidence?.date ??
    null;
  const asOf =
    displayAsOf ??
    meta.updated_through ??
    meta.regime?.asof_date ??
    meta.scorecard?.asof_date ??
    meta.date ??
    meta.confidence?.date ??
    null;
  const observedLagDays =
    lagDaysFromIsoDay(asOf ?? undefined) ??
    meta.confidence?.lag_days_vs_utc_today ??
    null;

  const regimeLabel = meta.status?.label ?? meta.regime?.label ?? "UNKNOWN";
  const oneLiner = meta.status?.one_liner;
  const briefHeadline = chainBrief?.brief?.headline;
  const briefPlain = chainBrief?.brief?.plain;
  const briefDominant = dominantBriefLabel(chainBrief);
  const briefPrimaryDriver = primaryBriefDriver(chainBrief);

  const conf = meta.confidence?.confidence_score;
  const confBand = confidenceBand(conf);
  const confNotice = confidenceNotice(conf);

  const driversAll = Array.isArray(meta.regime?.drivers)
    ? sortDrivers(meta.regime.drivers)
    : [];
  const topDrivers = driversAll.slice(0, 4);

  const dims = meta.scorecard?.dimensions;

  const hidden = new Set(
    (meta.profile?.hidden_metrics ?? cfg.hiddenMetrics ?? []).map(String)
  );
  const driverMetrics = driversAll
    .map((d) => d.metric)
    .filter((m): m is string => typeof m === "string");
  const defaults = guessMetricKeysForChain(chainId);

  const candidates = Array.from(new Set([...driverMetrics, ...defaults]))
    .filter((m) => !hidden.has(m))
    .slice(0, 4);

  // Per-metric windows — each chart can have its own time range
  const chartDataByMetric = await Promise.all(
    candidates.map(async (metric) => {
      const paramKey = metricParamKey(metric);
      const rawParam = (resolvedSearchParams as Record<string, string> | undefined)?.[paramKey];
      const metricWindow: 30 | 90 | 180 | 365 = normalizeWindow(rawParam);

      const mGoldPath = `gold/${chainId}/last${metricWindow}d.json`;
      const mDerivedPath = `derived/${chainId}/last${metricWindow}d.json`;

      const [mGold, mDerived] = await Promise.all([
        metricWindow !== effectiveWindowDays
          ? readPublishedJson<GoldRow[] | { rows?: GoldRow[] }>(mGoldPath)
          : goldPayload,
        metricWindow !== effectiveWindowDays
          ? readPublishedJson<DerivedRow[] | { rows?: DerivedRow[] }>(mDerivedPath)
          : derivedPayload,
      ]);

      const mGoldRows = Array.isArray(mGold) ? mGold : Array.isArray((mGold as { rows?: GoldRow[] })?.rows) ? (mGold as { rows?: GoldRow[] }).rows! : [];
      const mDerivedRows = Array.isArray(mDerived) ? mDerived : Array.isArray((mDerived as { rows?: DerivedRow[] })?.rows) ? (mDerived as { rows?: DerivedRow[] }).rows! : [];

      const mDerivedByDate = buildDerivedByDate(mDerivedRows);
      const mGoldByDate = buildGoldByDate(mGoldRows);
      const mMaxMs = maxDateMsFromRows(mDerivedRows) ?? maxDateMsFromRows(mGoldRows) ?? maxMs;
      const mBounds = computeBoundsFromMax(mMaxMs, metricWindow);

      const data = buildChartDataObserved({ bounds: mBounds, derivedByDate: mDerivedByDate, goldByDate: mGoldByDate, metric });
      const metricDriver = driversAll.find((d) => d.metric === metric);

      return {
        metric,
        axis: metricDriver?.axis,
        unitLabel: getUnitLabel(chainId, metric) ?? undefined,
        data,
        metricWindow,
        mGoldPath,
        mDerivedPath,
        mBounds,
        paramKey,
        hasData: data.some((p) => p.value !== null || p.ma7 !== null || p.ma30 !== null),
      };
    })
  );

  const charts = chartDataByMetric.filter((c) => c.hasData);


  const chainProfilePair = chainProfileCopy(chainId);

 
  // Chain-specific focus text for hero
  const chainFocus: Record<string, string> = {
    bitcoin: "Watch tx_count_daily and median_tx_fee_native as the primary demand and friction signals. Block time (avg_block_time_sec) proxies capacity — BTC has no gas utilisation field. Fee spikes are episodic and sharp. Regime shifts on BTC are driven by block-space competition, not execution congestion.",
    ethereum: "Watch gas_utilization_pct for capacity pressure and failed_tx_rate for execution friction alongside median_tx_fee_native. Demand reads from tx_count_daily and unique_active_addresses. EIP-1559 means base fees can move fast when utilisation crosses 50% sustained.",
    arbitrum: "L2 fee structure separates local execution from L1 settlement cost. Watch tx_count_daily for demand and median_tx_fee_native for friction. gas_utilization_pct is hidden — capacity is proxied through block-time behaviour. A lag of ~7d is normal for this chain.",
    base: "Same two-part fee environment as Arbitrum: local execution + L1 publishing cost. Watch tx_count_daily and median_tx_fee_native. A lag of ~7d is part of the expected publication cadence. Low local demand does not guarantee low total fee if L1 conditions worsen.",
  };

  return (
    <main className="ua-page">
      <ModalStyles />

      {/* ── Hero ── */}
      <header className="border-b border-[var(--line)]" style={{ padding: "56px 0 0" }}>
        <div className="page-shell">

          {/* Top row: title + KPIs */}
          <div className="hero-grid" style={{ gap: "48px", alignItems: "start" }}>

            {/* Left: title block */}
            <div>
              <div className="eyebrow mb-3">Chain analysis</div>
              <div className="flex items-center gap-3 mb-4">
                <ChainIcon chain={chainId} className="h-8 w-8 text-sm" label={`${displayName} icon`} />
                <h1 className="ua-h1" style={{ lineHeight: 1 }}>{displayName}</h1>
              </div>

              {/* Regime — large and prominent */}
              <div style={{ marginBottom: "20px" }}>
                <RegimeBadge label={regimeLabel} statusColor={meta.status?.color}
                  className="text-[18px] tracking-[.12em] pb-[4px]" />
              </div>

              {oneLiner ? (
                <p className="text-[var(--ink)] text-[16px] leading-7 max-w-lg" style={{ marginBottom: "20px" }}>
                  {oneLiner}
                </p>
              ) : null}

              {confNotice ? (
                <div className="border-l-2 border-[var(--c-heating)] pl-4 py-1 mb-4">
                  <div className="eyebrow text-[var(--c-heating)] mb-1">{confNotice.title}</div>
                  <p className="text-sm text-[var(--ink2)]">{confNotice.body}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 items-center" style={{ marginBottom: "32px" }}>
                <Link href={`/chains/${chainId}/history`} className="btn-ghost">View history</Link>
                <Link href="/methodology" className="text-link">Methodology →</Link>
                <Link href="/glossary" className="text-link">Glossary →</Link>
              </div>
            </div>

            {/* Right: context panel with key metrics */}
            <aside className="context-panel" style={{ padding: "0" }}>
              <div className="ua-vf-panel-head">
                <div className="ua-vf-panel-title">Key metrics</div>
                <div className="ua-vf-panel-date">as of {fmtDate(asOf)}</div>
              </div>

              {/* Confidence + lag + hash as data rows */}
              <div style={{ padding: "0 18px 16px" }}>
                <div className="data-row" style={{ gridTemplateColumns: "140px 1fr", padding: "14px 0" }}>
                  <span className="font-mono text-[10px] text-[var(--ink3)] uppercase tracking-[.12em]">Confidence</span>
                  <span className="font-mono text-[20px] text-[var(--ink)] font-medium">{typeof conf === "number" ? conf.toFixed(3) : "—"}
                    <span className="font-mono text-[11px] text-[var(--ink3)] ml-2">{confBand}</span>
                  </span>
                </div>
                <div className="data-row" style={{ gridTemplateColumns: "140px 1fr", padding: "14px 0" }}>
                  <span className="font-mono text-[10px] text-[var(--ink3)] uppercase tracking-[.12em]">Observed lag</span>
                  <span className="font-mono text-[20px] text-[var(--ink)] font-medium">{typeof observedLagDays === "number" ? `${observedLagDays}d` : "—"}</span>
                </div>

                {/* Scorecard scores inline if available */}
                {dims ? (
                  <>
                    {([
                      { label: "Demand", dim: dims.demand },
                      { label: "Friction", dim: dims.friction },
                      { label: "Capacity", dim: dims.capacity },
                    ]).map(({ label, dim }) => (
                      <div key={label} className="data-row" style={{ gridTemplateColumns: "140px 1fr 56px", padding: "14px 0" }}>
                        <span className="font-mono text-[10px] text-[var(--ink3)] uppercase tracking-[.12em]">{label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            height: "4px", background: "var(--line2)", borderRadius: "2px",
                            flex: 1, maxWidth: "120px", position: "relative"
                          }}>
                            <div style={{
                              position: "absolute", left: 0, top: 0, height: "4px",
                              width: `${Math.min(100, Math.max(0, dim?.score ?? 50))}%`,
                              background: (dim?.score ?? 50) > 65 ? "var(--c-heating)" : (dim?.score ?? 50) < 35 ? "var(--c-cheap)" : "var(--c-stable)",
                              borderRadius: "2px"
                            }} />
                          </div>
                          <span className="font-mono text-[11px] text-[var(--ink2)]">{dim?.level ?? "—"}</span>
                        </div>
                        <span className="font-mono text-[13px] text-[var(--ink)] text-right">{fmtScore100(dim?.score)}</span>
                      </div>
                    ))}
                  </>
                ) : null}

                <div className="data-row" style={{ gridTemplateColumns: "140px 1fr", padding: "14px 0", borderBottom: 0 }}>
                  <span className="font-mono text-[10px] text-[var(--ink3)] uppercase tracking-[.12em]">Hash</span>
                  <span className="font-mono text-[10px] text-[var(--ink2)] break-all leading-5">{meta.regime?.determinism_hash ?? "—"}</span>
                </div>
              </div>
            </aside>
          </div>

          {/* Above-the-fold context: brief + profile + market interpretation */}
          <div className="border-t border-[var(--line)] mt-8 py-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <section className="context-panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="eyebrow">Latest 7-day Brief</div>
                  <Link href="/briefs" className="text-link">Briefs →</Link>
                </div>
                <p className="mt-4 text-[var(--ink)] text-sm leading-7">
                  {briefHeadline ?? briefPlain ?? "No latest chain Brief is currently published for this chain."}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[.12em] text-[var(--gold)]">Window</div>
                    <div className="mt-2 font-mono text-[12px] leading-5 text-[var(--ink2)]">{briefWindowLabel(chainBrief)}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[.12em] text-[var(--gold)]">Dominant</div>
                    <div className="mt-2 font-mono text-[12px] leading-5 text-[var(--ink2)]">{briefDominant}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[.12em] text-[var(--gold)]">Brief confidence</div>
                    <div className="mt-2 font-mono text-[12px] leading-5 text-[var(--ink2)]">{fmtBriefScore(chainBrief?.confidence?.average_7d)} avg 7d</div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[.12em] text-[var(--gold)]">Volatility</div>
                    <div className="mt-2 font-mono text-[12px] leading-5 text-[var(--ink2)]">{prettifySnake(chainBrief?.regime_path?.volatility)}</div>
                  </div>
                </div>
              </section>

              <section className="context-panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="eyebrow">Chain profile</div>
                  <MoreLink id={`profile-${chainId}`} />
                </div>
                <p className="mt-4 text-[var(--ink)] text-sm leading-7">
                  {cfg.primer?.shortFact ?? cfg.subtitle}
                </p>
                <p className="mt-4 text-sm leading-7 text-[var(--ink2)]">
                  {cfg.primer?.whatMakesItDifferent ?? meta.profile?.note ?? cfg.note ?? cfg.subtitle}
                </p>
              </section>

              <section className="context-panel p-5">
                <div className="eyebrow">What to watch</div>
                <p className="mt-4 text-[var(--ink)] text-sm leading-7">
                  {chainFocus[chainId] ?? cfg.primer?.whatMakesItDifferent ?? cfg.subtitle}
                </p>
                <div className="mt-5 border-t border-[var(--line)] pt-4">
                  <div className="font-mono text-[10px] uppercase tracking-[.12em] text-[var(--gold)]">Brief driver</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink2)]">{briefPrimaryDriver}</p>
                </div>
                {cfg.primer?.whyUsersCare ? (
                  <div className="mt-4 border-t border-[var(--line)] pt-4">
                    <div className="font-mono text-[10px] uppercase tracking-[.12em] text-[var(--gold)]">Why users care</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink2)]">{cfg.primer.whyUsersCare}</p>
                  </div>
                ) : null}
              </section>
            </div>
          </div>

        </div>
      </header>

      <section className="border-b border-[var(--line)] py-8">
        <div className="page-shell">
          <SourceFreshnessExplainer chain={chainId} variant="chain" />
        </div>
      </section>

      <div className="page-shell" style={{ paddingTop: "56px", paddingBottom: "96px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "72px" }}>

        {/* ── Chain details ── */}
        {cfg.primer ? (
          <section className="border-t border-[var(--line)] pt-8">
            <div className="section-head">
              <div>
                <div className="eyebrow mb-3">Profile details</div>
                <h2 className="ua-h2">How {displayName} behaves</h2>
                <MoreLink id={`profile-${chainId}`} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <p className="text-[var(--ink)] text-base leading-7">{cfg.primer.shortFact}</p>
                <p className="text-[var(--ink2)] text-sm leading-7">{cfg.primer.whatMakesItDifferent}</p>
                <div>
                  <div className="eyebrow mb-3">Primary drivers</div>
                  {cfg.primer.primaryDrivers.map((d, i) => (
                    <div key={i} className="data-row" style={{ gridTemplateColumns: "1fr", padding: "12px 0" }}>
                      <p className="text-sm text-[var(--ink2)] m-0">{d}</p>
                    </div>
                  ))}
                </div>
                {cfg.primer.caveats && cfg.primer.caveats.length > 0 ? (
                  <div>
                    <div className="eyebrow mb-3">Caveats</div>
                    {cfg.primer.caveats.map((c, i) => (
                      <div key={i} className="data-row" style={{ gridTemplateColumns: "1fr", padding: "12px 0" }}>
                        <p className="text-sm text-[var(--ink2)] m-0">{c}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Charts ── */}
        <section>
          {!derivedPayload ? (
            <p className="text-sm text-[var(--ink2)]">No derived source found at <InlineCode>{derivedPath}</InlineCode>.</p>
          ) : charts.length === 0 ? (
            <p className="text-sm text-[var(--ink2)]">No chartable series found for the selected metrics.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "56px" }}>
              {charts.map((c, index) => (
                <section key={c.metric} id={`chart-${safeId(c.metric)}`} className="border-t border-[var(--line)] pt-8">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="eyebrow mb-2">Chart {index + 1}</div>
                      <h3 className="ua-h3">{c.metric}</h3>
                      <p className="text-sm text-[var(--ink2)] mt-2 max-w-xl">{topLineMetricNote(chainId, c.metric)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="font-mono text-[10px] text-[var(--ink3)] uppercase tracking-[.1em]">Units: {c.unitLabel ?? "—"}</div>
                      <nav className="flex flex-wrap gap-1.5" aria-label={`Window for ${c.metric}`}>
                        {([30, 90, 180, 365] as const).map((w) => {
                          const isActive = c.metricWindow === w;
                          const newParams = new URLSearchParams();
                          charts.forEach((other) => {
                            if (other.metric !== c.metric) newParams.set(other.paramKey, String(other.metricWindow));
                          });
                          newParams.set(c.paramKey, String(w));
                          return (
                            <Link key={w} href={`/chains/${chainId}?${newParams.toString()}#chart-${safeId(c.metric)}`} prefetch={false}
                              className={`ua-vf-tab ${isActive ? "is-active" : ""}`}>
                              {w}d
                            </Link>
                          );
                        })}
                      </nav>
                    </div>
                  </div>

                  <MetricLineChart
                    title={c.metric}
                    subtitle={`MA: ${c.mDerivedPath} · Raw: ${c.mGoldPath} · Window: ${utcMsToIsoDay(c.mBounds.minMs)} → ${utcMsToIsoDay(c.mBounds.maxMs)} (${c.metricWindow} calendar days)`}
                    unitLabel={c.unitLabel}
                    data={c.data}
                    windowDays={c.metricWindow}
                  />

                  <div className="mt-4 grid md:grid-cols-2 border-t border-[var(--line)]">
                    <div style={{ padding: "18px 24px 18px 0", borderBottom: "1px solid var(--line)" }}>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="font-mono text-[11px] text-[var(--gold)] uppercase tracking-[.12em]">How to read</span>
                        <MoreLink id={`chart-read-${safeId(chainId)}-${safeId(c.metric)}`} />
                      </div>
                      <p className="text-sm text-[var(--ink2)]">Use raw for day-to-day movement, MA7 for short smoothing, MA30 for broader baseline.</p>
                    </div>
                    <div style={{ padding: "18px 0 18px 24px", borderBottom: "1px solid var(--line)", borderLeft: "1px solid var(--line)" }}>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="font-mono text-[11px] text-[var(--gold)] uppercase tracking-[.12em]">Why shown</span>
                        <MoreLink id={`chart-why-${safeId(chainId)}-${safeId(c.metric)}`} />
                      </div>
                      <p className="text-sm text-[var(--ink2)]">{chartWhyShownOneLiner(c.metric, c.axis, regimeLabel)}</p>
                    </div>
                  </div>

                  <ExplainModal
                    id={`chart-read-${safeId(chainId)}-${safeId(c.metric)}`}
                    title={`How to read ${c.metric}`}
                    subtitle={<>Window <InlineCode>{String(c.metricWindow)}d</InlineCode> · Units <InlineCode>{c.unitLabel ?? "—"}</InlineCode></>}
                    pair={chartReadExplanation(c.metric, c.metricWindow, c.unitLabel)}
                    traceability={<ul className="list-disc pl-5"><li>MA: <InlineCode>{c.mDerivedPath}</InlineCode></li><li>Raw: <InlineCode>{c.mGoldPath}</InlineCode></li><li>Metric: <InlineCode>{c.metric}</InlineCode></li></ul>}
                  />
                  <ExplainModal
                    id={`chart-why-${safeId(chainId)}-${safeId(c.metric)}`}
                    title={`Why ${c.metric} is shown`}
                    pair={metricReasonExplanation(c.metric, c.axis, chainId, regimeLabel)}
                    traceability={<ul className="list-disc pl-5"><li>Metric: <InlineCode>{c.metric}</InlineCode></li><li>Axis: <InlineCode>{c.axis ?? "—"}</InlineCode></li></ul>}
                  />
                </section>
              ))}
            </div>
          )}
        </section>

        {/* ── Scorecard ── */}
        <section>
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Deeper decomposition</div>
              <h2 className="ua-h2">Scorecard</h2>
            </div>
            <div>
              <p className="text-[var(--ink2)] text-sm leading-7 max-w-xl">
                The scorecard breaks the present state into Demand, Friction, and Capacity. This is where to go when the top-line label feels too compressed or too blunt.
              </p>
              {meta.scorecard?.notes?.interpretation ? (
                <p className="mt-4 text-sm text-[var(--ink2)] border-l-2 border-[var(--line2)] pl-4">{meta.scorecard.notes.interpretation}</p>
              ) : null}
            </div>
          </div>

          {!dims ? (
            <p className="text-sm text-[var(--ink2)]">No scorecard dimensions found in <InlineCode>scorecard.dimensions</InlineCode>.</p>
          ) : (
            <div className="fact-row" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              {([
                { key: "demand" as const, label: "Demand", dim: dims.demand },
                { key: "friction" as const, label: "Friction", dim: dims.friction },
                { key: "capacity" as const, label: "Capacity", dim: dims.capacity },
              ]).map(({ key, label, dim }) => {
                const modalId = `scorecard-${safeId(chainId)}-${key}`;
                return (
                  <div key={key} className="fact-item">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <strong>{label}</strong>
                      <div className="flex items-center gap-2">
                        <span className="regime-token" style={{ color: "var(--ink2)" }}>{dim?.level ?? "—"}</span>
                        <MoreLink id={modalId} />
                      </div>
                    </div>
                    {typeof dim?.score === "number" && Number.isFinite(dim.score) ? (
                      <div className="flex justify-center mb-4">
                        <ScoreGauge score={dim.score} label={label} note={String(dim.level ?? "—")} />
                      </div>
                    ) : null}
                    <div className="text-center mb-4">
                      <span className="font-mono text-[28px] text-[var(--ink)]">{fmtScore100(dim?.score)}</span>
                      <span className="text-[var(--ink3)] text-sm ml-1">/ 100</span>
                    </div>
                    <div className="text-[12px] text-[var(--ink3)]">
                      Coverage: {fmtNum(dim?.coverage_factor, 3)} · Effective conf: {fmtNum(dim?.effective_confidence, 3)}
                    </div>
                    <ExplainModal
                      id={modalId}
                      title={`What ${label} means`}
                      subtitle={<>Source <InlineCode>{`scorecard.dimensions.${key}`}</InlineCode> · Level <InlineCode>{dim?.level ?? "—"}</InlineCode></>}
                      pair={scorecardAxisExplanation(key, dim)}
                      traceability={<ul className="list-disc pl-5"><li>Source: <InlineCode>{metaPath}</InlineCode></li><li>Coverage: <InlineCode>{fmtNum(dim?.coverage_factor, 3)}</InlineCode></li><li>Effective confidence: <InlineCode>{fmtNum(dim?.effective_confidence, 3)}</InlineCode></li></ul>}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Drivers ── */}
        <section>
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Evidence layer</div>
              <h2 className="ua-h2">Drivers</h2>
            </div>
            <p className="text-[var(--ink2)] text-sm leading-7 max-w-xl">
              Drivers are the &ldquo;because&rdquo; behind the visible regime. They show which published metrics are currently doing the most work in explaining the present state.
            </p>
          </div>

          {topDrivers.length === 0 ? (
            <p className="text-sm text-[var(--ink2)]">No drivers found in <InlineCode>regime.drivers[]</InlineCode>.</p>
          ) : (
            <div className="grid lg:grid-cols-2 gap-x-12">
              {topDrivers.map((d, index) => {
                const metricId = safeId(d.metric ?? `driver-${index}`);
                return (
                  <section key={`${d.metric}-${index}`} className="border-t border-[var(--line)] pt-6 pb-6">
                    <div className="flex items-start justify-between gap-3 mb-6">
                      <div>
                        <div className="eyebrow mb-1">{d.axis ?? "—"}</div>
                        <h3 className="ua-h3">{d.metric ?? "—"}</h3>
                      </div>
                      <span className="regime-token" style={{ color: "var(--c-heating)" }}>{d.trend ?? "—"}</span>
                    </div>

                    <div className="grid grid-cols-2 border-t border-[var(--line)]">
                      {([
                        { label: "Z robust", value: fmtNum(d.z_robust, 2), id: `driver-z-${metricId}` },
                        { label: "90d percentile", value: fmtPct0to100(d.pct_90d), id: `driver-pct-${metricId}` },
                        { label: "Momentum 7d vs 30d", value: fmtNum(d.momentum_7d_vs_30d, 3), id: `driver-mom-${metricId}` },
                        { label: "Current value", value: typeof d.current === "number" ? String(d.current) : "—", id: `driver-current-${metricId}` },
                      ]).map(({ label, value, id }) => (
                        <div key={id} className="border-b border-r border-[var(--line)] p-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-[10px] text-[var(--gold)] uppercase tracking-[.1em]">{label}</span>
                            <MoreLink id={id} />
                          </div>
                          <div className="font-mono text-[20px] text-[var(--ink)]">{value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 mt-2">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="font-mono text-[11px] text-[var(--ink3)] uppercase tracking-[.1em]">Why {d.metric ?? "this metric"} is shown</span>
                        <MoreLink id={`driver-why-${metricId}`} />
                      </div>
                      <p className="text-sm text-[var(--ink2)]">This row is being used as visible evidence for the current descriptive state.</p>
                      <p className="mt-2 font-mono text-[10px] text-[var(--ink3)]">
                        Source: <InlineCode>{metaPath}</InlineCode> → <InlineCode>regime.drivers[]</InlineCode>
                      </p>
                    </div>

                    <ExplainModal id={`driver-z-${metricId}`} title={`Robust z-score for ${d.metric ?? "metric"}`} pair={statExplanation("z", d.z_robust)} traceability={<div>Field: <InlineCode>regime.drivers[].z_robust</InlineCode></div>} />
                    <ExplainModal id={`driver-pct-${metricId}`} title={`90-day percentile for ${d.metric ?? "metric"}`} pair={statExplanation("pct", d.pct_90d)} traceability={<div>Field: <InlineCode>regime.drivers[].pct_90d</InlineCode></div>} />
                    <ExplainModal id={`driver-mom-${metricId}`} title={`Momentum for ${d.metric ?? "metric"}`} pair={statExplanation("mom", d.momentum_7d_vs_30d)} traceability={<div>Field: <InlineCode>regime.drivers[].momentum_7d_vs_30d</InlineCode></div>} />
                    <ExplainModal id={`driver-current-${metricId}`} title={`Current value for ${d.metric ?? "metric"}`} pair={statExplanation("current", d.current)} traceability={<div>Field: <InlineCode>regime.drivers[].current</InlineCode></div>} />
                    <ExplainModal
                      id={`driver-why-${metricId}`}
                      title={`Why ${d.metric ?? "this metric"} is shown`}
                      subtitle={<>Axis <InlineCode>{d.axis ?? "—"}</InlineCode> · Trend <InlineCode>{d.trend ?? "—"}</InlineCode></>}
                      pair={metricReasonExplanation(d.metric ?? "metric", d.axis, chainId, regimeLabel)}
                      traceability={<ul className="list-disc pl-5"><li>Source: <InlineCode>{metaPath}</InlineCode></li><li>Metric: <InlineCode>{d.metric ?? "—"}</InlineCode></li></ul>}
                    />
                  </section>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Data contract ── */}
        <section className="border-t border-[var(--line)] pt-8">
          <details>
            <summary className="eyebrow cursor-pointer">Data contract &amp; traceability</summary>
            <div className="mt-4 space-y-2 text-sm text-[var(--ink2)]">
              <div>Data source: <InlineCode>{currentDataSource()}</InlineCode></div>
              <div>Meta: <InlineCode>{metaPath}</InlineCode></div>
              <div>Gold: <InlineCode>{goldPath}</InlineCode></div>
              <div>Derived: <InlineCode>{derivedPath}</InlineCode></div>
              <div>Briefs: <InlineCode>{briefPath}</InlineCode></div>
              <div>Runtime chart points use observed published dates inside the selected window.</div>
            </div>
          </details>
        </section>

        {/* ── CTA ── */}
        <div className="border-y border-[var(--line)] py-6 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="eyebrow mb-2">Want the JSON behind these charts?</div>
            <p className="text-sm text-[var(--ink2)] max-w-lg">Every label here is backed by a determinism hash and a full confidence score. A subscription gives you API access to the complete Gold, Derived, Meta, and Briefs JSON layers.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up" className="btn-ghost">Sign up free</Link>
            <Link href="/#pricing" className="btn-primary">See plans</Link>
          </div>
        </div>

        </div>
      </div>

      {/* ── Global modals ── */}
      <ExplainModal id={`profile-${chainId}`} title={`${displayName} chain profile`} subtitle={<>Why this chain is interpreted the way it is on this page.</>} pair={chainProfilePair} traceability={<ul className="list-disc pl-5"><li>Chain: <InlineCode>{chainId}</InlineCode></li><li>Profile label: <InlineCode>{meta.profile?.label ?? displayName}</InlineCode></li></ul>} />
      <ExplainModal id={`read-order-${chainId}`} title="Why this reading order is recommended" pair={readOrderExplanation()} traceability={<ul className="list-disc pl-5"><li>Freshness: <InlineCode>confidence.lag_days_vs_utc_today</InlineCode></li><li>Confidence: <InlineCode>confidence.confidence_score</InlineCode></li><li>Regime: <InlineCode>status.label</InlineCode></li></ul>} />
      <ExplainModal id={`regime-${chainId}`} title="What regime means" subtitle={<>Current label: <InlineCode>{regimeLabel}</InlineCode></>} pair={regimeExplanation(regimeLabel)} traceability={<ul className="list-disc pl-5"><li>Source: <InlineCode>{metaPath}</InlineCode></li><li>Field: <InlineCode>status.label</InlineCode></li></ul>} />
      <ExplainModal id={`confidence-${chainId}`} title="What confidence means" subtitle={<>Band: <InlineCode>{confBand}</InlineCode></>} pair={confidenceExplanation(conf, meta.confidence?.data_quality_score, meta.confidence?.label_confidence_score)} traceability={<ul className="list-disc pl-5"><li>Source: <InlineCode>{metaPath}</InlineCode></li><li>Score: <InlineCode>{fmtNum(conf, 3)}</InlineCode></li></ul>} />
      <ExplainModal id={`asof-${chainId}`} title="What data as-of means" pair={asOfExplanation(asOf)} traceability={<ul className="list-disc pl-5"><li>Visible date: <InlineCode>{fmtDate(asOf)}</InlineCode></li><li>Hero path: <InlineCode>{heroPath}</InlineCode></li></ul>} />
      <ExplainModal id={`lag-${chainId}`} title="What observed lag means" pair={lagExplanation(meta.confidence?.lag_days_vs_utc_today)} traceability={<ul className="list-disc pl-5"><li>Field: <InlineCode>confidence.lag_days_vs_utc_today</InlineCode></li><li>Value: <InlineCode>{typeof meta.confidence?.lag_days_vs_utc_today === "number" ? `${meta.confidence.lag_days_vs_utc_today}d` : "—"}</InlineCode></li></ul>} />
      <ExplainModal id={`determinism-${chainId}`} title="What determinism means" pair={determinismExplanation(meta.regime?.determinism_hash, meta.regime?.window_days ?? meta.scorecard?.window_days)} traceability={<ul className="list-disc pl-5"><li>Hash: <InlineCode>{meta.regime?.determinism_hash ?? "—"}</InlineCode></li><li>Window: <InlineCode>{String(meta.regime?.window_days ?? meta.scorecard?.window_days ?? "—")}</InlineCode></li></ul>} />
    </main>
  );
}
