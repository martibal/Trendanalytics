import CheckoutRedirectGuard from "@/components/home/CheckoutRedirectGuard";
import InteractiveHomeDashboard, { type HomeChainSnapshot, type HomeLabel } from "@/components/home/InteractiveHomeDashboard";
import { readStorageObject } from "@/lib/storage";

export const revalidate = 0;

type ArtifactName = "Meta" | "Gold" | "Derived" | "Briefs";

type MetaLatest = {
  chain?: string;
  date?: string;
  updated_through?: string;
  status?: {
    label?: string;
    one_liner?: string;
  };
  regime?: {
    label?: string;
    asof_date?: string;
  };
  confidence?: {
    confidence_score?: number;
    data_quality_score?: number;
    label_confidence_score?: number;
    lag_days_vs_utc_today?: number;
  };
  scorecard?: {
    dimensions?: {
      demand?: { score?: number; label?: string };
      friction?: { score?: number; label?: string };
      capacity?: { score?: number; label?: string };
    };
  };
  methodology_version?: string;
};

type DatasetJson = {
  published_at?: string;
  computed_at_utc?: string;
};

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

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function normalizeDimensionLabel(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

async function getArtifacts(chainId: string): Promise<Record<ArtifactName, unknown | null>> {
  const [meta, gold, derived, briefs] = await Promise.all([
    readJson<unknown>(`data/published/v1/meta/${chainId}/latest.json`),
    readJson<unknown>(`data/published/v1/gold/${chainId}/latest.json`),
    readJson<unknown>(`data/published/v1/derived/${chainId}/latest.json`),
    readJson<unknown>(`data/published/v1/briefs/chains/${chainId}/latest.json`),
  ]);

  return {
    Meta: meta,
    Gold: gold,
    Derived: derived,
    Briefs: briefs,
  };
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
    dataQuality: typeof meta?.confidence?.data_quality_score === "number" ? meta.confidence.data_quality_score : null,
    labelConfidence: typeof meta?.confidence?.label_confidence_score === "number" ? meta.confidence.label_confidence_score : null,
    asOf: formatDate(meta?.date ?? meta?.updated_through ?? meta?.regime?.asof_date),
    oneLiner:
      meta?.status?.one_liner ??
      `${chain.name} latest published network-state row is ${regime}.`,
    demand: typeof dimensions?.demand?.score === "number" ? dimensions.demand.score : null,
    demandLabel: normalizeDimensionLabel(dimensions?.demand?.label, "Demand context"),
    friction: typeof dimensions?.friction?.score === "number" ? dimensions.friction.score : null,
    frictionLabel: normalizeDimensionLabel(dimensions?.friction?.label, "Friction context"),
    capacity: typeof dimensions?.capacity?.score === "number" ? dimensions.capacity.score : null,
    capacityLabel: normalizeDimensionLabel(dimensions?.capacity?.label, "Capacity context"),
    methodologyVersion: meta?.methodology_version ?? "—",
    artifacts,
  };
}

async function getLastRun(): Promise<string> {
  const dataset = await readJson<DatasetJson>("data/published/v1/dataset.json");
  return formatDate(dataset?.published_at ?? dataset?.computed_at_utc);
}

export default async function HomePage() {
  const [snapshots, lastRun] = await Promise.all([
    Promise.all(CHAINS.map((chain) => getSnapshot(chain))),
    getLastRun(),
  ]);

  return (
    <>
      <CheckoutRedirectGuard />
      <InteractiveHomeDashboard snapshots={snapshots} lastRun={lastRun} />
    </>
  );
}
