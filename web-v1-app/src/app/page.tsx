import type { ReactNode } from "react";
import Link from "next/link";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import { readStorageObject } from "@/lib/storage";
import { loadSiteBriefBundle } from "@/lib/briefs/loadSiteBriefBundle";
import type {
  RegimeLabel,
  SiteBriefBundle,
  SiteBriefChain,
  SiteBriefSeries,
  SiteBriefSeriesDay,
} from "@/lib/briefs/types";

import "server-only";

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

type MetaLatest = {
  date?: string;
  updated_through?: string;
  status?: {
    label?: string;
    one_liner?: string;
  };
  regime?: {
    asof_date?: string;
    drivers?: Array<{ metric?: string; axis?: string; trend?: string; pct_90d?: number; z_robust?: number }>;
  };
  confidence?: {
    confidence_score?: number | null;
    lag_days_vs_utc_today?: number | null;
  };
};

type LatestContextRow = {
  chain: ChainId;
  shortLabel: string;
  name: string;
  icon: string;
  label: RegimeLabel;
  confidence: number | null;
  updatedThrough: string | null;
  oneLiner: string;
  days: SiteBriefSeriesDay[];
};

type JsonLayer = "gold" | "derived" | "meta" | "brief";

type JsonSample = {
  layer: JsonLayer;
  chain: ChainId;
  date: string | null;
  path: string;
  code: string;
};

const CHAIN_ORDER: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];
const SAMPLE_CHAIN: ChainId = "bitcoin";

const REGIME_COLORS: Record<RegimeLabel, { text: string; border: string; bg: string; dot: string }> = {
  STABLE: { text: "text-[#10B981]", border: "border-[#10B981]/55", bg: "bg-[#10B981]/10", dot: "bg-[#10B981]" },
  HEATING: { text: "text-[#F59E0B]", border: "border-[#F59E0B]/60", bg: "bg-[#F59E0B]/10", dot: "bg-[#F59E0B]" },
  CONGESTED: { text: "text-[#F43F5E]", border: "border-[#F43F5E]/60", bg: "bg-[#F43F5E]/10", dot: "bg-[#F43F5E]" },
  CHEAP: { text: "text-[#0EA5E9]", border: "border-[#0EA5E9]/60", bg: "bg-[#0EA5E9]/10", dot: "bg-[#0EA5E9]" },
  "UNKNOWN/DEGRADED": { text: "text-[#64748B]", border: "border-[#64748B]", bg: "bg-[#64748B]/12", dot: "bg-[#64748B]" },
};

const DARK_REGIME_COLORS: Record<RegimeLabel, { text: string; border: string; bg: string; stroke: string }> = {
  STABLE: { text: "text-[#10B981]", border: "border-[#10B981]/45", bg: "bg-[#10B981]/10", stroke: "#10B981" },
  HEATING: { text: "text-[#F59E0B]", border: "border-[#F59E0B]/45", bg: "bg-[#F59E0B]/10", stroke: "#F59E0B" },
  CONGESTED: { text: "text-[#F43F5E]", border: "border-[#F43F5E]/45", bg: "bg-[#F43F5E]/10", stroke: "#F43F5E" },
  CHEAP: { text: "text-[#0EA5E9]", border: "border-[#0EA5E9]/45", bg: "bg-[#0EA5E9]/10", stroke: "#0EA5E9" },
  "UNKNOWN/DEGRADED": { text: "text-[#94A3B8]", border: "border-[#64748B]/60", bg: "bg-[#64748B]/14", stroke: "#64748B" },
};


const RAW_METRICS: Array<{ metric: string; value: string; d1: string; d7: string }> = [
  { metric: "active_addresses", value: "478,231", d1: "+18%", d7: "+34%" },
  { metric: "transactions", value: "1.24M", d1: "+12%", d7: "+28%" },
  { metric: "fees_native", value: "3.421", d1: "+32%", d7: "+45%" },
  { metric: "contract_calls", value: "5.60M", d1: "+9%", d7: "+22%" },
  { metric: "gas_used", value: "12.6B", d1: "+14%", d7: "+31%" },
  { metric: "blob_tx", value: "21,134", d1: "+41%", d7: "+67%" },
];

const VOCABULARY: Array<{ label: RegimeLabel; title: string; body: string }> = [
  { label: "STABLE", title: "Normal, balanced conditions", body: "No meaningful chain-relative stress or acceleration." },
  { label: "HEATING", title: "Activity building", body: "Demand or activity is running above baseline." },
  { label: "CONGESTED", title: "Friction or capacity pressure", body: "Fees, utilization, or pressure indicators are elevated." },
  { label: "CHEAP", title: "Lower-friction conditions", body: "Fee or friction evidence is below recent baseline." },
  { label: "UNKNOWN/DEGRADED", title: "Insufficient support", body: "Data quality or evidence is not strong enough to label confidently." },
];

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(path: string): Promise<T | null> {
  const result = await readStorageObject(path);
  if (!result) return null;

  try {
    return JSON.parse(arrayBufferToUtf8(result.body)) as T;
  } catch {
    return null;
  }
}

function coerceRegimeLabel(value: unknown): RegimeLabel {
  const normalized = String(value ?? "UNKNOWN/DEGRADED").toUpperCase();
  if (normalized === "STABLE") return "STABLE";
  if (normalized === "HEATING") return "HEATING";
  if (normalized === "CONGESTED") return "CONGESTED";
  if (normalized === "CHEAP") return "CHEAP";
  return "UNKNOWN/DEGRADED";
}

function formatConfidence(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const pct = Math.abs(value) <= 1 ? value * 100 : value;
  return `${Math.round(Math.max(0, Math.min(100, pct)))}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function heroDisplayAsOf(hero?: LandingHero | null): string | null {
  return (
    hero?.display_asof ??
    hero?.asof?.display ??
    hero?.asof?.latest_available ??
    hero?.asof?.gold ??
    hero?.asof?.derived ??
    hero?.asof?.meta ??
    null
  );
}

function seriesFor(bundle: SiteBriefBundle | null, chain: ChainId): SiteBriefSeriesDay[] {
  return bundle?.series_30d.find((series) => series.chain === chain)?.days ?? [];
}

function chainBrief(bundle: SiteBriefBundle | null, chain: ChainId): SiteBriefChain | null {
  return bundle?.chains.find((item) => item.chain === chain) ?? null;
}

function sparklinePath(days: SiteBriefSeriesDay[], width = 116, height = 32): string {
  const usable = days.slice(-14).filter((day) => typeof day.confidence_score === "number");
  if (usable.length < 2) return "";

  const values = usable.map((day) => Math.max(0, Math.min(1, day.confidence_score ?? 0)));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function sparklineStroke(row: LatestContextRow): string {
  return DARK_REGIME_COLORS[row.label]?.stroke ?? "#93c5fd";
}

async function buildLatestContextRows(bundle: SiteBriefBundle | null): Promise<LatestContextRow[]> {
  const rows = await Promise.all(
    CHAIN_ORDER.map(async (chainId) => {
      const chain = CHAIN_LIST.find((item) => item.id === chainId)!;
      const [meta, hero] = await Promise.all([
        readPublishedJson<MetaLatest>(`data/published/v1/meta/${chainId}/latest.json`),
        readPublishedJson<LandingHero>(`data/published/v1/landing/${chainId}/hero.json`),
      ]);
      const brief = chainBrief(bundle, chainId);
      const days = seriesFor(bundle, chainId);
      const latestSeriesDay = days.at(-1);
      const label = coerceRegimeLabel(meta?.status?.label ?? brief?.label ?? latestSeriesDay?.label);
      const confidence =
        typeof meta?.confidence?.confidence_score === "number"
          ? meta.confidence.confidence_score
          : brief?.confidence?.latest ?? latestSeriesDay?.confidence_score ?? null;
      const updatedThrough = heroDisplayAsOf(hero) ?? meta?.updated_through ?? meta?.date ?? brief?.updated_through ?? null;

      return {
        chain: chainId,
        shortLabel: chain.label,
        name: chain.name,
        icon: chain.icon,
        label,
        confidence,
        updatedThrough,
        oneLiner:
          meta?.status?.one_liner ??
          brief?.headline ??
          "Published context available for this chain.",
        days,
      } satisfies LatestContextRow;
    }),
  );

  return rows;
}

function compactOneLiner(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 84) return cleaned;
  return `${cleaned.slice(0, 81).trim()}…`;
}

function jsonExcerpt(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .split("\n")
    .slice(0, 15)
    .join("\n");
}

function samplePath(layer: JsonLayer, chain: ChainId, date: string | null): string {
  if (layer === "brief") return `data/published/v1/briefs/chains/${chain}/latest.json`;
  if (date) return `data/published/v1/${layer}/${chain}/${date}.json`;
  return `data/published/v1/${layer}/${chain}/latest.json`;
}

function extractJsonDate(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const candidates = [record.date, record.updated_through, record.as_of];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
  }
  return null;
}

async function readJsonSample(layer: JsonLayer, chain: ChainId, date: string | null): Promise<JsonSample> {
  const path = samplePath(layer, chain, date);
  const json = await readPublishedJson<unknown>(path);

  if (!json) {
    return {
      layer,
      chain,
      date,
      path,
      code: JSON.stringify(
        {
          sample_unavailable: true,
          layer,
          chain,
          attempted_path: `/${path}`,
        },
        null,
        2,
      ),
    };
  }

  return {
    layer,
    chain,
    date: extractJsonDate(json) ?? date,
    path,
    code: jsonExcerpt(json),
  };
}

async function buildJsonSamples(): Promise<JsonSample[]> {
  const metaLatest = await readPublishedJson<MetaLatest>(`data/published/v1/meta/${SAMPLE_CHAIN}/latest.json`);
  const date = metaLatest?.date ?? metaLatest?.updated_through ?? null;

  return Promise.all([
    readJsonSample("gold", SAMPLE_CHAIN, date),
    readJsonSample("derived", SAMPLE_CHAIN, date),
    readJsonSample("meta", SAMPLE_CHAIN, date),
    readJsonSample("brief", SAMPLE_CHAIN, date),
  ]);
}

function latestUpdatedThrough(rows: LatestContextRow[]): string {
  const dates = rows.map((row) => row.updatedThrough).filter((value): value is string => Boolean(value));
  if (dates.length === 0) return "—";
  return dates.sort().at(-1) ?? "—";
}

function datasetPublishedAt(dataset: DatasetManifest | null): string {
  if (!dataset?.published_at) return "Updated daily";
  const parsed = new Date(dataset.published_at);
  if (Number.isNaN(parsed.getTime())) return "Updated daily";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}


type RealBriefExample = {
  chain: ChainId;
  chainName: string;
  chainLabel: string;
  icon: string;
  windowStart: string;
  windowEnd: string;
  updatedThrough: string;
  latestLabel: RegimeLabel;
  latestConfidence: number | null;
  dominantLabel: RegimeLabel;
  dominantLabelDays: number | null;
  latestLabelRunDays: number | null;
  labelChanges: number | null;
  volatility: string;
  primaryAxis: string;
  demand: string;
  friction: string;
  capacity: string;
  confidenceDirection: string;
  averageConfidence7d: number | null;
  movementType: string;
  persistence: string;
  headline: string;
  plain: string;
  advanced: string;
  validationStatus: string;
  labels: RegimeLabel[];
};

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringField(record: Record<string, unknown>, key: string, fallback = "—"): string {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatRawValue(value: string): string {
  if (!value || value === "—") return "—";
  return value.replace(/_/g, " ");
}

function briefCompletenessScore(briefAny: Record<string, unknown>): number {
  const window = safeRecord(briefAny.window);
  const latest = safeRecord(briefAny.latest);
  const regimePath = safeRecord(briefAny.regime_path);
  const drivers = safeRecord(briefAny.drivers);
  const confidence = safeRecord(briefAny.confidence);
  const movement = safeRecord(briefAny.movement);
  const briefText = safeRecord(briefAny.brief);
  const validation = safeRecord(briefAny.validation);
  const labels = Array.isArray(regimePath.labels) ? regimePath.labels : [];

  let score = 0;
  if (briefAny.brief_status === "published") score += 20;
  if (stringField(window, "start_date") !== "—") score += 8;
  if (stringField(window, "end_date") !== "—") score += 8;
  if (labels.length >= 7) score += 18;
  if (stringField(briefText, "headline") !== "—") score += 12;
  if (stringField(briefText, "plain") !== "—") score += 12;
  if (stringField(briefText, "advanced") !== "—") score += 10;
  if (numberField(confidence, "average_7d") != null) score += 8;
  if (numberField(latest, "confidence_score") != null) score += 8;
  if (stringField(regimePath, "dominant_label") !== "—") score += 6;
  if (stringField(drivers, "primary_axis") !== "—") score += 5;
  if (stringField(drivers, "demand") !== "—") score += 3;
  if (stringField(drivers, "friction") !== "—") score += 3;
  if (stringField(drivers, "capacity") !== "—") score += 3;
  if (stringField(movement, "type") !== "—") score += 4;
  if (stringField(validation, "language_validation_status") === "passed") score += 4;
  if (coerceRegimeLabel(latest.label ?? latest.status) !== "UNKNOWN/DEGRADED") score += 8;

  return score;
}

function realBriefExampleFromRecord(briefAny: Record<string, unknown>): RealBriefExample {
  const chainId = String(briefAny.chain ?? "bitcoin") as ChainId;
  const chain = CHAIN_LIST.find((item) => item.id === chainId);

  const window = safeRecord(briefAny.window);
  const latest = safeRecord(briefAny.latest);
  const regimePath = safeRecord(briefAny.regime_path);
  const drivers = safeRecord(briefAny.drivers);
  const confidence = safeRecord(briefAny.confidence);
  const movement = safeRecord(briefAny.movement);
  const briefText = safeRecord(briefAny.brief);
  const validation = safeRecord(briefAny.validation);

  const labelsRaw = Array.isArray(regimePath.labels) ? regimePath.labels : [];
  const labels = labelsRaw.map(coerceRegimeLabel).slice(-7);
  const latestLabel = coerceRegimeLabel(latest.label ?? latest.status ?? regimePath.dominant_label);

  return {
    chain: chainId,
    chainName: chain?.name ?? chainId,
    chainLabel: chain?.label ?? chainId.toUpperCase(),
    icon: chain?.icon ?? "•",
    windowStart: stringField(window, "start_date", "latest window"),
    windowEnd: stringField(window, "end_date", "latest window"),
    updatedThrough: stringField(window, "updated_through", stringField(window, "end_date", "latest")),
    latestLabel,
    latestConfidence: numberField(latest, "confidence_score"),
    dominantLabel: coerceRegimeLabel(regimePath.dominant_label ?? latestLabel),
    dominantLabelDays: numberField(regimePath, "dominant_label_days"),
    latestLabelRunDays: numberField(regimePath, "latest_label_run_days"),
    labelChanges: numberField(regimePath, "label_changes"),
    volatility: stringField(regimePath, "volatility", "not specified"),
    primaryAxis: stringField(drivers, "primary_axis", "not specified"),
    demand: stringField(drivers, "demand", "not specified"),
    friction: stringField(drivers, "friction", "not specified"),
    capacity: stringField(drivers, "capacity", "not specified"),
    confidenceDirection: stringField(confidence, "direction", "not specified"),
    averageConfidence7d: numberField(confidence, "average_7d"),
    movementType: stringField(movement, "type", "not specified"),
    persistence: stringField(movement, "persistence", "not specified"),
    headline: stringField(briefText, "headline", "Latest Brief headline available in JSON."),
    plain: stringField(briefText, "plain", "Latest Brief plain-language summary available in JSON."),
    advanced: stringField(briefText, "advanced", "Latest Brief advanced context available in JSON."),
    validationStatus: stringField(validation, "language_validation_status", "not specified"),
    labels: labels.length ? labels : [latestLabel],
  };
}

async function buildBriefExample(bundle: SiteBriefBundle | null): Promise<RealBriefExample | null> {
  const chainPreference: ChainId[] = ["bitcoin", "base", "arbitrum", "ethereum"];
  const fullBriefs = await Promise.all(
    chainPreference.map(async (chain) => {
      const record = await readPublishedJson<Record<string, unknown>>(`data/published/v1/briefs/chains/${chain}/latest.json`);
      return record ? { chain, record, score: briefCompletenessScore(record) } : null;
    }),
  );

  const selectedFull = fullBriefs
    .filter((item): item is { chain: ChainId; record: Record<string, unknown>; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score)[0];

  if (selectedFull && selectedFull.score >= 70) {
    return realBriefExampleFromRecord(selectedFull.record);
  }

  const siteBriefs = (bundle?.chains ?? []) as unknown as Record<string, unknown>[];
  const selectedSite = siteBriefs
    .map((record) => ({ record, score: briefCompletenessScore(record) }))
    .sort((a, b) => b.score - a.score)[0];

  return selectedSite ? realBriefExampleFromRecord(selectedSite.record) : null;
}

// ─── Layout shells ────────────────────────────────────────────────────────────

function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-8 sm:px-10 ${className}`}>{children}</div>;
}

// ─── Regime Pills ─────────────────────────────────────────────────────────────

function RegimePill({ label, dark = false }: { label: RegimeLabel; dark?: boolean }) {
  const colors = dark ? DARK_REGIME_COLORS[label] : REGIME_COLORS[label];
  const unknownClass = label === "UNKNOWN/DEGRADED" ? "border-2" : "border";
  return (
    <span className={`inline-flex whitespace-nowrap items-center rounded-md ${unknownClass} px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.04em] ${colors.border} ${colors.bg} ${colors.text}`}>
      {label === "UNKNOWN/DEGRADED" ? "UNKNOWN" : label}
    </span>
  );
}

function BriefRegimeChip({ label, compact = false }: { label: RegimeLabel; compact?: boolean }) {
  const colors = REGIME_COLORS[label];
  const display = label === "UNKNOWN/DEGRADED" ? "UNKNOWN" : label;
  const compactClass = compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-[11px]";
  return (
    <span className={`inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-full border ${compactClass} font-black uppercase tracking-[0.04em] ${colors.border} ${colors.bg} ${colors.text}`}>
      {display}
    </span>
  );
}

function briefLabelNote(label: RegimeLabel): string | null {
  return label === "UNKNOWN/DEGRADED" ? "degraded / low support" : null;
}

function prettyBriefValue(value: string): string {
  return formatRawValue(value).replace(/\s+/g, " ").trim();
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function LatestContextWidget({ rows }: { rows: LatestContextRow[] }) {
  return (
    <aside className="min-w-0 overflow-hidden text-white">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/18 pb-5">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/90">Latest Published Context</div>
          <div className="mt-1.5 text-[11px] font-normal text-white/58">Daily, not intraday</div>
        </div>
        <div className="text-right text-[11px] font-normal text-white/70">
          Updated through<br /><span className="font-bold text-white/75">{formatDate(latestUpdatedThrough(rows))}</span>
        </div>
      </div>

      <div className="divide-y divide-white/8">
        {rows.map((row) => {
          const path = sparklinePath(row.days);
          return (
            <Link key={row.chain} href={`/chains/${row.chain}`} className="grid min-w-0 grid-cols-[28px_minmax(40px,52px)_minmax(70px,88px)_46px_minmax(64px,1fr)] items-center gap-2.5 py-4 transition hover:text-[#93c5fd]">
              <span className="min-w-0 text-[18px] font-black text-white/80">{row.icon}</span>
              <div className="min-w-0 truncate text-[14px] font-black text-white">{row.shortLabel}</div>
              <span className={`inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.06em] ${DARK_REGIME_COLORS[row.label].text}`}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sparklineStroke(row) }} />
                {row.label === "UNKNOWN/DEGRADED" ? "UNKNOWN" : row.label}
              </span>
              <div className={`min-w-0 text-[13px] font-black ${DARK_REGIME_COLORS[row.label].text}`}>{formatConfidence(row.confidence)}</div>
              <svg viewBox="0 0 116 32" className="hidden h-8 w-full min-w-0 max-w-[92px] sm:block" aria-hidden="true">
                <path d="M0 31.5H116" stroke="rgba(255,255,255,0.10)" />
                {path ? <path d={path} fill="none" stroke={sparklineStroke(row)} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /> : null}
              </svg>
            </Link>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/16 pt-4 text-[11px] font-normal text-white/58">
        <span>Labels are chain-relative, not price-relative.</span>
        <Link href="/track-record" className="font-bold text-white/76 transition hover:text-white">View history →</Link>
      </div>
    </aside>
  );
}

function HeroSection({ rows }: { rows: LatestContextRow[] }) {
  return (
    <section className="relative isolate overflow-hidden bg-[#07111f] text-white">
      {/* Radial glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(37,99,235,0.28),transparent_40%),radial-gradient(ellipse_at_80%_20%,rgba(37,99,235,0.12),transparent_35%)]" />

      <PageShell className="relative z-10 grid gap-12 pb-[72px] pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.65fr)] lg:items-start lg:gap-16">
        {/* Left: headline + CTAs */}
        <div>
          <div className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-white/65">Daily regime context for blockchain</div>
          <h1 className="max-w-[680px] text-[54px] font-black leading-[0.96] tracking-[-0.055em] text-white sm:text-[68px] lg:text-[82px]">
            Separate blockchain noise from structural change.
          </h1>
          <p className="mt-7 max-w-[580px] text-[16px] font-normal leading-8 text-white/76">
            Daily Gold, Derived, Meta, and Brief JSON for BTC, ETH, ARB, and BASE. Use it directly, or join regime context to your own data by chain and date. No price data. No forecasts. No recommendations.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a href="#json" className="inline-flex h-11 items-center justify-center rounded-lg bg-[#B46A22] px-6 text-[14px] font-bold text-[#F7F3E8] transition hover:bg-[#9E5B1C]">
              Inspect real JSON samples
            </a>
            <Link href="/api-docs" className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 px-6 text-[14px] font-bold text-white/80 transition hover:border-white/40 hover:text-white">
              Get started with API →
            </Link>
          </div>

          <a href="#methodology" className="mt-6 inline-flex text-[12px] font-semibold text-white/58 underline decoration-white/15 underline-offset-4 transition hover:text-white/70">
            Unsure? Start with the methodological choices →
          </a>

          <div className="mt-7 flex flex-wrap gap-6 text-[12px] font-semibold text-white/65">
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#6FB7E8]/70" />Daily JSON files</div>
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#6FB7E8]/70" />Versioned methodology</div>
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#6FB7E8]/70" />Hash-anchored labels</div>
          </div>
        </div>

        {/* Right: live context widget */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-white/24 bg-white/[0.10] p-5 backdrop-blur-sm sm:p-6 lg:p-7">
          <LatestContextWidget rows={rows} />
        </div>
      </PageShell>

      {/* Price strip – sits at bottom of dark hero */}
      <PageShell className="relative z-10 -mt-[52px] pb-0">
        <div className="grid border-y border-white/18 py-5 text-white md:grid-cols-3 md:divide-x md:divide-white/10">
          <PriceStripItem title="Free" price="$0" note="Public charts & sample JSON" />
          <PriceStripItem title="Single Chain" price="$49/mo" note="One chain · full JSON" />
          <PriceStripItem title="Full Access" price="$149/mo" note="All chains · full access" />
        </div>
      </PageShell>
    </section>
  );
}

function PriceStripItem({ title, price, note }: { title: string; price: string; note: string }) {
  return (
    <a href="#pricing" className="block px-0 py-5 transition hover:text-[#93c5fd] md:px-10 md:first:pl-0 md:last:pr-0">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/58">{title}</div>
      <div className="mt-1.5 text-[30px] font-black tracking-[-0.05em] text-white">{price}</div>
      <div className="mt-0.5 text-[12px] font-normal text-white/70">{note}</div>
    </a>
  );
}

// ─── Section title ─────────────────────────────────────────────────────────────

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <div className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#B46A22]">{eyebrow}</div> : null}
      <h2 className="text-[34px] font-bold leading-tight tracking-[-0.025em] text-[#061B36] sm:text-[42px]">{title}</h2>
      {subtitle ? <p className="mt-2 max-w-2xl text-[15px] font-normal leading-7 text-[#475569]">{subtitle}</p> : null}
    </div>
  );
}

// ─── Paths section ─────────────────────────────────────────────────────────────

function PathsSection() {
  return (
    // Alternating section: white background
    <section id="paths" className="border-y border-slate-300 bg-white py-10 lg:py-12">
      <PageShell>
        <SectionTitle
          eyebrow="Two paths"
          title="One source of truth."
          subtitle="Same published data layer. Different ways to use it."
        />
        <div className="mt-4 grid gap-0 rounded-2xl border border-[#061B36]/18 bg-[#F7F3E8] lg:grid-cols-2">
          {/* Path A */}
          <div className="p-10 lg:border-r lg:border-slate-300">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#B46A22]">Path A</div>
            <h3 className="text-[26px] font-bold tracking-[-0.02em] text-[#061B36]">Have your own pipeline?</h3>
            <p className="mt-1 text-[13px] font-bold text-[#B46A22]">Enrich your existing stack</p>
            <p className="mt-5 text-[15px] font-normal leading-7 text-[#475569]">
              Join Urd Atlas JSON to your daily rows by chain and date. Add regime, confidence, and drivers to your own models, dashboards, and reports.
            </p>
            <ul className="mt-6 grid gap-2.5">
              {["Clean, machine-readable JSON", "Stable schemas and field definitions", "Built for joins, storage, and automation"].map((b) => (
                <li key={b} className="flex items-center gap-3 text-[14px] font-semibold text-[#334155]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#B46A22]" />{b}
                </li>
              ))}
            </ul>
            <a href="#workflow" className="mt-8 inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-5 text-[13px] font-bold text-[#061B36] transition hover:border-slate-400 hover:bg-slate-50">
              See join workflow →
            </a>
          </div>

          {/* Path B — highlighted */}
          <div className="relative rounded-b-2xl bg-[#061B36] p-10 lg:rounded-r-2xl lg:rounded-bl-none">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#6FB7E8]">Path B</div>
            <h3 className="text-[26px] font-bold tracking-[-0.02em] text-white">No pipeline? Use Briefs.</h3>
            <p className="mt-1 text-[13px] font-bold text-[#6FB7E8]">Read the published context directly</p>
            <p className="mt-5 text-[15px] font-normal leading-7 text-white/76">
              Briefs summarize what changed, what drove it, and whether the latest label looks isolated or persistent. No infrastructure required.
            </p>
            <ul className="mt-6 grid gap-2.5">
              {["One readable brief per chain", "Plain-language weekly context", "Built from the same published Meta data"].map((b) => (
                <li key={b} className="flex items-center gap-3 text-[14px] font-semibold text-white/80">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6FB7E8]" />{b}
                </li>
              ))}
            </ul>
            <Link href="/briefs" className="mt-8 inline-flex h-10 items-center justify-center rounded-lg bg-[#B46A22] px-5 text-[13px] font-bold text-[#F7F3E8] transition hover:bg-[#9E5B1C]">
              Read today's Brief →
            </Link>
          </div>
        </div>
      </PageShell>
    </section>
  );
}

// ─── Brief contrast section ────────────────────────────────────────────────────

function BriefMetricRow({ label, value, note }: { label: string; value: ReactNode; note?: string | null }) {
  return (
    <div className="grid gap-2 border-b border-slate-200 py-3 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)]">
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">{label}</div>
      <div className="min-w-0">
        <div className="text-[14px] font-bold leading-6 text-slate-900">{value}</div>
        {note ? <div className="mt-0.5 text-[11px] font-normal leading-5 text-slate-600">{note}</div> : null}
      </div>
    </div>
  );
}

function BriefTextRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid gap-2 border-t border-slate-200 py-4 first:border-t-0 sm:grid-cols-[132px_minmax(0,1fr)]">
      <div className="text-[13px] font-bold text-slate-700">{title}</div>
      <div className="text-[14px] font-normal leading-7 text-slate-600">{body}</div>
    </div>
  );
}

function RegimeText({ label }: { label: RegimeLabel }) {
  const colors = REGIME_COLORS[label];
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap text-[12px] font-black uppercase tracking-[0.12em] ${colors.text}`}>
      <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
      {label === "UNKNOWN/DEGRADED" ? "UNKNOWN" : label}
    </span>
  );
}

function BriefTimelineClean({ labels }: { labels: RegimeLabel[] }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">regime path</div>
        <div className="text-[11px] font-normal text-slate-600">{labels.length} published days</div>
      </div>
      <div className="grid grid-cols-7 items-start gap-2">
        {labels.map((label, index) => {
          const color = REGIME_COLORS[label];
          return (
            <div key={`${label}-${index}`} className="min-w-0">
              <div className="mb-2 text-[10px] font-bold text-slate-300">D{index + 1}</div>
              <div className={`h-1.5 w-full rounded-full ${color.dot}`} />
              <div className={`mt-2 truncate text-[9px] font-black uppercase tracking-[0.06em] ${color.text}`}>
                {label === "UNKNOWN/DEGRADED" ? "UNK" : label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProblemMark({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
      <span className="text-[12px] font-black text-rose-500">×</span>
      <span>{text}</span>
    </div>
  );
}

function BriefContrastSection({ example }: { example: RealBriefExample | null }) {
  return (
    // Alternating section: slate-50 background
    <section className="border-y border-slate-200 bg-[#DDE8F1] py-10 lg:py-12">
      <PageShell>
        <SectionTitle
          eyebrow="The difference"
          title="Without a Brief / With a Brief"
          subtitle="A Brief turns published Meta data into a readable, checkable weekly context layer."
        />

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-start">
          {/* Left: raw data */}
          <div>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-[22px] font-bold text-[#061B36]">Without a Brief</h3>
                <p className="mt-1 text-[13px] text-slate-700">Raw daily metrics. Different units. No summary layer.</p>
              </div>
              <span className="text-[11px] font-bold text-[#B46A22]">112+ more metrics</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#061B36]/18 bg-[#F7F3E8]">
              <table className="w-full min-w-[420px] border-collapse font-mono text-[12px] text-slate-800">
                <thead className="bg-slate-100 text-left text-[10px] uppercase tracking-[0.12em] text-slate-700">
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-3 pr-5">metric</th>
                    <th className="px-5 py-3 pr-5">value</th>
                    <th className="px-5 py-3 pr-5">Δ1d</th>
                    <th className="px-5 py-3">Δ7d</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {RAW_METRICS.map((row) => (
                    <tr key={row.metric} className="hover:bg-slate-100/70">
                      <td className="px-5 py-3 pr-5 font-semibold text-slate-600">{row.metric}</td>
                      <td className="px-5 py-3 pr-5">{row.value}</td>
                      <td className="px-5 py-3 pr-5 text-emerald-600">{row.d1}</td>
                      <td className="px-5 py-3 text-emerald-600">{row.d7}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              <ProblemMark text="Too many moving parts" />
              <ProblemMark text="Where is the signal?" />
              <ProblemMark text="Hard to explain quickly" />
            </div>
          </div>

          {/* Right: brief */}
          <div className="rounded-2xl bg-[#F7F3E8] p-8 shadow-[0_8px_40px_rgba(15,23,42,0.14),0_1px_4px_rgba(15,23,42,0.08)]">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-[22px] font-bold text-[#061B36]">With a Brief</h3>
                <p className="mt-1 text-[13px] text-slate-700">A real latest-published chain brief, built from published Meta data.</p>
              </div>
              <Link href="/briefs" className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#B46A22] px-5 text-[13px] font-bold text-[#F7F3E8] transition hover:bg-[#9E5B1C]">
                Read today's Brief →
              </Link>
            </div>

            {example ? (
              <div>
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-[28px]">{example.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[20px] font-bold text-[#061B36]">{example.chainName}</div>
                      <div className="mt-0.5 text-[12px] text-slate-600">
                        Real latest 7-day Brief · {example.windowStart} to {example.windowEnd}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-row items-center gap-3 md:flex-col md:items-end md:gap-1.5">
                    <RegimeText label={example.latestLabel} />
                    <div className="text-[12px] font-bold text-slate-700">
                      Confidence {typeof example.latestConfidence === "number" ? example.latestConfidence.toFixed(3) : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <BriefTimelineClean labels={example.labels} />
                </div>

                <div className="mt-4 grid gap-6 lg:grid-cols-2">
                  <div>
                    <BriefMetricRow label="dominant label" note={`${example.dominantLabelDays ?? "—"}/7 days${briefLabelNote(example.dominantLabel) ? ` · ${briefLabelNote(example.dominantLabel)}` : ""}`} value={<RegimeText label={example.dominantLabel} />} />
                    <BriefMetricRow label="label changes" note={`volatility: ${prettyBriefValue(example.volatility)}`} value={example.labelChanges ?? "—"} />
                    <BriefMetricRow label="latest run" note="published days" value={example.latestLabelRunDays ?? "—"} />
                    <BriefMetricRow label="avg confidence" note={prettyBriefValue(example.confidenceDirection)} value={typeof example.averageConfidence7d === "number" ? example.averageConfidence7d.toFixed(3) : "—"} />
                  </div>
                  <div>
                    <BriefMetricRow label="demand" note={`primary axis: ${prettyBriefValue(example.primaryAxis)}`} value={prettyBriefValue(example.demand)} />
                    <BriefMetricRow label="friction" note="drivers.friction" value={prettyBriefValue(example.friction)} />
                    <BriefMetricRow label="capacity" note="drivers.capacity" value={prettyBriefValue(example.capacity)} />
                    <BriefMetricRow label="movement" note={`persistence: ${prettyBriefValue(example.persistence)}`} value={`type: ${prettyBriefValue(example.movementType)}`} />
                  </div>
                </div>

                <div className="mt-4 divide-y divide-slate-100 border-t border-slate-200">
                  <BriefTextRow title="Headline" body={example.headline} />
                  <BriefTextRow title="Plain summary" body={example.plain} />
                  <BriefTextRow title="Validation" body={`${prettyBriefValue(example.validationStatus)} · daily, not intraday`} />
                </div>
              </div>
            ) : (
              <div className="text-[14px] leading-7 text-slate-600">
                Latest Brief data was not available in the site bundle. The Briefs section will populate when chain Brief JSON is present.
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-6 border-t border-slate-200 pt-5">
              <Link href="/briefs" className="text-[13px] font-bold text-[#B46A22] hover:text-[#9E5B1C]">Open Briefs →</Link>
              <a href="#json" className="text-[13px] font-bold text-[#B46A22] hover:text-[#9E5B1C]">Inspect Brief JSON →</a>
            </div>
          </div>
        </div>
      </PageShell>
    </section>
  );
}

// ─── Pipeline workflow ─────────────────────────────────────────────────────────

function ChainLogoDot({ label, tone }: { label: string; tone: "btc" | "eth" | "arb" | "base" }) {
  const classes: Record<typeof tone, string> = {
    btc: "bg-[#f59e0b] text-white",
    eth: "bg-[#8aa7ff] text-white",
    arb: "bg-[#1f6feb] text-white",
    base: "bg-[#315dff] text-white",
  };
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${classes[tone]}`}>
      {label}
    </span>
  );
}

function WorkflowGlyph({ step }: { step: string }) {
  if (step === "1") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 rounded-lg border border-[#061B36]/18 bg-[#F7F3E8] px-2.5 py-1.5 font-mono text-[10px] font-bold text-slate-600 shadow-sm">
          <span className="text-slate-300">{`{}`}</span> gold_btc_2025-05-23.json
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#061B36]/18 bg-[#F7F3E8] px-2.5 py-1.5 font-mono text-[10px] font-bold text-slate-600 shadow-sm">
          <span className="text-slate-300">{`{}`}</span> meta_eth_2025-05-23.json
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#061B36]/18 bg-[#F7F3E8] px-2.5 py-1.5 font-mono text-[10px] font-bold text-slate-700 shadow-sm">
          <span className="text-slate-300">{`{}`}</span> brief_base_2025-05-23.json
        </div>
        <div className="mt-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <ChainLogoDot label="₿" tone="btc" /><span className="text-[10px] font-black text-white">BTC</span>
            <ChainLogoDot label="Ξ" tone="eth" /><span className="text-[10px] font-black text-white">ETH</span>
            <ChainLogoDot label="A" tone="arb" /><span className="text-[10px] font-black text-white">ARB</span>
            <ChainLogoDot label="B" tone="base" /><span className="text-[10px] font-black text-white">BASE</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === "2") {
    const rows = [
      ["₿ BTC", "2025-05-23", "STABLE", "0.748"],
      ["Ξ ETH", "2025-05-23", "HEATING", "0.612"],
      ["B BASE", "2025-05-23", "CHEAP", "0.327"],
    ];
    return (
      <div className="overflow-hidden rounded-xl border border-[#061B36]/18 bg-[#F7F3E8] shadow-sm">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-700">
            <tr>
              <th className="border-r border-slate-200 px-3 py-2">chain</th>
              <th className="border-r border-slate-200 px-3 py-2">date</th>
              <th className="border-r border-slate-200 px-3 py-2">label</th>
              <th className="px-3 py-2">conf</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[10px] font-bold text-slate-700">
            {rows.map((row) => (
              <tr key={row.join("-")} className="border-t border-slate-200">
                <td className="border-r border-slate-200 px-3 py-2">{row[0]}</td>
                <td className="border-r border-slate-200 px-3 py-2">{row[1]}</td>
                <td className={`border-r border-slate-200 px-3 py-2 font-black ${row[2] === "STABLE" ? "text-emerald-600" : row[2] === "HEATING" ? "text-amber-600" : "text-sky-600"}`}>{row[2]}</td>
                <td className="px-3 py-2">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-[11px] font-bold text-emerald-600">
          <span>3 rows loaded</span>
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300 text-emerald-500 text-[10px]">✓</span>
        </div>
      </div>
    );
  }

  if (step === "3") {
    return (
      <div className="grid gap-3">
        <div className="grid grid-cols-[1fr_32px_1fr] items-center gap-2">
          <div className="overflow-hidden rounded-xl border border-[#061B36]/18 bg-[#F7F3E8] text-center shadow-sm">
            <div className="bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-600">Your rows</div>
            <div className="grid grid-cols-2 border-t border-slate-200 font-mono text-[10px] font-bold text-slate-700">
              <span className="border-r border-slate-200 px-2 py-2">chain</span>
              <span className="px-2 py-2">date</span>
              <span className="border-r border-slate-200 px-2 py-2">BTC</span>
              <span className="px-2 py-2">2025-05-23</span>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[16px] font-black text-white">→</div>
          <div className="overflow-hidden rounded-xl border border-[#061B36]/18 bg-[#F7F3E8] text-center shadow-sm">
            <div className="bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-600">Urd Atlas</div>
            <div className="grid grid-cols-2 border-t border-slate-200 font-mono text-[10px] font-bold text-slate-700">
              <span className="border-r border-slate-200 px-2 py-2">label</span>
              <span className="px-2 py-2">conf</span>
              <span className="border-r border-slate-200 px-2 py-2 text-emerald-600">STABLE</span>
              <span className="px-2 py-2">0.748</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">Joined result</div>
          <div className="mt-0.5 font-mono text-[11px] font-bold text-slate-700">BTC · 2025-05-23 · STABLE · 0.748</div>
        </div>
      </div>
    );
  }

  if (step === "4") {
    return (
      <div className="rounded-xl border border-[#061B36]/18 bg-[#F7F3E8] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
          <span>Share of days (%)</span><span>30d</span>
        </div>
        <div className="grid grid-cols-[22px_1fr] gap-2">
          <div className="flex flex-col justify-between text-right text-[9px] font-bold text-slate-300">
            <span>60</span><span>40</span><span>20</span><span>0</span>
          </div>
          <div className="relative h-[88px] border-b border-l border-slate-200">
            <div className="absolute inset-x-0 top-[33%] border-t border-dashed border-slate-200" />
            <div className="absolute inset-x-0 top-[66%] border-t border-dashed border-slate-200" />
            <div className="absolute bottom-0 left-[6%] flex w-[18%] flex-col items-center">
              <span className="mb-1 text-[10px] font-black text-emerald-600">42%</span>
              <div className="h-[56px] w-full rounded-t-md bg-emerald-500" />
            </div>
            <div className="absolute bottom-0 left-[32%] flex w-[18%] flex-col items-center">
              <span className="mb-1 text-[10px] font-black text-amber-600">26%</span>
              <div className="h-[38px] w-full rounded-t-md bg-amber-400" />
            </div>
            <div className="absolute bottom-0 left-[58%] flex w-[18%] flex-col items-center">
              <span className="mb-1 text-[10px] font-black text-rose-600">18%</span>
              <div className="h-[28px] w-full rounded-t-md bg-rose-500" />
            </div>
            <div className="absolute bottom-0 left-[82%] flex w-[14%] flex-col items-center">
              <span className="mb-1 text-[10px] font-black text-sky-600">14%</span>
              <div className="h-[22px] w-full rounded-t-md bg-sky-500" />
            </div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[9px] font-black uppercase tracking-[0.06em]">
          <span className="text-emerald-600">STABLE</span>
          <span className="text-amber-600">HEATING</span>
          <span className="text-rose-600">CONGEST</span>
          <span className="text-sky-600">CHEAP</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#061B36]/18 bg-[#F7F3E8] p-4 shadow-sm">
      <div className="text-[12px] font-bold text-slate-700">Urd Atlas Daily Report</div>
      <div className="mt-3 grid gap-2 font-mono text-[10px] text-slate-600">
        <div className="flex justify-between"><span>date:</span><span className="text-blue-600">2025-05-23</span></div>
        <div className="flex justify-between"><span>determinism_hash:</span><span className="text-blue-600">81b295000696</span></div>
        <div className="flex justify-between"><span>chains:</span><span>BTC, ETH, ARB, BASE</span></div>
        <div className="flex justify-between"><span>layers:</span><span>gold, derived, meta, brief</span></div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px]">✓</span>
        Verified & reproducible
      </div>
    </div>
  );
}

function PipelineWorkflowSection() {
  const steps = [
    ["1", "Ingest", "Pull daily JSON by chain and date."],
    ["2", "Store / Parse", "Load stable schemas into your tables."],
    ["3", "Join by chain + date", "Align Urd Atlas context with your rows."],
    ["4", "Analyze / Segment", "Compare your data by label and confidence."],
    ["5", "Archive / Report", "Keep a reproducible record of results."],
  ];

  return (
    // Alternating section: white background
    <section id="workflow" className="border-y border-slate-300 bg-white py-10 lg:py-12">
      <PageShell>
        <SectionTitle
          eyebrow="For pipeline users"
          title="A stable daily workflow"
          subtitle="A compact reference workflow: ingest, join, segment, and report with the same published keys every day."
        />
        <div className="mt-4 grid gap-5 lg:grid-cols-5 lg:gap-4">
          {steps.map(([number, title, body], index) => (
            <div key={number} className="relative flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">Step {number}</div>
              <h3 className="text-[14px] font-bold leading-5 text-[#061B36]">{title}</h3>
              <p className="mt-1.5 text-[12px] font-normal leading-5 text-slate-600">{body}</p>
              <div className="mt-4 overflow-hidden"><WorkflowGlyph step={number} /></div>
              {index < steps.length - 1 ? (
                <div className="absolute -right-2.5 top-8 hidden text-slate-300 lg:block text-[18px]">›</div>
              ) : null}
            </div>
          ))}
        </div>
      </PageShell>
    </section>
  );
}

// ─── What you receive ─────────────────────────────────────────────────────────

function LayerPreview({ layer }: { layer: string }) {
  if (layer === "Gold") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#061B36]">
        <div className="flex items-center justify-between border-b border-white/18 px-4 py-2">
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-400">Gold JSON excerpt</span>
          <span className="text-[10px] font-bold text-white/30">daily</span>
        </div>
        <pre className="p-4 font-mono text-[11px] leading-6"><code>
          <span className="text-white/58">{"{"}</span>{"\n"}
          <span className="text-sky-300">{"  \"chain\""}</span><span className="text-white/58">{": "}</span><span className="text-emerald-300">{"\"bitcoin\""}</span>{",\n"}
          <span className="text-sky-300">{"  \"date\""}</span><span className="text-white/58">{": "}</span><span className="text-emerald-300">{"\"2025-05-23\""}</span>{",\n"}
          <span className="text-sky-300">{"  \"tx_count_daily\""}</span><span className="text-white/58">{": "}</span><span className="text-violet-300">{"1284567"}</span>{",\n"}
          <span className="text-sky-300">{"  \"unique_active_addresses\""}</span><span className="text-white/58">{": "}</span><span className="text-violet-300">{"964321"}</span>{",\n"}
          <span className="text-sky-300">{"  \"median_tx_fee_native\""}</span><span className="text-white/58">{": "}</span><span className="text-violet-300">{"0.000031"}</span>{",\n"}
          <span className="text-sky-300">{"  \"avg_block_time_sec\""}</span><span className="text-white/58">{": "}</span><span className="text-violet-300">{"596.4"}</span>{"\n"}
          <span className="text-white/58">{"}"}</span>
        </code></pre>
      </div>
    );
  }

  if (layer === "Derived") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#061B36] p-4">
        <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em]">
          <span className="text-[#6FB7E8]">Normalized transactions</span><span className="text-white/30">last 30d</span>
        </div>
        <svg viewBox="0 0 260 110" className="h-[100px] w-full" aria-hidden="true">
          <path d="M34 10V88H250" stroke="rgba(255,255,255,0.15)" />
          {[28, 50, 70].map((y) => <path key={y} d={`M34 ${y}H250`} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 5" />)}
          <path d="M38 72 L48 40 L57 88 L66 38 L76 52 L85 72 L96 28 L106 76 L116 44 L126 62 L136 34 L146 70 L156 40 L166 50 L176 32 L186 72 L196 44 L206 58 L216 36 L226 50 L238 38" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.6" />
          <path d="M38 68 C62 58, 82 54, 108 52 S160 46, 238 50" fill="none" stroke="#34d399" strokeWidth="2.5" />
          <path d="M38 72 C72 70, 104 66, 136 62 S202 58, 238 56" fill="none" stroke="#94a3b8" strokeWidth="3.5" opacity="0.6" />
        </svg>
        <div className="mt-2 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-[0.1em]">
          <span className="flex items-center gap-1.5 text-sky-400"><span className="h-1.5 w-4 rounded-full bg-sky-400" />RAW</span>
          <span className="flex items-center gap-1.5 text-emerald-400"><span className="h-1.5 w-4 rounded-full bg-emerald-400" />MA7</span>
          <span className="flex items-center gap-1.5 text-slate-600"><span className="h-1.5 w-4 rounded-full bg-slate-400" />MA30</span>
        </div>
      </div>
    );
  }

  if (layer === "Meta") {
    return (
      <div className="overflow-hidden rounded-xl border border-[#061B36]/18 bg-[#F7F3E8]">
        <div className="grid grid-cols-[1fr_90px] border-b border-slate-200">
          <div className="bg-emerald-600 px-5 py-4 text-center text-[22px] font-black text-white">STABLE</div>
          <div className="flex flex-col items-center justify-center bg-white px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">Confidence</div>
            <div className="text-[26px] font-black text-slate-900">0.748</div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
          <div className="px-3 py-3"><div className="text-[10px] font-black text-slate-600">Demand</div><div className="mt-1.5 text-[12px] font-bold text-emerald-600">Normal</div></div>
          <div className="px-3 py-3"><div className="text-[10px] font-black text-slate-600">Friction</div><div className="mt-1.5 text-[12px] font-bold text-emerald-600">Normal</div></div>
          <div className="px-3 py-3"><div className="text-[10px] font-black text-slate-600">Capacity</div><div className="mt-1.5 text-[12px] font-bold text-blue-600">Balanced</div></div>
        </div>
      </div>
    );
  }

  // Briefs
  return (
    <div className="overflow-hidden rounded-xl border border-[#061B36]/18 bg-[#F7F3E8]">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="text-[11px] font-black text-violet-600">What changed</div>
        <p className="mt-1 text-[12px] leading-5 text-slate-600">Activity and fees increased while capacity remained available.</p>
      </div>
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="text-[11px] font-black text-violet-600">Why it matters</div>
        <p className="mt-1 text-[12px] leading-5 text-slate-600">Stronger demand was handled without material congestion.</p>
      </div>
      <div className="px-4 py-3">
        <div className="text-[11px] font-black text-violet-600">Persistence</div>
        <div className="mt-2 flex items-center gap-3">
          <div className="text-[26px] font-black text-violet-600">62%</div>
          <div className="flex-1">
            <div className="relative h-5 rounded-full bg-slate-100">
              <div className="absolute inset-y-1 left-1 w-[60%] rounded-full bg-violet-500" />
            </div>
            <div className="mt-1 flex justify-between text-[9px] font-bold text-slate-300">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-slate-600">62% of similar episodes lasted 7+ days.</p>
      </div>
    </div>
  );
}

function WhatYouReceiveSection() {
  const items: Array<[string, string, string, string, string]> = [
    ["Gold", "Canonical daily measurements", "gold_YYYY-MM-DD.json", "Raw chain facts close to the source.", "#D97706"],
    ["Derived", "Normalized metrics and baselines", "derived_YYYY-MM-DD.json", "Comparable trend features built from Gold.", "#6FB7E8"],
    ["Meta", "Regime, confidence, drivers", "meta_YYYY-MM-DD.json", "The interpretive layer used by dashboards and pipelines.", "#16A34A"],
    ["Briefs", "7-day context and summaries", "brief_YYYY-MM-DD.json", "Human-readable context built from Meta.", "#7C3AED"],
  ];

  return (
    // Alternating section: slate-50 background
    <section className="border-y border-slate-200 bg-[#DDE8F1] py-10 lg:py-12">
      <PageShell>
        <SectionTitle
          eyebrow="Daily output"
          title="What you receive every day"
          subtitle="Four layers, one published data product — each with a different role in the workflow."
        />
        <div className="mt-4 grid gap-6 lg:grid-cols-4">
          {items.map(([title, headline, filename, body, accent]) => (
            <article key={title} className="border-t-[3px] pt-4" style={{ borderColor: accent }}>
              <div className="text-[20px] font-bold text-[#061B36]">{title}</div>
              <div className="mt-1.5 text-[12px] font-bold" style={{ color: accent }}>{headline}</div>
              <p className="mt-2 text-[12px] font-normal leading-6 text-slate-700">{body}</p>
              <div className="mt-4"><LayerPreview layer={title} /></div>
              <div className="mt-3 font-mono text-[11px] font-semibold text-slate-600">{filename}</div>
            </article>
          ))}
        </div>
      </PageShell>
    </section>
  );
}

// ─── Regime vocabulary ────────────────────────────────────────────────────────

function RegimeVocabularySection() {
  return (
    // Alternating section: dark background for strong contrast
    <section className="border-y border-[#1e293b] bg-[#08111f] py-10 lg:py-12">
      <PageShell>
        <div className="max-w-3xl">
          <div className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#6FB7E8]">Regime vocabulary</div>
          <h2 className="text-[38px] font-bold leading-tight tracking-[-0.025em] text-white sm:text-[46px]">Five states. Chain-relative. Not price.</h2>
          <p className="mt-5 max-w-2xl text-[16px] font-normal leading-8 text-white/70">
            Labels describe current network conditions relative to each chain's own recent history. They are not price labels, trading signals, or forecasts.
          </p>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-5">
          {VOCABULARY.map((item) => {
            const colors = DARK_REGIME_COLORS[item.label];
            return (
              <div key={item.label} className="border-t border-white/18 pt-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors.stroke }} />
                  <span className={`text-[11px] font-black uppercase tracking-[0.16em] ${colors.text}`}>{item.label === "UNKNOWN/DEGRADED" ? "UNKNOWN" : item.label}</span>
                </div>
                <h3 className="mt-4 text-[14px] font-bold leading-5 text-white">{item.title}</h3>
                <p className="mt-2 text-[13px] font-normal leading-6 text-white/58">{item.body}</p>
              </div>
            );
          })}
        </div>
      </PageShell>
    </section>
  );
}

// ─── JSON samples ─────────────────────────────────────────────────────────────

function JsonSamplesSection({ samples }: { samples: JsonSample[] }) {
  // Simple keyword-based syntax highlight for JSON display
  function highlightJson(code: string): string {
    return code
      .replace(/("[\w_]+")(\s*:)/g, '<span class="text-sky-300">$1</span><span class="text-slate-600">$2</span>')
      .replace(/:\s*(".*?")/g, ': <span class="text-emerald-300">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="text-amber-300">$1</span>')
      .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="text-violet-300">$1</span>');
  }

  const LAYER_ACCENT: Record<string, string> = {
    gold: "#D97706",
    derived: "#6FB7E8",
    meta: "#16A34A",
    brief: "#7C3AED",
  };

  return (
    <section id="json" className="border-y border-[#1e293b] bg-[#08111f] py-10 lg:py-12">
      <PageShell>
        {/* Title in dark context */}
        <div className="mb-10">
          <div className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#6FB7E8]">Real data</div>
          <h2 className="text-[36px] font-bold leading-tight tracking-[-0.025em] text-white sm:text-[44px]">Inspect the actual JSON</h2>
          <p className="mt-4 max-w-2xl text-[15px] font-normal leading-7 text-white/70">
            Real files, stable keys, downloadable samples. Built for users who want to verify the schema before subscribing.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {samples.map((sample) => {
            const accent = LAYER_ACCENT[sample.layer] ?? "#B46A22";
            return (
              <article
                key={sample.layer}
                className="flex flex-col overflow-hidden rounded-xl border border-white/18 bg-[#050b14]"
              >
                {/* Card header */}
                <div className="flex items-center justify-between border-b border-white/18 px-4 py-3" style={{ borderTopWidth: 2, borderTopColor: accent }}>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white">{sample.layer}</div>
                    <div className="mt-0.5 text-[10px] text-white/58">{sample.chain} · {sample.date ?? "latest"}</div>
                  </div>
                  <a href={`/${sample.path}`} className="text-[11px] font-bold text-[#6FB7E8] transition hover:text-[#6FB7E8]">
                    ZIP ↓
                  </a>
                </div>
                {/* Code block */}
                <pre
                  className="flex-1 overflow-hidden p-4 font-mono text-[11px] leading-[1.7] text-white"
                  dangerouslySetInnerHTML={{ __html: highlightJson(sample.code) }}
                />
              </article>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-8 border-t border-white/18 pt-6">
          <Link href="/api-docs/samples" className="text-[13px] font-bold text-[#6FB7E8] transition hover:text-[#6FB7E8]">Download full sample pack →</Link>
          <Link href="/api-docs/schema" className="text-[13px] font-bold text-[#6FB7E8] transition hover:text-[#6FB7E8]">View schema reference →</Link>
        </div>
      </PageShell>
    </section>
  );
}

// ─── Methodology & FAQ ────────────────────────────────────────────────────────

function MethodologyFaqSection() {
  const methodology = [
    ["Why daily, not intraday?", "Daily cadence reduces sensitivity to short-lived spikes and keeps the product focused on regime context rather than monitoring."],
    ["How are labels determined?", "Labels are derived from documented demand, friction, and capacity evidence with deterministic rules and confidence gates."],
    ["What does confidence mean?", "Confidence reflects evidence support, data quality, and agreement. It is not a probability of future outcomes."],
    ["How do you handle degraded data?", "Low support or incomplete evidence is surfaced as UNKNOWN/DEGRADED rather than forced into a stronger label."],
    ["Can I verify the output?", "Published rows include methodology versioning, provenance fields, and determinism hashes."],
  ];

  const questions = [
    ["What does this add beyond price data?", "Urd Atlas labels network conditions, not market price. It adds chain-relative context to your own analysis."],
    ["Could I build this myself?", "Yes, with enough pipeline work. The value is consistent publication, methodology, history, and ready-to-use JSON."],
    ["Is yesterday's data too late?", "The product is daily context, not intraday alerting. BTC/ETH are near prior-day; L2s can lag more."],
    ["Can I join it to my own data?", "Yes. The join key is chain + date, with stable JSON fields for regime, confidence, and drivers."],
    ["Can I inspect examples before paying?", "Yes. Samples, schema, methodology, and public track record are visible before subscription."],
  ];

  return (
    // Alternating section: slate-50 background
    <section id="methodology" className="border-y border-slate-200 bg-[#DDE8F1] py-10 lg:py-12">
      <PageShell>
        <div className="grid gap-16 lg:grid-cols-2">
          <FaqColumn title="Methodological choices" subtitle="Built to be checked, not trusted blindly." items={methodology} />
          <FaqColumn title="Questions analysts ask before subscribing" subtitle="Direct answers before the pricing decision." items={questions} />
        </div>
      </PageShell>
    </section>
  );
}

function FaqColumn({ title, subtitle, items }: { title: string; subtitle: string; items: string[][] }) {
  return (
    <article>
      <h2 className="text-[32px] font-bold tracking-[-0.025em] text-[#061B36]">{title}</h2>
      <p className="mt-3 text-[15px] text-slate-600">{subtitle}</p>
      <div className="mt-8">
        {items.map(([question, answer]) => (
          <details key={question} className="group border-b border-slate-200 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-semibold text-[#061B36]">
              {question}
              <span className="shrink-0 text-[#B46A22] transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-4 text-[13px] font-normal leading-7 text-slate-700">{answer}</p>
          </details>
        ))}
      </div>
    </article>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function PricingSection({ publishedDays }: { publishedDays: string }) {
  const plans = [
    {
      title: "Free",
      price: "$0",
      period: "",
      note: "Public charts & sample JSON",
      bullets: ["Public chain context", "Sample JSON", "Limited history", "Community support"],
      cta: "Get started",
      href: "/status",
      featured: false,
    },
    {
      title: "Single Chain",
      price: "$49",
      period: "/mo",
      note: "One chain · full JSON",
      bullets: ["One chain of your choice", "Gold, Derived, Meta, Brief JSON", "Historical access", "Email support"],
      cta: "Choose a chain",
      href: "/api/v1/checkout?plan=basic",
      featured: false,
    },
    {
      title: "Full Access",
      price: "$149",
      period: "/mo",
      note: "All chains · full access",
      bullets: ["BTC, ETH, ARB, BASE", "Cross-chain Briefs", `${publishedDays} published-day archive`, "Priority support"],
      cta: "Get full access",
      href: "/api/v1/checkout?plan=pro",
      featured: true,
    },
  ];

  return (
    <section id="pricing" className="border-y border-[#061B36]/20 bg-[#DDE8F1] py-10 lg:py-12">
      <PageShell>
        <SectionTitle
          eyebrow="Pricing"
          title="Simple, transparent pricing"
          subtitle="All paid plans include daily Gold, Derived, Meta, and Brief JSON. Start free; upgrade when you need API access."
        />
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.title}
              className="relative rounded-2xl border border-[#6FB7E8]/70 bg-[#061B36] p-8 text-[#F7F3E8]"
            >
              <div className="text-[13px] font-black uppercase tracking-[0.08em] text-[#F7F3E8]">
                {plan.title}
              </div>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-[52px] font-black tracking-[-0.06em] text-[#F7F3E8]">{plan.price}</span>
                {plan.period ? <span className="mb-3 text-[16px] font-normal text-[#F7F3E8]/72">{plan.period}</span> : null}
              </div>
              <p className="mt-1 text-[13px] font-black text-[#6FB7E8]">{plan.note}</p>
              <ul className="mt-7 grid min-h-[120px] gap-3 text-[13px]">
                {plan.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-[#F7F3E8]/86">
                    <span className="text-[#B46A22]">✓</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-[#B46A22] py-3 text-[14px] font-bold text-[#F7F3E8] transition hover:bg-[#9f5f1f]"
              >
                {plan.cta} →
              </Link>
            </div>
          ))}
        </div>
      </PageShell>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 border-t border-slate-300 bg-[#DDE8F1] py-8">
      <PageShell className="flex flex-col gap-5 text-[13px] text-slate-600 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <img src="/web-bilder/ygg-transparent.png" alt="" className="h-7 w-7 object-contain opacity-40" />
          <span>© 2026 Urd Atlas. On-chain reference data. No price data. No forecasts. No recommendations.</span>
        </div>
        <div className="flex flex-wrap gap-5">
          <Link href="/status" className="hover:text-slate-700">Status</Link>
          <Link href="/privacy" className="hover:text-slate-700">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-700">Terms</Link>
          <Link href="/api-docs" className="hover:text-slate-700">Docs</Link>
        </div>
      </PageShell>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [bundle, dataset, historyDepthDays, samples] = await Promise.all([
    loadSiteBriefBundle(),
    readDatasetManifest().catch(() => null),
    computeHistoryDepthDays().catch(() => null),
    buildJsonSamples(),
  ]);

  const rows = await buildLatestContextRows(bundle);
  const briefExample = await buildBriefExample(bundle);
  const publishedDays =
    typeof historyDepthDays === "number" && Number.isFinite(historyDepthDays)
      ? historyDepthDays.toLocaleString("en-GB")
      : "published";
  const datasetStamp = datasetPublishedAt(dataset);

  return (
    <main className="min-h-screen bg-[#DDE8F1] text-[#061B36]">
      <HeroSection rows={rows} />

      {/* Publication marker */}
      <div className="border-y border-slate-200 bg-[#DDE8F1] py-3 text-center text-[11px] font-semibold text-slate-600">
        Dataset publication marker: {datasetStamp}. Data cadence is daily, not intraday.
      </div>

      {/* Alternating sections: white → slate-50 → white → slate-50 → dark → white → slate-50 → white */}
      <PathsSection />           {/* white */}
      <BriefContrastSection example={briefExample} />  {/* slate-50 */}
      <PipelineWorkflowSection />  {/* white */}
      <WhatYouReceiveSection />   {/* slate-50 */}
      <RegimeVocabularySection />  {/* dark navy */}
      <JsonSamplesSection samples={samples} />  {/* white + dark inner */}
      <MethodologyFaqSection />   {/* slate-50 */}
      <PricingSection publishedDays={publishedDays} />  {/* white */}
      <SiteFooter />
    </main>
  );
}
