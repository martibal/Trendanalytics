// src/app/api/v1/status/route.ts
import { NextResponse } from "next/server";
import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest } from "@/lib/dataset";
import { currentDataSource, readStorageObject } from "@/lib/storage";

export const revalidate = 300;

type MetaLatest = {
  date?: string;
  updated_through?: string;
  confidence?: {
    lag_days_vs_utc_today?: number;
    confidence_score?: number;
  };
  status?: {
    label?: string;
    color?: string;
    one_liner?: string;
  };
  regime?: {
    asof_date?: string;
  };
  profile?: {
    label?: string;
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

type StatusCode = "ok" | "warn" | "fail" | "unknown";

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

function parseIsoDayToUtcMs(date?: string): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  return Number.isFinite(ms) ? ms : null;
}

function utcTodayMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function lagDaysFromIsoDay(date?: string): number | null {
  const asOfMs = parseIsoDayToUtcMs(date);
  if (asOfMs === null) return null;
  const diff = utcTodayMs() - asOfMs;
  return Math.max(0, Math.floor(diff / 86400000));
}

function expectedDelayDays(chain: ChainId): number {
  return chain === "arbitrum" || chain === "base" ? 7 : 1;
}

function classifyStatus(params: {
  chain: ChainId;
  lagDays: number | null;
  asOf?: string | null;
}): StatusCode {
  const { chain, lagDays, asOf } = params;

  if (!asOf || typeof lagDays !== "number") {
    return "unknown";
  }

  const expectedDelay = expectedDelayDays(chain);

  if (lagDays <= expectedDelay) {
    return "ok";
  }

  if (lagDays <= expectedDelay + 2) {
    return "warn";
  }

  return "fail";
}

export async function GET() {
  const dataset = await readDatasetManifest();

  const chains = await Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const metaPath = `data/published/v1/meta/${chain.id}/latest.json`;
      const heroPath = `data/published/v1/landing/${chain.id}/hero.json`;

      const [meta, hero] = await Promise.all([
        readPublishedJson<MetaLatest>(metaPath),
        readPublishedJson<LandingHero>(heroPath),
      ]);

      const asOf =
        hero?.display_asof ??
        hero?.asof?.display ??
        hero?.asof?.latest_available ??
        meta?.updated_through ??
        meta?.regime?.asof_date ??
        meta?.date ??
        undefined;

      const lagDays =
        typeof meta?.confidence?.lag_days_vs_utc_today === "number"
          ? meta.confidence.lag_days_vs_utc_today
          : lagDaysFromIsoDay(asOf);

      const status = classifyStatus({
        chain: chain.id,
        lagDays,
        asOf,
      });

      return {
        chain: chain.id,
        name: chain.name,
        label: chain.label,
        as_of: asOf ?? null,
        lag_days: lagDays,
        status,
        published_regime: meta?.status?.label ?? null,
        confidence_score:
          typeof meta?.confidence?.confidence_score === "number"
            ? meta.confidence.confidence_score
            : null,
        expected_delay_days: expectedDelayDays(chain.id),
        traceability: {
          source_path: metaPath,
          source_field: "latest.json",
        },
      };
    })
  );

  const payload = {
    ok: true,
    generated_at_utc: new Date().toISOString(),
    data_source: currentDataSource(),
    dataset: dataset
      ? {
          version: dataset.version ?? null,
          published_at: dataset.published_at ?? null,
          methodology_version: dataset.methodology_version ?? null,
        }
      : null,
    summary: {
      chain_count: chains.length,
      ok_count: chains.filter((row) => row.status === "ok").length,
      warn_count: chains.filter((row) => row.status === "warn").length,
      fail_count: chains.filter((row) => row.status === "fail").length,
      unknown_count: chains.filter((row) => row.status === "unknown").length,
    },
    chains,
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
    },
  });
}