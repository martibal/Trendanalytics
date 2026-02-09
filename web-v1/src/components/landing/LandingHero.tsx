"use client";

import Link from "next/link";
import { ChainHeroCard } from "@/components/landing/ChainHeroCard";
import type { ChainId } from "@/lib/types";

const CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

function HeroPill(props: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-ui-border bg-ui-bg/30 px-3 py-1 text-[11px] font-semibold text-ui-muted backdrop-blur">
      {props.children}
    </div>
  );
}

function PrimaryCta(props: { href: string; label: string }) {
  return (
    <Link
      href={props.href}
      className="ui-lift inline-flex items-center justify-center rounded-2xl border border-ui-border bg-ui-surface2 px-4 py-2 text-sm font-semibold text-ui-text hover:bg-ui-surface focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
    >
      {props.label}
    </Link>
  );
}

function SecondaryCta(props: { href: string; label: string }) {
  return (
    <Link
      href={props.href}
      className="inline-flex items-center justify-center rounded-2xl border border-ui-border bg-ui-bg/20 px-4 py-2 text-sm font-semibold text-ui-muted hover:bg-ui-bg/30 hover:text-ui-text"
    >
      {props.label}
    </Link>
  );
}

export default function LandingHero() {
  return (
    <section className="space-y-6">
      {/* Full-bleed hero shell */}
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
        <div className="relative overflow-hidden border-y border-ui-border bg-ui-bg">
          {/* Background */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-ui-accent/10 via-transparent to-transparent" />
            <div className="absolute -top-24 left-1/2 h-72 w-[900px] -translate-x-1/2 rounded-full bg-ui-accent/12 blur-3xl" />
            <div className="absolute -top-16 left-[12%] h-64 w-64 rounded-full bg-ui-accent2/12 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.16]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
                backgroundSize: "72px 72px",
                maskImage: "radial-gradient(circle at 50% 10%, black 0%, transparent 58%)",
                WebkitMaskImage: "radial-gradient(circle at 50% 10%, black 0%, transparent 58%)",
              }}
            />
          </div>

          <div className="relative mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
            <div className="flex flex-wrap items-center gap-2">
              <HeroPill>Price-agnostic</HeroPill>
              <HeroPill>Descriptive only</HeroPill>
              <HeroPill>Auditable artifacts</HeroPill>
              <HeroPill>No forecasts</HeroPill>
            </div>

            <div className="mt-6 max-w-3xl">
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-ui-text md:text-5xl">
                Trends you can see in 30 seconds.
              </h1>
              <p className="mt-4 text-pretty text-base text-ui-muted md:text-lg">
                Big, readable on-chain snapshots — designed to show persistent movement without price narratives.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <PrimaryCta href="/chains" label="Explore dashboards" />
              <SecondaryCta href="/methodology" label="Methodology" />
              <div className="text-xs text-ui-faint sm:ml-2">No prices · No advice · Nulls shown as gaps, never zeros</div>
            </div>

            {/* Mental model (single, global explanation) */}
            <div className="mt-8 rounded-3xl border border-ui-border bg-ui-bg/20 p-4 md:p-5">
              <div className="text-xs font-semibold text-ui-text">How to read every chart</div>
              <div className="mt-2 grid gap-2 text-sm text-ui-muted md:grid-cols-4">
                <div>
                  <span className="font-semibold text-ui-text">Daily</span> = raw day-to-day activity (noise)
                </div>
                <div>
                  <span className="font-semibold text-ui-text">MA7</span> = short-term regime (last week)
                </div>
                <div>
                  <span className="font-semibold text-ui-text">MA30</span> = structural baseline (last month)
                </div>
                <div>
                  <span className="font-semibold text-ui-text">Percentile</span> = historical placement (context)
                </div>
              </div>
            </div>

            {/* Live snapshots (centerpiece) */}
            <div className="mt-10">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-ui-text">Live snapshots</div>
                  <div className="mt-1 text-xs text-ui-faint">
                    Landing shows only: Daily + MA7 + MA30 + Percentile. Click a chain for deeper context.
                  </div>
                </div>
                <div className="text-xs text-ui-faint">
                  Data source: <span className="font-mono text-ui-muted">public/data/published/v1</span>
                </div>
              </div>

              {/* ✅ full-width vertical stacking */}
              <div className="mt-5 grid grid-cols-1 gap-8">
                {CHAINS.map((c) => (
                  <ChainHeroCard key={c} chain={c} />
                ))}
              </div>
            </div>

            <div className="mt-10 text-[11px] text-ui-faint">Descriptive only. No causality implied. No forecasts made.</div>
          </div>
        </div>
      </div>
    </section>
  );
}