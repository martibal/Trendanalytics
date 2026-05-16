// src/components/landing/Plans.tsx
import Link from "next/link";
import { landingPlans, landingUseCases } from "@/lib/landing";
import CheckoutButton from "@/components/landing/CheckoutButton";

type PlansProps = { historyDepthDays?: number | null };

export default function Plans({ historyDepthDays }: PlansProps) {
  return (
    <section id="plans" className="mb-10 rounded-3xl border border-cyan-500/15 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.07),transparent_60%)] p-8">
      <div className="max-w-3xl">
        <div className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-500/70">Subscriber plans</div>
        <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl leading-tight">Choose the smallest plan that matches your research workflow.</h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">The public site explains the reference data surface. Paid plans unlock authenticated JSON delivery for Gold, Derived, Meta, and Briefs. Until billing is activated, the fastest due-diligence path is the public sample pack, schema reference, verification pack, and service policy.</p>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {landingUseCases.map((item) => (
          <div key={item.title} className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
            <div className="text-xs font-bold text-white">{item.title}</div>
            <div className="mt-1.5 text-xs leading-5 text-slate-300">{item.body}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 text-sm leading-7 text-slate-200">
        <div className="font-semibold text-white">Validate before purchase</div>
        <div className="mt-2">Download a real <Link href="/api-docs/samples" className="underline">sample pack</Link>, inspect every field in the <Link href="/api-docs/schema" className="underline">schema reference</Link>, walk through the <Link href="/methodology/verification" className="underline">verification pack</Link>, and read the <Link href="/service" className="underline">service / revision policy</Link>.</div>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-3">
        {landingPlans.map((plan) => (
          <div key={plan.name} className={`flex flex-col rounded-3xl border p-6 ${plan.border}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-xs font-black uppercase tracking-[0.16em] ${plan.accent}`}>{plan.name}</div>
                <div className="mt-2 text-3xl font-black text-white">{plan.price}</div>
              </div>
              <div className={`rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-bold ${plan.accent}`}>{plan.tierTag}</div>
            </div>
            <div className="mt-4 text-sm font-semibold text-white">{plan.body}</div>
            <div className="mt-2 text-xs leading-5 text-slate-300 flex-1">{plan.detail}</div>
            {"bestFor" in plan && plan.bestFor ? <div className={`mt-3 text-xs leading-5 ${plan.accent} opacity-80`}>{plan.bestFor as string}</div> : null}
            <div className="mt-6">
              {plan.name === "Free" ? (
                <a href={plan.href} className="inline-flex items-center text-sm font-semibold hover:underline text-slate-300">{plan.cta}</a>
              ) : (
                <CheckoutButton plan={plan.checkoutPlan as "basic" | "pro"} className={`inline-flex items-center rounded-full border px-6 py-2.5 text-sm font-black transition ${plan.checkoutPlan === "pro" ? "border-purple-500/40 bg-purple-500/15 text-purple-200 hover:bg-purple-500/25" : "border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"}`}>
                  {plan.cta}
                </CheckoutButton>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-300">History Add-on</div>
            <div className="mt-1.5 text-sm font-bold text-white">Full archive — {historyDepthDays ?? "499"}+ days</div>
            <p className="mt-1 text-xs leading-5 text-slate-300 max-w-xl">Separate one-time unlock for the complete published archive. Research defaults to 365 days because that covers most active research workflows without requiring full-archive scope by default.</p>
          </div>
          <CheckoutButton plan="history_addon" className="shrink-0 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 transition">Add full history →</CheckoutButton>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.015] px-5 py-3 text-xs leading-6 text-slate-400">
        <span className="font-semibold text-slate-300">Buyer fit: </span>
        Research is built for multi-chain research, regime conditioning, notebook workflows, and API-driven dashboards. BTC / ETH support near-daily workflows; ARB / BASE are better suited to slower state-aware monitoring and historical segmentation.
      </div>
    </section>
  );
}
