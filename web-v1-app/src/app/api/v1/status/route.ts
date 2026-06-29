// src/app/api/v1/status/route.ts
import { NextResponse } from "next/server";
import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest } from "@/lib/dataset";
import { currentDataSource, readStorageObject } from "@/lib/storage";
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

type SourceFreshnessChain = {
  chain?: string;
  last_run_at_utc?: string | null;
  last_run_date?: string | null;
  last_data_load_date?: string | null;
  latest_available_source_date?: string | null;
  latest_seen_source_partition_date?: string | null;
  source_cutoff_date?: string | null;
  published_asof?: string | null;
  source_latest_available?: string | null;
  source_effective_latest?: string | null;
  expected_delay_days?: number | null;
  observed_lag_days?: number | null;
  source_effective_lag_days?: number | null;
  source_is_newer_than_published?: boolean;
  source_is_not_newer_than_published?: boolean;
  reason_code?: string | null;
  reason?: string | null;
  tables?: Record<string, unknown>;
};

type SourceFreshnessReport = {
  schema?: string;
  generated_at_utc?: string;
  last_run_at_utc?: string;
  last_run_date?: string;
  source?: string;
  chains?: Record<string, SourceFreshnessChain>;
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

function sourceFreshnessForChain(
  report: SourceFreshnessReport | null,
  chain: ChainId
): SourceFreshnessChain | null {
  const row = report?.chains?.[chain];
  return row && typeof row === "object" ? row : null;
}

function sourceExplainsPublishedLag(sourceFreshness: SourceFreshnessChain | null): boolean {
  if (!sourceFreshness) return false;
  if (sourceFreshness.reason_code === "source_not_newer_than_published") return true;
  if (sourceFreshness.reason_code === "published_newer_than_source_listing") return true;
  if (sourceFreshness.source_is_not_newer_than_published === true) return true;
  return false;
}

function sourceCheckUnavailable(sourceFreshness: SourceFreshnessChain | null): boolean {
  if (!sourceFreshness) return false;
  return (
    sourceFreshness.reason_code === "source_check_unavailable" ||
    sourceFreshness.reason_code === "source_no_dates_detected"
  );
}

function classifyStatus(params: {
  chain: ChainId;
  lagDays: number | null;
  asOf?: string | null;
  sourceFreshness: SourceFreshnessChain | null;
}): StatusCode {
  const { chain, lagDays, asOf, sourceFreshness } = params;

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

  if (sourceExplainsPublishedLag(sourceFreshness) || sourceCheckUnavailable(sourceFreshness)) {
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
  const sourceFreshnessReport = await readPublishedJson<SourceFreshnessReport>(
    "data/published/v1/source-freshness.json"
  );

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
      const sourceFreshness = sourceFreshnessForChain(sourceFreshnessReport, chain.id);

      const status = classifyStatus({
        chain: chain.id,
        lagDays,
        asOf,
        sourceFreshness,
      });

      const freshnessExplanation =
        sourceFreshness?.reason ??
        (status === "fail"
          ? "Published data is older than the chain freshness policy and no upstream source explanation is available."
          : null);

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
        source_freshness: sourceFreshness
          ? {
              source: sourceFreshnessReport?.source ?? "aws-public-blockchain",
              generated_at_utc: sourceFreshnessReport?.generated_at_utc ?? null,
              last_run_at_utc:
                sourceFreshness.last_run_at_utc ?? sourceFreshnessReport?.last_run_at_utc ?? null,
              last_run_date:
                sourceFreshness.last_run_date ?? sourceFreshnessReport?.last_run_date ?? null,
              last_data_load_date: sourceFreshness.last_data_load_date ?? sourceFreshness.published_asof ?? null,
              latest_available_source_date:
                sourceFreshness.latest_available_source_date ??
                sourceFreshness.source_effective_latest ??
                sourceFreshness.source_latest_available ??
                null,
              latest_seen_source_partition_date: sourceFreshness.latest_seen_source_partition_date ?? null,
              source_cutoff_date: sourceFreshness.source_cutoff_date ?? null,
              reason_code: sourceFreshness.reason_code ?? null,
              reason: sourceFreshness.reason ?? null,
              source_is_newer_than_published:
                sourceFreshness.source_is_newer_than_published === true,
              source_is_not_newer_than_published:
                sourceFreshness.source_is_not_newer_than_published === true,
              tables: sourceFreshness.tables ?? null,
            }
          : null,
        freshness_explanation: freshnessExplanation,
        degradation,
        traceability: {
          source_path: metaPath,
          hero_path: heroPath,
          source_field: "latest.json",
        },
      };
    })
  );

  const degradationSummary = summarizeChainDegradation(chains);

  const payload = {
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