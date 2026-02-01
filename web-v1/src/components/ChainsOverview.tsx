"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useDatasetIndex } from "@/lib/data";
import type { ChainId } from "@/lib/types";

import { ChainSnapshotCard } from "@/components/landing/ChainSnapshotCard";

const CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

export function ChainsOverview() {
  const { data, error, isLoading } = useDatasetIndex();

  const chains = useMemo(() => {
    if (!data) return CHAINS;
    const supported = Array.isArray((data as any).supported_chains) ? (data as any).supported_chains : [];
    const ordered = supported.length ? supported : CHAINS;
    return ordered.filter((c: any) => (CHAINS as string[]).includes(String(c))) as ChainId[];
  }, [data]);

  if (isLoading) return <div className="text-sm text-zinc-400">Loading dataset index…</div>;
  if (error || !data) return <div className="text-sm text-red-300">Failed to load dataset index.</div>;

  const asofMeta = ((data as any).asof_by_genre_chain as any)?.meta ?? {};
  const asofDerived = ((data as any).asof_by_genre_chain as any)?.derived ?? {};
  const asofGold = ((data as any).asof_by_genre_chain as any)?.gold ?? {};

  return (
    <section className="space-y-8">
      {/* HERO + PRIMARY ACTION */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Blockchain trends, without prices</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Descriptive, explainable analytics: regimes, persistence, and historical context. No prices, no forecasts,
              no advice.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/chains/bitcoin"
                className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-100 hover:bg-zinc-800"
              >
                Open a chain
              </Link>
              <Link href="/methodology" className="inline-flex items-center rounded-xl px-1 text-xs text-zinc-300 underline">
                Methodology
              </Link>
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            Computed (UTC): <span className="text-zinc-200">{(data as any).computed_at_utc}</span>
            <span className="mx-2">·</span>
            Methodology: <span className="text-zinc-200">{(data as any).methodology_version}</span>
          </div>
        </div>

        {/* CHAIN SNAPSHOT CARDS (dominant) */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {chains.map((chain) => (
            <ChainSnapshotCard
              key={chain}
              chain={chain}
              metaAsof={asofMeta[chain]}
              derivedAsof={asofDerived[chain]}
              goldAsof={asofGold[chain]}
            />
          ))}
        </div>

        {/* COMPACT "HOW TO READ" (one stop shop guidance) */}
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-semibold">How to read this site</div>
              <div className="mt-1 text-sm text-zinc-300">
                Start with the snapshot cards, then open a chain to see <span className="text-zinc-200">primary metrics</span> as
                tri-line charts (Daily + MA7 + MA30).
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:w-[520px]">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                <div className="text-[11px] text-zinc-400">Daily</div>
                <div className="mt-1 text-xs text-zinc-300">Latest observation (no smoothing)</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                <div className="text-[11px] text-zinc-400">MA7</div>
                <div className="mt-1 text-xs text-zinc-300">Short-term context (week)</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                <div className="text-[11px] text-zinc-400">MA30</div>
                <div className="mt-1 text-xs text-zinc-300">Medium-term context (month)</div>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
            Guardrail: Everything is descriptive and contextual. Null means missing/unknown (gaps), never zero.
          </div>
        </div>
      </div>

      {/* SECONDARY: WHO IT'S FOR + TRANSPARENCY (condensed) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-sm font-semibold">For serious retail</div>
          <p className="mt-2 text-sm text-zinc-400">
            Learn regimes and persistence without being distracted by intraday noise.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-sm font-semibold">For professionals</div>
          <p className="mt-2 text-sm text-zinc-400">
            Deterministic rules, explain-mode, coverage-aware diagnostics, and consistent (chain,date) partitions.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="text-sm font-semibold">Transparency by design</div>
          <p className="mt-2 text-sm text-zinc-400">
            Every chart is explainable. Advanced mode exposes assumptions, coverage, and the exact bundle date.
          </p>
        </div>
      </div>

      {/* SIMPLE CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
        <div>
          <div className="text-sm font-semibold">Next step</div>
          <div className="mt-1 text-xs text-zinc-500">Pick a chain to see the interpretation summary + primary charts.</div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/chains/bitcoin"
            className="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-100 hover:bg-zinc-800"
          >
            Open Bitcoin
          </Link>
          <Link
            href="/methodology"
            className="inline-flex items-center rounded-xl border border-zinc-800 px-4 py-2 text-xs text-zinc-200 hover:bg-zinc-900"
          >
            Read methodology
          </Link>
        </div>
      </div>
    </section>
  );
}
