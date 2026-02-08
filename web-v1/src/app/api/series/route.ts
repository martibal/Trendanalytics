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
    details?: any;
  };
};

const CACHE = new Map<string, { createdAt: number; payload: ApiResponse }>();
const CACHE_CONTROL = "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

function jsonError(code: string, message: string, status: number, details?: any) {
  const body: ApiError = { error: { code, message, details } };
  return NextResponse.json(body, { status });
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

async function readJsonSafe(filePath: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isNumber(x: any): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  let s = 0;
  for (const n of nums) s += n;
  return s / nums.length;
}

function parseRevisionId(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickZPercentile(meta: any, metric: string): { z: number | null; percentile: number | null } {
  const candidates = [
    meta?.metrics?.[metric]?.z,
    meta?.metrics?.[metric]?.z_score,
    meta?.metrics?.[metric]?.zscore,
    meta?.[metric]?.z,
    meta?.[metric]?.z_score,
  ];
  const pcandidates = [
    meta?.metrics?.[metric]?.percentile,
    meta?.metrics?.[metric]?.pct,
    meta?.[metric]?.percentile,
    meta?.[metric]?.pct,
  ];

  const z = candidates.find((v: any) => isNumber(v)) ?? null;
  const percentile = pcandidates.find((v: any) => isNumber(v)) ?? null;

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

    const datasetJson = await readJsonSafe(path.join(root, "dataset.json"));
    const dataset_id: string | null = typeof datasetJson?.dataset_id === "string" ? datasetJson.dataset_id : null;
    const revision_id: number | null = parseRevisionId(datasetJson?.revision_id);

    const goldManifestPath = path.join(root, "gold", chain, "manifest.json");
    const goldManifest = await readJsonSafe(goldManifestPath);
    const asof: string | null = typeof goldManifest?.asof === "string" ? goldManifest.asof : null;

    if (!asof || !isValidISODate(asof)) {
      return jsonError("MANIFEST_ASOF_INVALID", `Missing/invalid gold manifest asof for ${chain}.`, 500, { expected_path: goldManifestPath });
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

    const cacheKey = `${dataset_id ?? "no_dataset"}|${revision_id ?? "no_revision"}|${chain}|${metric}|${start}|${end}`;
    const etag = makeEtag(cacheKey);

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, "Cache-Control": CACHE_CONTROL } });
    }

    const cached = CACHE.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached.payload, { status: 200, headers: { ETag: etag, "Cache-Control": CACHE_CONTROL } });
    }

    const availableDays: string[] = Array.isArray(goldManifest?.available_days) ? goldManifest.available_days : [];
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

      const [goldDaily, derivedDaily, metaDaily] = await Promise.all([
        readJsonSafe(goldDailyPath),
        readJsonSafe(derivedDailyPath),
        readJsonSafe(metaDailyPath),
      ]);

      const daily: number | null = isNumber(goldDaily?.[metric]) ? goldDaily[metric] : null;

      const ma7Key = `${metric}__ma7`;
      const ma30Key = `${metric}__ma30`;

      const ma7FromDerived: number | null = isNumber(derivedDaily?.derived?.metrics?.[ma7Key]) ? derivedDaily.derived.metrics[ma7Key] : null;
      const ma30FromDerived: number | null = isNumber(derivedDaily?.derived?.metrics?.[ma30Key]) ? derivedDaily.derived.metrics[ma30Key] : null;

      const confidence: number | null = isNumber(derivedDaily?.derived?.meta_confidence?.confidence_score)
        ? derivedDaily.derived.meta_confidence.confidence_score
        : null;

      const { z, percentile } = pickZPercentile(metaDaily, metric);

      rows.push({ date: d, daily, ma7: ma7FromDerived, ma30: ma30FromDerived, confidence, z, percentile, ma_source: "derived" });
    }

    // Fallback MA (only if derived missing): trailing over present days.
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

      if (row.ma7 === null) {
        const vals = getTrailing(7);
        const m = mean(vals);
        if (m !== null) {
          row.ma7 = m;
          row.ma_source = "fallback_computed";
        }
      }

      if (row.ma30 === null) {
        const vals = getTrailing(30);
        const m = mean(vals);
        if (m !== null) {
          row.ma30 = m;
          row.ma_source = "fallback_computed";
        }
      }
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
      coverage: { expected_days: expectedDays.length, present_days: present_days.length, missing_days, nonNull_ratio },
      freshness: { asof, lag_days },
    };

    CACHE.set(cacheKey, { createdAt: Date.now(), payload });

    return NextResponse.json(payload, { status: 200, headers: { ETag: etag, "Cache-Control": CACHE_CONTROL } });
  } catch (e: any) {
    return jsonError("SERIES_FAILED", e?.message || "Series route failed", 500);
  }
}