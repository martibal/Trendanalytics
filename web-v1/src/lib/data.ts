import useSWR from "swr";
import type {
  DatasetIndex,
  ChainId,
  MetaFile,
  DerivedFile,
  LandingHeroFile,
  LandingWindowFile,
} from "@/lib/types";

/**
 * Gold typing:
 * - If you already have GoldFile in "@/lib/types", replace this alias with:
 *   import type { GoldFile } from "@/lib/types";
 * - Otherwise keep this lightweight structural type for now.
 */
export type GoldFile = {
  chain: ChainId | string;
  date: string;
  [k: string]: any;
};

export type BundleFile = {
  chain: ChainId;
  date: string;
  meta: MetaFile | null;
  derived: DerivedFile | null;
  gold: GoldFile | null;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
};

// Safe fetcher for optional files (returns null on 404 / error)
const fetcherOrNull = async <T,>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
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

export function useGold(chain: ChainId, date?: string) {
  const url = date ? `/data/published/v1/gold/${chain}/${date}.json` : null;
  return useSWR<GoldFile>(url, fetcher);
}

/**
 * chooseBundleDate
 * Strategy: pick the MIN (earliest) date among meta/derived/gold as-of values
 * to maximize chance that all three layers exist for that date.
 *
 * ISO YYYY-MM-DD strings compare lexicographically correctly.
 */
export function chooseBundleDate(args: {
  metaAsof?: string;
  derivedAsof?: string;
  goldAsof?: string;
}): string | null {
  const candidates = [args.metaAsof, args.derivedAsof, args.goldAsof].filter(
    (x): x is string => typeof x === "string" && x.length > 0
  );
  if (candidates.length === 0) return null;
  return candidates.sort()[0]; // earliest
}

/**
 * useBundle
 * Loads meta + derived + gold for the same (chain, date) partition.
 */
export function useBundle(chain: ChainId, date?: string) {
  const key = date ? `bundle:v1:${chain}:${date}` : null;

  return useSWR<BundleFile>(
    key,
    async () => {
      if (!date) {
        return { chain, date: "", meta: null, derived: null, gold: null };
      }

      const [meta, derived, gold] = await Promise.all([
        fetcher<MetaFile>(`/data/published/v1/meta/${chain}/${date}.json`).catch(() => null),
        fetcher<DerivedFile>(`/data/published/v1/derived/${chain}/${date}.json`).catch(() => null),
        fetcher<GoldFile>(`/data/published/v1/gold/${chain}/${date}.json`).catch(() => null),
      ]);

      return { chain, date, meta, derived, gold };
    },
    { revalidateOnFocus: false }
  );
}

/**
 * Landing: hero + per-window
 */

export function useLandingHero(chain: ChainId) {
  const url = `/data/published/v1/landing/${chain}/hero.json`;
  return useSWR<LandingHeroFile | null>(url, fetcherOrNull, { revalidateOnFocus: false });
}

export function useLandingHeroWindow(chain: ChainId, windowDays: number | null | undefined) {
  const url =
    typeof windowDays === "number" && windowDays > 0
      ? `/data/published/v1/landing/${chain}/last${windowDays}d.json`
      : null;

  return useSWR<LandingWindowFile | null>(url, fetcherOrNull, { revalidateOnFocus: false });
}

/**
 * SERIES HELPERS (existing)
 */

function onlyFiniteNumbers(obj: any): Record<string, number> {
  const out: Record<string, number> = {};
  if (!obj || typeof obj !== "object") return out;

  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export async function fetchDerivedSeries(chain: ChainId, dates: string[]) {
  const out: Array<{ date: string; metrics: Record<string, number> }> = [];

  for (const d of dates) {
    try {
      const file = await fetcher<DerivedFile>(`/data/published/v1/derived/${chain}/${d}.json`);
      const raw = (file as any)?.derived?.metrics ?? {};
      out.push({ date: String((file as any)?.date ?? d), metrics: onlyFiniteNumbers(raw) });
    } catch {
      // skip
    }
  }

  return out;
}

export async function fetchGoldSeries(chain: ChainId, dates: string[]) {
  const out: Array<{ date: string; metrics: Record<string, number> }> = [];

  for (const d of dates) {
    try {
      const file = await fetcher<GoldFile>(`/data/published/v1/gold/${chain}/${d}.json`);
      const { date, chain: _c, ...rest } = file as any;
      out.push({ date: String(date ?? d), metrics: onlyFiniteNumbers(rest) });
    } catch {
      // skip
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
