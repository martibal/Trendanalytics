"use client";

import Link from "next/link";
import { useDatasetIndex, useMeta } from "@/lib/data";
import type { ChainId } from "@/lib/types";
import { RegimeBadge } from "@/components/ui/RegimeBadge";
import { InfoBox } from "@/components/info-boxes/InfoBox";
import { MiniScorecard } from "@/components/scorecard/MiniScorecard";
import { useUiStore } from "@/store/uiStore";

function ChainCard({ chain, asof }: { chain: ChainId; asof: string }) {
  const { data, error, isLoading } = useMeta(chain, asof);
  const explainMode = useUiStore((s) => s.explainMode);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold capitalize">{chain}</div>
          <div className="mt-1 text-xs text-zinc-400">
            Data as-of: <span className="text-zinc-200">{asof}</span>
          </div>
        </div>
        {data?.regime?.label ? <RegimeBadge label={data.regime.label} /> : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
          <div className="text-[11px] text-zinc-400">Confidence (7d)</div>
          <div className="mt-1 text-sm">
            {isLoading ? "…" : error ? "—" : data?.confidence?.confidence_score?.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
          <div className="text-[11px] text-zinc-400">Updated through</div>
          <div className="mt-1 text-sm">{isLoading ? "…" : error ? "—" : data?.updated_through}</div>
        </div>
      </div>

      {/* MINI SCORECARD (B): Demand / Friction / Capacity */}
      {!isLoading && !error && data?.scorecard?.dimensions ? (
        <MiniScorecard
          dimensions={data.scorecard.dimensions}
          windowDays={data.scorecard.window_days}
          explainMode={explainMode}
        />
      ) : null}

      <div className="mt-4">
        <Link
          href={`/chains/${chain}`}
          className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 hover:bg-zinc-800"
        >
          Open details
        </Link>
      </div>

      <div className="mt-4">
        <InfoBox
          title="What you’re seeing"
          basic="A quick snapshot of the chain’s recent operating regime and the freshness/coverage of the dataset."
          advanced="Regime is derived from a deterministic ruleset using robust z-scores and short-vs-long momentum signals over a fixed window (see Methodology). Confidence is a coverage-weighted signal about data completeness and stability for the same window."
        />
      </div>
    </div>
  );
}

export function ChainsOverview() {
  const { data, error, isLoading } = useDatasetIndex();

  if (isLoading) return <div className="text-sm text-zinc-400">Loading dataset index…</div>;
  if (error || !data) return <div className="text-sm text-red-300">Failed to load dataset index.</div>;

  const chains = data.supported_chains;
  const asofByChain = data.asof_by_genre_chain?.meta ?? {};

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Dataset</div>
            <div className="mt-1 text-xs text-zinc-400">
              Computed at (UTC): <span className="text-zinc-200">{data.computed_at_utc}</span>
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            Methodology version: <span className="text-zinc-200">{data.methodology_version}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {chains.map((c) => (
          <ChainCard key={c} chain={c} asof={asofByChain[c] ?? data.asof_by_genre_chain?.gold?.[c]} />
        ))}
      </div>
    </section>
  );
}
