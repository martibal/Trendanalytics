"use client";

import Link from "next/link";
import type { ChainId } from "@/lib/types";

import { RegimeBadge } from "@/components/ui/RegimeBadge";
import { MetricTriLineChart } from "@/components/charts/MetricTriLineChart";
import type { TriSeriesPoint } from "@/lib/series/triSeries";


export function ChainCard({
  chain,
  displayName,
  asof,
  regimeLabel,
  primerText,
  metricLabel,
  data,
  highlights,
  loading,
  errorText,
}: {
  chain: ChainId;
  displayName: string;
  asof: string | null;
  regimeLabel?: string | null;

  primerText: string;

  metricLabel: string;
  data: TriSeriesPoint[];

  highlights: string[];

  loading?: boolean;
  errorText?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold">{displayName}</div>
          <div className="mt-1 text-xs text-zinc-400">
            Snapshot date: <span className="text-zinc-200">{asof ?? "—"}</span>
          </div>
        </div>
        {regimeLabel ? <RegimeBadge label={regimeLabel} /> : null}
      </div>

      <div className="mt-3 text-xs text-zinc-300">{primerText}</div>

      <div className="mt-4">
        <div className="text-[11px] text-zinc-400">Default trend</div>
        <div className="mt-1 text-sm text-zinc-200">{metricLabel}</div>

        <div className="mt-2 h-52">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">Loading chart…</div>
          ) : errorText ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">{errorText}</div>
          ) : data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">No data for window.</div>
          ) : (
            <MetricTriLineChart data={data} />
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {highlights.slice(0, 3).map((h, i) => (
          <div key={i} className="text-xs text-zinc-300">
            • {h}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Link
          href={`/chains/${chain}`}
          className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 hover:bg-zinc-800"
        >
          Open diagnostics
        </Link>
      </div>
    </div>
  );
}
