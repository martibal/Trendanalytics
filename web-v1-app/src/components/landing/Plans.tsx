import Link from "next/link";
import { landingPlans, landingUseCases } from "@/lib/landing";

type PlansProps = {
  historyDepthDays?: number | null;
};

export default function Plans({ historyDepthDays }: PlansProps) {
  return (
    <section
      id="plans"
      className="mb-10 rounded-3xl border border-cyan-500/15 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.07),transparent_60%)] p-8 shadow-sm"
    >
      <div className="max-w-4xl">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
          Choose your subscriber scope
        </div>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Pick the smallest plan that matches your workflow.
        </h2>
        <p className="mt-4 text-base leading-8 text-slate-300">
          Free lets you inspect the published surface on the web. Paid tiers unlock documented
          Gold, Meta, and Derived JSON that you can actually use in monitoring, backtesting,
          research, and internal workflows.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {landingUseCases.map((item) => (
          <div key={item.title} className="rounded-2xl border border-white/8 bg-white/4 p-4">
            <div className="text-sm font-semibold text-white">{item.title}</div>
            <div className="mt-1 text-sm leading-7 text-slate-300">{item.body}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-3">
        {landingPlans.map((plan) => (
          <div
            key={plan.name}
            className={`flex h-full min-h-[420px] flex-col rounded-3xl border p-6 shadow-sm ${plan.border}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-sm font-semibold uppercase tracking-[0.16em] ${plan.accent}`}>
                  {plan.name}
                </div>
                <div className="mt-3 text-3xl font-semibold text-white">{plan.price}</div>
              </div>
              <div
                className={`rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[11px] font-medium ${plan.accent}`}
              >
                {plan.tierTag}
              </div>
            </div>

            <div className="mt-5 text-sm font-medium leading-7 text-white">{plan.body}</div>
            <div className="mt-3 text-sm leading-7 text-slate-300">{plan.detail}</div>
            <div className={`mt-4 text-sm leading-6 ${plan.accent}`}>{plan.bestFor}</div>

            {plan.name === "Pro" && historyDepthDays ? (
              <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-xs text-purple-200">
                Full archive: <span className="font-semibold text-white">{historyDepthDays} days</span> and growing daily.
              </div>
            ) : null}

            <div className="mt-auto pt-6">
              <Link
                href={plan.href}
                className={`inline-flex items-center text-sm font-medium hover:underline ${plan.accent}`}
              >
                {plan.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/4 p-4 text-sm leading-7 text-slate-300">
        Scope: This product publishes on-chain network state data only - no price data, no forecasts, no prescriptive signals.
        {historyDepthDays ? ` History Add-on currently covers ${historyDepthDays} days of published history.` : ""}
      </div>
    </section>
  );
}
