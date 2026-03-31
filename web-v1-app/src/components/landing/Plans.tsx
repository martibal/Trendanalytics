import Link from "next/link";
import { landingPlans, landingUseCases } from "@/lib/landing";

export default function Plans() {
  return (
    <section
      id="plans"
      className="mb-10 rounded-3xl border border-cyan-500/15 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.07),transparent_60%)] p-8 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="max-w-2xl">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
            Plans and access
          </div>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Pick the level that matches how deeply you want to use the product.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-300">
            The free tier is the readable web surface. Paid tiers add subscriber JSON access,
            longer history, and a more direct way to pull the published analytical artifacts into
            your own workflow.
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

        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
          {landingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`flex min-h-[320px] flex-col rounded-3xl border p-6 shadow-sm ${plan.border}`}
            >
              <div className={`text-sm font-semibold uppercase tracking-[0.16em] ${plan.accent}`}>
                {plan.name}
              </div>
              <div className="mt-3 text-4xl font-semibold tracking-tight text-white">{plan.price}</div>
              <div className="mt-4 text-base leading-8 text-slate-200">{plan.body}</div>

              <div className="mt-5 rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-slate-300">
                {plan.detail}
              </div>

              <div className="mt-auto pt-6">
                <Link href={plan.href} className={`inline-flex text-sm font-medium hover:underline ${plan.accent}`}>
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/4 p-4 text-sm leading-7 text-slate-300">
        History Add-on: one-time unlock for the full available history in your entitled scope.
        Not built for price charts, real-time execution, or prescriptive trading signals.
      </div>
    </section>
  );
}
