import CheckoutRedirectGuard from "@/components/home/CheckoutRedirectGuard";
import InteractiveHomeDashboard, { type HomeChainSnapshot, type HomeConfidenceExample, type HomeLabel } from "@/components/home/InteractiveHomeDashboard";
import type { HeroPanelSnapshot } from "@/components/home/HeroNetworkStatePanel";
import { readStorageObject } from "@/lib/storage";

export const revalidate = 0;

type ArtifactName = "Meta" | "Gold" | "Derived" | "Briefs";
type ScoreShape = number | { score?: number; label?: string } | undefined;

type MetaLatest = {
  chain?: string;
  date?: string;
  updated_through?: string;
  status?: { label?: string; one_liner?: string };
  regime?: { label?: string; asof_date?: string; demand_score?: number; friction_score?: number; capacity_score?: number };
  confidence?: { confidence_score?: number; data_quality_score?: number; label_confidence_score?: number; lag_days_vs_utc_today?: number };
  scorecard?: {
    demand?: ScoreShape;
    friction?: ScoreShape;
    capacity?: ScoreShape;
    dimensions?: {
      demand?: { score?: number; label?: string };
      friction?: { score?: number; label?: string };
      capacity?: { score?: number; label?: string };
    };
  };
  methodology_version?: string;
};

type DatasetJson = { published_at?: string; computed_at_utc?: string };

const CHAINS = [
  { id: "bitcoin", ticker: "BTC", name: "Bitcoin", lag: "T+1" },
  { id: "ethereum", ticker: "ETH", name: "Ethereum", lag: "T+1" },
  { id: "arbitrum", ticker: "ARB", name: "Arbitrum", lag: "T+7" },
  { id: "base", ticker: "BASE", name: "Base", lag: "T+7" },
] as const;

const DATASET_START_DATE = "2024-12-01";

const BITCOIN_META_HISTORY_PATHS = [
  "data/published/v1/meta/bitcoin/history.json",
  "data/published/v1/meta/bitcoin/all.json",
  "data/published/v1/meta/bitcoin/daily.json",
  "data/published/v1/meta/bitcoin/rows.json",
  "data/published/v1/meta/bitcoin/timeseries.json",
  "data/published/v1/meta/bitcoin/last1000d.json",
  "data/published/v1/meta/bitcoin/last730d.json",
  "data/published/v1/meta/bitcoin/last365d.json",
  "data/published/v1/meta/bitcoin/last180d.json",
  "data/published/v1/meta/bitcoin/last90d.json",
  "data/published/v1/meta/bitcoin/last30d.json",
  "data/published/v1/meta/bitcoin/last7d.json",
] as const;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readJson<T>(storagePath: string): Promise<T | null> {
  try {
    const result = await readStorageObject(storagePath);
    if (!result) return null;
    const raw = arrayBufferToUtf8(result.body);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as T;
  } catch {
    return null;
  }
}

function normalizeLabel(raw: string | undefined): HomeLabel {
  const label = (raw ?? "").toUpperCase();
  if (label === "STABLE") return "STABLE";
  if (label === "HEATING") return "HEATING";
  if (label === "CONGESTED") return "CONGESTED";
  if (label === "CHEAP") return "CHEAP";
  return "UNKNOWN/DEGRADED";
}

function pct(value: number | undefined | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function rawDate(row: MetaLatest): string {
  return row.date ?? row.updated_through ?? row.regime?.asof_date ?? "";
}

function normalizeDimensionLabel(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.toLowerCase().split(/[_\s-]+/).filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scoreValue(value: ScoreShape): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object") return numberOrNull(value.score);
  return null;
}

function score(row: MetaLatest, axis: "demand" | "friction" | "capacity"): number | null {
  if (axis === "demand") return numberOrNull(row.regime?.demand_score) ?? numberOrNull(row.scorecard?.dimensions?.demand?.score) ?? scoreValue(row.scorecard?.demand);
  if (axis === "friction") return numberOrNull(row.regime?.friction_score) ?? numberOrNull(row.scorecard?.dimensions?.friction?.score) ?? scoreValue(row.scorecard?.friction);
  return numberOrNull(row.regime?.capacity_score) ?? numberOrNull(row.scorecard?.dimensions?.capacity?.score) ?? scoreValue(row.scorecard?.capacity);
}

function extractRows(value: unknown): MetaLatest[] {
  if (Array.isArray(value)) return value.filter((row): row is MetaLatest => Boolean(row) && typeof row === "object");
  if (!value || typeof value !== "object") return [];
  const candidate = value as { rows?: unknown; data?: unknown; items?: unknown; records?: unknown };
  for (const key of [candidate.rows, candidate.data, candidate.items, candidate.records]) {
    if (Array.isArray(key)) return key.filter((row): row is MetaLatest => Boolean(row) && typeof row === "object");
  }
  return [];
}

function utcDayNumber(value: string): number | null {
  const datePart = value.includes("T") ? value.slice(0, 10) : value;
  const parsed = new Date(`${datePart}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor(parsed.getTime() / ONE_DAY_MS);
}

function formatDayNumber(value: number): string {
  return new Date(value * ONE_DAY_MS).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function datasetDailyWindow(rows: MetaLatest[], latest: MetaLatest | null): { count: number | null; firstPublishedLabel: string | null } {
  const observedDays = Array.from(new Set(rows.map((row) => utcDayNumber(rawDate(row))).filter((value): value is number => typeof value === "number"))).sort((a, b) => a - b);
  const latestDay = utcDayNumber(latest ? rawDate(latest) : "") ?? observedDays.at(-1) ?? null;
  const canonicalStartDay = utcDayNumber(DATASET_START_DATE);

  if (latestDay == null || canonicalStartDay == null || latestDay < canonicalStartDay) {
    return { count: null, firstPublishedLabel: null };
  }

  const earliestObservedDay = observedDays[0] ?? null;
  const firstDay = earliestObservedDay != null && earliestObservedDay < canonicalStartDay ? earliestObservedDay : canonicalStartDay;

  return {
    count: latestDay - firstDay + 1,
    firstPublishedLabel: formatDayNumber(firstDay),
  };
}

function formatMethodologyVersion(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^v/i.test(trimmed) ? trimmed : `v${trimmed}`;
}

async function getBitcoinMetaHistory(): Promise<MetaLatest[]> {
  for (const path of BITCOIN_META_HISTORY_PATHS) {
    const payload = await readJson<unknown>(path);
    const rows = extractRows(payload);
    if (rows.length > 0) return rows.filter((row) => rawDate(row));
  }
  const latest = await readJson<MetaLatest>("data/published/v1/meta/bitcoin/latest.json");
  return latest && rawDate(latest) ? [latest] : [];
}

async function getDatasetGlance(): Promise<HeroPanelSnapshot> {
  const [historyRows, latest] = await Promise.all([
    getBitcoinMetaHistory(),
    readJson<MetaLatest>("data/published/v1/meta/bitcoin/latest.json"),
  ]);
  const window = datasetDailyWindow(historyRows, latest);
  const latestFromHistory = [...historyRows].sort((a, b) => rawDate(a).localeCompare(rawDate(b))).at(-1);

  return {
    consecutiveRows: window.count,
    firstPublishedLabel: window.firstPublishedLabel,
    methodologyVersionLabel: formatMethodologyVersion(latest?.methodology_version ?? latestFromHistory?.methodology_version),
  };
}

async function getArtifacts(chainId: string): Promise<Record<ArtifactName, unknown | null>> {
  const [meta, gold, derived, briefs] = await Promise.all([
    readJson<unknown>(`data/published/v1/meta/${chainId}/latest.json`),
    readJson<unknown>(`data/published/v1/gold/${chainId}/latest.json`),
    readJson<unknown>(`data/published/v1/derived/${chainId}/latest.json`),
    readJson<unknown>(`data/published/v1/briefs/chains/${chainId}/latest.json`),
  ]);
  return { Meta: meta, Gold: gold, Derived: derived, Briefs: briefs };
}

async function getSnapshot(chain: (typeof CHAINS)[number]): Promise<HomeChainSnapshot> {
  const artifacts = await getArtifacts(chain.id);
  const meta = artifacts.Meta as MetaLatest | null;
  const regime = normalizeLabel(meta?.status?.label ?? meta?.regime?.label);
  const dimensions = meta?.scorecard?.dimensions;
  const confidenceValue = typeof meta?.confidence?.confidence_score === "number" ? meta.confidence.confidence_score : null;

  return {
    id: chain.id,
    ticker: chain.ticker,
    name: chain.name,
    lag: chain.lag,
    regime,
    confidence: pct(confidenceValue),
    confidenceValue,
    dataQuality: numberOrNull(meta?.confidence?.data_quality_score),
    labelConfidence: numberOrNull(meta?.confidence?.label_confidence_score),
    asOf: formatDate(meta?.date ?? meta?.updated_through ?? meta?.regime?.asof_date),
    oneLiner: meta?.status?.one_liner ?? `${chain.name} latest published network-state row is ${regime}.`,
    demand: typeof dimensions?.demand?.score === "number" ? dimensions.demand.score : score(meta ?? {}, "demand"),
    demandLabel: normalizeDimensionLabel(dimensions?.demand?.label, "Demand context"),
    friction: typeof dimensions?.friction?.score === "number" ? dimensions.friction.score : score(meta ?? {}, "friction"),
    frictionLabel: normalizeDimensionLabel(dimensions?.friction?.label, "Friction context"),
    capacity: typeof dimensions?.capacity?.score === "number" ? dimensions.capacity.score : score(meta ?? {}, "capacity"),
    capacityLabel: normalizeDimensionLabel(dimensions?.capacity?.label, "Capacity context"),
    methodologyVersion: meta?.methodology_version ?? "—",
    artifacts,
  };
}

async function getMetaRows(chainId: string): Promise<MetaLatest[]> {
  for (const windowName of ["last365d", "last180d", "last90d", "last30d", "last7d"]) {
    const rows = await readJson<MetaLatest[]>(`data/published/v1/meta/${chainId}/${windowName}.json`);
    if (Array.isArray(rows) && rows.length > 0) return rows.filter((row) => row && rawDate(row));
  }
  const latest = await readJson<MetaLatest>(`data/published/v1/meta/${chainId}/latest.json`);
  return latest ? [latest] : [];
}

function toExample(kind: "high" | "low", row: MetaLatest, chain: (typeof CHAINS)[number], fullPayload: unknown): HomeConfidenceExample {
  return {
    kind,
    chain: chain.id,
    chainLabel: chain.name,
    date: formatDate(rawDate(row)),
    sourceDate: rawDate(row),
    regime: normalizeLabel(row.status?.label ?? row.regime?.label),
    confidenceScore: numberOrNull(row.confidence?.confidence_score),
    dataQualityScore: numberOrNull(row.confidence?.data_quality_score),
    labelConfidenceScore: numberOrNull(row.confidence?.label_confidence_score),
    demandScore: score(row, "demand"),
    frictionScore: score(row, "friction"),
    capacityScore: score(row, "capacity"),
    dataLag: chain.lag,
    oneLiner: row.status?.one_liner ?? `${chain.name} published ${normalizeLabel(row.status?.label ?? row.regime?.label)} for ${formatDate(rawDate(row))}.`,
    fullPayload,
  };
}

async function getConfidenceExamples(): Promise<{ high: HomeConfidenceExample | null; low: HomeConfidenceExample | null }> {
  const allRows: Array<{ row: MetaLatest; chain: (typeof CHAINS)[number]; confidence: number }> = [];
  for (const chain of CHAINS) {
    const rows = await getMetaRows(chain.id);
    for (const row of rows) {
      const confidence = numberOrNull(row.confidence?.confidence_score);
      if (confidence != null) allRows.push({ row, chain, confidence });
    }
  }
  if (allRows.length === 0) return { high: null, low: null };
  const high = [...allRows].sort((a, b) => b.confidence - a.confidence)[0];
  const low = [...allRows].sort((a, b) => a.confidence - b.confidence)[0];
  const [highPayload, lowPayload] = await Promise.all([
    high ? readJson<unknown>(`data/published/v1/meta/${high.chain.id}/${rawDate(high.row)}.json`) : Promise.resolve(null),
    low ? readJson<unknown>(`data/published/v1/meta/${low.chain.id}/${rawDate(low.row)}.json`) : Promise.resolve(null),
  ]);
  return {
    high: high ? toExample("high", high.row, high.chain, highPayload ?? high.row) : null,
    low: low ? toExample("low", low.row, low.chain, lowPayload ?? low.row) : null,
  };
}

async function getLastRun(): Promise<string> {
  const dataset = await readJson<DatasetJson>("data/published/v1/dataset.json");
  return formatDate(dataset?.published_at ?? dataset?.computed_at_utc);
}

export default async function HomePage() {
  const [snapshots, lastRun, examples, heroSnapshot] = await Promise.all([
    Promise.all(CHAINS.map((chain) => getSnapshot(chain))),
    getLastRun(),
    getConfidenceExamples(),
    getDatasetGlance(),
  ]);

  return (
    <>
      <CheckoutRedirectGuard />
      <InteractiveHomeDashboard
        snapshots={snapshots}
        lastRun={lastRun}
        examples={examples}
        heroSnapshot={heroSnapshot}
      />
    </>
  );
}
