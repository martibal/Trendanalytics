// src/app/api/v1/summary/[chain]/route.ts
import { NextResponse } from "next/server";
import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest } from "@/lib/dataset";
import { currentDataSource, readStorageObject } from "@/lib/storage";

export const revalidate = 300;

type RouteContext = {
  params: Promise<{ chain: string }>;
};

type Driver = {
  axis?: string;
  metric?: string;
  trend?: string;
  z_robust?: number;
  pct_90d?: number;
  momentum_7d_vs_30d?: number;
  current?: number;
};

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
    label?: string;
    asof_date?: string;
    window_days?: number;
    determinism_hash?: string;
    drivers?: Driver[];
  };
  scorecard?: {
    asof_date?: string;
    window_days?: number;
    confidence_score?: number;
    dimensions?: {
      demand?: { score?: number; level?: string; coverage_factor?: number; effective_confidence?: number };
      friction?: { score?: number; level?: string; coverage_factor?: number; effective_confidence?: number };
      capacity?: { score?: number; level?: string; coverage_factor?: number; effective_confidence?: number };
    };
    notes?: {
      interpretation?: string;
    };
  };
  profile?: {
    label?: string;
    note?: string;
    hidden_metrics?: string[];
  };
};

type BundleRow = Record<string, unknown> & { date?: string };

type BundlePayload =
  | BundleRow[]
  | {
      rows?: BundleRow[];
      items?: BundleRow[];
      data?: BundleRow[];
    };

function isChainId(value: string): value is ChainId {
  return CHAIN_LIST.some((chain) => chain.id === value);
}

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

function extractRows(bundle: BundlePayload | null): BundleRow[] {
  if (!bundle) return [];
  if (Array.isArray(bundle)) return bundle;
  if (Array.isArray(bundle.rows)) return bundle.rows;
  if (Array.isArray(bundle.items)) return bundle.items;
  if (Array.isArray(bundle.data)) return bundle.data;
  return [];
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function pickLatestRow(rows: BundleRow[]): BundleRow | null {
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => {
    const da = typeof a.date === "string" ? a.date : "";
    const db = typeof b.date === "string" ? b.date : "";
    return da.localeCompare(db);
  });

  return sorted[sorted.length - 1] ?? null;
}

function summarizeNumericFields(
  row: BundleRow | null,
  limit: number
): Array<{ metric: string; value: number }> {
  if (!row) return [];

  const out: Array<{ metric: string; value: number }> = [];

  for (const [key, value] of Object.entries(row)) {
    if (key === "date" || key === "chain") continue;

    const n = toNumberOrNull(value);
    if (n !== null) {
      out.push({ metric: key, value: n });
    }
  }

  return out.slice(0, limit);
}

function summarizeDerivedMetrics(
  row: BundleRow | null,
  limit: number
): Array<{ metric: string; value: number }> {
  if (!row) return [];

  const direct = summarizeNumericFields(row, limit);
  if (direct.length > 0) return direct;

  const derived = asRecord(row.derived);
  const metrics = derived ? asRecord(derived.metrics) : null;
  if (!metrics) return [];

  const out: Array<{ metric: string; value: number }> = [];

  for (const [key, value] of Object.entries(metrics)) {
    const n = toNumberOrNull(value);
    if (n !== null) {
      out.push({ metric: key, value: n });
    }
  }

  return out.slice(0, limit);
}

function sortDrivers(drivers: Driver[]): Driver[] {
  return [...drivers].sort((a, b) => {
    const za = Math.abs(a.z_robust ?? 0);
    const zb = Math.abs(b.z_robust ?? 0);
    return zb - za;
  });
}

function confidenceBand(value?: number | null): "Good" | "Caution" | "Degraded" | "—" {
  if (typeof value !== "number") return "—";
  if (value >= 0.7) return "Good";
  if (value >= 0.4) return "Caution";
  return "Degraded";
}

function jsonError(status: number, code: string, message: string, detail?: string) {
  return NextResponse.json(
    {
      ok: false,
      code,
      message,
      detail: detail ?? null,
    },
    { status }
  );
}

export async function GET(_: Request, context: RouteContext) {
  const { chain } = await context.params;

  if (!isChainId(chain)) {
    return jsonError(404, "not_found", "Unknown chain.", "unknown_chain");
  }

  const chainConfig = CHAIN_LIST.find((item) => item.id === chain);
  const dataset = await readDatasetManifest();

  const metaPath = `data/published/v1/meta/${chain}/latest.json`;
  const goldPath = `data/published/v1/gold/${chain}/last90d.json`;
  const derivedPath = `data/published/v1/derived/${chain}/last90d.json`;

  const [meta, goldBundle, derivedBundle] = await Promise.all([
    readPublishedJson<MetaLatest>(metaPath),
    readPublishedJson<BundlePayload>(goldPath),
    readPublishedJson<BundlePayload>(derivedPath),
  ]);

  if (!meta) {
    return jsonError(404, "not_found", "Published chain summary not available.", metaPath);
  }

  const goldRows = extractRows(goldBundle);
  const derivedRows = extractRows(derivedBundle);

  const latestGoldRow = pickLatestRow(goldRows);
  const latestDerivedRow = pickLatestRow(derivedRows);

  const topDrivers = Array.isArray(meta.regime?.drivers)
    ? sortDrivers(meta.regime.drivers).slice(0, 5)
    : [];

  const confidenceScore =
    typeof meta.confidence?.confidence_score === "number"
      ? meta.confidence.confidence_score
      : null;

  const asOf =
    meta.updated_through ??
    meta.regime?.asof_date ??
    meta.scorecard?.asof_date ??
    meta.date ??
    null;

  return NextResponse.json(
    {
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
      chain: {
        id: chain,
        name: chainConfig?.name ?? chain,
        label: chainConfig?.label ?? chain.toUpperCase(),
      },
      summary: {
        display_name: meta.profile?.label ?? chainConfig?.name ?? chain,
        as_of: asOf,
        regime_label: meta.status?.label ?? meta.regime?.label ?? null,
        one_liner: meta.status?.one_liner ?? null,
        confidence_score: confidenceScore,
        confidence_band: confidenceBand(confidenceScore),
        lag_days:
          typeof meta.confidence?.lag_days_vs_utc_today === "number"
            ? meta.confidence.lag_days_vs_utc_today
            : null,
        determinism_hash: meta.regime?.determinism_hash ?? null,
        window_days: meta.regime?.window_days ?? meta.scorecard?.window_days ?? 90,
        profile_note: meta.profile?.note ?? null,
        scorecard_interpretation: meta.scorecard?.notes?.interpretation ?? null,
      },
      scorecard: meta.scorecard?.dimensions ?? null,
      drivers: topDrivers,
      gold_snapshot: {
        source_path: goldPath,
        row_count: goldRows.length,
        latest_date: latestGoldRow?.date ?? null,
        metrics: summarizeNumericFields(latestGoldRow, 12),
      },
      derived_snapshot: {
        source_path: derivedPath,
        row_count: derivedRows.length,
        latest_date: latestDerivedRow?.date ?? null,
        metrics: summarizeDerivedMetrics(latestDerivedRow, 12),
      },
      traceability: {
        meta_path: metaPath,
        gold_path: goldPath,
        derived_path: derivedPath,
        canonical_contract: {
          meta_latest: true,
          gold_last90d: true,
          derived_last90d: true,
          alternate_window_fallback: false,
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