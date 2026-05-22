// src/app/api/v1/landing/route.ts
import { NextResponse } from "next/server";
import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest } from "@/lib/dataset";
import { readStorageObject } from "@/lib/storage";
import { enforcePreAuthRateLimit } from "@/lib/security/preAuthRateLimit";

export const revalidate = 300;

type MetaLatest = {
  updated_through?: string;
  date?: string;
  status?: {
    label?: string;
    one_liner?: string;
    color?: string;
  };
  confidence?: {
    confidence_score?: number;
    lag_days_vs_utc_today?: number;
  };
  regime?: {
    asof_date?: string;
    determinism_hash?: string;
    window_days?: number;
  };
  profile?: {
    label?: string;
    note?: string;
  };
};

type LandingHero = {
  display_asof?: string;
  regime_asof?: string;
  asof?: {
    display?: string;
    latest_available?: string;
    regime?: string;
    meta_actual?: string;
  };
};

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readStorageObject(storagePath);

  if (!result) {
    return null;
  }

  try {
    const raw = arrayBufferToUtf8(result.body);
    const json = JSON.parse(raw);

    if (!json || typeof json !== "object") {
      return null;
    }

    return json as T;
  } catch {
    return null;
  }
}

function expectedDelayDays(chain: ChainId): number {
  return chain === "arbitrum" || chain === "base" ? 7 : 1;
}

function parseIsoDayToUtcMs(date?: string | null): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  return Number.isFinite(ms) ? ms : null;
}

function utcTodayMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function lagDaysFromIsoDay(date?: string | null): number | null {
  const asOfMs = parseIsoDayToUtcMs(date);
  if (asOfMs === null) return null;
  const diff = utcTodayMs() - asOfMs;
  return Math.max(0, Math.floor(diff / 86400000));
}

function heroDisplayAsOf(hero?: LandingHero | null): string | null {
  return hero?.display_asof ?? hero?.asof?.display ?? hero?.asof?.latest_available ?? null;
}

function confidenceBand(value?: number | null): "Good" | "Caution" | "Degraded" | "—" {
  if (typeof value !== "number") return "—";
  if (value >= 0.7) return "Good";
  if (value >= 0.4) return "Caution";
  return "Degraded";
}

export async function GET(request: Request) {
  const preAuthRateLimit = await enforcePreAuthRateLimit(request, "public-read-api");

  if (!preAuthRateLimit.ok) {
    return preAuthRateLimit.response;
  }

  const dataset = await readDatasetManifest();

  const chains = await Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const metaPath = `data/published/v1/meta/${chain.id}/latest.json`;
      const heroPath = `data/published/v1/landing/${chain.id}/hero.json`;
      const [meta, hero] = await Promise.all([
        readPublishedJson<MetaLatest>(metaPath),
        readPublishedJson<LandingHero>(heroPath),
      ]);

      const confidenceScore =
        typeof meta?.confidence?.confidence_score === "number"
          ? meta.confidence.confidence_score
          : null;

      const asOf = heroDisplayAsOf(hero) ?? meta?.updated_through ?? meta?.regime?.asof_date ?? meta?.date ?? null;
      const lagDays =
        heroDisplayAsOf(hero) !== null
          ? lagDaysFromIsoDay(asOf)
          : typeof meta?.confidence?.lag_days_vs_utc_today === "number"
            ? meta.confidence.lag_days_vs_utc_today
            : lagDaysFromIsoDay(asOf);

      return {
        chain: chain.id,
        name: chain.name,
        label: chain.label,
        profile_label: meta?.profile?.label ?? chain.name,
        status_label: meta?.status?.label ?? null,
        one_liner: meta?.status?.one_liner ?? null,
        confidence_score: confidenceScore,
        confidence_band: confidenceBand(confidenceScore),
        lag_days: lagDays,
        as_of: asOf,
        expected_delay_days: expectedDelayDays(chain.id),
        traceability: {
          source_path: `${metaPath} + ${heroPath}`,
          source_field: "landing date uses hero.display_asof when available; regime/confidence remain from published meta latest",
        },
      };
    })
  );

  return NextResponse.json(
    {
      ok: true,
      generated_at_utc: new Date().toISOString(),
      dataset: dataset
        ? {
            version: dataset.version ?? null,
            published_at: dataset.published_at ?? null,
            methodology_version: dataset.methodology_version ?? null,
          }
        : null,
      product_boundary: {
        descriptive_only: true,
        includes_price_data: false,
        includes_forecasts: false,
        includes_recommendations: false,
      },
      chains,
      traceability: {
        canonical_contract: {
          dataset_manifest: true,
          published_meta_latest_per_chain: true,
          alternate_fallback: false,
          runtime_repair: false,
        },
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    }
  );
}
