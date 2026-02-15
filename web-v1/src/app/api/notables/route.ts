// src/app/api/notables/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";
import { METRIC_KEYS, requireMetric, metricAvailability, metricLinks } from "@/lib/metrics/catalog";
import { validateNoForbiddenLanguage } from "@/lib/legal/forbiddenLanguage";
import type { ChainId } from "@/lib/types";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";

type ApiError = {
  error: {
    code: string;
    message: string;
    details?: any;
  };
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

type TrendLabel = "Rising" | "Falling" | "Flat";
type Strength = "Weak" | "Moderate" | "Strong";
type VolLabel = "Stable" | "Variable" | "Highly variable";
type LevelLabel = "Low" | "Typical" | "Elevated" | "Extreme";

type Notable = {
  metric: string;
  label: string;
  category: string;

  score: number;

  signals: {
    level: { label: LevelLabel; percentile: number | null; method: "meta_percentile" | "window_rank" };
    trend: { label: TrendLabel; strength: Strength; slope_ma30: number | null };
    volatility: { label: VolLabel; cv_daily: number | null };
    coverage: Coverage;
    freshness: Freshness;
  };

  kind: Array<"Level" | "Trend" | "Volatility" | "DataQuality">;

  interpretation: {
    basic: string; // 1–2 sentences (descriptive)
    advanced: string[]; // bullet-ish strings
  };

  caveats: string[];

  links: {
    methodology: string;
    wiki: string;
  };
};

type ApiResponse = {
  dataset_id: string | null;
  revision_id: number | null;

  chain: Chain;
  window_days: number;
  start: string;
  end: string;

  freshness: Freshness;

  notables: Notable[];

  notes: string[];
};

const CACHE_CONTROL = "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

/**
 * In-memory cache (per server instance).
 * Keyed by ETag because ETag hashes the response identity (inputs + manifest content).
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

function jsonError(code: string, message: string, status: number, details?: any) {
  const body: ApiError = { error: { code, message, details } };
  return NextResponse.json(body, { status });
}

function parseChain(s: string | null): Chain | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === "bitcoin" || v === "ethereum" || v === "arbitrum" || v === "base") return v;
  return null;
}

function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
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

function parseWindowDays(v: string | null): number {
  if (!v) return 30;
  const n = Number(v);
  if (!Number.isFinite(n)) return 30;
  const i = Math.floor(n);
  if (i <= 0) return 30;
  if (i > 3650) return 3650;
  return i;
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

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
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

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const a = xs.slice().sort((p, q) => p - q);
  const mid = Math.floor(a.length / 2);
  if (a.length % 2 === 1) return a[mid];
  return (a[mid - 1] + a[mid]) / 2;
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

function strengthFromNormalizedSlope(normAbsSlope: number): Strength {
  if (normAbsSlope < 0.25) return "Weak";
  if (normAbsSlope < 0.75) return "Moderate";
  return "Strong";
}

function volLabelFromCV(cv: number | null): VolLabel {
  if (cv === null) return "Variable";
  if (cv < 0.25) return "Stable";
  if (cv <= 0.6) return "Variable";
  return "Highly variable";
}

function levelFromPercentile(p: number): LevelLabel {
  if (p >= 95) return "Extreme";
  if (p >= 80) return "Elevated";
  if (p <= 20) return "Low";
  return "Typical";
}

function rankPercentile(current: number, hist: number[]): number {
  const vals = hist.filter((x) => Number.isFinite(x));
  if (vals.length === 0) return 50;
  let le = 0;
  for (const v of vals) if (v <= current) le++;
  return (le / vals.length) * 100;
}

function pickZPercentile(meta: any, metric: string): { z: number | null; percentile: number | null } {
  const zCandidates = [
    meta?.metrics?.[metric]?.z,
    meta?.metrics?.[metric]?.z_score,
    meta?.metrics?.[metric]?.zscore,
    meta?.[metric]?.z,
    meta?.[metric]?.z_score,
  ];
  const pCandidates = [
    meta?.metrics?.[metric]?.percentile,
    meta?.metrics?.[metric]?.pct,
    meta?.[metric]?.percentile,
    meta?.[metric]?.pct,
  ];
  const z = zCandidates.find((v: any) => isNumber(v)) ?? null;
  const percentile = pCandidates.find((v: any) => isNumber(v)) ?? null;
  return { z, percentile };
}

function makeEtag(input: string): string {
  const hash = crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
  return `W/"${hash}"`;
}

function hashStringList(xs: string[]): string {
  // Stable content hash: order is assumed normalized by caller (sorted, de-duped).
  const h = crypto.createHash("sha256");
  for (const s of xs) {
    h.update(s);
    h.update("|");
  }
  return h.digest("hex").slice(0, 16);
}

type Row = {
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
  confidence: number | null;
  z: number | null;
  percentile: number | null;
};

async function loadWindowSeries(root: string, chain: Chain, metric: string, start: string, end: string, availableSet: Set<string>) {
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

  const rows: Row[] = [];
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

    const ma7: number | null = isNumber(derivedDaily?.derived?.metrics?.[ma7Key]) ? derivedDaily.derived.metrics[ma7Key] : null;
    const ma30: number | null = isNumber(derivedDaily?.derived?.metrics?.[ma30Key]) ? derivedDaily.derived.metrics[ma30Key] : null;

    const confidence: number | null = isNumber(derivedDaily?.derived?.meta_confidence?.confidence_score)
      ? derivedDaily.derived.meta_confidence.confidence_score
      : null;

    const { z, percentile } = pickZPercentile(metaDaily, metric);

    rows.push({ date: d, daily, ma7, ma30, confidence, z, percentile });
  }

  // Fallback MA if missing: trailing mean over present days
  const sorted = rows.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  function trailingMean(idx: number, n: number): number | null {
    const vals: number[] = [];
    for (let j = idx; j >= 0 && vals.length < n; j--) {
      const v = sorted[j].daily;
      if (isNumber(v)) vals.push(v);
    }
    return vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : null;
  }

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].ma7 === null) sorted[i].ma7 = trailingMean(i, 7);
    if (sorted[i].ma30 === null) sorted[i].ma30 = trailingMean(i, 30);
  }

  const nonNullCount = sorted.reduce((acc, r) => acc + (isNumber(r.daily) ? 1 : 0), 0);
  const nonNull_ratio = sorted.length === 0 ? 0 : nonNullCount / sorted.length;

  const coverage: Coverage = {
    expected_days: expectedDays.length,
    present_days: present_days.length,
    missing_days,
    nonNull_ratio,
  };

  return { rows: sorted, coverage };
}

function computeSignals(metric: string, rows: Row[]) {
  const latest = rows.length ? rows[rows.length - 1] : null;

  const dailyVals = rows.map((r) => r.daily).filter(isNumber);
  const ma30Vals = rows.map((r) => r.ma30).filter(isNumber);

  const sdDaily = stdev(dailyVals) ?? 0;
  const absMeanDaily = (() => {
    if (dailyVals.length === 0) return null;
    let s = 0;
    for (const x of dailyVals) s += Math.abs(x);
    return s / dailyVals.length;
  })();

  const slope = linearSlope(ma30Vals);

  const T = 0.05 * (sdDaily / Math.max(1, rows.length));
  const trendLabel: TrendLabel = slope === null ? "Flat" : slope > T ? "Rising" : slope < -T ? "Falling" : "Flat";

  const normAbsSlope = slope === null ? 0 : Math.abs(slope) / Math.max(1e-9, sdDaily || 1e-9);
  const strength = strengthFromNormalizedSlope(normAbsSlope);

  const cv = sdDaily === 0 || absMeanDaily === null || absMeanDaily === 0 ? null : sdDaily / absMeanDaily;
  const volLabel = volLabelFromCV(cv);

  // Level: prefer meta percentile, else rank within window daily values
  const metaP = latest?.percentile ?? null;
  let levelP: number | null = null;
  let method: "meta_percentile" | "window_rank" = "window_rank";
  if (isNumber(metaP)) {
    levelP = metaP;
    method = "meta_percentile";
  } else if (latest && isNumber(latest.daily) && dailyVals.length) {
    levelP = rankPercentile(latest.daily, dailyVals);
    method = "window_rank";
  }

  const levelLabel: LevelLabel = levelP === null ? "Typical" : levelFromPercentile(levelP);

  return {
    latest,
    trend: { label: trendLabel, strength, slope_ma30: slope },
    volatility: { label: volLabel, cv_daily: cv },
    level: { label: levelLabel, percentile: levelP, method },
    stats: {
      mean_daily: mean(dailyVals),
      median_daily: median(dailyVals),
      stdev_daily: stdev(dailyVals),
    },
  };
}

function persistenceHint(rows: Row[]) {
  // Simple persistence indicator: compare median of last 7 daily vs median of first 7 daily within window
  const n = rows.length;
  if (n < 14) return { ok: false, delta: null, label: "insufficient window length" as const };

  const first = rows.slice(0, 7).map((r) => r.daily).filter(isNumber);
  const last = rows.slice(n - 7).map((r) => r.daily).filter(isNumber);

  const m1 = median(first);
  const m2 = median(last);
  if (m1 === null || m2 === null) return { ok: false, delta: null, label: "insufficient non-null values" as const };

  const delta = m2 - m1;
  // We do not interpret sign as "good/bad", only directionality.
  return {
    ok: true,
    delta,
    label: delta > 0 ? "higher than early-window baseline" : delta < 0 ? "lower than early-window baseline" : "similar to early-window baseline",
  };
}

function buildNotable(
  chain: Chain,
  metricKey: string,
  windowStart: string,
  windowEnd: string,
  freshness: Freshness,
  coverage: Coverage,
  rows: Row[]
): Notable | null {
  const m = requireMetric(metricKey);
  const avail = metricAvailability(chain as ChainId, metricKey);

  // Structural NA => skip from notables list
  if (avail.kind === "expected_na") return null;

  const signals = computeSignals(metricKey, rows);

  const kind: Notable["kind"] = [];
  let score = 0;

  // Data quality first (can be notable on its own)
  if (
    freshness.lag_days >= 7 ||
    coverage.nonNull_ratio < 0.7 ||
    coverage.missing_days.length >= Math.max(3, Math.floor(coverage.expected_days * 0.1))
  ) {
    kind.push("DataQuality");
    score += 1;
  }

  // Level
  if (signals.level.percentile !== null) {
    if (signals.level.label === "Extreme") {
      kind.push("Level");
      score += 3;
    } else if (signals.level.label === "Elevated" || signals.level.label === "Low") {
      kind.push("Level");
      score += 2;
    }
  }

  // Trend
  if (signals.trend.label !== "Flat") {
    if (signals.trend.strength === "Strong") {
      kind.push("Trend");
      score += 2;
    } else if (signals.trend.strength === "Moderate") {
      kind.push("Trend");
      score += 1;
    }
  }

  // Volatility
  if (signals.volatility.label === "Highly variable") {
    kind.push("Volatility");
    score += 1;
  }

  // If nothing triggered, not a notable
  if (kind.length === 0) return null;

  const caveats: string[] = [];
  if (coverage.missing_days.length > 0) caveats.push(`Missing days in window: ${coverage.missing_days.length}.`);
  if (coverage.nonNull_ratio < 0.7) caveats.push(`Low coverage: ${(coverage.nonNull_ratio * 100).toFixed(1)}% non-null within the selected window.`);
  if (freshness.lag_days >= 5) caveats.push(`Data lag: as-of ${freshness.asof} (lag ${freshness.lag_days} day(s)).`);

  if (avail.kind === "possible_missing") {
    caveats.push(avail.reason_basic);
  }

  const pers = persistenceHint(rows);

  const levelText =
    signals.level.percentile === null
      ? `Level: Typical (no percentile available).`
      : `Level: ${signals.level.label} (~p${signals.level.percentile.toFixed(0)}, ${signals.level.method}).`;

  const trendText = `Trend: ${signals.trend.strength} ${signals.trend.label} (slope_ma30=${signals.trend.slope_ma30 === null ? "—" : signals.trend.slope_ma30.toFixed(6)}).`;
  const volText = `Volatility: ${signals.volatility.label} (cv=${signals.volatility.cv_daily === null ? "—" : signals.volatility.cv_daily.toFixed(3)}).`;

  // Basic: 1–2 descriptive sentences, no normative verbs.
  const basicSentence1 = `${m.label} is flagged as notable in the ${windowStart} → ${windowEnd} window: ${kind.join(", ")}.`;
  const basicSentence2 = `Context signals: ${signals.level.label} level, ${signals.trend.strength} ${signals.trend.label} trend, and ${signals.volatility.label} variability.`;

  const basic = `${basicSentence1} ${basicSentence2}`;

  const advanced: string[] = [
    `Metric: ${m.key} · Category: ${m.category}`,
    `Window: ${windowStart} → ${windowEnd}`,
    `Freshness: as-of ${freshness.asof} (lag ${freshness.lag_days} day(s))`,
    `Coverage: ${coverage.present_days}/${coverage.expected_days} present; missing=${coverage.missing_days.length}; non-null=${coverage.nonNull_ratio.toFixed(4)}`,
    levelText,
    trendText,
    volText,
    pers.ok
      ? `Persistence (median last7 vs first7): ${pers.label} (Δ=${pers.delta === null ? "—" : pers.delta.toFixed(6)}).`
      : `Persistence: ${pers.label}.`,
    `Why this metric exists (basic): ${m.doc.why.basic}`,
    `Value to the user (basic): ${m.doc.value.basic}`,
  ];

  const links = metricLinks(metricKey);

  return {
    metric: m.key,
    label: m.label,
    category: m.category,
    score,
    kind,
    signals: {
      level: signals.level,
      trend: signals.trend,
      volatility: signals.volatility,
      coverage,
      freshness,
    },
    interpretation: { basic, advanced },
    caveats,
    links: { methodology: links.methodologyHref, wiki: links.wikiHref },
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const chain = parseChain(url.searchParams.get("chain"));
    if (!chain) return jsonError("INVALID_CHAIN", "Invalid chain. Use bitcoin|ethereum|arbitrum|base.", 400);

    const window_days = parseWindowDays(url.searchParams.get("window"));
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.max(1, Math.min(50, Math.floor(Number(limitParam) || 12))) : 12;

    const root = path.join(process.cwd(), "public", "data", "published", "v1");

    const datasetJson = await readJsonSafe(path.join(root, "dataset.json"));
    const dataset_id: string | null = typeof datasetJson?.dataset_id === "string" ? datasetJson.dataset_id : null;
    const revision_id: number | null = typeof datasetJson?.revision_id === "number" ? datasetJson.revision_id : null;

    const goldManifestPath = path.join(root, "gold", chain, "manifest.json");
    const goldManifest = await readJsonSafe(goldManifestPath);

    const asof: string | null = typeof goldManifest?.asof === "string" ? goldManifest.asof : null;
    if (!asof || !isValidISODate(asof)) {
      return jsonError("MANIFEST_ASOF_INVALID", `Missing/invalid gold manifest asof for ${chain}.`, 500, { expected_path: goldManifestPath });
    }

    const todayISO = toISODateUTC(new Date());
    const lag_days = Math.max(0, diffDaysUTC(todayISO, asof));

    const end = asof;
    const start = addDaysISO(end, -(window_days - 1));

    // Normalize available_days to avoid order/dup/invalid-date cache issues.
    const availableDaysRaw: string[] = Array.isArray(goldManifest?.available_days) ? goldManifest.available_days : [];
    const availableDays = Array.from(new Set(availableDaysRaw.filter((d) => typeof d === "string" && isValidISODate(d)))).sort();
    const availableSet = new Set<string>(availableDays);

    const freshness: Freshness = { asof, lag_days };

    // Robust response identity:
    // - include limit (payload slices notables)
    // - include stable hash of available_days CONTENT (not just length)
    const availableDaysHash = hashStringList(availableDays);

    const etag = makeEtag(
      [
        dataset_id ?? "no_dataset",
        revision_id ?? "no_revision",
        "notables",
        chain,
        String(window_days),
        start,
        end,
        `limit=${limit}`,
        `available_days_hash=${availableDaysHash}`,
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

    // Candidate metrics = catalog keys, filtered by chain availability
    const candidates = METRIC_KEYS.map((k) => String(k));

    const notables: Notable[] = [];
    for (const metricKey of candidates) {
      const avail = metricAvailability(chain as ChainId, metricKey);
      if (avail.kind === "expected_na") continue;

      const { rows, coverage } = await loadWindowSeries(root, chain, metricKey, start, end, availableSet);

      // Hard gating: if we have almost no rows, skip (not meaningful)
      if (rows.length < 7) continue;

      const n = buildNotable(chain, metricKey, start, end, freshness, coverage, rows);
      if (n) notables.push(n);
    }

    // Sort: score desc, then by label
    notables.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.label.localeCompare(b.label);
    });

    const notes: string[] = [
      "Notables are descriptive flags based on historical deviation, persistence signals, and trend/volatility context.",
      "Missing days are never treated as zeros; coverage and freshness are reported explicitly.",
      "No price data, forecasts, or recommendations are used or produced.",
    ];

    const payload: ApiResponse = {
      dataset_id,
      revision_id,
      chain,
      window_days,
      start,
      end,
      freshness,
      notables: notables.slice(0, limit),
      notes,
    };

    // Web2 [LEGAL]: hard-stop if any generated narrative violates the no-advice / no-prediction policy.
    for (let i = 0; i < payload.notes.length; i++) {
      validateNoForbiddenLanguage(payload.notes[i], `notables.notes[${i}]`);
    }
    for (let i = 0; i < payload.notables.length; i++) {
      const n = payload.notables[i];
      validateNoForbiddenLanguage(n.interpretation.basic, `notables[${i}].interpretation.basic`);
      for (let j = 0; j < n.interpretation.advanced.length; j++) {
        validateNoForbiddenLanguage(n.interpretation.advanced[j], `notables[${i}].interpretation.advanced[${j}]`);
      }
      for (let j = 0; j < n.caveats.length; j++) {
        validateNoForbiddenLanguage(n.caveats[j], `notables[${i}].caveats[${j}]`);
      }
    }

    memCacheSet(etag, payload);

    return NextResponse.json(payload, { status: 200, headers: { ETag: etag, "Cache-Control": CACHE_CONTROL } });
  } catch (e: any) {
    return jsonError("NOTABLES_FAILED", e?.message || "Notables route failed", 500);
  }
}