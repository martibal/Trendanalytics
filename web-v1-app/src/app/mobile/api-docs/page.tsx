import Link from "next/link";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";

const INTEGRATION_STEPS = [
  {
    n: "01",
    title: "Subscribe and generate a key",
    body: "Log in at urdatlas.com, pick a plan, and generate an API key from your dashboard. The key is shown once — store it safely.",
    code: null,
  },
  {
    n: "02",
    title: "Make your first request",
    body: "Fetch the latest Meta JSON for your chain. Pass your key in the Authorization header.",
    code: "GET /api/v1/files/meta/ethereum/latest.json\nAuthorization: Bearer YOUR_KEY",
  },
  {
    n: "03",
    title: "Read the regime label",
    body: "The label is at status.label. Confidence is at confidence.confidence_score. That's the core — two fields.",
    code: '{\n  "status": { "label": "CONGESTED" },\n  "confidence": { "confidence_score": 0.684 }\n}',
  },
  {
    n: "04",
    title: "Go deeper with scorecard and drivers",
    body: "scorecard.dimensions gives Demand, Friction, and Capacity scores. regime.drivers[] gives the specific metrics driving the label.",
    code: null,
  },
];

const JSON_LAYERS = [
  {
    name: "Gold",
    tagline: "What happened",
    color: "#F7931A",
    border: "border-yellow-500/20",
    bg: "bg-yellow-500/5",
    desc: "Raw daily observations in native units. Transaction counts, fees, block times, active addresses. The canonical source everything else is built from.",
    fields: [
      { key: "tx_count_daily", note: "Total confirmed transactions" },
      { key: "median_tx_fee_native", note: "Typical cost per transaction" },
      { key: "gas_utilization_pct", note: "Block fullness — EVM chains only" },
      { key: "unique_active_addresses", note: "Distinct active addresses" },
      { key: "avg_block_time_sec", note: "Block cadence" },
    ],
    bestFor: "Reproducible raw inputs, independent verification, custom features",
  },
  {
    name: "Meta",
    tagline: "What it means",
    color: "#A78BFA",
    border: "border-purple-500/20",
    bg: "bg-purple-500/5",
    desc: "The analytical layer. Regime label, confidence score, three-axis scorecard, and driver attribution. The commercial core of the product.",
    fields: [
      { key: "status.label", note: "STABLE / HEATING / CONGESTED / CHEAP" },
      { key: "confidence.confidence_score", note: "Evidence quality, 0–1" },
      { key: "scorecard.dimensions.*", note: "Demand · Friction · Capacity" },
      { key: "regime.drivers[]", note: "Top signals with z-score and percentile" },
      { key: "regime.determinism_hash", note: "Reproducibility fingerprint" },
    ],
    bestFor: "Regime research, confidence-gated analysis, driver attribution, backtesting",
  },
  {
    name: "Derived",
    tagline: "How it is trending",
    color: "#60A5FA",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
    desc: "7-day and 30-day rolling averages for every Gold metric. Independently verifiable: any MA7 is the arithmetic mean of the matching Gold field over 7 days.",
    fields: [
      { key: "<metric>__ma7", note: "7-day rolling mean of any Gold field" },
      { key: "<metric>__ma30", note: "30-day rolling mean of any Gold field" },
      { key: "meta_confidence", note: "Confidence overlay for chart rendering" },
    ],
    bestFor: "Trend charting, spike vs persistence detection, momentum context",
  },
];

const ENDPOINTS = [
  {
    title: "Latest published state",
    method: "GET",
    path: "/api/v1/files/meta/{chain}/latest.json",
    desc: "The most recently published Meta artifact for a chain. Includes regime label, confidence, scorecard, and drivers.",
    plan: "All paid plans",
  },
  {
    title: "Historical window",
    method: "GET",
    path: "/api/v1/files/meta/{chain}/last{N}d/latest.json",
    desc: "A bundled window of published Meta rows. N is your entitled window depth: 90 (Basic) or 365 (Pro).",
    plan: "Basic: 90d · Pro: 365d",
  },
  {
    title: "Gold raw observations",
    method: "GET",
    path: "/api/v1/files/gold/{chain}/latest.json",
    desc: "The raw daily Gold metrics for a chain. Native units, unmodified.",
    plan: "All paid plans",
  },
  {
    title: "Derived trend series",
    method: "GET",
    path: "/api/v1/files/derived/{chain}/last{N}d/latest.json",
    desc: "Bundled MA7/MA30 trend series for all Gold metrics over your entitled window.",
    plan: "Basic: 90d · Pro: 365d",
  },
];

export default function MobileApiDocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="flex items-center gap-3 py-3">
          <Link href="/mobile" className="pr-1 text-lg text-slate-400">←</Link>
          <div className="flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">API Docs</div>
            <div className="text-[14px] font-bold text-white">JSON delivery reference</div>
          </div>
          <Link href="/api-docs?view=desktop" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-slate-200">
            Full ↗
          </Link>
        </div>
      </header>

      <main className="flex-1 space-y-5 px-4 py-4 pb-24">

        {/* Core concept */}
        <section className="rounded-3xl border border-cyan-500/15 bg-cyan-500/[0.05] p-5">
          <p className="text-[13px] leading-[1.75] text-slate-100">
            Subscribers get daily API access to three JSON file types per chain:
            Gold (what happened), Meta (what it means), and Derived (how it is trending).
            Every field in every file is documented in the schema reference.
          </p>
          <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
            <code className="font-mono text-[11px] text-cyan-300">
              GET /api/v1/files/&#123;genre&#125;/&#123;chain&#125;/&#123;window&#125;/latest.json
            </code>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            genre: gold · meta · derived &nbsp;|&nbsp; chain: bitcoin · ethereum · arbitrum · base
          </div>
        </section>

        {/* Getting started steps */}
        <section>
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Getting started in 4 steps
          </div>
          <div className="space-y-2.5">
            {INTEGRATION_STEPS.map((step) => (
              <div key={step.n} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-[10px] font-black text-cyan-400 w-5">{step.n}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-white">{step.title}</div>
                    <p className="mt-1 text-[12px] leading-[1.7] text-slate-300">{step.body}</p>
                    {step.code && (
                      <div className="mt-2.5 rounded-xl border border-white/8 bg-black/30 px-3 py-2.5">
                        <pre className="font-mono text-[10px] text-slate-200 whitespace-pre-wrap break-all">
                          {step.code}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* JSON layers */}
        <section>
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            The three JSON file types
          </div>
          <div className="space-y-3">
            {JSON_LAYERS.map((layer) => (
              <div
                key={layer.name}
                className={`rounded-2xl border p-5 ${layer.border} ${layer.bg}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: layer.color }} />
                  <span className="text-[14px] font-bold text-white">{layer.name}</span>
                  <span className="text-[11px] text-slate-400">— {layer.tagline}</span>
                </div>
                <p className="text-[12px] leading-[1.7] text-slate-300 mb-3">{layer.desc}</p>
                <div className="space-y-1.5 mb-3">
                  {layer.fields.map((f) => (
                    <div key={f.key} className="flex items-start gap-2">
                      <code className="shrink-0 rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] text-slate-200">
                        {f.key}
                      </code>
                      <span className="text-[10px] text-slate-500">{f.note}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-white/8 bg-black/15 px-3 py-2">
                  <div className="text-[9px] text-slate-600 mb-0.5">Best for</div>
                  <div className="text-[11px] text-slate-300">{layer.bestFor}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Endpoints */}
        <section>
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Key endpoints
          </div>
          <div className="space-y-2.5">
            {ENDPOINTS.map((ep) => (
              <div key={ep.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[12px] font-bold text-white">{ep.title}</span>
                  <span className="shrink-0 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[9px] font-bold text-cyan-300">
                    {ep.method}
                  </span>
                </div>
                <code className="block rounded-lg border border-white/8 bg-black/25 px-2.5 py-2 font-mono text-[10px] text-slate-200 break-all mb-2">
                  {ep.path}
                </code>
                <p className="text-[11px] leading-[1.6] text-slate-400 mb-2">{ep.desc}</p>
                <div className="text-[10px] text-slate-600">
                  Plan: <span className="text-slate-400">{ep.plan}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Plan limits */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Access by plan
          </div>
          <div className="space-y-2">
            {[
              { plan: "Basic — $29/mo", access: "1 chain of your choice · Gold, Meta, Derived · 90-day history", color: "#22d3ee" },
              { plan: "Pro — $79/mo", access: "All 4 chains · Gold, Meta, Derived · 365-day history", color: "#a78bfa" },
              { plan: "History Add-on", access: "Full archive from December 2024 as one-time purchase", color: "#fbbf24" },
            ].map((p) => (
              <div key={p.plan} className="rounded-xl border border-white/6 bg-black/10 px-3 py-3">
                <div className="text-[11px] font-bold mb-0.5" style={{ color: p.color }}>{p.plan}</div>
                <div className="text-[11px] text-slate-400">{p.access}</div>
              </div>
            ))}
          </div>
        </section>

        <Link
          href="/mobile/plans"
          className="block rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4 text-center"
        >
          <div className="text-[12px] font-bold text-white">Subscribe to get API access →</div>
          <div className="mt-1 text-[11px] text-slate-400">Start with Basic on your most-watched chain</div>
        </Link>
      </main>

      <MobileBottomNav active="overview" />
    </div>
  );
}
