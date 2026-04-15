import Link from "next/link";

import RegimeBadge from "@/components/RegimeBadge";
import type { SurfaceRowDisplay } from "@/lib/landingSurface";

type MobileLandingProps = {
  rows: SurfaceRowDisplay[];
  historyDepthDays?: number | null;
};

const useCaseCards = [
  {
    title: "Monitor current chain state",
    body: "Check whether current network conditions are actually changing or just fluctuating before treating a move as meaningful.",
  },
  {
    title: "Compare four chains consistently",
    body: "Read BTC, ETH, Arbitrum, and Base through the same published labels, confidence logic, and score structure.",
  },
  {
    title: "Validate and backtest",
    body: "Use the published archive to test how often similar conditions appeared before and how persistent they were.",
  },
  {
    title: "Pull JSON into your workflow",
    body: "Use documented Gold, Meta, and Derived files in dashboards, notebooks, models, and internal reporting.",
  },
] as const;

const planCards = [
  {
    name: "Free",
    price: "$0",
    note: "Inspect the public surface first.",
    detail: "Track record, status, methodology, glossary, thresholds, and schema.",
    href: "/track-record",
    cta: "Open public surface",
    className: "border-white/10 bg-white/5",
  },
  {
    name: "Basic",
    price: "$29/mo",
    note: "One chain, 90-day JSON access.",
    detail: "Best for focused single-chain monitoring, research, and downstream workflow use.",
    href: "/sign-up",
    cta: "Payments open soon",
    className: "border-cyan-500/25 bg-cyan-500/8",
  },
  {
    name: "Pro",
    price: "$79/mo",
    note: "Four chains, 365-day JSON access.",
    detail: "Best for multi-chain monitoring, heavier API use, and broader research workflows.",
    href: "/sign-up",
    cta: "Payments open soon",
    className: "border-purple-500/25 bg-purple-500/8",
  },
] as const;

const jsonCards = [
  {
    title: "Gold",
    body: "Raw daily observations in native units. Best when you want the canonical inputs behind everything else.",
    href: "/api-docs/schema#gold",
    className: "border-yellow-500/20 bg-yellow-500/5",
  },
  {
    title: "Meta",
    body: "The core product: regime label, confidence, scorecard, and drivers in reusable JSON.",
    href: "/api-docs/schema#meta",
    className: "border-purple-500/20 bg-purple-500/5",
  },
  {
    title: "Derived",
    body: "MA7 and MA30 trend series for every Gold metric. Useful for persistence and chart context.",
    href: "/api-docs/schema#derived",
    className: "border-blue-500/20 bg-blue-500/5",
  },
] as const;

const nextLinks = [
  {
    title: "Q&A",
    body: "Definitions, thresholds, confidence, and why the labels mean what they mean.",
    href: "/faq",
  },
  {
    title: "Methodology",
    body: "Read the full model logic, thresholds, and interpretation boundary.",
    href: "/methodology",
  },
  {
    title: "Track Record",
    body: "Inspect what was actually published over time, not just the latest row.",
    href: "/track-record",
  },
  {
    title: "JSON Schema",
    body: "See every field in Gold, Meta, and Derived before you subscribe.",
    href: "/api-docs/schema",
  },
] as const;

export default function MobileLanding({ rows, historyDepthDays }: MobileLandingProps) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-5 lg:hidden">
      <section className="overflow-hidden rounded-3xl border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(2,8,23,0.98),rgba(3,15,30,0.96))] p-5 shadow-[0_20px_60px_rgba(2,12,27,0.45)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]" />
          Daily chain-state JSON product
        </div>

        <h1 className="mt-4 text-[2.35rem] font-semibold leading-[1.04] tracking-[-0.045em] text-white">
          Daily chain-state JSON that tells you whether current on-chain conditions are actually changing — or just spiking briefly.
        </h1>

        <p className="mt-4 text-[15px] leading-7 text-slate-200">
          Urd Atlas publishes Gold, Meta, and Derived JSON for BTC, ETH, Arbitrum, and Base so you can monitor current conditions, compare networks, validate unusual activity historically, and reuse structured outputs immediately.
        </p>

        <div className="mt-5 rounded-[1.6rem] border border-cyan-400/18 bg-[linear-gradient(135deg,rgba(8,47,73,0.34),rgba(255,255,255,0.03))] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Archive depth
          </div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-5xl font-semibold leading-none tracking-[-0.05em] text-white">
              {historyDepthDays ?? "—"}
            </div>
            <div className="pb-1 text-xs uppercase tracking-[0.18em] text-slate-300">
              published days
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            Use the archive to verify today&apos;s label, inspect past transitions, and backtest your own rules against a daily published record.
          </p>
        </div>

        <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Why people subscribe
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-200">
            Subscribers are buying reusable daily files and archive access — not just charts. The product removes the ingestion, aggregation, baseline scoring, confidence logic, and publication work you would otherwise need to build and maintain yourself.
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          {useCaseCards.map((card, index) => (
            <div key={card.title} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-xs font-semibold text-cyan-200">
                  0{index + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{card.title}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{card.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href="#plans"
            className="inline-flex items-center justify-center rounded-full border border-cyan-400/35 bg-cyan-500/12 px-5 py-2.5 text-sm font-semibold text-cyan-100"
          >
            See plans
          </Link>
          <Link
            href="/api-docs/schema"
            className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-100"
          >
            Inspect the JSON schema
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-200">
              Latest published surface
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-white">Current chain context</h2>
          </div>
        </div>
        <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-3">
            {rows.map((row) => (
              <Link
                key={row.chain}
                href={row.href}
                className="w-[84vw] max-w-[320px] shrink-0 rounded-3xl border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold text-white">{row.label}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {row.name}
                    </div>
                  </div>
                  <span className={row.statusClass}>{row.statusText}</span>
                </div>

                <div className="mt-4">
                  {row.publishedRegime ? (
                    <RegimeBadge label={row.publishedRegime} />
                  ) : (
                    <span className="text-sm text-muted-foreground">No published label</span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border bg-background/40 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      Confidence
                    </div>
                    <div className="mt-1 font-semibold text-white">{row.confidenceValue}</div>
                    <div className="mt-1">
                      <span className={row.confidenceClass}>{row.confidenceBand}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-background/40 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      As of
                    </div>
                    <div className="mt-1 font-semibold text-white">{row.asOf}</div>
                    <div className="mt-1 text-xs text-slate-400">Lag {row.lagValue}</div>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-300">{row.takeaway}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="plans-mobile" className="mt-6 rounded-3xl border p-5 shadow-sm">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-200">
          What you buy
        </div>
        <h2 className="mt-1 text-2xl font-semibold text-white">JSON-first subscription</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          Free lets you inspect the public surface. Paid tiers unlock the documented Gold, Meta, and Derived JSON you can pull into your own workflow without building the full pipeline yourself.
        </p>
        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs leading-6 text-amber-100/85">
          Payments are temporarily inactive while business registration is being finalized.
          The public site and documentation remain fully available.
        </div>
        <div className="mt-4 space-y-3">
          {planCards.map((plan) =>
            plan.name === "Free" ? (
              <Link key={plan.name} href={plan.href} className={`block rounded-2xl border p-4 ${plan.className}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-white">{plan.name}</div>
                    <div className="mt-1 text-sm text-slate-300">{plan.note}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">{plan.price}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{plan.detail}</p>
                <div className="mt-3 text-sm font-medium text-cyan-200">{plan.cta} →</div>
              </Link>
            ) : (
              <div key={plan.name} className={`rounded-2xl border p-4 ${plan.className}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-white">{plan.name}</div>
                    <div className="mt-1 text-sm text-slate-300">{plan.note}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">{plan.price}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{plan.detail}</p>
                {plan.name === "Pro" && historyDepthDays ? (
                  <div className="mt-3 rounded-xl border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-xs text-purple-200">
                    Full archive: <span className="font-semibold text-white">{historyDepthDays} days</span> and growing daily.
                  </div>
                ) : null}
                <div className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-500 opacity-70">
                  {plan.cta}
                </div>
                <div className="mt-2 text-[11px] leading-5 text-slate-500">
                  Checkout is temporarily disabled for launch preparation.
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border p-5 shadow-sm">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-200">
          The three files
        </div>
        <h2 className="mt-1 text-2xl font-semibold text-white">Gold, Meta, Derived</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          Meta is the commercial heart of the product. Gold lets you verify inputs. Derived gives you smoothed trend context.
        </p>
        <div className="mt-4 space-y-3">
          {jsonCards.map((card) => (
            <Link key={card.title} href={card.href} className={`block rounded-2xl border p-4 ${card.className}`}>
              <div className="text-base font-semibold text-white">{card.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{card.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border p-5 shadow-sm">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-200">
          Continue on desktop
        </div>
        <h2 className="mt-1 text-2xl font-semibold text-white">Go deeper before subscribing</h2>
        <div className="mt-4 space-y-3">
          {nextLinks.map((item) => (
            <Link key={item.title} href={item.href} className="block rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-base font-semibold text-white">{item.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
