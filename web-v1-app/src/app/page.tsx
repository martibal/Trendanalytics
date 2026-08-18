import CheckoutRedirectGuard from "@/components/home/CheckoutRedirectGuard";
import EditorialReferenceInstrument, {
  type Artifact,
  type HeroSnapshot,
  type HomeChainSnapshot,
  type HomeConfidenceExample,
  type HomeHistoryPoint,
  type HomeLabel,
} from "@/components/home/EditorialReferenceInstrument";
import { readStorageObject } from "@/lib/storage";

export const revalidate = 0;

type ScoreShape = number | { score?: number; label?: string } | undefined;
type MetaLatest = {
  chain?: string;
  date?: string;
  updated_through?: string;
  status?: { label?: string; one_liner?: string };
  regime?: { label?: string; asof_date?: string; demand_score?: number; friction_score?: number; capacity_score?: number; drivers?: unknown[] };
  confidence?: { confidence_score?: number; data_quality_score?: number; label_confidence_score?: number; lag_days_vs_utc_today?: number };
  scorecard?: {
    demand?: ScoreShape; friction?: ScoreShape; capacity?: ScoreShape;
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
const ONE_DAY_MS = 86_400_000;
const BITCOIN_META_HISTORY_PATHS = [
  "data/published/v1/meta/bitcoin/history.json", "data/published/v1/meta/bitcoin/all.json", "data/published/v1/meta/bitcoin/daily.json",
  "data/published/v1/meta/bitcoin/rows.json", "data/published/v1/meta/bitcoin/timeseries.json", "data/published/v1/meta/bitcoin/last1000d.json",
  "data/published/v1/meta/bitcoin/last730d.json", "data/published/v1/meta/bitcoin/last365d.json",
] as const;

function arrayBufferToUtf8(buffer: ArrayBuffer) { return new TextDecoder("utf-8").decode(new Uint8Array(buffer)); }
async function readJson<T>(path: string): Promise<T | null> {
  try { const result = await readStorageObject(path); if (!result) return null; const parsed = JSON.parse(arrayBufferToUtf8(result.body)); return parsed && typeof parsed === "object" ? parsed as T : null; } catch { return null; }
}
function normalizeLabel(raw?: string): HomeLabel {
  const label = (raw ?? "").toUpperCase();
  return ["STABLE", "HEATING", "CONGESTED", "CHEAP"].includes(label) ? label as HomeLabel : "UNKNOWN/DEGRADED";
}
function numberOrNull(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function scoreValue(value: ScoreShape) { return typeof value === "number" ? value : value && typeof value === "object" ? numberOrNull(value.score) : null; }
function score(row: MetaLatest, axis: "demand" | "friction" | "capacity") {
  const direct = axis === "demand" ? row.regime?.demand_score : axis === "friction" ? row.regime?.friction_score : row.regime?.capacity_score;
  return numberOrNull(direct) ?? numberOrNull(row.scorecard?.dimensions?.[axis]?.score) ?? scoreValue(row.scorecard?.[axis]);
}
function rawDate(row: MetaLatest) { return (row.date ?? row.updated_through ?? row.regime?.asof_date ?? "").slice(0, 10); }
function formatDate(value?: string) {
  if (!value) return "—"; const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
function pct(value: number | null) { return value == null ? "—" : `${Math.round(value * 100)}%`; }
function extractRows(value: unknown): MetaLatest[] {
  if (Array.isArray(value)) return value.filter((v): v is MetaLatest => !!v && typeof v === "object");
  if (!value || typeof value !== "object") return [];
  const obj = value as Record<string, unknown>;
  for (const key of ["rows", "data", "items", "records"]) if (Array.isArray(obj[key])) return (obj[key] as unknown[]).filter((v): v is MetaLatest => !!v && typeof v === "object");
  return [];
}
function utcDay(value: string) { const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`); return Number.isNaN(parsed.getTime()) ? null : Math.floor(parsed.getTime() / ONE_DAY_MS); }
function formatDay(day: number) { return new Date(day * ONE_DAY_MS).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); }

async function getBitcoinMetaHistory() {
  for (const path of BITCOIN_META_HISTORY_PATHS) { const payload = await readJson<unknown>(path); const rows = extractRows(payload).filter((r) => rawDate(r)); if (rows.length) return rows; }
  const latest = await readJson<MetaLatest>("data/published/v1/meta/bitcoin/latest.json"); return latest ? [latest] : [];
}
async function getDatasetGlance(): Promise<HeroSnapshot> {
  const [rows, latest] = await Promise.all([getBitcoinMetaHistory(), readJson<MetaLatest>("data/published/v1/meta/bitcoin/latest.json")]);
  const latestDay = utcDay(rawDate(latest ?? {}) || rawDate(rows.at(-1) ?? {})); const start = utcDay(DATASET_START_DATE);
  const count = latestDay != null && start != null && latestDay >= start ? latestDay - start + 1 : null;
  const version = latest?.methodology_version ?? rows.at(-1)?.methodology_version ?? null;
  return { consecutiveRows: count, firstPublishedLabel: start == null ? null : formatDay(start), methodologyVersionLabel: version ? (/^v/i.test(version) ? version : `v${version}`) : null };
}
async function getArtifacts(chain: string): Promise<Record<Artifact, unknown | null>> {
  const [Meta, Gold, Derived, Briefs] = await Promise.all([
    readJson(`data/published/v1/meta/${chain}/latest.json`), readJson(`data/published/v1/gold/${chain}/latest.json`),
    readJson(`data/published/v1/derived/${chain}/latest.json`), readJson(`data/published/v1/briefs/chains/${chain}/latest.json`),
  ]);
  return { Meta, Gold, Derived, Briefs };
}
async function getSnapshot(chain: (typeof CHAINS)[number]): Promise<HomeChainSnapshot> {
  const artifacts = await getArtifacts(chain.id); const meta = artifacts.Meta as MetaLatest | null; const dateIso = rawDate(meta ?? {});
  const confidence = numberOrNull(meta?.confidence?.confidence_score); const regime = normalizeLabel(meta?.status?.label ?? meta?.regime?.label);
  return {
    id: chain.id, ticker: chain.ticker, name: chain.name, lag: chain.lag, regime, confidence: pct(confidence), confidenceValue: confidence,
    dataQuality: numberOrNull(meta?.confidence?.data_quality_score), labelConfidence: numberOrNull(meta?.confidence?.label_confidence_score), dateIso,
    asOf: formatDate(dateIso), oneLiner: meta?.status?.one_liner ?? `${chain.name} latest published state is ${regime}.`,
    demand: score(meta ?? {}, "demand"), friction: score(meta ?? {}, "friction"), capacity: score(meta ?? {}, "capacity"),
    methodologyVersion: meta?.methodology_version ?? "—", artifacts,
  };
}
function toHistoryPoint(row: MetaLatest, chain: string): HomeHistoryPoint {
  return { chain, date: rawDate(row), regime: normalizeLabel(row.status?.label ?? row.regime?.label), confidence: numberOrNull(row.confidence?.confidence_score),
    dataQuality: numberOrNull(row.confidence?.data_quality_score), labelConfidence: numberOrNull(row.confidence?.label_confidence_score),
    oneLiner: row.status?.one_liner ?? "Published network-state observation.", demand: score(row, "demand"), friction: score(row, "friction"), capacity: score(row, "capacity") };
}
async function getHistory(chain: (typeof CHAINS)[number]): Promise<HomeHistoryPoint[]> {
  for (const windowName of ["last90d", "last180d", "last365d"]) {
    const payload = await readJson<unknown>(`data/published/v1/meta/${chain.id}/${windowName}.json`); const rows = extractRows(payload).filter((r) => rawDate(r));
    if (rows.length) return rows.slice(-90).map((row) => toHistoryPoint(row, chain.id));
  }
  const latest = await readJson<MetaLatest>(`data/published/v1/meta/${chain.id}/latest.json`); return latest ? [toHistoryPoint(latest, chain.id)] : [];
}
function toExample(kind: "high" | "low", row: MetaLatest, chain: (typeof CHAINS)[number], payload: unknown): HomeConfidenceExample {
  return { ...toHistoryPoint(row, chain.id), kind, chainLabel: chain.name, dataLag: chain.lag, fullPayload: payload };
}
async function exactExample(kind: "high" | "low", chain: (typeof CHAINS)[number], date: string) {
  const payload = await readJson<MetaLatest>(`data/published/v1/meta/${chain.id}/${date}.json`); return payload ? toExample(kind, payload, chain, payload) : null;
}
async function getConfidenceExamples() {
  const bitcoin = CHAINS[0];
  const [high, low] = await Promise.all([exactExample("high", bitcoin, "2025-03-09"), exactExample("low", bitcoin, "2025-01-16")]);
  if (high && low) return { high, low };
  const history = await getBitcoinMetaHistory(); const scored = history.map((row) => ({ row, score: numberOrNull(row.confidence?.confidence_score) })).filter((x): x is { row: MetaLatest; score: number } => x.score != null);
  const highRow = [...scored].sort((a, b) => b.score - a.score)[0]?.row; const lowRow = [...scored].sort((a, b) => a.score - b.score)[0]?.row;
  return { high: high ?? (highRow ? toExample("high", highRow, bitcoin, highRow) : null), low: low ?? (lowRow ? toExample("low", lowRow, bitcoin, lowRow) : null) };
}
async function getLastRun() { const dataset = await readJson<DatasetJson>("data/published/v1/dataset.json"); return formatDate(dataset?.published_at ?? dataset?.computed_at_utc); }

export default async function HomePage() {
  const [snapshots, historyPairs, lastRun, examples, heroSnapshot] = await Promise.all([
    Promise.all(CHAINS.map(getSnapshot)), Promise.all(CHAINS.map(async (chain) => [chain.id, await getHistory(chain)] as const)), getLastRun(), getConfidenceExamples(), getDatasetGlance(),
  ]);
  const histories = Object.fromEntries(historyPairs) as Record<string, HomeHistoryPoint[]>;
  return <><CheckoutRedirectGuard /><EditorialReferenceInstrument snapshots={snapshots} histories={histories} lastRun={lastRun} examples={examples} heroSnapshot={heroSnapshot} /></>;
}
