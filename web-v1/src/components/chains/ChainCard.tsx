"use client";

import Link from "next/link";
import type { ChainId } from "@/lib/types";

import { RegimeBadge } from "@/components/ui/RegimeBadge";
import { MetricTriLineChart } from "@/components/charts/MetricTriLineChart";
import type { TriLinePoint } from "@/components/charts/MetricTriLineChart";

export function ChainCard({
  chain,
  displayName,
  regimeLabel,
  metricLabel,
  data,
  asof,
  highlights,
}: {
  chain: ChainId;
  displayName: string;
  regimeLabel?: string | null;
  metricLabel: string;
  data: TriLinePoint[];
  asof: string | null;
  highlights: string[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{displayName}</div>
          <div className="mt-1 text-xs text-zinc-500">
            Snapshot date: <span className="text-zinc-200">{asof ?? "—"}</span>
          </div>
        </div>
        {regimeLabel ? <RegimeBadge label={regimeLabel} /> : null}
      </div>

      <div className="mt-3">
        <div className="text-xs text-zinc-400">Default trend</div>
        <div className="mt-1 text-sm text-zinc-200">{metricLabel}</div>
      </div>

      <div className="mt-3">
        <div className="h-52">
          <MetricTriLineChart data={data} />
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
        <Link href={`/chains/${chain}`} className="text-sm text-zinc-200 underline">
          Open diagnostics
        </Link>
      </div>
    </div>
  );
}
