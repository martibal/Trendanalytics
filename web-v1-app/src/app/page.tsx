// src/app/page.tsx
import { readStorageObject } from "@/lib/storage";
import UrdAtlasVFinalLandingClient from "@/components/landing/UrdAtlasVFinalLandingClient";
import type {
  LandingBriefData,
  LandingChainData,
} from "@/components/landing/UrdAtlasVFinalLandingClient";

export const revalidate = 0;

// ---------------------------------------------------------------------------
// Types matching published JSON structure
// ---------------------------------------------------------------------------

type MetaLatest = {
  chain?: string;
  date?: string;
  status?: {
    label?: string;
    one_liner?: string;
  };
  confidence?: {
    confidence_score?: number;
  };
  regime?: {
    label?: string;
    asof_date?: string;
  };
  updated_through?: string;
};

type MetaWindowRow = {
  chain?: string;
  date?: string;
  status?: {
    label?: string;
    one_liner?: string;
  };
  confidence?: {
    confidence_score?: number;
  };
  regime?: {
    label?: string;
    asof_date?: string;
  };
  updated_through?: string;
};

type HeroJson = {
  display_asof?: string;
  asof?: {
    display?: string;
    latest_available?: string;
    gold?: string;
    derived?: string;
    meta?: string;
  };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const CHAIN_MAP: Record<
  string,
  { key: string; label: string; icon: string; fullName: string }
> = {
  bitcoin: {
    key: "btc",
    label: "BTC",
    icon: "₿",
    fullName: "Bitcoin",
  },
  ethereum: {
    key: "eth",
    label: "ETH",
    icon: "Ξ",
    fullName: "Ethereum",
  },
  arbitrum: {
    key: "arb",
    label: "ARB",
    icon: "A",
    fullName: "Arbitrum",
  },
  base: {
    key: "base",
    label: "BASE",
    icon: "B",
    fullName: "Base",
  },
};

const CHAINS_ORDER = ["bitcoin", "ethereum", "arbitrum", "base"];

type Label = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";

function normalizeLabel(raw: string | undefined): Label {
  const upper = (raw ?? "").toUpperCase();

  if (upper === "STABLE") return "STABLE";
  if (upper === "HEATING") return "HEATING";
  if (upper === "CONGESTED") return "CONGESTED";
  if (upper === "CHEAP") return "CHEAP";

  return "UNKNOWN/DEGRADED";
}

function labelForSentence(label: Label): string {
  if (label === "UNKNOWN/DEGRADED") return "unknown/degraded";
  return label.toLowerCase();
}

function fmtConfidencePct(score: number | undefined): string {
  if (score == null || Number.isNaN(score)) return "—";
  return `${Math.round(score * 100)}%`;
}

function fmtConfidenceDecimal(score: number | undefined): string {
  if (score == null || Number.isNaN(score)) return "—";
  return score.toFixed(3);
}

function sparklineFromConfidence(confidence: number): number[] {
  const base = Math.round(confidence * 100);

  return Array.from({ length: 10 }, (_, i) =>
    Math.max(10, Math.min(90, base + Math.round(Math.sin(i * 0.9) * 8))),
  );
}

function dateFromRow(row: MetaWindowRow): string {
  return row.date ?? row.updated_through ?? row.regime?.asof_date ?? "";
}

function sortedMetaRows(rows: MetaWindowRow[]): MetaWindowRow[] {
  return [...rows].sort((a, b) => dateFromRow(a).localeCompare(dateFromRow(b)));
}

function formatBriefPathDate(date: string): string {
  if (!date) return "—";

  try {
    const parsed = new Date(`${date}T00:00:00Z`);

    if (Number.isNaN(parsed.getTime())) return date;

    return parsed.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  } catch {
    return date;
  }
}

function countLabelChanges(labels: Label[]): number {
  if (labels.length < 2) return 0;

  let changes = 0;

  for (let i = 1; i < labels.length; i += 1) {
    if (labels[i] !== labels[i - 1]) changes += 1;
  }

  return changes;
}

function latestRunDays(labels: Label[]): number {
  if (labels.length === 0) return 0;

  const latest = labels[labels.length - 1];
  let run = 0;

  for (let i = labels.length - 1; i >= 0; i -= 1) {
    if (labels[i] !== latest) break;
    run += 1;
  }

  return run;
}

function dominantLabel(labels: Label[]): Label {
  if (labels.length === 0) return "UNKNOWN/DEGRADED";

  const counts = new Map<Label, number>();

  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  let best: Label = labels[0];
  let bestCount = counts.get(best) ?? 0;

  for (const label of labels) {
    const count = counts.get(label) ?? 0;

    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }

  return best;
}

function averageConfidence(rows: MetaWindowRow[]): number | undefined {
  const values = rows
    .map((row) => row.confidence?.confidence_score)
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

  if (values.length === 0) return undefined;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function buildChainData(): Promise<LandingChainData[]> {
  const results: LandingChainData[] = [];

  for (const chainId of CHAINS_ORDER) {
    const info = CHAIN_MAP[chainId];
    const meta = await readJson<MetaLatest>(
      `data/published/v1/meta/${chainId}/latest.json`,
    );

    const label = normalizeLabel(meta?.status?.label ?? meta?.regime?.label);
    const confidenceScore = meta?.confidence?.confidence_score ?? 0;

    results.push({
      key: info.key,
      label: info.label,
      icon: info.icon,
      fullName: info.fullName,
      chainId,
      regime: label,
      confidence: fmtConfidencePct(confidenceScore),
      oneLiner: meta?.status?.one_liner ?? "",
      path: sparklineFromConfidence(confidenceScore),
    });
  }

  return results;
}

async function buildBriefData(): Promise<Record<string, LandingBriefData>> {
  const result: Record<string, LandingBriefData> = {};

  for (const chainId of CHAINS_ORDER) {
    const info = CHAIN_MAP[chainId];

    const [metaLatest, metaLast7Raw] = await Promise.all([
      readJson<MetaLatest>(`data/published/v1/meta/${chainId}/latest.json`),
      readJson<MetaWindowRow[]>(`data/published/v1/meta/${chainId}/last7d.json`),
    ]);

    const metaLast7 = Array.isArray(metaLast7Raw)
      ? sortedMetaRows(metaLast7Raw)
      : [];

    const path =
      metaLast7.length > 0
        ? metaLast7.map((row, index) => ({
            date: formatBriefPathDate(dateFromRow(row)),
            label: normalizeLabel(row.status?.label ?? row.regime?.label),
            isLatest: index === metaLast7.length - 1,
          }))
        : [
            {
              date: formatBriefPathDate(
                metaLatest?.date ??
                  metaLatest?.updated_through ??
                  metaLatest?.regime?.asof_date ??
                  "",
              ),
              label: normalizeLabel(metaLatest?.status?.label ?? metaLatest?.regime?.label),
              isLatest: true,
            },
          ];

    const labels = path.map((point) => point.label);
    const latestLabel = labels[labels.length - 1] ?? normalizeLabel(
      metaLatest?.status?.label ?? metaLatest?.regime?.label,
    );

    const dominant = dominantLabel(labels);
    const changes = countLabelChanges(labels);
    const run = latestRunDays(labels);

    const latestConfidence =
      metaLatest?.confidence?.confidence_score ?? averageConfidence(metaLast7);

    const latestOneLiner = metaLatest?.status?.one_liner ?? "";
    const isMixed = changes > 0;
    const latestDate =
      metaLatest?.date ?? metaLatest?.updated_through ?? metaLatest?.regime?.asof_date;

    result[info.key] = {
      title: info.fullName,
      headline: isMixed
        ? `${info.fullName} showed a mixed regime path across the latest ${path.length} published days.`
        : `${info.fullName} remained ${labelForSentence(
            latestLabel,
          )} across the latest published context.`,
      dominant,
      confidence: fmtConfidenceDecimal(latestConfidence),
      changes: String(changes),
      run: String(run),
      path,
      plain:
        latestOneLiner ||
        (latestDate
          ? `${info.fullName}'s latest published meta row is ${labelForSentence(
              latestLabel,
            )} as of ${latestDate}.`
          : `${info.fullName}'s latest published meta row is ${labelForSentence(latestLabel)}.`),
    };
  }

  return result;
}

async function buildUpdatedThrough(): Promise<string> {
  const hero = await readJson<HeroJson>(
    "data/published/v1/landing/bitcoin/hero.json",
  );

  const date =
    hero?.display_asof ??
    hero?.asof?.display ??
    hero?.asof?.latest_available ??
    hero?.asof?.gold ??
    hero?.asof?.derived ??
    hero?.asof?.meta ??
    null;

  if (!date) return "—";

  try {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return date;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function buildPipelineDays(): number {
  // Pipeline started December 2024. Calculate days from then to today.
  const start = new Date("2024-12-01T00:00:00Z");
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}

export default async function HomePage() {
  const [chains, briefs, updatedThrough] = await Promise.all([
    buildChainData(),
    buildBriefData(),
    buildUpdatedThrough(),
  ]);

  const pipelineDays = buildPipelineDays();

  return (
    <UrdAtlasVFinalLandingClient
      chains={chains}
      briefs={briefs}
      updatedThrough={updatedThrough}
      pipelineDays={pipelineDays}
    />
  );
}