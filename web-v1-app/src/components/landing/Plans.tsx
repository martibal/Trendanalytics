// src/components/landing/Plans.tsx
import { landingPlans, landingUseCases } from "@/lib/landing";
import CheckoutButton from "@/components/landing/CheckoutButton";

type PlansProps = {
  historyDepthDays?: number | null;
};

export default function Plans({ historyDepthDays }: PlansProps) {
  return (
    <section
      id="plans"
      className="mb-10 rounded-3xl border border-cyan-500/15 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.07),transparent_60%)] p-8"
    >
      {/* Header */}
      <div className="max-w-2xl">
        <div className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-500/70">
          Subscriber plans
        </div>
        <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl leading-tight">
          Pick the smallest plan that matches your workflow.
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          The public site lets you inspect the published surface. Paid plans unlock direct API
          access to Gold, Meta, and Derived JSON — structured and delivered daily.
        </p>
      </div>

      {/* Use cases */}
      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {landingUseCases.map((item) => (
          <div key={item.title} className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
            <div className="text-xs font-bold text-white">{item.title}</div>
            <div className="mt-1.5 text-xs leading-5 text-slate-500">{item.body}</div>
          </div>
        ))}
      </div>

      {/* Plan cards */}
      <div className="mt-8 grid gap-5 xl:grid-cols-3">
        {landingPlans.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col rounded-3xl border p-6 ${plan.border}`}
          >
            {/* Plan header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-xs font-black uppercase tracking-[0.16em] ${plan.accent}`}>
                  {plan.name}
                </div>
                <div className="mt-2 text-3xl font-black text-white">{plan.price}</div>
              </div>
              <div className={`rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-bold ${plan.accent}`}>
                {plan.tierTag}
              </div>
            </div>

            <div className="mt-4 text-sm font-semibold text-white">{plan.body}</div>
            <div className="mt-2 text-xs leading-5 text-slate-500 flex-1">{plan.detail}</div>

            {/* Best for */}
            {"bestFor" in plan && plan.bestFor ? (
              <div className={`mt-3 text-xs leading-5 ${plan.accent} opacity-80`}>
                {plan.bestFor as string}
              </div>
            ) : null}

            {/* CTA */}
            <div className="mt-6">
              {plan.name === "Free" ? (
                <a
                  href={plan.href}
                  className="inline-flex items-center text-sm font-semibold hover:underline text-slate-300"
                >
                  {plan.cta}
                </a>
              ) : (
                <CheckoutButton
                  plan={plan.name.toLowerCase() as "basic" | "pro"}
                  className={`inline-flex items-center rounded-full border px-6 py-2.5 text-sm font-black transition ${
                    plan.name === "Pro"
                      ? "border-purple-500/40 bg-purple-500/15 text-purple-200 hover:bg-purple-500/25"
                      : "border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                  }`}
                >
                  {plan.cta}
                </CheckoutButton>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* History Add-on */}
      <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">
              History Add-on
            </div>
            <div className="mt-1.5 text-sm font-bold text-white">
              Full archive — {historyDepthDays ?? "496"}+ days
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500 max-w-xl">
              One-time unlock for the complete published history back to December 2024.
              This extends access beyond the included subscription window. Available within your
              entitled scope — one chain for Basic, all four chains for Pro.
              Delivered as structured JSON via the same API endpoint.
            </p>
          </div>
          <CheckoutButton
            plan="history_addon"
            className="shrink-0 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 transition"
          >
            Add full history →
          </CheckoutButton>
        </div>
      </div>

      {/* Scope note */}
      <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.015] px-5 py-3 text-xs leading-6 text-slate-600">
        <span className="font-semibold text-slate-500">Scope: </span>
        This product publishes on-chain network state data only — no price data, no forecasts, no prescriptive signals.
        Subscriptions renew monthly and can be cancelled at any time from your dashboard.
      </div>
    </section>
  );
}