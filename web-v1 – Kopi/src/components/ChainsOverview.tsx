"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useDatasetIndex } from "@/lib/data";
import type { ChainId } from "@/lib/types";

import { AtAGlanceSummaryCard } from "@/components/landing/AtAGlanceSummaryCard";
import { ChainHeroCard } from "@/components/landing/ChainHeroCard";

const CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

export function ChainsOverview() {
  const { data, error, isLoading } = useDatasetIndex();

  const chains = useMemo(() => {
    if (!data) return CHAINS;
    const supported = Array.isArray(data.supported_chains) ? data.supported_chains : [];
    const ordered = supported.length ? supported : CHAINS;
    return ordered.filter((c) => (CHAINS as string[]).includes(String(c))) as ChainId[];
  }, [data]);

  if (isLoading) return <div className="text-sm text-ui-muted">Loading dataset index…</div>;
  if (error || !data) return <div className="text-sm text-ui-bad">Failed to load dataset index.</div>;

  const asofMeta = (data.asof_by_genre_chain as any)?.meta ?? {};
  const asofDerived = (data.asof_by_genre_chain as any)?.derived ?? {};
  const asofGold = (data.asof_by_genre_chain as any)?.gold ?? {};

  return (
    <section className="space-y-10">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl border border-ui-border bg-ui-bg shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-ui-accent/12 via-ui-accent/0 to-transparent" />
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-ui-accent/10 blur-3xl" />
          <div className="absolute -right-44 -top-52 h-[560px] w-[560px] rounded-full bg-ui-accent2/10 blur-3xl" />
          <div className="absolute inset-x-0 top-[88px] h-px bg-white/10" />
        </div>

        <div className="relative p-6 md:p-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-ui-border bg-ui-bg/30 px-3 py-1 text-[11px] text-ui-muted backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-ui-accent/80" />
                Price-agnostic • Descriptive only
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ui-text md:text-4xl">
                Blockchain market intelligence
              </h1>

              <p className="mt-3 text-sm text-ui-muted md:text-base">
                Large, interactive chain “signature” charts designed for fast comprehension: levels, direction, persistence,
                and confidence — no prices, no forecasts, no advice.
              </p>

              <div className="mt-5 h-px w-40 bg-gradient-to-r from-ui-accent/50 via-ui-accent/10 to-transparent" />
            </div>

            <div className="rounded-2xl border border-ui-border bg-ui-bg/30 px-4 py-3 text-xs text-ui-muted backdrop-blur">
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <div>
                  Computed (UTC): <span className="text-ui-text">{data.computed_at_utc}</span>
                </div>
                <div>
                  Methodology: <span className="text-ui-text">{data.methodology_version}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AT A GLANCE */}
        <div className="relative px-6 pb-6 md:px-10">
          <AtAGlanceSummaryCard
            computedAtUtc={data.computed_at_utc}
            methodologyVersion={data.methodology_version}
            supportedChains={chains}
            asofMeta={asofMeta}
            asofDerived={asofDerived}
            asofGold={asofGold}
          />
        </div>
      </div>

      {/* CHAINS (STACKED HERO CARDS) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-ui-text">Chains</div>
            <div className="mt-1 text-xs text-ui-faint">
              Big signature charts (hover for exact values). Click a chain to open the full diagnostic view.
            </div>
          </div>
          <Link href="/methodology" className="text-xs text-ui-muted underline">
            Methodology
          </Link>
        </div>

        <div className="space-y-4">
          {chains.map((chain) => (
            <ChainHeroCard key={chain} chain={chain} />
          ))}
        </div>
      </div>

      {/* HOW TO READ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="ui-card p-5">
          <div className="text-sm font-semibold text-ui-text">Trends, not prices</div>
          <p className="mt-2 text-sm text-ui-muted">
            The site is strictly descriptive: no prices, no forecasts, no advice. The goal is to understand on-chain operating
            regimes and persistent shifts.
          </p>
        </div>

        <div className="ui-card p-5">
          <div className="text-sm font-semibold text-ui-text">Daily vs MA7 vs MA30</div>
          <p className="mt-2 text-sm text-ui-muted">
            Daily values show the latest observation. MA7 and MA30 provide short- and medium-term context so you can see
            acceleration, cooling, and regime shifts.
          </p>
        </div>

        <div className="ui-card p-5">
          <div className="text-sm font-semibold text-ui-text">Confidence is first-class</div>
          <p className="mt-2 text-sm text-ui-muted">
            The confidence strip summarizes data completeness/coverage. Use it to distinguish persistent shifts from periods
            with degraded input quality.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-ui-border bg-ui-bg p-6">
        <div>
          <div className="text-sm font-semibold text-ui-text">Explore chains</div>
          <div className="mt-1 text-xs text-ui-faint">Open a chain to see the full diagnostic view.</div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/chains/bitcoin`}
            className="inline-flex items-center rounded-xl border border-ui-border bg-ui-surface2 px-4 py-2 text-xs text-ui-text hover:bg-ui-surface focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
          >
            Open Bitcoin
          </Link>
          <Link
            href="/methodology"
            className="inline-flex items-center rounded-xl border border-ui-border px-4 py-2 text-xs text-ui-muted hover:bg-ui-surface focus:outline-none focus:ring-2 focus:ring-ui-accent/20"
          >
            Read methodology
          </Link>
        </div>
      </div>
    </section>
  );
}
