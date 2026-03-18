import type { ChainId } from "@/lib/types";
import { fetchDerivedSeries } from "@/lib/data";
import { resolveTriSeriesKeys, buildTriSeries, countTriCoverage } from "@/lib/series/triSeries";

export type LandingChartResult = {
  chosenBaseKey: string;
  chosenKeys: { dailyKey: string; ma7Key: string; ma30Key: string; baseKey: string };
  coverage: { daily: number; ma7: number; ma30: number; total: number };
  series: Array<{ date: string; daily: number | null; ma7: number | null; ma30: number | null }>;
};

function stripMA(key: string) {
  return key.split("__")[0] ?? key;
}

export async function buildLandingTriSeries(args: {
  chain: ChainId;
  dates: string[];
  candidateBaseKeys: string[];
}): Promise<LandingChartResult | null> {
  const { chain, dates, candidateBaseKeys } = args;
  if (!dates || dates.length === 0) return null;

  const raw = await fetchDerivedSeries(chain, dates);
  const rows = raw.map((r) => ({ date: r.date, metrics: r.metrics ?? {} }));

  // discover available numeric keys
  const available = new Set<string>();
  for (const r of rows) {
    for (const [k, v] of Object.entries(r.metrics)) {
      if (typeof v === "number" && Number.isFinite(v)) available.add(k);
    }
  }

  // try candidates in order; accept first that yields any points
  for (const base of candidateBaseKeys) {
    const requested = stripMA(base);
    const keys = resolveTriSeriesKeys({ requestedKey: requested, availableKeys: available });
    const series = buildTriSeries({ rows, keys });
    const cov = countTriCoverage(series);
    if (cov.daily + cov.ma7 + cov.ma30 > 0) {
      return {
        chosenBaseKey: requested,
        chosenKeys: keys,
        coverage: cov,
        series,
      };
    }
  }

  // fallback: pick any key that exists (deterministic)
  const anyKey = Array.from(available).sort()[0];
  if (!anyKey) return null;

  const keys = resolveTriSeriesKeys({ requestedKey: anyKey, availableKeys: available });
  const series = buildTriSeries({ rows, keys });
  const cov = countTriCoverage(series);

  return {
    chosenBaseKey: stripMA(anyKey),
    chosenKeys: keys,
    coverage: cov,
    series,
  };
}
