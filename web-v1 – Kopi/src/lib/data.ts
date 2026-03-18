// src/lib/data.ts
import useSWR from "swr";
import type {
  DatasetIndex,
  ChainId,
  MetaFile,
  DerivedFile,
  GoldFile,
  LandingHeroFile,
  LandingWindowFile,
  ContractFile,
} from "@/lib/types";

export type BundleFile = {
  chain: ChainId;
  date: string;
  meta: MetaFile | null;
  derived: DerivedFile | null;
  gold: GoldFile | null;
};

export type ManifestGenre = "gold" | "meta" | "derived";

export type ManifestResponse = {
  ok: boolean;
  chain: ChainId;
  genre: ManifestGenre;
  // contract: manifests can evolve; keep typed but safe
  manifest: Record<string, unknown> | null;
};

export const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
};

// Safe fetcher for optional files (returns null on non-200 / error)
export const fetcherOrNull = async <T,>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

/**
 * Small shared helper for safely extracting ISO dates.
 * Exported for reuse in UI modules without creating unused-local lint errors.
 */
export function toISODateOrNull(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const s = x.trim();
  if (!s) return null;
  // Keep it simple: accept YYYY-MM-DD and also allow longer ISO strings by slicing.
  const d = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/**
 * ===== Web3: Contract loader (published artifact) =====
 */
export async function fetchContract(): Promise<ContractFile> {
  return fetcher<ContractFile>("/data/published/v1/contract.json");
}

export function useContract() {
  return useSWR<ContractFile>("/data/published/v1/contract.json", fetcher, {
    revalidateOnFocus: false,
  });
}

/**
 * ===== Dataset index =====
 */
export function useDatasetIndex() {
  return useSWR<DatasetIndex>("/data/published/v1/dataset.json", fetcher, {
    revalidateOnFocus: false,
  });
}

/**
 * ===== Layer fetch hooks =====
 */
export function useMeta(chain: ChainId, asofDate?: string) {
  const url = asofDate ? `/data/published/v1/meta/${chain}/${asofDate}.json` : null;
  return useSWR<MetaFile>(url, fetcher, { revalidateOnFocus: false });
}

export function useDerived(chain: ChainId, date?: string) {
  const url = date ? `/data/published/v1/derived/${chain}/${date}.json` : null;
  return useSWR<DerivedFile>(url, fetcher, { revalidateOnFocus: false });
}

export function useGold(chain: ChainId, date?: string) {
  const url = date ? `/data/published/v1/gold/${chain}/${date}.json` : null;
  return useSWR<GoldFile>(url, fetcher, { revalidateOnFocus: false });
}

/**
 * ===== Web3: Manifest fetch (server-side export route) =====
 * Uses: /api/export/manifest?chain=...&genre=...
 */
export async function fetchManifest(chain: ChainId, genre: ManifestGenre): Promise<ManifestResponse> {
  return fetcher<ManifestResponse>(`/api/export/manifest?chain=${chain}&genre=${genre}`);
}

export function useManifest(chain: ChainId | null | undefined, genre: ManifestGenre | null | undefined) {
  const key = chain && genre ? `/api/export/manifest?chain=${chain}&genre=${genre}` : null;
  return useSWR<ManifestResponse>(key, fetcher, { revalidateOnFocus: false });
}

/**
 * ===== Web3: Resolve bundle date (single source of truth) =====
 * Strategy: pick the MIN (earliest) date among meta/derived/gold as-of values
 * to maximize chance that all three layers exist for that date.
 *
 * ISO YYYY-MM-DD strings compare lexicographically correctly.
 */
export function resolveBundleDate(args: {
  metaAsof?: string | null;
  derivedAsof?: string | null;
  goldAsof?: string | null;
}): string | null {
  const candidates = [args.metaAsof, args.derivedAsof, args.goldAsof].filter(
    (x): x is string => typeof x === "string" && x.length > 0
  );
  if (candidates.length === 0) return null;
  return candidates.sort()[0]; // earliest
}

/**
 * Back-compat alias (keep older call sites working)
 */
export function chooseBundleDate(args: {
  metaAsof?: string;
  derivedAsof?: string;
  goldAsof?: string;
}): string | null {
  return resolveBundleDate({
    metaAsof: args.metaAsof,
    derivedAsof: args.derivedAsof,
    goldAsof: args.goldAsof,
  });
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
  return useSWR<LandingHeroFile | null>(url, fetcherOrNull, {
    revalidateOnFocus: false,
  });
}

export function useLandingHeroWindow(chain: ChainId, windowDays: number | null | undefined) {
  const url =
    typeof windowDays === "number" && windowDays > 0
      ? `/data/published/v1/landing/${chain}/last${windowDays}d.json`
      : null;

  return useSWR<LandingWindowFile | null>(url, fetcherOrNull, {
    revalidateOnFocus: false,
  });
}

/**
 * Meta convenience hooks (published artifacts)
 * - latest.json for a chain
 * - last{N}d.json window for a chain (array)
 */
export function useMetaLatest(chain: ChainId) {
  const url = `/data/published/v1/meta/${chain}/latest.json`;
  return useSWR<MetaFile | null>(url, fetcherOrNull, {
    revalidateOnFocus: false,
  });
}

export function useMetaWindow(chain: ChainId, windowDays: number | null | undefined) {
  const url =
    typeof windowDays === "number" && windowDays > 0
      ? `/data/published/v1/meta/${chain}/last${windowDays}d.json`
      : null;

  return useSWR<MetaFile[] | null>(url, fetcherOrNull, {
    revalidateOnFocus: false,
  });
}

/**
 * SERIES HELPERS
 */

function onlyFiniteNumbers(obj: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!obj || typeof obj !== "object") return out;

  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export async function fetchDerivedSeries(chain: ChainId, dates: string[]) {
  const out: Array<{ date: string; metrics: Record<string, number> }> = [];

  for (const d of dates) {
    try {
      const file = await fetcher<DerivedFile>(`/data/published/v1/derived/${chain}/${d}.json`);
      const raw = file?.derived?.metrics ?? {};
      out.push({ date: String(file?.date ?? d), metrics: onlyFiniteNumbers(raw) });
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

      // GoldFile has (chain,date,metrics...). Exclude chain/date keys.
      const { date, chain: _c, ...rest } = file;
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