// src/app/api/v1/landing/route.ts
import { NextResponse } from "next/server";
import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest } from "@/lib/dataset";
import { currentDataSource, readStorageObject } from "@/lib/storage";
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

type PublishedJsonReadStatus = "ok" | "missing" | "invalid_json" | "invalid_shape";

type PublishedJsonRead<T> = {
  path: string;
  status: PublishedJsonReadStatus;
  value: T | null;
  detail: string | null;
};

type ChainDegradationReason =
  | "published_meta_missing"
  | "published_meta_invalid_json"
  | "published_meta_invalid_shape";

type ChainDegradation = {
  degraded: true;
  reason_code: ChainDegradationReason;
  source_path: string;
  detail: string;
};

async function readPublishedJsonWithState<T>(
  storagePath: string
): Promise<PublishedJsonRead<T>> {
  const result = await readStorageObject(storagePath);

  if (!result) {
    return {
      path: storagePath,
      status: "missing",
      value: null,
      detail: "Published JSON object is missing.",
    };
  }

  try {
    const raw = arrayBufferToUtf8(result.body);
    const json = JSON.parse(raw);

    if (!json || typeof json !== "object") {
      return {
        path: storagePath,
        status: "invalid_shape",
        value: null,
        detail: "Published JSON object is not an object.",
      };
    }

    return {
      path: storagePath,
      status: "ok",
      value: json as T,
      detail: null,
    };
  } catch {
    return {
      path: storagePath,
      status: "invalid_json",
      value: null,
      detail: "Published JSON object could not be parsed.",
    };
  }
}

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readPublishedJsonWithState<T>(storagePath);
  return result.value;
}

function chainDegradationFromMetaRead(
  read: PublishedJsonRead<unknown>
): ChainDegradation | null {
  if (read.status === "ok") {
    return null;
  }

  if (read.status === "missing") {
    return {
      degraded: true,
      reason_code: "published_meta_missing",
      source_path: read.path,
      detail: read.detail ?? "Published meta latest JSON is missing.",
    };
  }

  if (read.status === "invalid_json") {
    return {
      degraded: true,
      reason_code: "published_meta_invalid_json",
      source_path: read.path,
      detail: read.detail ?? "Published meta latest JSON could not be parsed.",
    };
  }

  return {
    degraded: true,
    reason_code: "published_meta_invalid_shape",
    source_path: read.path,
    detail: read.detail ?? "Published meta latest JSON is not an object.",
  };
}

function summarizeChainDegradation(
  rows: Array<{ degradation?: ChainDegradation | null }>
) {
  const degradedRows = rows.filter((row) => row.degradation);

  return {
    degraded_chain_count: degradedRows.length,
    missing_meta_count: degradedRows.filter(
      (row) => row.degradation?.reason_code === "published_meta_missing"
    ).length,
    invalid_meta_count: degradedRows.filter(
      (row) => row.degradation?.reason_code === "published_meta_invalid_json"
    ).length,
    invalid_shape_count: degradedRows.filter(
      (row) => row.degradation?.reason_code === "published_meta_invalid_shape"
    ).length,
  };
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
      const [metaRead, hero] = await Promise.all([
        readPublishedJsonWithState<MetaLatest>(metaPath),
        readPublishedJson<LandingHero>(heroPath),
      ]);

      const meta = metaRead.value;
      const degradation = chainDegradationFromMetaRead(metaRead);

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
        degradation,
        traceability: {
          source_path: `${metaPath} + ${heroPath}`,
          source_field: "landing date uses hero.display_asof when available; regime/confidence remain from published meta latest",
        },
      };
    })
  );

  const degradationSummary = summarizeChainDegradation(chains);

  return NextResponse.json(
    {
      ok: true,
      degraded: degradationSummary.degraded_chain_count > 0,
      degradation_summary: degradationSummary,
      data_source: currentDataSource(),
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