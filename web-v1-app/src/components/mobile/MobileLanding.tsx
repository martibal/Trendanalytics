import Link from "next/link";
import RegimeBadge from "@/components/RegimeBadge";
import type { SurfaceRowDisplay } from "@/lib/landingSurface";

type MobileLandingProps = {
  rows: SurfaceRowDisplay[];
  historyDepthDays?: number | null;
};

const useCaseCards = [
  {
    title: "Monitor daily chain state",
    body: "Check whether current conditions look stable, heating, congested, or cheap with confidence context attached.",
  },
  {
    title: "Compare four chains consistently",
    body: "Read BTC, ETH, ARB, and BASE through one shared regime framework instead of four incompatible dashboards.",
  },
  {
    title: "Backtest published history",
    body: "Use the archive to see how often similar states appeared before and how persistent they were.",
  },
  {
    title: "Reuse JSON in your workflow",
    body: "Pull Gold, Meta, and Derived files into notebooks, dashboards, or internal models without building the pipeline first.",
  },
] as const;

const planCards = [
  {
    name: "Free",
    price: "$0",
    note: "Read the surface on the web.",
    detail: "Public pages, track record, status, methodology, glossary, thresholds, and schema.",
    href: "/track-record",
    cta: "Open public surface",
    className: "border-white/10 bg-white/5",
  },
  {
    name: "Basic",
    price: "$29/mo",
    note: "One chain, 90-day JSON access.",
    detail: "Gold, Meta, and Derived JSON for one chain via API.",
    href: "/sign-up",
    cta: "Start Basic",
    className: "border-cyan-500/25 bg-cyan-500/8",
  },
  {
    name: "Pro",
    price: "$79/mo",
    note: "Four chains, 365-day JSON access.",
    detail: "Full Gold, Meta, and Derived access across Bitcoin, Ethereum, Arbitrum, and Base.",
    href: "/sign-up",
    cta: "Start Pro",
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
      <section className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-5 shadow-sm">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-200">
          Daily on-chain regime model
        </div>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">
          Daily chain-state JSON for BTC, ETH, Arbitrum, and Base.
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          TrendAnalytics publishes Gold, Meta, and Derived JSON so you can monitor current chain conditions, compare four networks in one framework, backtest published history, and reuse structured regime data in your own workflow.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          The public site is the inspection layer. The paid product is the documented JSON output.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {useCaseCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                {card.title}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{card.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-5 py-2.5 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
          >
            See plans
          </Link>
          <Link
            href="/api-docs/schema"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
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

      <section className="mt-6 rounded-3xl border p-5 shadow-sm">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-200">
          What you buy
        </div>
        <h2 className="mt-1 text-2xl font-semibold text-white">JSON-first subscription</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          The website is the inspection layer. The paid product is the documented Gold, Meta,
          and Derived JSON you can pull into your own workflow without building the full pipeline yourself.
        </p>
        <div className="mt-4 space-y-3">
          {planCards.map((plan) => (
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
              {plan.name === "Pro" && historyDepthDays ? (
                <div className="mt-3 rounded-xl border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-xs text-purple-200">
                  History Add-on unlocks <span className="font-semibold text-white">{historyDepthDays} days</span> of published history and growing daily.
                </div>
              ) : null}
              <div className="mt-3 text-sm font-medium text-cyan-200">{plan.cta} →</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border p-5 shadow-sm">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-200">
          The three files
        </div>
        <h2 className="mt-1 text-2xl font-semibold text-white">Gold, Meta, Derived</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          Meta is the core product. Gold lets you verify inputs. Derived gives you smoothed trend context.
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
        <h2 className="mt-1 text-2xl font-semibold text-white">Go deeper when you want the full surface</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          Mobile is the quick read. Desktop is where the product becomes fully useful for schema inspection, history work, and API-first research.
        </p>
        <div className="mt-4 grid gap-3">
          {nextLinks.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-2xl border bg-white/5 p-4">
              <div className="text-base font-semibold text-white">{item.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
