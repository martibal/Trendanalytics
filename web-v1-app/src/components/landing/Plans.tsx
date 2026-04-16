import { landingPlans } from "@/lib/landing";
import Link from "next/link";
import type { ReactNode } from "react";

type PlansProps = {
  historyDepthDays?: number | null;
};

const inactiveCtaClass =
  "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-black text-slate-500 opacity-70 cursor-not-allowed";

const COMPARISON_ROWS = [
  {
    tier: "Free",
    detail: "Inspect the public surface on-site. No API access.",
    accent: "text-slate-300",
  },
  {
    tier: "Basic",
    detail: "One chain. API access. 90-day history.",
    accent: "text-cyan-200",
  },
  {
    tier: "Pro",
    detail: "All four chains. API access. 365-day history.",
    accent: "text-purple-200",
  },
] as const;

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300/75">
      {children}
    </div>
  );
}

export default function Plans({ historyDepthDays }: PlansProps) {
  return (
    <section
      id="plans"
      className="mb-10 rounded-3xl border border-cyan-500/15 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.07),transparent_60%)] p-8"
    >
      <div className="max-w-3xl">
        <SectionLabel>Subscriber plans</SectionLabel>

        <h2 className="mt-2 text-3xl font-semibold leading-tight text-white sm:text-4xl">
          Pick the smallest plan that matches your workflow.
        </h2>

        <p className="mt-4 text-sm leading-7 text-slate-300">
          Free lets you inspect the public surface on-site. Paid plans unlock direct
          API access to Gold, Meta, and Derived JSON — delivered daily to your key.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {COMPARISON_ROWS.map((row) => (
            <div
              key={row.tier}
              className="rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3"
            >
              <div className={`text-[12px] font-black ${row.accent}`}>{row.tier}</div>
              <div className="mt-1 text-[11px] leading-[1.55] text-slate-400">
                {row.detail}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[12px] leading-6 text-slate-400">
          New here? Start with <span className="font-semibold text-white">Basic</span> on
          your most-watched chain. Upgrade to{" "}
          <span className="font-semibold text-white">Pro</span> any time from your
          dashboard.
        </p>

        <div className="mt-4 inline-flex max-w-xl rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs leading-6 text-amber-100/85">
          Payments are temporarily inactive while business registration is being
          finalized. You can explore the full public site and documentation now, but
          checkout is not yet enabled.
        </div>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-3">
        {landingPlans.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col rounded-3xl border p-6 ${plan.border}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className={`text-xs font-black uppercase tracking-[0.16em] ${plan.accent}`}
                >
                  {plan.name}
                </div>
                <div className="mt-2 text-3xl font-black text-white">{plan.price}</div>
              </div>

              <div
                className={`rounded-full border border-white/10 bg-black/10 px-3 py-1 text-[10px] font-bold ${plan.accent}`}
              >
                {plan.tierTag}
              </div>
            </div>

            <div className="mt-4 text-[19px] font-semibold leading-7 text-white">
              {plan.body}
            </div>

            <div className="mt-3 flex-1 text-[13px] leading-7 text-slate-300">
              {plan.detail}
            </div>

            {"bestFor" in plan && plan.bestFor ? (
              <div className={`mt-4 text-[12px] leading-6 ${plan.accent} opacity-85`}>
                {plan.bestFor as string}
              </div>
            ) : null}

            <div className="mt-6">
              {plan.name === "Free" ? (
                <Link
                  href={plan.href}
                  className="inline-flex items-center text-sm font-semibold text-slate-200 hover:underline"
                >
                  {plan.cta}
                </Link>
              ) : (
                <div>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className={inactiveCtaClass}
                  >
                    Payments open soon
                  </button>
                  <div className="mt-2 text-[11px] leading-5 text-slate-500">
                    Checkout is temporarily disabled for launch preparation.
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              History add-on
            </div>

            <div className="mt-1.5 text-[18px] font-bold text-white">
              Full archive — {historyDepthDays ?? "499"}+ days
            </div>

            <p className="mt-2 text-[13px] leading-6 text-slate-300">
              Already subscribed? Unlock the complete published history back to
              December 2024 as a one-time purchase — no plan change required.
            </p>

            <p className="mt-2 text-[12px] leading-6 text-slate-500">
              Available within your entitled scope: one chain for Basic, all four
              chains for Pro.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-500 opacity-70 cursor-not-allowed"
            >
              Payments open soon
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.015] px-5 py-3 text-xs leading-6 text-slate-600">
        <span className="font-semibold text-slate-500">Scope: </span>
        This product publishes on-chain network state data only — no price data, no
        forecasts, and no prescriptive signals. Subscriptions renew monthly and can
        be cancelled at any time from your dashboard.
      </div>
    </section>
  );
}