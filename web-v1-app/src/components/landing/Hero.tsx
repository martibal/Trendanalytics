import Link from "next/link";
import {
  heroTagline,
  landingProofChips,
  landingUseCases,
} from "@/lib/landing";

const compactUseCases = landingUseCases.map((item) => ({
  title: item.title,
  body: item.body,
}));

export default function Hero() {
  return (
    <header className="mb-10">
      <div className="grid gap-6 rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_42%)] p-8 shadow-sm xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
            Daily chain-state JSON product
          </div>

          <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
            {heroTagline}
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            TrendAnalytics publishes Gold, Meta, and Derived JSON every day for BTC, ETH, Arbitrum,
            and Base. Use it to monitor current chain conditions, compare four networks in one
            framework, validate whether unusual activity is persisting, and feed structured
            chain-state data into your own dashboards, notebooks, or models.
          </p>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            Subscribers are buying reusable daily files and archive access — not just charts. The
            product removes the ingestion, aggregation, baseline scoring, confidence logic, and
            publication work you would otherwise need to build and maintain yourself.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="#plans"
              className="inline-flex items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
            >
              See plans →
            </Link>
            <Link
              href="#latest-surface"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              Latest published surface →
            </Link>
            <Link
              href="/api-docs/schema"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              JSON schema →
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
            <a href="#what-is-modal" className="hover:text-cyan-200">
              What this is
            </a>
            <span className="text-slate-500">•</span>
            <a href="#boundary-modal" className="hover:text-cyan-200">
              Interpretation boundary
            </a>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {landingProofChips.map((chip) => (
              <div key={chip.label} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  {chip.label}
                </div>
                <div className="mt-1 text-base font-semibold text-white">{chip.value}</div>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl border border-white/10 bg-black/10 p-5">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
            What subscribers use this for
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">What this helps you do, concretely.</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Reuse documented chain-state outputs immediately in monitoring, comparison, validation,
            and workflow automation.
          </p>

          <div className="mt-4 space-y-3">
            {compactUseCases.map((point) => (
              <div key={point.title} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="text-sm font-semibold text-white">{point.title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-400">{point.body}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm leading-6 text-slate-300">
            Public pages let you inspect the published surface. Paid plans unlock reusable Gold,
            Meta, and Derived JSON with archive access.
          </div>
        </aside>
      </div>
    </header>
  );
}
