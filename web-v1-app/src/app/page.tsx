// src/app/page.tsx
import { readStorageObject } from "@/lib/storage";
import UrdAtlasVFinalLandingClient from "@/components/landing/UrdAtlasVFinalLandingClient";
import type { LandingChainData, LandingBriefData } from "@/components/landing/UrdAtlasVFinalLandingClient";

export const revalidate = 0;

// ---------------------------------------------------------------------------
// Types matching published JSON structure
// ---------------------------------------------------------------------------

type MetaLatest = {
  chain?: string;
  status?: { label?: string; one_liner?: string };
  confidence?: { confidence_score?: number };
  regime?: { label?: string; asof_date?: string };
  updated_through?: string;
};

type BriefLatest = {
  chain?: string;
  updated_through?: string;
  latest?: { label?: string; confidence_score?: number };
  regime_path?: {
    labels?: string[];
    dominant_label?: string;
    dominant_label_days?: number;
    label_changes?: number;
  };
  brief?: { headline?: string; plain?: string };
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

const CHAIN_MAP: Record<string, { key: string; label: string; icon: string; fullName: string }> = {
  bitcoin:  { key: "btc",  label: "BTC",  icon: "₿", fullName: "Bitcoin" },
  ethereum: { key: "eth",  label: "ETH",  icon: "Ξ", fullName: "Ethereum" },
  arbitrum: { key: "arb",  label: "ARB",  icon: "A", fullName: "Arbitrum" },
  base:     { key: "base", label: "BASE", icon: "B", fullName: "Base" },
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

function fmtConfidencePct(score: number | undefined): string {
  if (score == null || isNaN(score)) return "—";
  return `${Math.round(score * 100)}%`;
}

function sparklineFromConfidence(confidence: number): number[] {
  // Generate a simple 10-point path centered around the confidence value
  const base = Math.round(confidence * 100);
  return Array.from({ length: 10 }, (_, i) =>
    Math.max(10, Math.min(90, base + Math.round(Math.sin(i * 0.9) * 8)))
  );
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function buildChainData(): Promise<LandingChainData[]> {
  const results: LandingChainData[] = [];

  for (const chainId of CHAINS_ORDER) {
    const info = CHAIN_MAP[chainId];
    const meta = await readJson<MetaLatest>(
      `data/published/v1/meta/${chainId}/latest.json`
    );

    const label = normalizeLabel(
      meta?.status?.label ?? meta?.regime?.label
    );
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
    const brief = await readJson<BriefLatest>(
      `data/published/v1/briefs/chains/${chainId}/latest.json`
    );

    const key = info.key;
    const regimePath = (brief?.regime_path?.labels ?? []).map(normalizeLabel);
    const dominant = normalizeLabel(brief?.regime_path?.dominant_label);
    const confidenceScore = brief?.latest?.confidence_score ?? 0;
    const changes = brief?.regime_path?.label_changes ?? 0;
    const run = brief?.regime_path?.dominant_label_days ?? 0;

    result[key] = {
      title: info.fullName,
      headline: brief?.brief?.headline ?? `${info.fullName} — latest published context.`,
      dominant,
      confidence: confidenceScore.toFixed(3),
      changes: String(changes),
      run: String(run),
      path: regimePath.length > 0 ? regimePath : [dominant],
      plain: brief?.brief?.plain ?? "",
    };
  }

  return result;
}

async function buildUpdatedThrough(): Promise<string> {
  // Use bitcoin hero.json as the canonical display date — it is the most
  // frequently updated chain and reflects the latest pipeline run.
  const hero = await readJson<HeroJson>(
    "data/published/v1/landing/bitcoin/hero.json"
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

  // Format as "13 May 2026"
  try {
    return new Date(date + "T00:00:00Z").toLocaleDateString("en-GB", {
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

export default async function HomePage() {
  const [chains, briefs, updatedThrough] = await Promise.all([
    buildChainData(),
    buildBriefData(),
    buildUpdatedThrough(),
  ]);

  return (
    <UrdAtlasVFinalLandingClient
      chains={chains}
      briefs={briefs}
      updatedThrough={updatedThrough}
    />
  );
}
