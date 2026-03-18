// src/app/api/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import { getMetric } from "@/lib/metrics/catalog";
import { validateNoForbiddenLanguage } from "@/lib/legal/forbiddenLanguage";

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

type SeriesResponse = {
  dataset_id: string | null;
  revision_id: number | null;
  chain: Chain;
  metric: string;
  start: string;
  end: string;
  rows: SeriesRow[];
  coverage: {
    expected_days: number;
    present_days: number;
    missing_days: string[];
    nonNull_ratio: number;
  };
  freshness: {
    asof: string;
    lag_days: number;
  };
};

type SummaryResponse = {
  dataset_id: string | null;
  revision_id: number | null;
  chain: Chain;
  metric: string;
  start: string;
  end: string;

  current: {
    daily: number | null;
    ma7: number | null;
    ma30: number | null;
  };

  period: {
    mean_daily: number | null;
    median_daily: number | null;
    stdev_daily: number | null;
  };

  trend: {
    slope_ma30: number | null;
    label: "Rising" | "Falling" | "Flat";
    strength: "Weak" | "Moderate" | "Strong";
  };

  volatility: {
    cv_daily: number | null;
    label: "Stable" | "Variable" | "Highly variable";
  };

  level: {
    label: "Low" | "Typical" | "Elevated" | "Extreme";
    method: "meta_percentile" | "last365_rank";
    reference: "historical";
    percentile: number | null;
  };

  confidence: {
    mean: number | null;
    latest: number | null;
  };

  caveats: string[];

  interpretation: {
    basic: string; // exactly 2 sentences
    advanced: string[]; // always array
  };
};

type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

const CACHE_CONTROL_PUBLIC = "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

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

function diffDaysUTC(aISO: string, bISO: string): number {
  const [ay, am, ad] = aISO.split("-").map((x) => parseInt(x, 10));
  const [by, bm, bd] = bISO.split("-").map((x) => parseInt(x, 10));
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toISODateUTC(dt);
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

function parseRevisionId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
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

function authEnabled(): boolean {
  return typeof process.env.EXPORT_TOKEN === "string" && process.env.EXPORT_TOKEN.trim().length > 0;
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function requireExportAuth(req: NextRequest): NextResponse | null {
  if (!authEnabled()) return null;

  const expected = (process.env.EXPORT_TOKEN ?? "").trim();
  const tokenFromHeader = extractBearerToken(req.headers.get("authorization"));
  const tokenFromQuery = new URL(req.url).searchParams.get("token")?.trim() || null;

  const token = tokenFromHeader ?? tokenFromQuery;
  if (!token || token !== expected) {
    return jsonError("UNAUTHORIZED", "Missing or invalid export token.", 401, {
      hint: "Provide Authorization: Bearer <token> (or ?token=... for testing).",
    });
  }
  return null;
}

function headersFor(req: NextRequest, etag?: string) {
  if (authEnabled()) {
    const h: Record<string, string> = {
      "Cache-Control": "private, no-store",
      Vary: "Authorization",
    };
    if (etag) h.ETag = etag;
    return h;
  }

  const h: Record<string, string> = {
    "Cache-Control": CACHE_CONTROL_PUBLIC,
  };
  if (etag) h.ETag = etag;
  return h;
}

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const a = xs.slice().sort((p, q) => p - q);
  const mid = Math.floor(a.length / 2);
  if (a.length % 2 === 1) return a[mid];
  return (a[mid - 1] + a[mid]) / 2;
}

function stdev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs);
  if (m === null) return null;
  let s2 = 0;
  for (const x of xs) {
    const d = x - m;
    s2 += d * d;
  }
  return Math.sqrt(s2 / (xs.length - 1));
}

function absMean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  let s = 0;
  for (const x of xs) s += Math.abs(x);
  return s / xs.length;
}

function linearSlope(y: number[]): number | null {
  const n = y.length;
  if (n < 2) return null;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += y[i];
    sumXY += i * y[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

function strengthFromNormalizedSlope(normAbsSlope: number): "Weak" | "Moderate" | "Strong" {
  if (normAbsSlope < 0.25) return "Weak";
  if (normAbsSlope < 0.75) return "Moderate";
  return "Strong";
}

function volLabelFromCV(cv: number | null): "Stable" | "Variable" | "Highly variable" {
  if (cv === null) return "Variable";
  if (cv < 0.25) return "Stable";
  if (cv <= 0.6) return "Variable";
  return "Highly variable";
}

function levelFromPercentile(p: number): "Low" | "Typical" | "Elevated" | "Extreme" {
  if (p >= 95) return "Extreme";
  if (p >= 80) return "Elevated";
  if (p <= 20) return "Low";
  return "Typical";
}

function levelFromRankIn365(current: number, hist: number[]): { label: "Low" | "Typical" | "Elevated" | "Extreme"; p: number } {
  const vals = hist.filter((x) => Number.isFinite(x));
  if (vals.length === 0) return { label: "Typical", p: 50 };
  let le = 0;
  for (const v of vals) if (v <= current) le++;
  const p = (le / vals.length) * 100;
  return { label: levelFromPercentile(p), p };
}

function metricDisplayName(metric: string): string {
  return metric.replaceAll("_", " ");
}

function stabilityTranslation(volLabel: "Stable" | "Variable" | "Highly variable"): string {
  if (volLabel === "Stable") return "relatively smooth and persistent";
  if (volLabel === "Variable") return "changing meaningfully week-to-week";
  return "dominated by sharp swings";
}

function plainMeaning(metric: string, levelLabel: "Low" | "Typical" | "Elevated" | "Extreme"): string {
  const higherLower =
    levelLabel === "Elevated" || levelLabel === "Extreme" ? "higher" : levelLabel === "Low" ? "lower" : "about typical";

  switch (metric) {
    case "tx_count_daily":
      return `the network’s day-to-day activity level has been ${higherLower} compared to its usual range.`;
    case "gas_utilization_pct":
      return `blocks have been ${higherLower === "higher" ? "more" : higherLower === "lower" ? "less" : "about as"} full than usual.`;
    case "median_tx_fee_native":
      return `typical transaction cost has been ${higherLower} compared to recent history.`;
    case "failed_tx_rate":
      return `a ${higherLower} share of transactions failed than usual.`;
    case "avg_block_time_sec":
      return `block production cadence has been ${higherLower === "higher" ? "slower" : higherLower === "lower" ? "faster" : "about typical"}.`;
    case "block_count_daily":
      return `block output has been ${higherLower} than usual.`;
    case "unique_active_addresses":
      return `participation breadth has been ${higherLower === "higher" ? "broader" : higherLower === "lower" ? "narrower" : "about typical"}.`;
    case "value_transferred_native":
      return `settlement volume has been ${higherLower} in native units.`;
    case "median_tx_value_native":
      return `typical transfer size has been ${higherLower} compared to recent history.`;
    default:
      return `this metric has been ${higherLower} compared to its usual range.`;
  }
}

function assertSummaryContract(s: SummaryResponse) {
  if (!s.trend?.label || !s.trend?.strength) throw new Error("Summary contract violated: trend missing");
  if (!s.volatility?.label) throw new Error("Summary contract violated: volatility missing");
  if (!s.level?.label) throw new Error("Summary contract violated: level missing");
  if (typeof s.interpretation?.basic !== "string") throw new Error("Summary contract violated: interpretation.basic missing");
  if (!Array.isArray(s.interpretation?.advanced)) throw new Error("Summary contract violated: interpretation.advanced missing");
  if (!Array.isArray(s.caveats)) throw new Error("Summary contract violated: caveats missing");
}

function stableHashSeriesRows(rows: SeriesRow[]): string {
  // Deterministic identity for caching: any change in underlying day-json values => different ETag.
  // We include nulls explicitly and lock field order.
  const h = crypto.createHash("sha256");
  for (const r of rows) {
    h.update(r.date);
    h.update("|");
    h.update(r.daily === null ? "null" : String(r.daily));
    h.update("|");
    h.update(r.ma7 === null ? "null" : String(r.ma7));
    h.update("|");
    h.update(r.ma30 === null ? "null" : String(r.ma30));
    h.update("|");
    h.update(r.confidence === null ? "null" : String(r.confidence));
    h.update("|");
    h.update(r.z === null ? "null" : String(r.z));
    h.update("|");
    h.update(r.percentile === null ? "null" : String(r.percentile));
    h.update("|");
    h.update(typeof r.ma_source === "string" ? r.ma_source : "none");
    h.update("\n");
  }
  return h.digest("hex").slice(0, 32);
}

async function fetchSeriesLocal(chain: Chain, metric: string, start: string, end: string): Promise<SeriesResponse | null> {
  const root = path.join(process.cwd(), "public", "data", "published", "v1");

  const datasetRaw = await readJsonSafe(path.join(root, "dataset.json"));
  const datasetRec = asRecord(datasetRaw);
  const dataset_id: string | null =
    datasetRec && typeof datasetRec["dataset_id"] === "string" ? (datasetRec["dataset_id"] as string) : null;
  const revision_id: number | null = datasetRec ? parseRevisionId(datasetRec["revision_id"]) : null;

  const goldManifestPath = path.join(root, "gold", chain, "manifest.json");
  const goldManifestRaw = await readJsonSafe(goldManifestPath);
  const goldManifest = asRecord(goldManifestRaw);
  const asof: string | null = goldManifest && typeof goldManifest["asof"] === "string" ? (goldManifest["asof"] as string) : null;
  if (!asof || !isValidISODate(asof)) return null;

  const availableDaysRaw = goldManifest ? goldManifest["available_days"] : null;
  const availableDays: string[] = Array.isArray(availableDaysRaw)
    ? availableDaysRaw.filter((x): x is string => typeof x === "string" && isValidISODate(x))
    : [];
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

    const goldDaily = asRecord(goldDailyRaw);
    const derivedDaily = asRecord(derivedDailyRaw);
    const metaDaily = asRecord(metaDailyRaw);

    const daily: number | null = goldDaily ? (isNumber(goldDaily[metric]) ? (goldDaily[metric] as number) : null) : null;

    const ma7Key = `${metric}__ma7`;
    const ma30Key = `${metric}__ma30`;

    const derived = derivedDaily ? asRecord(derivedDaily["derived"]) : null;
    const derivedMetrics = derived ? asRecord(derived["metrics"]) : null;

    const ma7: number | null = derivedMetrics && isNumber(derivedMetrics[ma7Key]) ? (derivedMetrics[ma7Key] as number) : null;
    const ma30: number | null =
      derivedMetrics && isNumber(derivedMetrics[ma30Key]) ? (derivedMetrics[ma30Key] as number) : null;

    const metaConf = derived ? asRecord(derived["meta_confidence"]) : null;
    const confidence: number | null =
      metaConf && isNumber(metaConf["confidence_score"]) ? (metaConf["confidence_score"] as number) : null;

    const metaMetrics = metaDaily ? asRecord(metaDaily["metrics"]) : null;
    const metricObj = metaMetrics ? asRecord(metaMetrics[metric]) : null;
    const metricObjAlt = metaDaily ? asRecord(metaDaily[metric]) : null;

    const zCandidates: unknown[] = [
      metricObj ? metricObj["z"] : null,
      metricObj ? metricObj["z_score"] : null,
      metricObj ? metricObj["zscore"] : null,
      metricObjAlt ? metricObjAlt["z"] : null,
      metricObjAlt ? metricObjAlt["z_score"] : null,
    ];
    const pCandidates: unknown[] = [
      metricObj ? metricObj["percentile"] : null,
      metricObj ? metricObj["pct"] : null,
      metricObjAlt ? metricObjAlt["percentile"] : null,
      metricObjAlt ? metricObjAlt["pct"] : null,
    ];

    const z: number | null = (zCandidates.find((v) => isNumber(v)) as number | undefined) ?? null;
    const percentile: number | null = (pCandidates.find((v) => isNumber(v)) as number | undefined) ?? null;

    rows.push({ date: d, daily, ma7, ma30, confidence, z, percentile, ma_source: "derived" });
  }

  const nonNullCount = rows.reduce((acc, r) => acc + (isNumber(r.daily) ? 1 : 0), 0);
  const nonNull_ratio = rows.length === 0 ? 0 : nonNullCount / rows.length;

  const todayISO = toISODateUTC(new Date());
  const lag_days = Math.max(0, diffDaysUTC(todayISO, asof));

  return {
    dataset_id,
    revision_id,
    chain,
    metric,
    start,
    end,
    rows: rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    coverage: {
      expected_days: expectedDays.length,
      present_days: present_days.length,
      missing_days,
      nonNull_ratio,
    },
    freshness: {
      asof,
      lag_days,
    },
  };
}

export async function GET(req: NextRequest) {
  // Optional subscriber gate (align with export/* routes)
  const authResp = requireExportAuth(req);
  if (authResp) return authResp;

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

    if (startParam && !isValidISODate(startParam)) return jsonError("INVALID_START", "Invalid start. Use YYYY-MM-DD.", 400);
    if (endParam && !isValidISODate(endParam)) return jsonError("INVALID_END", "Invalid end. Use YYYY-MM-DD.", 400);

    const windowDays = parseWindowDays(windowParam);
    if (windowParam && windowDays === null) {
      return jsonError("INVALID_WINDOW", "Invalid window. Use a positive integer number of days (<= 3650).", 400);
    }

    const root = path.join(process.cwd(), "public", "data", "published", "v1");
    const goldManifestPath = path.join(root, "gold", chain, "manifest.json");
    const goldManifestRaw = await readJsonSafe(goldManifestPath);
    const goldManifest = asRecord(goldManifestRaw);
    const asof: string | null = goldManifest && typeof goldManifest["asof"] === "string" ? (goldManifest["asof"] as string) : null;

    if (!asof || !isValidISODate(asof)) {
      return jsonError("MANIFEST_ASOF_INVALID", `Missing/invalid gold manifest asof for ${chain}.`, 500, { expected_path: goldManifestPath });
    }

    const end = endParam ?? asof;
    const start = startParam ?? (windowDays ? addDaysISO(end, -(windowDays - 1)) : null);

    if (!start) {
      return jsonError("MISSING_START_OR_WINDOW", "Provide either start (YYYY-MM-DD) or window (days).", 400);
    }
    if (diffDaysUTC(start, end) > 0) {
      return jsonError("INVALID_RANGE", "start must be <= end.", 400, { start, end });
    }

    const series = await fetchSeriesLocal(chain, metric, start, end);
    if (!series) return jsonError("SERIES_ASSEMBLY_FAILED", "Failed to assemble series.", 500);

    const rows = series.rows;
    const latest = rows.length > 0 ? rows[rows.length - 1] : null;

    const dailyVals = rows.map((r) => r.daily).filter(isNumber);
    const ma30Vals = rows.map((r) => r.ma30).filter(isNumber);

    const meanDaily = mean(dailyVals);
    const medianDaily = median(dailyVals);
    const stdevDaily = stdev(dailyVals);

    const slope = linearSlope(ma30Vals);

    const windowLen = Math.max(1, series.coverage.expected_days);
    const stdevForT = stdevDaily ?? 0;
    const T = 0.05 * (stdevForT / Math.max(1, windowLen));

    const trendLabel: "Rising" | "Falling" | "Flat" = slope === null ? "Flat" : slope > T ? "Rising" : slope < -T ? "Falling" : "Flat";

    const normAbsSlope = slope === null ? 0 : Math.abs(slope) / Math.max(1e-9, stdevForT || 1e-9);
    const trendStrength = strengthFromNormalizedSlope(normAbsSlope);

    const absM = absMean(dailyVals);
    const cv = stdevDaily === null || absM === null || absM === 0 ? null : stdevDaily / absM;
    const volLabel = volLabelFromCV(cv);

    const metaPercentile = latest?.percentile ?? null;
    let levelLabel: "Low" | "Typical" | "Elevated" | "Extreme" = "Typical";
    let levelMethod: "meta_percentile" | "last365_rank" = "last365_rank";
    let levelPercentile: number | null = null;

    if (isNumber(metaPercentile)) {
      levelMethod = "meta_percentile";
      levelPercentile = metaPercentile;
      levelLabel = levelFromPercentile(metaPercentile);
    } else {
      const window365Path = path.join(root, "gold", chain, "last365d.json");
      const window365Raw = await readJsonSafe(window365Path);

      const hist: number[] = [];
      const wrec = asRecord(window365Raw);

      if (wrec && Array.isArray(wrec["rows"])) {
        for (const r of wrec["rows"]) {
          const rr = asRecord(r);
          if (!rr) continue;
          const v = rr[metric];
          if (isNumber(v)) hist.push(v);
        }
      } else if (Array.isArray(window365Raw)) {
        for (const r of window365Raw) {
          const rr = asRecord(r);
          if (!rr) continue;
          const v = rr[metric];
          if (isNumber(v)) hist.push(v);
        }
      }

      if (latest && isNumber(latest.daily) && hist.length > 0) {
        const out = levelFromRankIn365(latest.daily, hist);
        levelLabel = out.label;
        levelPercentile = out.p;
      } else {
        levelLabel = "Typical";
        levelPercentile = null;
      }
    }

    const confVals = rows.map((r) => r.confidence).filter(isNumber);
    const confMean = mean(confVals);
    const confLatest = latest?.confidence ?? null;

    const caveats: string[] = [];
    if (series.coverage.missing_days.length > 0) caveats.push(`Missing days in window: ${series.coverage.missing_days.length}.`);
    if (series.coverage.nonNull_ratio < 0.7) {
      caveats.push(`Low coverage for ${metric}: ${(series.coverage.nonNull_ratio * 100).toFixed(1)}% non-null in the selected window.`);
    }
    caveats.push(
      series.freshness.lag_days >= 5
        ? `Data is delayed: as-of ${series.freshness.asof} (lag ${series.freshness.lag_days} day(s)).`
        : `Data is near-real-time: as-of ${series.freshness.asof} (lag ${series.freshness.lag_days} day(s)).`
    );

    const metricName = metricDisplayName(metric);
    const s1 = `Over the selected period, ${metricName} has been ${levelLabel}, with a ${trendStrength} ${trendLabel} trend and ${volLabel} variability.`;
    const s2 = `This means ${plainMeaning(metric, levelLabel)} and the changes are ${stabilityTranslation(volLabel)} rather than isolated outliers.`;
    const basic = `${s1} ${s2}`;

    const expected = series.coverage.expected_days;
    const present = series.coverage.present_days;

    const advanced: string[] = [
      `Window: ${series.start} → ${series.end} (${present}/${expected} days)`,
      `Freshness: as-of ${series.freshness.asof}, lag ${series.freshness.lag_days} day(s)`,
      `Current: daily=${isNumber(latest?.daily) ? latest!.daily : "—"}, ma7=${isNumber(latest?.ma7) ? latest!.ma7 : "—"}, ma30=${
        isNumber(latest?.ma30) ? latest!.ma30 : "—"
      }`,
      `Trend method: Linear slope of MA30 over window; strength normalized by daily dispersion`,
      `Vol method: Daily coefficient of variation over window`,
      `Confidence: mean=${isNumber(confMean) ? confMean : "—"}; latest=${isNumber(confLatest) ? confLatest : "—"}`,
      `Missingness: missing days=${series.coverage.missing_days.length}; non-null ratio=${series.coverage.nonNull_ratio.toFixed(4)}`,
      `Meta context: z-score/percentile available: ${isNumber(metaPercentile) || isNumber(latest?.z) ? "yes" : "no"}`,
      ...(caveats.length > 0 ? [`Caveats: ${caveats.join(" ")}`] : []),
    ];

    const payload: SummaryResponse = {
      dataset_id: series.dataset_id,
      revision_id: series.revision_id,
      chain,
      metric,
      start,
      end,
      current: {
        daily: latest?.daily ?? null,
        ma7: latest?.ma7 ?? null,
        ma30: latest?.ma30 ?? null,
      },
      period: {
        mean_daily: meanDaily,
        median_daily: medianDaily,
        stdev_daily: stdevDaily,
      },
      trend: {
        slope_ma30: slope,
        label: trendLabel,
        strength: trendStrength,
      },
      volatility: {
        cv_daily: cv,
        label: volLabel,
      },
      level: {
        label: levelLabel,
        method: levelMethod,
        reference: "historical",
        percentile: levelPercentile,
      },
      confidence: {
        mean: confMean,
        latest: confLatest,
      },
      caveats,
      interpretation: {
        basic,
        advanced,
      },
    };

    assertSummaryContract(payload);

    // Web2 [LEGAL]: hard-stop if any generated narrative violates the no-advice / no-prediction policy.
    validateNoForbiddenLanguage(payload.interpretation.basic, "summary.interpretation.basic");
    for (let i = 0; i < payload.interpretation.advanced.length; i++) {
      validateNoForbiddenLanguage(payload.interpretation.advanced[i], `summary.interpretation.advanced[${i}]`);
    }
    for (let i = 0; i < payload.caveats.length; i++) {
      validateNoForbiddenLanguage(payload.caveats[i], `summary.caveats[${i}]`);
    }

    // Robust ETag: depends on the actual computed series content (not only dataset/revision).
    const seriesHash = stableHashSeriesRows(series.rows);
    const etagKey = [
      payload.dataset_id ?? "no_dataset",
      payload.revision_id ?? "no_revision",
      "summary",
      chain,
      metric,
      start,
      end,
      `asof=${series.freshness.asof}`,
      `lag=${series.freshness.lag_days}`,
      `series_hash=${seriesHash}`,
    ].join("|");
    const etag = `W/"${crypto.createHash("sha256").update(etagKey).digest("hex")}"`;

    // Only honor If-None-Match when unauthenticated (shared cache). For authed: private/no-store anyway.
    if (!authEnabled()) {
      const ifNoneMatch = req.headers.get("if-none-match");
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, { status: 304, headers: headersFor(req, etag) });
      }
    }

    return NextResponse.json(payload, { status: 200, headers: headersFor(req, etag) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Summary route failed";
    return jsonError("SUMMARY_FAILED", msg, 500);
  }
}