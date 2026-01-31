import useSWR from "swr";
import type { DatasetIndex, ChainId, MetaFile, DerivedFile } from "@/lib/types";

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
};

export function useDatasetIndex() {
  return useSWR<DatasetIndex>("/data/published/v1/dataset.json", fetcher);
}

export function useMeta(chain: ChainId, asofDate?: string) {
  const url = asofDate
    ? `/data/published/v1/meta/${chain}/${asofDate}.json`
    : null;
  return useSWR<MetaFile>(url, fetcher);
}

export function useDerived(chain: ChainId, date?: string) {
  const url = date ? `/data/published/v1/derived/${chain}/${date}.json` : null;
  return useSWR<DerivedFile>(url, fetcher);
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
