import Link from "next/link";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import { landingPlans } from "@/lib/landing";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import "server-only";

const inactiveCtaClass =
  "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-500 opacity-70 cursor-not-allowed";

export default async function MobilePlansPage() {
  const historyDays = await computeHistoryDepthDays().catch(() => null);

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="py-3">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">Subscriber plans</div>
          <div className="mt-0.5 text-[14px] font-bold text-white">Pick the smallest plan that matches your workflow</div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">
        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
          <p className="text-[13px] leading-[1.7] text-slate-200">
            Free lets you inspect the public surface on-site. Paid plans unlock direct API access
            to Gold, Meta, and Derived JSON — delivered daily.
          </p>
          <p className="mt-2 text-[12px] leading-[1.7] text-slate-400">
            New here? Start with <span className="font-semibold text-white">Basic</span> on your
            most-watched chain. Upgrade to <span className="font-semibold text-white">Pro</span> later.
          </p>
        </div>

        <div className="space-y-3">
          {landingPlans.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border p-4 ${plan.border}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`text-xs font-black uppercase tracking-[0.16em] ${plan.accent}`}>{plan.name}</div>
                  <div className="mt-1 text-[22px] font-black text-white">{plan.price}</div>
                  <div className={`mt-1 text-[11px] font-semibold ${plan.accent}`}>{plan.tierTag}</div>
                </div>
              </div>
              <div className="mt-3 text-[16px] font-semibold leading-6 text-white">{plan.body}</div>
              <div className="mt-2 text-[12px] leading-[1.7] text-slate-300">{plan.detail}</div>
              {"bestFor" in plan && plan.bestFor ? <div className={`mt-3 text-[11px] ${plan.accent} opacity-85`}>{plan.bestFor as string}</div> : null}
              <div className="mt-4">
                {plan.name === "Free" ? (
                  <Link href={plan.href} className="inline-flex items-center text-sm font-semibold text-cyan-300">
                    {plan.cta}
                  </Link>
                ) : (
                  <button type="button" disabled aria-disabled="true" className={inactiveCtaClass}>
                    Payments open soon
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">History add-on</div>
          <div className="mt-1 text-[18px] font-bold text-white">Full archive — {historyDays ?? "499"}+ days</div>
          <p className="mt-2 text-[12px] leading-[1.7] text-slate-300">
            Already subscribed? Unlock the complete published history back to December 2024 as a one-time purchase — no plan change required.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs leading-6 text-amber-100/85">
          Payments are temporarily inactive while business registration is being finalized.
          Explore the public site and mobile surface now; enable checkout as soon as Stripe is live.
        </div>

        <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 text-[11px] leading-[1.7] text-slate-500">
          No price data. No forecasts. No prescriptive signals. This product publishes descriptive
          on-chain network state only.
        </div>
      </main>

      <MobileBottomNav active="plans" />
    </div>
  );
}
