// web-v1/src/catalog/scan/scanGoldMetrics.ts
//
// Reads a gold window file (e.g. last365d.json) that contains an array of daily records,
// then produces per-metric observable profiles (availability, missingness, gaps, basic stats,
// simple unit diagnostics for rate/pct-like metrics).
//
// IMPORTANT: This is "scan" (observational only). No product decisions live here.

import type { Chain } from "../decisions/productDecisions";

export type ISODate = string;

export type MetricStats = {
  count_present: number; // numeric, finite
  count_missing: number; // null/undefined/NaN/Infinity/non-numeric
  missing_rate: number; // missing / total_rows
  min: number | null;
  median: number | null;
  max: number | null;
};

export type UnitDiagnostics = {
  // For pct/rate-like metrics, attempt to detect whether values look like 0..1 or 0..100.
  // This is only a heuristic warning for the catalog.
  pct_unit_guess?: "0..1" | "0..100" | "mixed/unknown";
  pct_out_of_range_count?: number; // after interpreting as 0..1 (raw), values outside [0,1] (ignoring nulls)
  notes?: string[];
};

export type MetricProfile = {
  metric_id: string;
  chains_present: Chain[]; // filled by caller across chains; here we return chain-local and caller merges
  date_range: { first: ISODate | null; last: ISODate | null };
  days_total: number;
  gap_count: number;
  stats: MetricStats;
  unit_diagnostics?: UnitDiagnostics;
};

export type ChainScanResult = {
  chain: Chain;
  days_total: number;
  date_range: { first: ISODate | null; last: ISODate | null };
  gap_count: number;
  metrics: Record<string, MetricProfile>;
  warnings: string[];
};

/**
 * Scan one chain's gold window array (e.g. last365d.json parsed).
 * The input is expected to be an array of objects with at least a "date" field,
 * but this function is robust to missing fields.
 */
export function scanGoldWindowRows(chain: Chain, rows: unknown): ChainScanResult {
  const warnings: string[] = [];

  const arr = Array.isArray(rows) ? rows : [];
  if (!Array.isArray(rows)) {
    warnings.push(`Expected array for window rows, got ${typeof rows}. Treating as empty.`);
  }

  // Collect dates, detect gaps
  const dates: ISODate[] = [];
  for (const r of arr) {
    const d = isRecord(r) ? r["date"] : undefined;
    if (typeof d === "string" && isISODate(d)) dates.push(d);
  }
  dates.sort(); // ISO sorts lexicographically

  const date_range = {
    first: dates.length ? dates[0] : null,
    last: dates.length ? dates[dates.length - 1] : null,
  };

  const gap_count = countDateGaps(dates);

  // Discover metric keys across rows (exclude standard keys)
  const excludeKeys = new Set(["date", "chain"]);
  const metricKeys = new Set<string>();

  for (const r of arr) {
    if (!isRecord(r)) continue;
    for (const k of Object.keys(r)) {
      if (!excludeKeys.has(k)) metricKeys.add(k);
    }
  }

  // Build profiles per metric
  const metrics: Record<string, MetricProfile> = {};

  const totalRows = arr.length;

  for (const metric_id of Array.from(metricKeys).sort()) {
    const values: Array<number | null> = [];

    for (const r of arr) {
      if (!isRecord(r)) {
        values.push(null);
        continue;
      }
      const v = r[metric_id];
      values.push(coerceFiniteNumberOrNull(v));
    }

    const stats = computeStats(values, totalRows);

    const unit_diagnostics = maybeDiagnosePctUnits(metric_id, values);

    metrics[metric_id] = {
      metric_id,
      chains_present: [chain], // caller can merge across chains later
      date_range,
      days_total: totalRows,
      gap_count,
      stats,
      unit_diagnostics,
    };
  }

  return {
    chain,
    days_total: totalRows,
    date_range,
    gap_count,
    metrics,
    warnings,
  };
}

/* ----------------------------- helpers ----------------------------- */

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isISODate(s: string): boolean {
  // Strict YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map((t) => Number(t));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  return true;
}

function coerceFiniteNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    // Allow numeric strings; reject empty and obvious non-numerics
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  // booleans, objects, arrays => null
  return null;
}

function computeStats(values: Array<number | null>, totalRows: number): MetricStats {
  const present = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const count_present = present.length;
  const count_missing = Math.max(0, totalRows - count_present);
  const missing_rate = totalRows > 0 ? count_missing / totalRows : 1;

  if (count_present === 0) {
    return {
      count_present,
      count_missing,
      missing_rate,
      min: null,
      median: null,
      max: null,
    };
  }

  present.sort((a, b) => a - b);

  const min = present[0];
  const max = present[present.length - 1];
  const median = computeMedianSorted(present);

  return {
    count_present,
    count_missing,
    missing_rate,
    min,
    median,
    max,
  };
}

function computeMedianSorted(sorted: number[]): number {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function countDateGaps(sortedDates: ISODate[]): number {
  // Count missing days in the sequence (unique dates only).
  if (sortedDates.length <= 1) return 0;

  const uniq: ISODate[] = [];
  for (const d of sortedDates) {
    if (!uniq.length || uniq[uniq.length - 1] !== d) uniq.push(d);
  }

  let gaps = 0;
  for (let i = 1; i < uniq.length; i++) {
    const prev = uniq[i - 1];
    const curr = uniq[i];
    const deltaDays = daysBetween(prev, curr);
    if (deltaDays > 1) gaps += (deltaDays - 1);
  }
  return gaps;
}

function daysBetween(a: ISODate, b: ISODate): number {
  // UTC midnight diff
  const da = new Date(`${a}T00:00:00Z`);
  const db = new Date(`${b}T00:00:00Z`);
  const ms = db.getTime() - da.getTime();
  return Math.round(ms / 86_400_000);
}

function maybeDiagnosePctUnits(metricId: string, values: Array<number | null>): UnitDiagnostics | undefined {
  // Only run heuristic for obviously rate/pct-style metrics
  const looksPct =
    metricId.endsWith("_pct") ||
    metricId.endsWith("_rate") ||
    metricId.includes("pct") ||
    metricId.includes("rate");

  if (!looksPct) return undefined;

  const present = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (present.length === 0) return { pct_unit_guess: "mixed/unknown", notes: ["No numeric data present."] };

  // Heuristic:
  // - If most values are in [0,1.2], guess 0..1
  // - Else if most values are in [0,120], and many >1, guess 0..100
  // - Else mixed/unknown
  let in01ish = 0;
  let in100ish = 0;
  let gt1 = 0;

  for (const x of present) {
    if (x > 1) gt1++;
    if (x >= 0 && x <= 1.2) in01ish++;
    if (x >= 0 && x <= 120) in100ish++;
  }

  const frac01 = in01ish / present.length;
  const frac100 = in100ish / present.length;
  const fracGt1 = gt1 / present.length;

  let pct_unit_guess: UnitDiagnostics["pct_unit_guess"] = "mixed/unknown";
  const notes: string[] = [];

  if (frac01 >= 0.9) {
    pct_unit_guess = "0..1";
    notes.push("Most values fall within ~[0,1].");
  } else if (frac100 >= 0.9 && fracGt1 >= 0.2) {
    pct_unit_guess = "0..100";
    notes.push("Most values fall within ~[0,100] and many are > 1.");
  } else {
    pct_unit_guess = "mixed/unknown";
    notes.push("Values do not clearly cluster into 0..1 or 0..100.");
  }

  // Count out-of-range if interpreted as 0..1 raw
  let outOfRange01 = 0;
  for (const x of present) {
    if (x < 0 || x > 1) outOfRange01++;
  }

  return {
    pct_unit_guess,
    pct_out_of_range_count: outOfRange01,
    notes,
  };
}
