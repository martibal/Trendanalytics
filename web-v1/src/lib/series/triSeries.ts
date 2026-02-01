export type DerivedSeriesRow = {
  date: string;
  // Allow null/undefined: missing values must become gaps, never zeros.
  metrics: Record<string, number | null | undefined>;
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

function normalizeBaseKey(requestedKey: string): { base: string } {
  const parts = requestedKey.split("__");
  const base = parts[0] ?? requestedKey;
  return { base };
}

function toNumOrNull(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

export function resolveTriSeriesKeys(args: {
  requestedKey: string;
  availableKeys?: Set<string> | null;
}): TriSeriesKeys {
  const { requestedKey, availableKeys } = args;
  const { base } = normalizeBaseKey(requestedKey);

  const dailyKey = base;
  const ma7Key = `${base}__ma7`;
  const ma30Key = `${base}__ma30`;

  // If base isn't present but MA is, use MA as the daily line (prevents empty charts on MA-only chains).
  if (availableKeys && !availableKeys.has(dailyKey)) {
    if (availableKeys.has(ma7Key)) return { baseKey: base, dailyKey: ma7Key, ma7Key, ma30Key };
    if (availableKeys.has(ma30Key)) return { baseKey: base, dailyKey: ma30Key, ma7Key, ma30Key };
  }

  return { baseKey: base, dailyKey, ma7Key, ma30Key };
}

/**
 * IMPORTANT: do NOT filter out "all-null" days.
 * Keeping dates with nulls preserves time continuity and renders true gaps in charts.
 */
export function buildTriSeries(args: { rows: DerivedSeriesRow[]; keys: TriSeriesKeys }): TriSeriesPoint[] {
  const { rows, keys } = args;

  return rows.map((r) => {
    const m = r.metrics ?? {};
    const daily = toNumOrNull(m[keys.dailyKey]);
    const ma7 = toNumOrNull(m[keys.ma7Key]);
    const ma30 = toNumOrNull(m[keys.ma30Key]);
    return { date: r.date, daily, ma7, ma30 };
  });
}

export function countTriCoverage(points: { daily: number | null; ma7: number | null; ma30: number | null }[]) {
  let daily = 0;
  let ma7 = 0;
  let ma30 = 0;

  for (const p of points) {
    if (p.daily !== null) daily += 1;
    if (p.ma7 !== null) ma7 += 1;
    if (p.ma30 !== null) ma30 += 1;
  }

  return { daily, ma7, ma30, total: points.length };
}
