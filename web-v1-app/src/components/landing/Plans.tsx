import Link from "next/link";
import { landingPlans, landingUseCases } from "@/lib/landing";

type PlansProps = {
  historyDepthDays?: number | null;
};

export default function Plans({ historyDepthDays }: PlansProps) {
  return (
    <section
      id="plans"
      className="mb-10 rounded-3xl border border-cyan-500/15 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.07),transparent_60%)] p-5 shadow-sm sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
            This is for you if
          </div>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            You want the JSON product, not just the charts.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-300">
            The public site is the inspection layer. The paid tiers unlock the documented Gold,
            Meta, and Derived JSON artifacts that save you from building the full AWS-to-analysis
            pipeline yourself.
          </p>

          <div className="mt-6 space-y-4">
            {landingUseCases.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-sm leading-7 text-slate-300">{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid w-full max-w-3xl gap-4 md:grid-cols-3">
          {landingPlans.map((plan) => (
            <div key={plan.name} className={`min-h-[320px] rounded-3xl border p-6 shadow-sm ${plan.border}`}>
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

              <div className="mt-5 text-sm leading-7 text-slate-200">{plan.body}</div>
              <div className="mt-4 text-sm leading-7 text-slate-400">{plan.detail}</div>

              {plan.name === "Pro" && historyDepthDays ? (
                <div className="mt-3 rounded-xl border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-xs text-purple-200">
                  History Add-on unlocks <span className="font-semibold text-white">{historyDepthDays} days</span> of published history - and growing daily.
                </div>
              ) : null}

              <Link
                href={plan.href}
                className={`mt-6 inline-flex items-center text-sm font-medium hover:underline ${plan.accent}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/4 p-4 text-sm leading-7 text-slate-300">
        History Add-on: one-time unlock for the full available history in your entitled scope.
        {historyDepthDays ? ` Currently ${historyDepthDays} days and growing daily.` : ""} Not built for price charts, real-time execution, or prescriptive trading signals.
      </div>
    </section>
  );
}
