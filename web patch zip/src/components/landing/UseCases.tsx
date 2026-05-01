// src/components/landing/UseCases.tsx
// New component — insert in page.tsx between <LiveChains> and <Plans>

import Link from "next/link";

const SCENARIOS = [
  {
    role: "Researcher / analyst",
    accent: "border-cyan-500/25 bg-cyan-500/5",
    eyebrow: "text-cyan-300",
    what: "Condition your analysis on documented network state",
    steps: [
      {
        code: null,
        text: "Fetch the Meta JSON bundle for your chain of choice.",
      },
      {
        code: "status.label == \"CONGESTED\" and confidence_score > 0.70",
        text: "Filter for high-confidence periods.",
      },
      {
        code: null,
        text: "You now have a clean, documented dataset of structural congestion periods — with z-scores, percentiles, and driver attribution pre-computed. Split your own data by these periods and condition your analysis accordingly.",
      },
    ],
    why: "Every label is hash-anchored to its exact inputs. What you backtest on is identical to what was published on that date — not reconstructed after the fact.",
    link: { label: "Browse historical labels →", href: "/track-record" },
  },
  {
    role: "Dashboard / monitoring user",
    accent: "border-purple-500/25 bg-purple-500/5",
    eyebrow: "text-purple-300",
    what: "Push daily chain state into your own tools — no pipeline needed",
    steps: [
      {
        code: "GET /api/v1/files/meta/{chain}/last30d/latest.json",
        text: "Fetch daily with your API key.",
      },
      {
        code: "status.label, confidence.confidence_score",
        text: "Read the label and confidence score.",
      },
      {
        code: null,
        text: "Push to your internal dashboard, alerting system, or Slack integration. No aggregation, no normalization, no baseline logic to maintain. The published JSON is the finished output.",
      },
    ],
    why: "Two fields. One endpoint. Updated every day. That is the full integration surface for basic monitoring.",
    link: { label: "See the API endpoint →", href: "/api-docs" },
  },
  {
    role: "Backtesting / quant",
    accent: "border-amber-500/20 bg-amber-500/5",
    eyebrow: "text-amber-300",
    what: "Regime-conditioned analysis with a verifiable historical record",
    steps: [
      {
        code: null,
        text: "Access the 365-day archive via Pro API key.",
      },
      {
        code: "regime.determinism_hash",
        text: "Verify any past label against its published hash.",
      },
      {
        code: null,
        text: "Build a regime-conditioned return series. Every label carries a determinism hash tied to its exact inputs — so you can independently verify that the classification you are backtesting on is what was actually published on that date, not a reconstruction.",
      },
    ],
    why: "No narrative retroactive adjustment is possible without changing the hash. The track record is auditable by design.",
    link: { label: "Read the methodology →", href: "/methodology" },
  },
] as const;

export default function UseCases() {
  return (
    <section className="mt-10 mb-2">
      <div className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-300/75 mb-2">
        How subscribers use this
      </div>
      <h2 className="text-2xl font-semibold text-white sm:text-3xl">
        What you actually do with the JSON files
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
        Three concrete workflows. Each shows what you fetch, what you read out, and why it is useful —
        so you can decide whether this matches how you work before subscribing.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {SCENARIOS.map((s) => (
          <div key={s.role} className={`flex flex-col rounded-3xl border p-6 ${s.accent}`}>
            <div className={`text-[10px] font-black uppercase tracking-[0.22em] ${s.eyebrow}`}>
              {s.role}
            </div>
            <div className="mt-2 text-[14px] font-bold text-white leading-snug">{s.what}</div>

            <div className="mt-4 flex-1 space-y-3">
              {s.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className={`mt-0.5 shrink-0 text-[10px] font-black ${s.eyebrow} opacity-60`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    {step.code && (
                      <code className="mb-1 block rounded bg-black/25 px-2 py-1 font-mono text-[10px] leading-[1.6] text-slate-200">
                        {step.code}
                      </code>
                    )}
                    <p className="text-[11px] leading-[1.65] text-slate-300">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/8 bg-black/15 px-3 py-2.5">
              <p className="text-[11px] leading-[1.6] text-slate-300">{s.why}</p>
            </div>

            <Link
              href={s.link.href}
              className={`mt-4 inline-flex text-[11px] font-semibold hover:underline ${s.eyebrow}`}
            >
              {s.link.label}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
