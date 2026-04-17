import Link from "next/link";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";

const endpointCards = [
  {
    title: "Latest daily file",
    path: "/api/v1/files/<genre>/<chain>/latest.json",
    body: "Fetch the latest published Gold, Meta, or Derived JSON for a chain.",
  },
  {
    title: "Historical window",
    path: "/api/v1/files/<genre>/<chain>/<window>/latest.json",
    body: "Access the entitled history window for a genre and chain.",
  },
  {
    title: "Schema reference",
    path: "/api-docs/schema",
    body: "See every documented field before subscribing.",
  },
] as const;

const genreCards = [
  {
    title: "Gold",
    body: "What happened. Raw daily observations in native units.",
    fields: ["tx_count_daily", "median_tx_fee_native", "gas_utilization_pct"],
    color: "border-yellow-500/20 bg-yellow-500/5",
  },
  {
    title: "Meta",
    body: "What it means. Regime label, confidence, scorecard, and drivers.",
    fields: ["status.label", "confidence.confidence_score", "regime.drivers[]"],
    color: "border-purple-500/20 bg-purple-500/5",
  },
  {
    title: "Derived",
    body: "How it is trending. MA7 and MA30 rolling context.",
    fields: ["<metric>__ma7", "<metric>__ma30", "meta_confidence"],
    color: "border-blue-500/20 bg-blue-500/5",
  },
] as const;

export default function MobileApiDocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="flex items-center gap-3 py-3">
          <Link href="/mobile" className="pr-1 text-lg text-slate-400">
            ←
          </Link>
          <div>
            <div className="text-[14px] font-bold text-white">API Docs</div>
            <div className="text-[10px] text-slate-500">
              Simplified mobile reference
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">
        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3">
          <p className="text-[11px] leading-[1.65] text-slate-200">
            This mobile API page is a simplified version of the full desktop docs.
            Use it to understand the structure quickly, then open the full reference if needed.
          </p>
          <a
            href="/api-docs?view=desktop"
            className="mt-2 inline-block text-[11px] font-semibold text-cyan-300"
          >
            Open full desktop API docs →
          </a>
        </div>

        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Core idea
          </div>
          <p className="text-[12px] leading-[1.7] text-slate-200">
            Subscribers get direct API access to three daily JSON artifacts per chain:
            Gold, Meta, and Derived.
          </p>
        </section>

        <section className="space-y-3">
          {genreCards.map((card) => (
            <div key={card.title} className={`rounded-2xl border p-4 ${card.color}`}>
              <div className="text-[15px] font-bold text-white">{card.title}</div>
              <p className="mt-2 text-[12px] leading-[1.65] text-slate-300">{card.body}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {card.fields.map((field) => (
                  <code
                    key={field}
                    className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] text-slate-100"
                  >
                    {field}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Common paths
          </div>
          <div className="space-y-3">
            {endpointCards.map((card) => (
              <div key={card.title} className="rounded-xl border border-white/6 bg-black/15 p-3">
                <div className="text-[12px] font-semibold text-white">{card.title}</div>
                <code className="mt-2 block break-all rounded bg-black/25 px-2 py-1.5 font-mono text-[10px] text-slate-100">
                  {card.path}
                </code>
                <p className="mt-2 text-[11px] leading-[1.6] text-slate-400">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Need the full reference?
          </div>
          <div className="space-y-2">
            <a
              href="/api-docs/schema?view=desktop"
              className="block rounded-xl border border-white/6 bg-black/15 px-4 py-3 text-[12px] font-semibold text-cyan-300"
            >
              Open full schema reference →
            </a>
            <a
              href="/api-docs?view=desktop"
              className="block rounded-xl border border-white/6 bg-black/15 px-4 py-3 text-[12px] font-semibold text-cyan-300"
            >
              Open full API docs →
            </a>
          </div>
        </section>
      </main>

      <MobileBottomNav active="overview" />
    </div>
  );
}