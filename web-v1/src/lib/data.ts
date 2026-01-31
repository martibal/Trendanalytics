import useSWR from "swr";
import type { DatasetIndex, ChainId, MetaFile, DerivedFile } from "@/lib/types";

/**
 * NOTE:
 * GoldFile is not currently typed in "@/lib/types" (based on what you pasted).
 * We keep it as unknown/any to avoid breaking builds while still fetching/using it.
 */
export type GoldFile = any;

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
};

export function useDatasetIndex() {
  return useSWR<DatasetIndex>("/data/published/v1/dataset.json", fetcher);
}

export function useMeta(chain: ChainId, asofDate?: string) {
  const url = asofDate ? `/data/published/v1/meta/${chain}/${asofDate}.json` : null;
  return useSWR<MetaFile>(url, fetcher);
}

export function useDerived(chain: ChainId, date?: string) {
  const url = date ? `/data/published/v1/derived/${chain}/${date}.json` : null;
  return useSWR<DerivedFile>(url, fetcher);
}

/** NEW: gold snapshot hook */
export function useGold(chain: ChainId, date?: string) {
  const url = date ? `/data/published/v1/gold/${chain}/${date}.json` : null;
  return useSWR<GoldFile>(url, fetcher);
}

/**
 * NEW: bundle snapshot (meta + derived + gold) for same chain+date.
 * This is the core primitive for combining partitioned JSON layers.
 */
export type ChainBundle = {
  chain: ChainId;
  date: string;
  meta: MetaFile | null;
  derived: DerivedFile | null;
  gold: GoldFile | null;
};

export async function fetchBundle(chain: ChainId, date: string): Promise<ChainBundle> {
  const [meta, derived, gold] = await Promise.all([
    fetcher<MetaFile>(`/data/published/v1/meta/${chain}/${date}.json`).catch(() => null),
    fetcher<DerivedFile>(`/data/published/v1/derived/${chain}/${date}.json`).catch(() => null),
    fetcher<GoldFile>(`/data/published/v1/gold/${chain}/${date}.json`).catch(() => null),
  ]);

  return { chain, date, meta, derived, gold };
}

/**
 * NEW: SWR hook for bundle snapshot.
 * Returns nulls for missing layers (still useful for diagnostics).
 */
export function useBundle(chain: ChainId, date?: string) {
  const key = date ? (["bundle", chain, date] as const) : null;
  return useSWR<ChainBundle>(key, async () => fetchBundle(chain, date as string));
}

/**
 * Helper: choose a safe "bundle date" that maximizes overlap across layers.
 * For YYYY-MM-DD, lexical compare is valid.
 *
 * Strategy: choose MIN date among provided as-of dates.
 * That ensures all layers at/after that date should exist IF pipeline publishes daily.
 */
export function chooseBundleDate(args: {
  metaAsof?: string;
  derivedAsof?: string;
  goldAsof?: string;
}): string | null {
  const dates = [args.metaAsof, args.derivedAsof, args.goldAsof].filter(Boolean) as string[];
  if (dates.length === 0) return null;
  dates.sort(); // ascending
  return dates[0];
}

export async function fetchDerivedSeries(chain: ChainId, dates: string[]) {
  const out: Array<{ date: string; metrics: Record<string, number> }> = [];
  for (const d of dates) {
    try {
      const file = await fetcher<DerivedFile>(`/data/published/v1/derived/${chain}/${d}.json`);
      out.push({ date: file.date, metrics: file.derived.metrics });
    } catch {
      // missing day: skip
    }
  }
  return out;
}

export function buildDateRangeISO(endISO: string, days: number) {
  const end = new Date(endISO + "T00:00:00Z");
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(end);
    dt.setUTCDate(end.getUTCDate() - i);
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}
