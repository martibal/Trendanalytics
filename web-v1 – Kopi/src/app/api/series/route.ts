// src/app/api/series/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import { getMetric } from "@/lib/metrics/catalog";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";

type SeriesRow = {
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
  confidence: number | null;
  z: number | null;
  percentile: number | null;
  ma_source?: "derived" | "fallback_computed";
};

type Coverage = {
  expected_days: number;
  present_days: number;
  missing_days: string[];
  nonNull_ratio: number;
};

type Freshness = {
  asof: string;
  lag_days: number;
};

type ApiResponse = {
  dataset_id: string | null;
  revision_id: number | null;
  chain: Chain;
  metric: string;
  start: string;
  end: string;
  rows: SeriesRow[];
  coverage: Coverage;
  freshness: Freshness;
};

type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

const CACHE_CONTROL = "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

/**
 * In-memory cache (per server instance).
 * Keyed by ETag (which fingerprints response identity, including manifest content signature).
 * TTL aligned with s-maxage=300 to avoid long-lived staleness.
 */
type MemCacheEntry = {
  createdAtMs: number;
  payload: ApiResponse;
};

const MEM_CACHE_TTL_MS = 300_000; // 5 min
const MEM_CACHE_MAX_ENTRIES = 64;
const MEM_CACHE: Map<string, MemCacheEntry> = new Map();

function memCacheGet(etag: string): ApiResponse | null {
  const hit = MEM_CACHE.get(etag);
  if (!hit) return null;
  const age = Date.now() - hit.createdAtMs;
  if (age > MEM_CACHE_TTL_MS) {
    MEM_CACHE.delete(etag);
    return null;
  }
  return hit.payload;
}

function memCacheSet(etag: string, payload: ApiResponse) {
  if (MEM_CACHE.size >= MEM_CACHE_MAX_ENTRIES) {
    const entries = Array.from(MEM_CACHE.entries()).sort((a, b) => a[1].createdAtMs - b[1].createdAtMs);
    const toDrop = Math.max(1, Math.floor(MEM_CACHE_MAX_ENTRIES * 0.25));
    for (let i = 0; i < toDrop && i < entries.length; i++) MEM_CACHE.delete(entries[i][0]);
  }
  MEM_CACHE.set(etag, { createdAtMs: Date.now(), payload });
}

function jsonError(code: string, message: string, status: number, details?: unknown) {
  const body: ApiError = { error: { code, message, details } };
  return NextResponse.json(body, { status });
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseChain(s: string | null): Chain | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === "bitcoin" || v === "ethereum" || v === "arbitrum" || v === "base") return v;
  return null;
}

function toISODateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toISODateUTC(dt);
}

function diffDaysUTC(aISO: string, bISO: string): number {
  const [ay, am, ad] = aISO.split("-").map((x) => parseInt(x, 10));
  const [by, bm, bd] = bISO.split("-").map((x) => parseInt(x, 10));
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

async function readJsonSafe(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  let s = 0;
  for (const n of nums) s += n;
  return s / nums.length;
}

function parseRevisionId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickZPercentile(meta: unknown, metric: string): { z: number | null; percentile: number | null } {
  const m = asRecord(meta);

  const metrics = m ? asRecord(m["metrics"]) : null;
  const metricObj = metrics ? asRecord(metrics[metric]) : null;

  const candidates: unknown[] = [
    metricObj ? metricObj["z"] : null,
    metricObj ? metricObj["z_score"] : null,
    metricObj ? metricObj["zscore"] : null,
    m ? (asRecord(m[metric]) ? (asRecord(m[metric]) as Record<string, unknown>)["z"] : null) : null,
    m ? (asRecord(m[metric]) ? (asRecord(m[metric]) as Record<string, unknown>)["z_score"] : null) : null,
  ];

  const pcandidates: unknown[] = [
    metricObj ? metricObj["percentile"] : null,
    metricObj ? metricObj["pct"] : null,
    m ? (asRecord(m[metric]) ? (asRecord(m[metric]) as Record<string, unknown>)["percentile"] : null) : null,
    m ? (asRecord(m[metric]) ? (asRecord(m[metric]) as Record<string, unknown>)["pct"] : null) : null,
  ];

  const z = (candidates.find((v) => isNumber(v)) as number | undefined) ?? null;
  const percentile = (pcandidates.find((v) => isNumber(v)) as number | undefined) ?? null;

  return { z, percentile };
}

function parseWindowDays(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i <= 0) return null;
  if (i > 3650) return null;
  return i;
}

function makeEtag(input: string): string {
  const hash = crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
  return `W/"${hash}"`;
}

function normalizeAvailableDays(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const kept = v.filter((d): d is string => typeof d === "string" && isValidISODate(d));
  return Array.from(new Set(kept)).sort();
}

function stableHashStringList(xs: string[]): string {
  const h = crypto.createHash("sha256");
  for (const s of xs) {
    h.update(s);
    h.update("|");
  }
  return h.digest("hex").slice(0, 16);
}

function getDerivedMetricsRecord(derivedDaily: unknown): Record<string, unknown> | null {
  const d = asRecord(derivedDaily);
  const derived = d ? asRecord(d["derived"]) : null;
  const metrics = derived ? asRecord(derived["metrics"]) : null;
  return metrics;
}

function getDerivedConfidence(derivedDaily: unknown): number | null {
  const d = asRecord(derivedDaily);
  const derived = d ? asRecord(d["derived"]) : null;
  const metaConf = derived ? asRecord(derived["meta_confidence"]) : null;
  const v = metaConf ? metaConf["confidence_score"] : null;
  return isNumber(v) ? v : null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const chain = parseChain(url.searchParams.get("chain"));
    const metric = url.searchParams.get("metric");
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");
    const windowParam = url.searchParams.get("window");

    if (!chain) return jsonError("INVALID_CHAIN", "Invalid chain. Use bitcoin|ethereum|arbitrum|base.", 400);
    if (!metric) return jsonError("MISSING_METRIC", "Missing metric.", 400);

    // Guardrail: metric must exist in catalog
    if (!getMetric(metric)) {
      return jsonError("INVALID_METRIC", "Unknown metric key. This metric is not documented in METRIC_CATALOG.", 400, { metric });
    }

    if (endParam && !isValidISODate(endParam)) return jsonError("INVALID_END", "Invalid end. Use YYYY-MM-DD.", 400);
    if (startParam && !isValidISODate(startParam)) return jsonError("INVALID_START", "Invalid start. Use YYYY-MM-DD.", 400);

    const root = path.join(process.cwd(), "public", "data", "published", "v1");

    const datasetRaw = await readJsonSafe(path.join(root, "dataset.json"));
    const datasetRec = asRecord(datasetRaw);
    const dataset_id: string | null =
      datasetRec && typeof datasetRec["dataset_id"] === "string" ? (datasetRec["dataset_id"] as string) : null;
    const revision_id: number | null = datasetRec ? parseRevisionId(datasetRec["revision_id"]) : null;

    const goldManifestPath = path.join(root, "gold", chain, "manifest.json");
    const goldManifestRaw = await readJsonSafe(goldManifestPath);
    const goldManifestRec = asRecord(goldManifestRaw);

    const asof: string | null =
      goldManifestRec && typeof goldManifestRec["asof"] === "string" ? (goldManifestRec["asof"] as string) : null;

    if (!asof || !isValidISODate(asof)) {
      return jsonError("MANIFEST_ASOF_INVALID", `Missing/invalid gold manifest asof for ${chain}.`, 500, {
        expected_path: goldManifestPath,
      });
    }

    const end = endParam ?? asof;

    const windowDays = parseWindowDays(windowParam);
    if (windowParam && windowDays === null) {
      return jsonError("INVALID_WINDOW", "Invalid window. Use a positive integer number of days (<= 3650).", 400);
    }

    const start = startParam ? startParam : windowDays ? addDaysISO(end, -(windowDays - 1)) : null;
    if (!start) {
      return jsonError("MISSING_START_OR_WINDOW", "Provide either start (YYYY-MM-DD) or window (days).", 400);
    }

    if (diffDaysUTC(start, end) > 0) {
      return jsonError("INVALID_RANGE", "start must be <= end.", 400, { start, end });
    }

    // Normalize available_days so cache identity is robust to order/dup/invalid entries.
    const availableDays = normalizeAvailableDays(goldManifestRec ? goldManifestRec["available_days"] : null);
    const availableDaysHash = stableHashStringList(availableDays);

    // Robust response identity: include manifest signature + asof (not just dataset/revision).
    const etag = makeEtag(
      [
        dataset_id ?? "no_dataset",
        revision_id ?? "no_revision",
        "series",
        chain,
        metric,
        start,
        end,
        `asof=${asof}`,
        `available_days_hash=${availableDaysHash}`,
        `available_days_count=${availableDays.length}`,
      ].join("|")
    );

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, "Cache-Control": CACHE_CONTROL } });
    }

    const cached = memCacheGet(etag);
    if (cached) {
      return NextResponse.json(cached, { status: 200, headers: { ETag: etag, "Cache-Control": CACHE_CONTROL } });
    }

    const availableSet = new Set<string>(availableDays);

    const expectedDays: string[] = [];
    for (let d = start, i = 0; diffDaysUTC(d, end) <= 0; d = addDaysISO(d, 1), i++) {
      expectedDays.push(d);
      if (i > 5000) break;
    }

    const missing_days: string[] = [];
    const present_days: string[] = [];
    for (const d of expectedDays) {
      if (availableSet.has(d)) present_days.push(d);
      else missing_days.push(d);
    }

    const rows: SeriesRow[] = [];

    for (const d of present_days) {
      const goldDailyPath = path.join(root, "gold", chain, `${d}.json`);
      const derivedDailyPath = path.join(root, "derived", chain, `${d}.json`);
      const metaDailyPath = path.join(root, "meta", chain, `${d}.json`);

      const [goldDailyRaw, derivedDailyRaw, metaDailyRaw] = await Promise.all([
        readJsonSafe(goldDailyPath),
        readJsonSafe(derivedDailyPath),
        readJsonSafe(metaDailyPath),
      ]);

      const goldRec = asRecord(goldDailyRaw);

      const daily: number | null = goldRec && isNumber(goldRec[metric]) ? (goldRec[metric] as number) : null;

      const ma7Key = `${metric}__ma7`;
      const ma30Key = `${metric}__ma30`;

      const derivedMetrics = getDerivedMetricsRecord(derivedDailyRaw);
      const ma7FromDerived: number | null = derivedMetrics && isNumber(derivedMetrics[ma7Key]) ? (derivedMetrics[ma7Key] as number) : null;
      const ma30FromDerived: number | null = derivedMetrics && isNumber(derivedMetrics[ma30Key]) ? (derivedMetrics[ma30Key] as number) : null;

      const confidence = getDerivedConfidence(derivedDailyRaw);

      const { z, percentile } = pickZPercentile(metaDailyRaw, metric);

      rows.push({
        date: d,
        daily,
        ma7: ma7FromDerived,
        ma30: ma30FromDerived,
        confidence,
        z,
        percentile,
        ma_source: "derived",
      });
    }

    // Fallback MA (only if derived missing): trailing mean over present days (non-null daily).
    const sortedRows = rows.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    for (let i = 0; i < sortedRows.length; i++) {
      const row = sortedRows[i];

      const getTrailing = (n: number): number[] => {
        const vals: number[] = [];
        for (let j = i; j >= 0 && vals.length < n; j--) {
          const v = sortedRows[j].daily;
          if (isNumber(v)) vals.push(v);
        }
        return vals;
      };

      let anyFallback = false;

      if (row.ma7 === null) {
        const vals = getTrailing(7);
        const m = mean(vals);
        if (m !== null) {
          row.ma7 = m;
          anyFallback = true;
        }
      }

      if (row.ma30 === null) {
        const vals = getTrailing(30);
        const m = mean(vals);
        if (m !== null) {
          row.ma30 = m;
          anyFallback = true;
        }
      }

      if (anyFallback) row.ma_source = "fallback_computed";
    }

    const nonNullCount = sortedRows.reduce((acc, r) => acc + (isNumber(r.daily) ? 1 : 0), 0);
    const nonNull_ratio = sortedRows.length === 0 ? 0 : nonNullCount / sortedRows.length;

    const todayISO = toISODateUTC(new Date());
    const lag_days = Math.max(0, diffDaysUTC(todayISO, asof));

    const payload: ApiResponse = {
      dataset_id,
      revision_id,
      chain,
      metric,
      start,
      end,
      rows: sortedRows,
      coverage: {
        expected_days: expectedDays.length,
        present_days: present_days.length,
        missing_days,
        nonNull_ratio,
      },
      freshness: { asof, lag_days },
    };

    memCacheSet(etag, payload);

    return NextResponse.json(payload, { status: 200, headers: { ETag: etag, "Cache-Control": CACHE_CONTROL } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Series route failed";
    return jsonError("SERIES_FAILED", msg, 500);
  }
}