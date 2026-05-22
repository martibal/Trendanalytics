// src/app/api/v1/status/route.ts
import { NextResponse } from "next/server";
import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest } from "@/lib/dataset";
import { readStorageObject } from "@/lib/storage";
import { enforcePreAuthRateLimit } from "@/lib/security/preAuthRateLimit";

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
  display_asof?: string | null;
  regime_asof?: string | null;
  asof?: {
    display?: string | null;
    latest_available?: string | null;
    gold?: string | null;
    derived?: string | null;
    meta?: string | null;
    meta_actual?: string | null;
    regime?: string | null;
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

function heroRegimeAsOf(hero?: LandingHero | null): string | null {
  return hero?.regime_asof ?? hero?.asof?.regime ?? hero?.asof?.meta_actual ?? null;
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

      const displayAsOf = heroDisplayAsOf(hero);
      const regimeAsOf = heroRegimeAsOf(hero) ?? meta?.regime?.asof_date ?? null;
      const asOf =
        displayAsOf ??
        meta?.updated_through ??
        meta?.regime?.asof_date ??
        meta?.date ??
        undefined;

      const lagDays =
        displayAsOf !== null
          ? lagDaysFromIsoDay(asOf)
          : typeof meta?.confidence?.lag_days_vs_utc_today === "number"
            ? meta.confidence.lag_days_vs_utc_today
            : lagDaysFromIsoDay(asOf);

      const status = classifyStatus({
        chain: chain.id,
        lagDays,
        asOf,
      });

      return {
        chain: chain.id,
        name: meta?.profile?.label ?? chain.name,
        label: chain.label,
        as_of: asOf ?? null,
        display_asof: displayAsOf,
        regime_asof: regimeAsOf,
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
          hero_path: heroPath,
          source_field: "latest.json",
        },
      };
    })
  );

  const payload = {
    ok: true,
    generated_at_utc: new Date().toISOString(),
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
