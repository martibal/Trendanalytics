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
      className="ui-lift inline-flex items-center justify-center rounded-full border border-ui-border bg-ui-surface2 px-5 py-2.5 text-sm font-semibold text-ui-text hover:bg-ui-surface focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
    >
      {props.label}
    </Link>
  );
}

function SecondaryCta(props: { href: string; label: string }) {
  return (
    <Link
      href={props.href}
      className="inline-flex items-center justify-center rounded-full border border-ui-border bg-ui-bg/20 px-5 py-2.5 text-sm font-semibold text-ui-muted hover:bg-ui-bg/30 hover:text-ui-text"
    >
      {props.label}
    </Link>
  );
}

function HeroVisual() {
  // Web2 intent: a “hero visual” that reinforces the mental model (Daily / MA7 / MA30 / Percentile),
  // without implying price, advice, or forecasts. Decorative + educational only.
  return (
    <div className="relative overflow-hidden rounded-3xl border border-ui-border bg-ui-bg/20 p-5 ui-lift">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-ui-text">One mental model</div>
          <div className="mt-1 text-xs text-ui-faint">Daily · MA7 · MA30 · Percentile</div>
        </div>
        <span className="rounded-full border border-ui-border bg-ui-bg/20 px-3 py-1 text-[11px] text-ui-faint">
          Descriptive
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-ui-border/15 bg-ui-bg/10 p-4">
        <div className="flex items-center justify-between text-[11px] text-ui-faint">
          <span>Example (illustrative)</span>
          <span className="font-mono text-ui-muted">no price axis</span>
        </div>

        <svg viewBox="0 0 520 180" className="mt-3 h-[160px] w-full">
          <defs>
            <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgb(var(--chart-ma30) / 0.18)" />
              <stop offset="1" stopColor="rgb(var(--chart-ma7) / 0.08)" />
            </linearGradient>
          </defs>

          {/* plotting surface */}
          <rect
            x="0"
            y="0"
            width="520"
            height="180"
            rx="18"
            fill="rgb(var(--surface) / 0.28)"
            stroke="rgb(var(--border) / 0.10)"
          />

          {/* baseline area */}
          <path
            d="M 24 150 L 90 140 L 150 132 L 220 120 L 290 110 L 360 108 L 430 98 L 496 92 L 496 156 L 24 156 Z"
            fill="url(#hero-area)"
            opacity="0.95"
          />

          {/* daily (subtle) */}
          <path
            d="M 24 148 L 70 142 L 112 146 L 150 134 L 190 140 L 230 122 L 272 128 L 312 114 L 352 118 L 396 104 L 440 112 L 496 96"
            fill="none"
            stroke="rgb(var(--chart-daily) / 0.70)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* MA7 */}
          <path
            d="M 24 146 L 90 140 L 150 136 L 220 126 L 290 118 L 360 112 L 430 104 L 496 98"
            fill="none"
            stroke="rgb(0 0 0 / 0.45)"
            strokeWidth="6.0"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M 24 146 L 90 140 L 150 136 L 220 126 L 290 118 L 360 112 L 430 104 L 496 98"
            fill="none"
            stroke="rgb(var(--chart-ma7) / 0.92)"
            strokeWidth="3.0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* MA30 */}
          <path
            d="M 24 150 L 90 144 L 150 140 L 220 132 L 290 124 L 360 120 L 430 112 L 496 106"
            fill="none"
            stroke="rgb(0 0 0 / 0.45)"
            strokeWidth="6.6"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M 24 150 L 90 144 L 150 140 L 220 132 L 290 124 L 360 120 L 430 112 L 496 106"
            fill="none"
            stroke="rgb(var(--chart-ma30) / 0.95)"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-ui-faint">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-[2px] w-6 rounded-full"
              style={{ background: "rgb(var(--chart-daily) / 0.70)" }}
            />
            <span className="text-ui-muted">Daily</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-[3px] w-6 rounded-full"
              style={{ background: "rgb(var(--chart-ma7) / 0.92)" }}
            />
            <span className="text-ui-muted">MA7</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-[3px] w-6 rounded-full"
              style={{ background: "rgb(var(--chart-ma30) / 0.95)" }}
            />
            <span className="text-ui-muted">MA30</span>
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/15 px-4 py-3 text-xs text-ui-muted">
        Percentile contextualizes today within a chosen historical window (distribution context, not a forecast).
      </div>
    </div>
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
            {/* Hero: web2 structure (badge + headline + value list + CTAs + visual) */}
            <div className="grid gap-8 md:grid-cols-2 md:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <HeroPill>Price-agnostic</HeroPill>
                  <HeroPill>Descriptive only</HeroPill>
                  <HeroPill>Auditable artifacts</HeroPill>
                  <HeroPill>No forecasts</HeroPill>
                </div>

                <div className="mt-6">
                  <h1 className="text-balance text-4xl font-semibold tracking-tight text-ui-text md:text-5xl">
                    Trend context you can read fast — without price narratives.
                  </h1>
                  <p className="mt-4 text-pretty text-base text-ui-muted md:text-lg">
                    Big, readable on-chain snapshots designed to highlight persistent movement and regime context across chains.
                  </p>
                </div>

                <ul className="mt-6 space-y-2 text-sm text-ui-muted">
                  <li className="flex gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-ui-accent/70" />
                    <span>
                      <span className="text-ui-text font-semibold">Same primitives everywhere</span>: Daily / MA7 / MA30 / Percentile —
                      consistent mental model.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-ui-accent/70" />
                    <span>
                      <span className="text-ui-text font-semibold">Audit signals</span>: as-of, lag, coverage, dataset_id and revision_id
                      (where available).
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-ui-accent/70" />
                    <span>
                      <span className="text-ui-text font-semibold">Descriptive only</span>: no advice, no forecasts, and missing values render
                      as gaps (null), never zeros.
                    </span>
                  </li>
                </ul>

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
              </div>

              {/* Hero visual (educational + decorative) */}
              <div className="md:pt-1">
                <HeroVisual />
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

              {/* full-width vertical stacking */}
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