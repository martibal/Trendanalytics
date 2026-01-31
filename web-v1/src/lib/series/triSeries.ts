export type DerivedSeriesRow = {
  date: string;
  metrics: Record<string, number>;
};

export type TriSeriesKeys = {
  baseKey: string;
  dailyKey: string;
  ma7Key: string;
  ma30Key: string;
};

export type TriSeriesPoint = {
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
};

function pickNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function stripMA(key: string): string {
  return key.split("__")[0] ?? key;
}

/**
 * Resolves daily+MA keys for a chosen metric.
 *
 * Default contract:
 * - baseKey = strip "__ma7/__ma30"
 * - dailyKey = baseKey (preferred)
 * - ma7Key   = `${baseKey}__ma7`
 * - ma30Key  = `${baseKey}__ma30`
 *
 * If dailyKey not present but `${baseKey}_daily` exists, we use that as dailyKey.
 */
export function resolveTriSeriesKeys(args: {
  requestedKey: string;
  availableKeys: Set<string>;
}): TriSeriesKeys {
  const baseKey = stripMA(args.requestedKey);

  const candidateDailyA = baseKey;
  const candidateDailyB = `${baseKey}_daily`;

  const dailyKey = args.availableKeys.has(candidateDailyA)
    ? candidateDailyA
    : args.availableKeys.has(candidateDailyB)
    ? candidateDailyB
    : candidateDailyA; // keep deterministic even if missing

  return {
    baseKey,
    dailyKey,
    ma7Key: `${baseKey}__ma7`,
    ma30Key: `${baseKey}__ma30`,
  };
}

/**
 * Builds tri-series points (daily + MA7 + MA30) from derived rows.
 * Missing lines become null (not zero).
 */
export function buildTriSeries(args: {
  rows: DerivedSeriesRow[];
  keys: TriSeriesKeys;
}): TriSeriesPoint[] {
  const { rows, keys } = args;

  return rows.map((r) => {
    const m = r.metrics ?? {};
    return {
      date: r.date,
      daily: pickNumber(m[keys.dailyKey]),
      ma7: pickNumber(m[keys.ma7Key]),
      ma30: pickNumber(m[keys.ma30Key]),
    };
  });
}

/**
 * Utility: counts how many points exist for each line.
 * Useful for diagnostics / QA.
 */
export function countTriCoverage(points: TriSeriesPoint[]) {
  let daily = 0, ma7 = 0, ma30 = 0;
  for (const p of points) {
    if (p.daily != null) daily++;
    if (p.ma7 != null) ma7++;
    if (p.ma30 != null) ma30++;
  }
  return { daily, ma7, ma30, total: points.length };
}
