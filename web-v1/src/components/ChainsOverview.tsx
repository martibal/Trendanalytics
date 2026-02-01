"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useDatasetIndex } from "@/lib/data";
import type { ChainId } from "@/lib/types";

import { ChainSnapshotCard } from "@/components/landing/ChainSnapshotCard";
import { AtAGlanceSummaryCard } from "@/components/landing/AtAGlanceSummaryCard";

const CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

export function ChainsOverview() {
  const { data, error, isLoading } = useDatasetIndex();

  const chains = useMemo(() => {
    if (!data) return CHAINS;
    const supported = Array.isArray(data.supported_chains) ? data.supported_chains : [];
    const ordered = supported.length ? supported : CHAINS;
    return ordered.filter((c) => (CHAINS as string[]).includes(String(c))) as ChainId[];
  }, [data]);

  if (isLoading) return <div className="text-sm ui-text-muted">Loading dataset index…</div>;
  if (error || !data) return <div className="text-sm text-ui-bad">Failed to load dataset index.</div>;

  const asofMeta = (data.asof_by_genre_chain as any)?.meta ?? {};
  const asofDerived = (data.asof_by_genre_chain as any)?.derived ?? {};
  const asofGold = (data.asof_by_genre_chain as any)?.gold ?? {};

  return (
    <section className="space-y-10">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl border ui-border ui-bg">
        {/* subtle accent wash */}
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="h-full w-full bg-gradient-to-b from-ui-accent/10 via-transparent to-transparent" />
        </div>

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl ui-text">
                Blockchain market intelligence
              </h1>
              <p className="mt-3 max-w-2xl text-sm md:text-base ui-text-muted">
                Price-agnostic, descriptive analytics. Regimes, persistence, and historical context — fully explainable,
                with no predictions.
              </p>
            </div>

            <div className="rounded-2xl border ui-border bg-ui-bg/60 px-4 py-3 text-xs ui-text-muted backdrop-blur">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <div>
                  Computed (UTC): <span className="ui-text">{data.computed_at_utc}</span>
                </div>
                <div>
                  Methodology: <span className="ui-text">{data.methodology_version}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AT A GLANCE */}
        <div className="relative px-6 pb-6 md:px-8">
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

      {/* CHAIN SNAPSHOT CARDS */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold ui-text">Chains</div>
            <div className="mt-1 text-xs ui-text-faint">
              Each card shows a default tri-line trend (Daily + MA7 + MA30) and the latest regime label (if available).
            </div>
          </div>
          <Link href="/methodology" className="text-xs ui-text-muted underline">
            Methodology
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* HOW TO READ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="ui-card p-5">
          <div className="text-sm font-semibold ui-text">Trends, not prices</div>
          <p className="mt-2 text-sm ui-text-muted">
            The site is strictly descriptive: no prices, no forecasts, no advice. The goal is to understand on-chain
            operating regimes and persistent shifts.
          </p>
        </div>

        <div className="ui-card p-5">
          <div className="text-sm font-semibold ui-text">Daily vs MA7 vs MA30</div>
          <p className="mt-2 text-sm ui-text-muted">
            Daily values show the latest observation. MA7 and MA30 provide short- and medium-term context so you can see
            acceleration, cooling, and regime shifts.
          </p>
        </div>

        <div className="ui-card p-5">
          <div className="text-sm font-semibold ui-text">Context over signals</div>
          <p className="mt-2 text-sm ui-text-muted">
            “Unusual” means statistically distinct relative to recent history, not a trading signal. Many patterns have
            multiple plausible explanations.
          </p>
        </div>
      </div>

      {/* WHO IS THIS FOR */}
      <div className="rounded-3xl border ui-border ui-bg p-6">
        <div className="text-sm font-semibold ui-text">Who this is for</div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="ui-card p-5">
            <div className="text-sm font-semibold ui-text">Serious retail</div>
            <p className="mt-2 text-sm ui-text-muted">
              Learn how to read regimes and persistent trends without being distracted by price noise.
            </p>
          </div>

          <div className="ui-card p-5">
            <div className="text-sm font-semibold ui-text">Professionals</div>
            <p className="mt-2 text-sm ui-text-muted">
              Audit-grade transparency: explain-mode, deterministic rules, coverage-aware diagnostics, and consistent
              partitions across layers.
            </p>
          </div>

          <div className="ui-card p-5">
            <div className="text-sm font-semibold ui-text">Institutions</div>
            <p className="mt-2 text-sm ui-text-muted">
              Versioned methodology and export-ready JSON layers (meta / derived / gold) for integration into internal
              research stacks.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border ui-border ui-bg p-6">
        <div>
          <div className="text-sm font-semibold ui-text">Explore chains</div>
          <div className="mt-1 text-xs ui-text-faint">Open a chain to see the full diagnostic view.</div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/chains/bitcoin`}
            className="inline-flex items-center rounded-xl border ui-border bg-ui-surface-2 px-4 py-2 text-xs ui-text hover:bg-ui-surface"
          >
            Open Bitcoin
          </Link>
          <Link
            href="/methodology"
            className="inline-flex items-center rounded-xl border ui-border px-4 py-2 text-xs ui-text-muted hover:bg-ui-surface"
          >
            Read methodology
          </Link>
        </div>
      </div>
    </section>
  );
}
