import Link from "next/link";
import { heroPipelinePoints, landingProofChips } from "@/lib/landing";

type HeroProps = {
  historyDepthDays?: number | null;
};

export default function Hero({ historyDepthDays }: HeroProps) {
  const historyValue = historyDepthDays ? `${historyDepthDays}` : "—";

  const featuredUses = heroPipelinePoints.slice(0, 2);
  const remainingUses = heroPipelinePoints.slice(2);

  return (
    <header className="mb-12">
      <div className="overflow-hidden rounded-[2rem] border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.12),transparent_24%),linear-gradient(135deg,rgba(2,8,23,0.985),rgba(3,13,28,0.97))] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_40px_120px_rgba(2,12,27,0.58)]">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[minmax(0,1.22fr)_360px] lg:px-10 lg:py-10 xl:grid-cols-[minmax(0,1.25fr)_390px] xl:px-12 xl:py-12">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.85)]" />
              Daily chain-state JSON product
            </div>

            <div className="mt-5 max-w-5xl">
              <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-5xl xl:text-[4.25rem]">
                Daily chain-state JSON that tells you whether current on-chain
                conditions are{" "}
                <span className="text-cyan-200">actually changing</span> or
                just spiking briefly.
              </h1>

              <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-200 sm:text-[1.18rem] sm:leading-9">
                TrendAnalytics publishes reusable Gold, Meta, and Derived JSON
                for BTC, ETH, Arbitrum, and Base so you can monitor current
                conditions, compare networks in one framework, validate unusual
                activity historically, and feed structured chain-state data into
                dashboards, notebooks, or models.
              </p>
            </div>

            <div className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="overflow-hidden rounded-[1.7rem] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(14,116,144,0.26),rgba(255,255,255,0.03))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  Archive depth
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
                  <div className="text-6xl font-semibold leading-none tracking-[-0.06em] text-white sm:text-7xl">
                    {historyValue}
                  </div>
                  <div className="pb-2 text-sm uppercase tracking-[0.2em] text-slate-300">
                    published days
                  </div>
                </div>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-100 sm:text-[15px]">
                  Today&apos;s label sits on top of a continuously published
                  archive you can use to verify whether a condition is rare,
                  persistent, or historically routine — and to backtest your own
                  rules against a daily record instead of screenshots or
                  one-off observations.
                </p>
              </div>

              <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  Why people pay
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  Subscribers are buying reusable daily files and archive
                  access — not just charts. The product removes the ingestion,
                  aggregation, baseline scoring, confidence logic, and
                  publication work you would otherwise need to build and
                  maintain yourself.
                </p>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="#plans"
                className="inline-flex items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/14 px-5 py-2.5 text-sm font-semibold text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.16)] transition hover:bg-cyan-500/22"
              >
                See plans →
              </Link>
              <Link
                href="#latest-surface"
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              >
                Latest published surface →
              </Link>
              <Link
                href="/api-docs/schema"
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-transparent px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
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

            <div className="mt-7 grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
              {landingProofChips.slice(0, 3).map((chip) => (
                <div
                  key={chip.label}
                  className="rounded-2xl border border-white/8 bg-black/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    {chip.label}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {chip.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.028))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
              What subscribers use this for
            </div>

            <h2 className="mt-3 text-[1.9rem] font-semibold leading-tight text-white">
              Four concrete uses, one reusable output.
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-200">
              Reuse documented chain-state outputs immediately in monitoring,
              comparison, validation, and workflow automation.
            </p>

            <div className="mt-5 space-y-4">
              {featuredUses.map((point, index) => (
                <div
                  key={point.title}
                  className="rounded-[1.4rem] border border-cyan-500/14 bg-[linear-gradient(135deg,rgba(8,47,73,0.18),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/22 bg-cyan-500/10 text-xs font-semibold text-cyan-200">
                      0{index + 1}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-white">
                        {point.title}
                      </div>
                      <div className="mt-1 text-sm leading-7 text-slate-300">
                        {point.body}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {remainingUses.length > 0 && (
              <div className="mt-4 rounded-[1.4rem] border border-white/8 bg-black/10 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Also use it for
                </div>
                <div className="mt-3 space-y-3">
                  {remainingUses.map((point) => (
                    <div key={point.title}>
                      <div className="text-sm font-semibold text-white">
                        {point.title}
                      </div>
                      <div className="mt-1 text-sm leading-7 text-slate-300">
                        {point.body}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/6 p-4 text-sm leading-7 text-slate-200">
              Public pages let you inspect the published surface. Paid plans
              unlock reusable Gold, Meta, and Derived JSON with archive access.
            </div>
          </aside>
        </div>
      </div>
    </header>
  );
}