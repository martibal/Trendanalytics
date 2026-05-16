// src/components/landing/JsonLayers.tsx
// Drop-in replacement. No new dependencies.
import Link from "next/link";

const LAYERS = [
  {
    tag: "Gold",
    tagClass: "border-amber-400/25 bg-amber-400/8 text-amber-300",
    title: "Raw daily observations",
    subtitle: "What happened",
    desc: "The raw daily observations the chain actually recorded — in native units, ready for verification and custom feature engineering.",
    fields: [
      { name: "tx_count_daily", note: "Daily transaction count" },
      { name: "median_tx_fee_native", note: "Typical cost per transaction" },
      { name: "gas_utilization_pct", note: "Block fullness — ETH L1 only" },
      { name: "+ 5 more documented fields", note: null },
    ],
    dotClass: "bg-amber-400",
    href: "/api-docs/schema#gold",
    hoverBorder: "hover:border-amber-400/20",
    featured: false as const,
  },
  {
    tag: "Meta",
    tagClass: "border-cyan-400/25 bg-cyan-400/8 text-cyan-300",
    title: "Regime reference layer",
    subtitle: "What it means",
    desc: "The reference layer subscribers are paying for — regime label, confidence, scorecard, and driver attribution. Pre-assembled and documented.",
    fields: [
      { name: "status.label", note: "STABLE / HEATING / CONGESTED / CHEAP" },
      { name: "confidence.confidence_score", note: "Evidence quality, 0–1" },
      { name: "scorecard.dimensions.*", note: "Demand · Friction · Capacity" },
      { name: "+ 20 more documented fields", note: null },
    ],
    dotClass: "bg-cyan-400",
    href: "/api-docs/schema#meta",
    hoverBorder: "hover:border-cyan-400/20",
    featured: true as const,
  },
  {
    tag: "Derived",
    tagClass: "border-emerald-400/20 bg-emerald-400/6 text-emerald-300",
    title: "Smoothed trend series",
    subtitle: "How it is trending",
    desc: "MA7 and MA30 trend series for every Gold metric. Separates one-day spikes from persistent moves. Useful for charting and monitoring.",
    fields: [
      { name: "<metric>__ma7", note: "7-day rolling mean of any Gold field" },
      { name: "<metric>__ma30", note: "30-day rolling mean of any Gold field" },
      { name: "derived.meta_confidence", note: "Confidence overlay for chart rendering" },
    ],
    dotClass: "bg-emerald-400",
    href: "/api-docs/schema#derived",
    hoverBorder: "hover:border-emerald-400/15",
    featured: false as const,
  },
  {
    tag: "Briefs",
    tagClass: "border-lime-400/20 bg-lime-400/6 text-lime-300",
    title: "Readable summaries",
    subtitle: "What changed",
    desc: "Short descriptive JSON summaries of latest Meta context. Built for fast reading, reporting, and non-pipeline workflows.",
    fields: [
      { name: "headline", note: "Readable latest-context summary" },
      { name: "updated_through", note: "As-of data boundary" },
      { name: "guardrails", note: "Non-predictive, non-advisory framing" },
    ],
    dotClass: "bg-lime-400",
    href: "/api-docs/schema#briefs",
    hoverBorder: "hover:border-lime-400/15",
    featured: false as const,
  },
] as const;

export default function JsonLayers() {
  return (
    <section className="mt-16">
      <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-500">
        Four published JSON layers per chain, per day
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <h2 className="text-3xl font-black tracking-[-0.02em] text-white leading-tight">
          Gold, Derived, Meta, and Briefs.
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {LAYERS.map((layer) => (
          <Link
            key={layer.tag}
            href={layer.href}
            className={`group flex flex-col rounded-2xl border p-6 transition-all duration-150 ${
              layer.featured
                ? "border-cyan-500/18 bg-gradient-to-br from-cyan-500/[0.06] to-[#080F1C]"
                : "border-white/7 bg-[#080F1C]"
            } ${layer.hoverBorder} hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(0,0,0,0.3)]`}
          >
            <span
              className={`mb-4 inline-block w-fit rounded font-mono text-[11px] font-bold px-2.5 py-1 border ${layer.tagClass}`}
            >
              {layer.tag}
            </span>
            <div className="text-[18px] font-black tracking-[-0.01em] text-white mb-1">
              {layer.title}
            </div>
            <div className="font-mono text-[10px] font-medium letter-spacing-[0.1em] text-slate-300 mb-3">
              {layer.subtitle}
            </div>
            <p className="text-[13px] leading-[1.7] text-slate-300 mb-5 flex-1">{layer.desc}</p>
            <div className="space-y-2.5">
              {layer.fields.map(({ name, note }) => (
                <div key={name} className="flex gap-2.5 items-start">
                  {note ? (
                    <span
                      className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${layer.dotClass} opacity-70`}
                    />
                  ) : (
                    <span className="mt-1.5 h-1 w-1 shrink-0" />
                  )}
                  <div>
                    <span className="font-mono text-[11px] text-slate-300">{name}</span>
                    {note && (
                      <span className="font-mono text-[10px] text-slate-400 ml-2">{note}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 font-mono text-[10px] font-semibold text-slate-400 transition group-hover:text-cyan-400">
              See all {layer.tag} fields →
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-5 text-[12px] text-slate-400 font-mono text-center">
        Delivered via{" "}
        <code className="text-slate-300">GET /api/v1/files/&lt;genre&gt;/&lt;chain&gt;/&lt;window&gt;/latest.json</code>
        {" · "}
        <Link href="/api-docs/schema" className="text-cyan-500/70 hover:text-cyan-400 hover:underline">
          Full schema reference
        </Link>
      </p>
    </section>
  );
}
