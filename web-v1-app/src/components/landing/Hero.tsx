import Link from "next/link";
import { landingProofChips } from "@/lib/landing";

export default function Hero() {
  return (
    <header className="mb-10">
      <div className="grid gap-6 rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm lg:grid-cols-[minmax(0,1.25fr)_360px]">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
            Daily on-chain regime model
          </div>

          <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
            See whether on-chain change is noise or structural shift.
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            TrendAnalytics publishes daily regime, confidence, and driver context for
            Bitcoin, Ethereum, Arbitrum, and Base. No price, no forecasts, no
            trading calls — just documented network-state change.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="#plans"
              className="inline-flex items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
            >
              See plans
            </Link>
            <Link
              href="#subscriber-files"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              Subscriber files
            </Link>
            <Link
              href="/api-docs/schema"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              Full field reference
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
            How to read the latest surface
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="text-sm font-semibold text-white">Latest published, not real-time</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Every value on the landing page comes from the latest published daily artifact.
                The surface is designed to filter out intraday chatter, not mirror it.
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="text-sm font-semibold text-white">Regime + confidence + timing</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Regime tells you the current published state, confidence tells you how well
                supported that label is, and lag tells you how old the latest row is relative
                to expected cadence.
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="text-sm font-semibold text-white">Paid tiers unlock JSON</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Subscribers get Gold, Meta, and Derived JSON files through API calls. The full
                field-by-field structure is documented openly before purchase.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </header>
  );
}
