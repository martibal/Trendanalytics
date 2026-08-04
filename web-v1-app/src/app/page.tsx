import CheckoutRedirectGuard from "@/components/home/CheckoutRedirectGuard";
import InteractiveHomeDashboard, { type HomeChainSnapshot, type HomeConfidenceExample, type HomeLabel } from "@/components/home/InteractiveHomeDashboard";
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
  for (const window of ["last365d", "last180d", "last90d", "last30d", "last7d"]) {
    const rows = await readJson<MetaLatest[]>(`data/published/v1/meta/${chainId}/${window}.json`);
    if (Array.isArray(rows) && rows.length > 0) return rows.filter((row) => row && rawDate(row));
  }
  const latest = await readJson<MetaLatest>(`data/published/v1/meta/${chainId}/latest.json`);
  return latest ? [latest] : [];
}

function toExample(kind: "high" | "low", row: MetaLatest, chain: (typeof CHAINS)[number]): HomeConfidenceExample {
  return {
    kind,
    chain: chain.id,
    chainLabel: chain.name,
    date: formatDate(rawDate(row)),
    regime: normalizeLabel(row.status?.label ?? row.regime?.label),
    confidenceScore: numberOrNull(row.confidence?.confidence_score),
    dataQualityScore: numberOrNull(row.confidence?.data_quality_score),
    labelConfidenceScore: numberOrNull(row.confidence?.label_confidence_score),
    demandScore: score(row, "demand"),
    frictionScore: score(row, "friction"),
    capacityScore: score(row, "capacity"),
    dataLag: chain.lag,
    oneLiner: row.status?.one_liner ?? `${chain.name} published ${normalizeLabel(row.status?.label ?? row.regime?.label)} for ${formatDate(rawDate(row))}.`,
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
  return { high: high ? toExample("high", high.row, high.chain) : null, low: low ? toExample("low", low.row, low.chain) : null };
}

async function getLastRun(): Promise<string> {
  const dataset = await readJson<DatasetJson>("data/published/v1/dataset.json");
  return formatDate(dataset?.published_at ?? dataset?.computed_at_utc);
}

export default async function HomePage() {
  const [snapshots, lastRun, examples] = await Promise.all([
    Promise.all(CHAINS.map((chain) => getSnapshot(chain))),
    getLastRun(),
    getConfidenceExamples(),
  ]);
  const ethereumSnapshot = snapshots.find((snapshot) => snapshot.id === "ethereum") ?? snapshots[1] ?? snapshots[0];

  return (
    <>
      <CheckoutRedirectGuard />
      <InteractiveHomeDashboard
        snapshots={snapshots}
        lastRun={lastRun}
        examples={examples}
        heroSnapshot={ethereumSnapshot ? {
          name: ethereumSnapshot.name,
          asOf: ethereumSnapshot.asOf,
          lag: ethereumSnapshot.lag,
          regime: ethereumSnapshot.regime,
          confidence: ethereumSnapshot.confidence,
          confidenceValue: ethereumSnapshot.confidenceValue,
          oneLiner: ethereumSnapshot.oneLiner,
        } : undefined}
      />
    </>
  );
}
