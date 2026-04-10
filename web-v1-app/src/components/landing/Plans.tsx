import Link from "next/link";
import { landingPlans, landingUseCases, trustAnchor } from "@/lib/landing";

type PlansProps = {
  historyDepthDays?: number | null;
};

export default function Plans({ historyDepthDays }: PlansProps) {
  return (
    <section
      id="plans"
      className="mb-10 rounded-3xl border border-cyan-500/15 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.07),transparent_60%)] p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-8">

        <div className="max-w-xl">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-500">
            Who subscribes
          </div>
          <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl leading-tight">
            You want the JSON output,<br />not just the charts.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            The public site lets you inspect the published surface — labels, confidence,
            track record, methodology. A subscription gives you direct API access to the
            underlying Gold, Meta, and Derived JSON artifacts. Same data, structured and
            delivered daily.
          </p>

          {/* History callout */}
          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-white">
                {historyDepthDays ? `${historyDepthDays} days` : "400+"} of published history
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              Published daily since {trustAnchor.since}. Every label hash-anchored to its exact inputs —
              verifiable on any past date. Pro subscribers get the full archive.
            </p>
            <Link href="/track-record" className="mt-2 inline-flex text-xs text-cyan-400 hover:underline">
              Browse the track record →
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {landingUseCases.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-1 text-xs leading-6 text-slate-400">{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid w-full max-w-2xl gap-4 md:grid-cols-3">
          {landingPlans.map((plan) => (
            <div key={plan.name} className={`flex flex-col rounded-3xl border p-6 ${plan.border}`}>
              <div className="flex items-start justify-between gap-2">
                <div className={`text-xs font-bold uppercase tracking-[0.16em] ${plan.accent}`}>
                  {plan.name}
                </div>
                <div className={`rounded-full border border-white/10 bg-black/10 px-2.5 py-0.5 text-[10px] font-medium ${plan.accent}`}>
                  {plan.tierTag}
                </div>
              </div>

              <div className="mt-3 text-3xl font-semibold text-white">{plan.price}</div>
              <div className="mt-4 text-xs font-semibold text-white">{plan.body}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500 flex-1">{plan.detail}</div>

              {plan.name === "Pro" && historyDepthDays ? (
                <div className="mt-3 rounded-xl border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-[11px] text-purple-300">
                  Full archive:{" "}
                  <span className="font-semibold text-white">{historyDepthDays} days</span>
                  {" "}and growing daily.
                </div>
              ) : null}

              <Link
                href={plan.href}
                className={`mt-5 inline-flex items-center text-xs font-semibold hover:underline ${plan.accent}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

      </div>

      <div className="mt-6 rounded-2xl border border-white/6 bg-white/[0.02] px-5 py-3.5 text-xs leading-6 text-slate-500">
        <span className="font-semibold text-slate-400">Scope: </span>
        This product publishes on-chain network state data only — no price data, no forecasts, no prescriptive signals.
        {historyDepthDays
          ? ` History Add-on currently covers ${historyDepthDays} days of published history.`
          : ""}
      </div>
    </section>
  );
}
