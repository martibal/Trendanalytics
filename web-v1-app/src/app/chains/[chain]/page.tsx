// src/app/chains/[chain]/page.tsx
import type { ReactNode } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import ChainIcon from "@/components/ChainIcon";
import ExplainModal from "@/components/ExplainModal";
import MetricLineChart, { type MetricPoint } from "@/components/MetricLineChart";
import RegimeBadge from "@/components/RegimeBadge";
import ScoreGauge from "@/components/ui/ScoreGauge";
import StalenessBar from "@/components/ui/StalenessBar";
import WindowSelector from "@/components/ui/WindowSelector";
import { getChainConfig, type ChainId } from "@/config/chains";
import { getUnitLabel } from "@/config/units";
import {
  asOfExplanation,
  chainProfileExplanation,
  chartHowToReadExplanation,
  chartWhyShownExplanation,
  confidenceExplanation,
  determinismExplanation,
  driverMetricExplanation,
  driverStatExplanation,
  driversOverviewExplanation,
  getConfidenceNoticeCopy,
  interpretationMapExplanation,
  lagExplanation,
  regimeExplanation,
  scorecardAxisExplanation,
  scorecardOverviewExplanation,
} from "@/lib/chains/pageExplanations";
import type { ExplainContent } from "@/lib/chains/pageExplanations";
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

type ScorecardDimension = {
  score?: number;
  level?: string;
  coverage_factor?: number;
  effective_confidence?: number;
};

type MetaLatest = {
  chain?: string;
  date?: string;
  updated_through?: string;
  methodology_version?: string;
  publish_lag_days_policy?: number;

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
      demand?: ScorecardDimension;
      friction?: ScorecardDimension;
      capacity?: ScorecardDimension;
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

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

function fmtDate(d?: string) {
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

function confidenceBand(v?: number) {
  if (typeof v !== "number") return "—";
  if (v >= 0.7) return "Good";
  if (v >= 0.4) return "Caution";
  return "Degraded";
}

function confidenceToneClass(v?: number) {
  const band = confidenceBand(v);
  if (band === "Good") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (band === "Caution") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  if (band === "Degraded") return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  return "border-white/10 bg-white/5 text-slate-200";
}

function sortDrivers(drivers: Driver[]) {
  return [...drivers].sort((a, b) => Math.abs(b.z_robust ?? 0) - Math.abs(a.z_robust ?? 0));
}

function guessMetricKeysForChain(chain: string): string[] {
  switch (chain) {
    case "bitcoin":
      return ["tx_count_daily", "median_tx_fee_native", "avg_block_time_sec", "block_count_daily"];
    default:
      return [
        "tx_count_daily",
        "unique_active_addresses",
        "gas_utilization_pct",
        "failed_tx_rate",
        "median_gas_price",
        "median_fee_native",
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
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return null;
  return Date.UTC(y, m - 1, day);
}

function utcMsToIsoDay(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDerivedByDate(rows: DerivedRow[]) {
  const out = new Map<string, DerivedRow>();
  for (const row of rows) {
    if (typeof row.date === "string") out.set(row.date, row);
  }
  return out;
}

function buildGoldByDate(rows: GoldRow[]) {
  const out = new Map<string, GoldRow>();
  for (const row of rows) {
    if (typeof row.date === "string") out.set(row.date, row);
  }
  return out;
}

function maxDateMsFromRows<T extends { date?: string }>(rows: T[]): number | null {
  let max: number | null = null;
  for (const row of rows) {
    const ms = parseIsoDayToUtcMs(row.date);
    if (ms === null) continue;
    if (max === null || ms > max) max = ms;
  }
  return max;
}

function computeBoundsFromMax(maxMs: number, days: number) {
  return { minMs: maxMs - (days - 1) * 24 * 60 * 60 * 1000, maxMs };
}

function listDays(bounds: { minMs: number; maxMs: number }): string[] {
  const out: string[] = [];
  for (let ms = bounds.minMs; ms <= bounds.maxMs; ms += 24 * 60 * 60 * 1000) {
    out.push(utcMsToIsoDay(ms));
  }
  return out;
}

function readGoldMetric(row: GoldRow | undefined, metric: string): number | null {
  if (!row) return null;

  const direct = toNumberOrNull(row[metric]);
  if (direct !== null) return direct;

  const metrics = asRecord(row.metrics);
  const gold = asRecord(row.gold);
  const goldMetrics = gold ? asRecord(gold.metrics) : null;
  const features = asRecord(row.features);
  const data = asRecord(row.data);
  const values = asRecord(row.values);

  const candidates = [
    metrics?.[metric],
    goldMetrics?.[metric],
    features?.[metric],
    data?.[metric],
    values?.[metric],
  ];

  for (const candidate of candidates) {
    const n = toNumberOrNull(candidate);
    if (n !== null) return n;
  }

  return null;
}

function buildChartDataDense(params: {
  bounds: { minMs: number; maxMs: number };
  derivedByDate: Map<string, DerivedRow>;
  goldByDate: Map<string, GoldRow>;
  metric: string;
}): MetricPoint[] {
  const { bounds, derivedByDate, goldByDate, metric } = params;
  const ma7Key = `${metric}__ma7`;
  const ma30Key = `${metric}__ma30`;

  const points: MetricPoint[] = [];
  for (let ms = bounds.minMs; ms <= bounds.maxMs; ms += 24 * 60 * 60 * 1000) {
    const date = utcMsToIsoDay(ms);
    const derivedRow = derivedByDate.get(date);
    const metrics = derivedRow?.derived?.metrics ?? {};
    const goldRow = goldByDate.get(date);

    points.push({
      date,
      value: readGoldMetric(goldRow, metric),
      ma7: toNumberOrNull(metrics[ma7Key]),
      ma30: toNumberOrNull(metrics[ma30Key]),
    });
  }

  return points;
}

function normalizeWindow(q?: string): 30 | 90 | 180 | 365 {
  const n = Number(q);
  if (n === 30 || n === 90 || n === 180 || n === 365) return n;
  return 365;
}

function chainAccentClasses(chainId: string) {
  switch (chainId) {
    case "bitcoin":
      return {
        glow: "from-amber-400/25 via-orange-400/10 to-transparent",
        border: "border-amber-400/20",
        chip: "border-amber-400/30 bg-amber-400/10 text-amber-100",
      };
    case "ethereum":
      return {
        glow: "from-indigo-400/25 via-violet-400/10 to-transparent",
        border: "border-indigo-400/20",
        chip: "border-indigo-400/30 bg-indigo-400/10 text-indigo-100",
      };
    case "arbitrum":
      return {
        glow: "from-sky-400/25 via-cyan-400/10 to-transparent",
        border: "border-sky-400/20",
        chip: "border-sky-400/30 bg-sky-400/10 text-sky-100",
      };
    case "base":
      return {
        glow: "from-blue-500/25 via-cyan-400/10 to-transparent",
        border: "border-blue-500/20",
        chip: "border-blue-400/30 bg-blue-400/10 text-blue-100",
      };
    default:
      return {
        glow: "from-cyan-400/20 via-cyan-400/10 to-transparent",
        border: "border-cyan-400/20",
        chip: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
      };
  }
}

function PremiumCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-900/80 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.65)] backdrop-blur-sm",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function SnapshotCard({
  label,
  value,
  aside,
  more,
}: {
  label: string;
  value: ReactNode;
  aside?: ReactNode;
  more?: ReactNode;
}) {
  return (
    <PremiumCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</div>
        {more}
      </div>
      <div className="mt-4 text-3xl font-semibold text-white">{value}</div>
      {aside ? <div className="mt-3 text-sm leading-6 text-slate-300">{aside}</div> : null}
    </PremiumCard>
  );
}

function DriverStatChip({
  label,
  value,
  more,
}: {
  label: string;
  value: ReactNode;
  more?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
        {more}
      </div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
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
  const requestedWindow = normalizeWindow((searchParams ? await searchParams : undefined)?.window);
  const effectiveWindowDays = requestedWindow;

  const metaPath = `meta/${chainId}/latest.json`;
  const goldPath = `gold/${chainId}/last${effectiveWindowDays}d.json`;
  const derivedPath = `derived/${chainId}/last${effectiveWindowDays}d.json`;

  const [meta, goldPayload, derivedPayload] = await Promise.all([
    readPublishedJson<MetaLatest>(metaPath),
    readPublishedJson<GoldRow[] | { rows?: GoldRow[] }>(goldPath),
    readPublishedJson<DerivedRow[] | { rows?: DerivedRow[] }>(derivedPath),
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
    meta.updated_through ?? meta.regime?.asof_date ?? meta.scorecard?.asof_date ?? meta.date
  );
  const maxMs = maxDerived ?? maxGold ?? maxFromMeta;
  if (maxMs === null) return notFound();

  const bounds = computeBoundsFromMax(maxMs, effectiveWindowDays);
  const dayList = listDays(bounds);

  const derivedByDate = buildDerivedByDate(derivedRows);
  const goldByDate = buildGoldByDate(goldRows);

  const missingDays = dayList.filter((d) => !derivedByDate.has(d) || !goldByDate.has(d));
  if (missingDays.length > 0) {
    const dailyResults = await Promise.all(
      missingDays.map(async (d) => {
        const [dr, gr] = await Promise.all([
          derivedByDate.has(d) ? Promise.resolve(null) : readPublishedJson<DerivedRow>(`derived/${chainId}/${d}.json`),
          goldByDate.has(d) ? Promise.resolve(null) : readPublishedJson<GoldRow>(`gold/${chainId}/${d}.json`),
        ]);
        return { date: d, derived: dr, gold: gr };
      })
    );
    for (const row of dailyResults) {
      if (row.derived && typeof row.derived.date === "string") derivedByDate.set(row.date, row.derived);
      if (row.gold && typeof row.gold.date === "string") goldByDate.set(row.date, row.gold);
    }
  }

  const displayName = meta.profile?.label ?? cfg.name;
  const asOf =
    meta.updated_through ??
    meta.regime?.asof_date ??
    meta.scorecard?.asof_date ??
    meta.date ??
    meta.confidence?.date;

  const regimeLabel = meta.status?.label ?? meta.regime?.label ?? "UNKNOWN/DEGRADED";
  const oneLiner = meta.status?.one_liner ?? null;
  const confidenceValue = meta.confidence?.confidence_score;
  const confidenceTier = confidenceBand(confidenceValue);
  const confidenceNotice = getConfidenceNoticeCopy(confidenceTier);
  const driversAll = Array.isArray(meta.regime?.drivers) ? sortDrivers(meta.regime.drivers) : [];
  const dims = meta.scorecard?.dimensions;
  const hidden = new Set((meta.profile?.hidden_metrics ?? cfg.hiddenMetrics ?? []).map(String));

  const driverMetrics = driversAll
    .map((d) => d.metric)
    .filter((m): m is string => typeof m === "string" && m.trim().length > 0);

  const candidates = Array.from(new Set([...driverMetrics, ...guessMetricKeysForChain(chainId)]))
    .filter((metric) => !hidden.has(metric))
    .slice(0, 6);

  const charts = candidates
    .filter((metric) => {
      const ma7Key = `${metric}__ma7`;
      const ma30Key = `${metric}__ma30`;
      for (const date of dayList) {
        const drow = derivedByDate.get(date);
        const metrics = drow?.derived?.metrics;
        const grow = goldByDate.get(date);
        if (metrics && (ma7Key in metrics || ma30Key in metrics)) return true;
        if (readGoldMetric(grow, metric) !== null) return true;
      }
      return false;
    })
    .map((metric) => ({
      metric,
      unitLabel: getUnitLabel(chainId, metric) ?? undefined,
      data: buildChartDataDense({ bounds, derivedByDate, goldByDate, metric }),
    }));

  const accent = chainAccentClasses(chainId);

  const scorecardDims = [
    { key: "demand", label: "Demand", dim: dims?.demand },
    { key: "friction", label: "Friction", dim: dims?.friction },
    { key: "capacity", label: "Capacity", dim: dims?.capacity },
  ] as const;


  function buildChartModalContent(metric: string, unitLabel?: string): ExplainContent {
    const how = chartHowToReadExplanation(metric, effectiveWindowDays, unitLabel);
    const why = chartWhyShownExplanation(metric, chainId);

    return {
      title: `${metric}`,
      subtitle: `How to read this chart and why it is shown.`,
      basic: (
        <>
          <section className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              How to read
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-slate-200">
              {how.basic}
            </div>
          </section>

          <section className="space-y-3 pt-2">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Why this chart is shown
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-slate-200">
              {why.basic}
            </div>
          </section>
        </>
      ),
      advanced: (
        <>
          <section className="space-y-3">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              How to read
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-slate-200">
              {how.advanced}
            </div>
          </section>

          <section className="space-y-3 pt-2">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Why this chart is shown
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-slate-200">
              {why.advanced}
            </div>
          </section>
        </>
      ),
      traceability: (
        <div className="space-y-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">How to read traceability</div>
            <div className="mt-2">{how.traceability ?? null}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Why shown traceability</div>
            <div className="mt-2">{why.traceability ?? null}</div>
          </div>
        </div>
      ),
    };
  }

  return (
    <main className="relative mx-auto max-w-7xl overflow-hidden px-6 py-10">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b ${accent.glow}`} />
      <div className="pointer-events-none absolute right-0 top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

      <StalenessBar
        chain={chainId}
        lagDays={meta.confidence?.lag_days_vs_utc_today}
        asOfDate={asOf}
        confidenceScore={confidenceValue}
      />

      {confidenceNotice ? (
        <section
          className={[
            "mb-6 rounded-2xl border px-4 py-4 text-sm shadow-[0_12px_40px_-24px_rgba(15,23,42,0.6)]",
            confidenceNotice.tone === "degraded"
              ? "border-rose-400/20 bg-rose-500/10 text-rose-50"
              : "border-amber-400/20 bg-amber-500/10 text-amber-50",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-medium">{confidenceNotice.title}</div>
              <p className="mt-1 max-w-4xl text-slate-200">{confidenceNotice.body}</p>
            </div>
            <div className="text-xs text-slate-300">
              Source: <InlineCode>confidence.confidence_score</InlineCode>
              {typeof confidenceValue === "number" ? <> · Current value <span className="font-medium text-white">{confidenceValue.toFixed(3)}</span></> : null}
            </div>
          </div>
        </section>
      ) : null}

      <PremiumCard className={`relative overflow-hidden border ${accent.border} p-7`}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-4">
                  <ChainIcon chain={chainId} className="h-14 w-14 text-base" label={`${displayName} icon`} />
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Chain page</div>
                    <h1 className="mt-1 text-4xl font-semibold tracking-tight text-white">{displayName}</h1>
                  </div>
                </div>
                <div className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                  {oneLiner ?? "Published chain state, evidence strength, structural scorecard, and chart context in one descriptive view."}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${accent.chip}`}>{chainId.toUpperCase()}</span>
                <Link
                  href={`/chains/${chainId}/history`}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Track record
                </Link>
                <ExplainModal
                  content={chainProfileExplanation(chainId, displayName, meta.profile?.note ?? null)}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span>Data as of <span className="font-medium text-white">{fmtDate(asOf)}</span></span>
              {typeof meta.confidence?.lag_days_vs_utc_today === "number" ? (
                <span>· Lag <span className="font-medium text-white">{meta.confidence.lag_days_vs_utc_today}d</span></span>
              ) : null}
              {typeof meta.publish_lag_days_policy === "number" ? (
                <span>· Expected publish lag <span className="font-medium text-white">{meta.publish_lag_days_policy}d</span></span>
              ) : null}
              {meta.methodology_version ? (
                <span>· Methodology <span className="font-medium text-white">{meta.methodology_version}</span></span>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-inner shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Fast interpretation map</div>
              <ExplainModal content={interpretationMapExplanation()} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {[
                ["1", "Regime"],
                ["2", "Confidence"],
                ["3", "Freshness"],
                ["4", "Charts"],
                ["5", "Drivers"],
              ].map(([step, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Step {step}</div>
                  <div className="mt-1 text-sm font-medium text-white">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PremiumCard>

      <section className="mt-8 grid gap-4 lg:grid-cols-5">
        <SnapshotCard
          label="Published regime"
          value={<RegimeBadge label={regimeLabel} />}
          aside={
            <div className="space-y-2">
              <div>{oneLiner ?? "Top-level published state for the chain."}</div>
            </div>
          }
          more={<ExplainModal content={regimeExplanation(regimeLabel)} />}
        />

        <SnapshotCard
          label="Confidence"
          value={
            <div className="flex items-center gap-3">
              <span>{fmtNum(confidenceValue, 2)}</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs ${confidenceToneClass(confidenceValue)}`}>{confidenceTier}</span>
            </div>
          }
          aside={
            <div>
              Evidence support for the current state, separate from freshness.
            </div>
          }
          more={
            <ExplainModal
              content={confidenceExplanation(
                meta.confidence?.confidence_score,
                meta.confidence?.data_quality_score,
                meta.confidence?.label_confidence_score
              )}
            />
          }
        />

        <SnapshotCard
          label="Data as of"
          value={fmtDate(asOf)}
          aside={<div>The effective date of the currently displayed row.</div>}
          more={<ExplainModal content={asOfExplanation(asOf)} />}
        />

        <SnapshotCard
          label="Observed lag"
          value={typeof meta.confidence?.lag_days_vs_utc_today === "number" ? `${meta.confidence.lag_days_vs_utc_today}d` : "—"}
          aside={<div>Freshness context relative to today.</div>}
          more={<ExplainModal content={lagExplanation(meta.confidence?.lag_days_vs_utc_today, chainId)} />}
        />

        <SnapshotCard
          label="Determinism"
          value={
            <span className="font-mono text-xl">
              {typeof meta.regime?.determinism_hash === "string"
                ? `${meta.regime.determinism_hash.slice(0, 10)}…`
                : "—"}
            </span>
          }
          aside={
            <div>
              Window days{" "}
              <span className="font-medium text-white">
                {typeof meta.regime?.window_days === "number"
                  ? meta.regime.window_days
                  : typeof meta.scorecard?.window_days === "number"
                  ? meta.scorecard.window_days
                  : "—"}
              </span>
            </div>
          }
          more={<ExplainModal content={determinismExplanation(meta.regime?.determinism_hash, meta.regime?.window_days ?? meta.scorecard?.window_days)} />}
        />
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Window</div>
            <h2 className="mt-1 text-2xl font-semibold text-white">Charts</h2>
          </div>
          <WindowSelector
            activeKey={String(requestedWindow)}
            ariaLabel="Chart window selector"
            options={[
              { key: "30", label: "30d", href: `/chains/${chainId}?window=30` },
              { key: "90", label: "90d", href: `/chains/${chainId}?window=90` },
              { key: "180", label: "180d", href: `/chains/${chainId}?window=180` },
              { key: "365", label: "365d", href: `/chains/${chainId}?window=365` },
            ]}
          />
        </div>

        {charts.length === 0 ? (
          <PremiumCard className="p-6 text-sm text-slate-300">
            No chartable metrics were found in the selected published window.
          </PremiumCard>
        ) : (
          <div className="space-y-6">
            {charts.map((chart) => (
              <PremiumCard key={chart.metric} className="overflow-hidden p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Metric</div>
                    <div className="mt-1 text-xl font-semibold text-white">{chart.metric}</div>
                    <div className="mt-2 text-sm text-slate-300">
                      Window {utcMsToIsoDay(bounds.minMs)} → {utcMsToIsoDay(bounds.maxMs)} · Unit {chart.unitLabel ?? "—"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ExplainModal content={buildChartModalContent(chart.metric, chart.unitLabel)} />
                  </div>
                </div>

                <MetricLineChart
                  title={chart.metric}
                  subtitle={`MA: ${derivedPath} · Raw: ${goldPath} · Window: ${utcMsToIsoDay(bounds.minMs)} → ${utcMsToIsoDay(bounds.maxMs)} (${effectiveWindowDays} calendar days)`}
                  unitLabel={chart.unitLabel}
                  data={chart.data}
                  windowDays={effectiveWindowDays}
                />
              </PremiumCard>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Structure</div>
            <h2 className="mt-1 text-2xl font-semibold text-white">Scorecard</h2>
          </div>
          <ExplainModal content={scorecardOverviewExplanation(chainId)} />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {scorecardDims.map(({ key, label, dim }) => (
            <PremiumCard key={key} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                      {dim?.level ?? "—"}
                    </span>
                  </div>
                </div>
                <ExplainModal
                  content={scorecardAxisExplanation(
                    label,
                    dim?.level,
                    dim?.score,
                    dim?.coverage_factor,
                    dim?.effective_confidence
                  )}
                />
              </div>

              <div className="mt-4 flex items-center justify-center">
                {typeof dim?.score === "number" && Number.isFinite(dim.score) ? (
                  <ScoreGauge score={dim.score} label={label} note={String(dim.level ?? "—")} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-6 py-8 text-sm text-slate-400">
                    Score not available
                  </div>
                )}
              </div>

              <div className="mt-4 text-3xl font-semibold text-white">
                {fmtScore100(dim?.score)}
                <span className="ml-2 text-sm font-normal text-slate-400">/ 100</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Coverage</div>
                  <div className="mt-2 text-lg font-semibold text-white">{fmtNum(dim?.coverage_factor, 3)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Effective conf</div>
                  <div className="mt-2 text-lg font-semibold text-white">{fmtNum(dim?.effective_confidence, 3)}</div>
                </div>
              </div>
            </PremiumCard>
          ))}
        </div>

        {meta.scorecard?.notes?.interpretation ? (
          <PremiumCard className="relative z-0 mt-5 p-5">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Published interpretation note</div>
            <div className="mt-3 text-sm leading-7 text-slate-200">{meta.scorecard.notes.interpretation}</div>
          </PremiumCard>
        ) : null}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Explanation layer</div>
            <h2 className="mt-1 text-2xl font-semibold text-white">Drivers</h2>
          </div>
          <ExplainModal content={driversOverviewExplanation(chainId)} />
        </div>

        {driversAll.length === 0 ? (
          <PremiumCard className="p-6 text-sm text-slate-300">
            No published driver rows were found in <InlineCode>regime.drivers[]</InlineCode>.
          </PremiumCard>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {driversAll.map((driver, index) => (
              <PremiumCard key={`${driver.metric ?? "driver"}-${index}`} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                        {driver.axis ?? "—"}
                      </span>
                      {driver.trend ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                          {driver.trend}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 text-xl font-semibold text-white">{driver.metric ?? "—"}</div>
                  </div>
                  <ExplainModal content={driverMetricExplanation(driver.metric, driver.axis, chainId)} />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <DriverStatChip
                    label="z_robust"
                    value={fmtNum(driver.z_robust, 2)}
                    more={<ExplainModal buttonLabel="More" className="px-2 py-0.5 text-[10px]" content={driverStatExplanation("z_robust", driver.z_robust, driver.metric)} />}
                  />
                  <DriverStatChip
                    label="pct_90d"
                    value={fmtPct0to100(driver.pct_90d)}
                    more={<ExplainModal buttonLabel="More" className="px-2 py-0.5 text-[10px]" content={driverStatExplanation("pct_90d", driver.pct_90d, driver.metric)} />}
                  />
                  <DriverStatChip
                    label="momentum"
                    value={fmtNum(driver.momentum_7d_vs_30d, 3)}
                    more={<ExplainModal buttonLabel="More" className="px-2 py-0.5 text-[10px]" content={driverStatExplanation("momentum_7d_vs_30d", driver.momentum_7d_vs_30d, driver.metric)} />}
                  />
                  <DriverStatChip
                    label="current"
                    value={typeof driver.current === "number" ? String(driver.current) : "—"}
                    more={<ExplainModal buttonLabel="More" className="px-2 py-0.5 text-[10px]" content={driverStatExplanation("current", driver.current, driver.metric)} />}
                  />
                </div>
              </PremiumCard>
            ))}
          </div>
        )}
      </section>

      <details className="mt-10 rounded-3xl border border-white/10 bg-slate-950/80 p-5 text-sm text-slate-300">
        <summary className="cursor-pointer select-none text-sm font-medium text-white">
          Runtime data contract and traceability
        </summary>
        <div className="mt-4 grid gap-2">
          <div>Data source: <InlineCode>{currentDataSource()}</InlineCode></div>
          <div>Meta path: <InlineCode>{metaPath}</InlineCode></div>
          <div>Gold path: <InlineCode>{goldPath}</InlineCode></div>
          <div>Derived path: <InlineCode>{derivedPath}</InlineCode></div>
          <div>No alternate-window fallback.</div>
          <div>Dense chart assembly preserves the full selected calendar window and only supplements missing dates with canonical per-day files.</div>
        </div>
      </details>
    </main>
  );
}
