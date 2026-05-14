import Link from "next/link";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileRouteMenu from "@/components/mobile/MobileRouteMenu";

const REGIME_LABELS = [
  {
    label: "STABLE",
    color: "#00FF88",
    plain: "All dimensions within this chain's own historical norms. No structural deviation detected.",
    technical: "Demand, Friction, and Capacity axes all within Normal bands. Confidence ≥ 0.40. Default state when evidence does not meet any other threshold.",
  },
  {
    label: "HEATING",
    color: "#FFD700",
    plain: "Demand is building and the recent direction still points upward — sustained, not a spike.",
    technical: "Demand axis in High band AND at least one axis trend HEATING (MA7 ahead of MA30). Level alone is insufficient — requires directional persistence across multiple days.",
  },
  {
    label: "CONGESTED",
    color: "#FF4444",
    plain: "The chain is under real pressure. Fees are elevated and blocks are filling up.",
    technical: "Capacity or Friction axis in Extreme High band, OR combined pressure across multiple axes. Strongest evidence state. Typically high z-scores on fee and utilization metrics.",
  },
  {
    label: "CHEAP",
    color: "#3B82F6",
    plain: "Fees and demand are materially below recent norms. The network looks lightly loaded.",
    technical: "Demand and Friction axes both in Low or Extreme Low bands. MA7 running below MA30 on primary signals. Capacity looks unconstrained.",
  },
  {
    label: "UNKNOWN / DEGRADED",
    color: "#6B7280",
    plain: "Evidence is not strong enough to support a named label. Shown instead of guessing.",
    technical: "Confidence score < 0.40. Triggered by missing data, coverage gaps, or insufficient signal quality. Never silently promoted to a named regime.",
  },
];

const PIPELINE_STEPS = [
  {
    n: "01",
    title: "Raw chain data ingested",
    body: "Transaction counts, fees, block times, gas utilization, and active addresses are read from AWS Public Blockchain Data and assembled into the daily Gold layer in native units.",
  },
  {
    n: "02",
    title: "Each metric scored against chain history",
    body: "Every metric is normalized using a robust z-score against that chain's own rolling 180-day baseline. Median and MAD are used instead of mean and std — making the score resistant to single outlier days.",
    formula: "z = (x − median) / (MAD × 1.4826)",
  },
  {
    n: "03",
    title: "Signals grouped into three axes",
    body: "Individual z-scores are grouped into Demand (transaction activity), Friction (fees and failure rate), and Capacity (block fullness and timing). Each axis produces a score from 0–100 where 50 is neutral.",
  },
  {
    n: "04",
    title: "Persistence filter applied",
    body: "A signal must persist for at least 3 consecutive days before contributing to a regime change. MA7 vs MA30 momentum is checked to confirm directionality. Single-day spikes are filtered out.",
  },
  {
    n: "05",
    title: "Confidence scored",
    body: "Five components are evaluated: data coverage today, recent coverage quality, 180-day history depth, recent data density, and freshness relative to expected cadence. Combined into a 0–1 score.",
  },
  {
    n: "06",
    title: "Label published — or not",
    body: "If confidence ≥ 0.40, a named regime label is published with a SHA-256 determinism hash tied to the exact inputs. Below 0.40: UNKNOWN/DEGRADED is published. Never a weak label presented as strong.",
  },
];

const BANDING_THRESHOLDS = [
  { band: "Extreme high", pct: "≥ 95th", z: "≥ +2.5", color: "#FF4444" },
  { band: "High", pct: "≥ 80th", z: "≥ +1.5", color: "#FF8C42" },
  { band: "Normal", pct: "20–80th", z: "−1.5 to +1.5", color: "#94A3B8" },
  { band: "Low", pct: "≤ 20th", z: "≤ −1.5", color: "#3B82F6" },
  { band: "Extreme low", pct: "≤ 5th", z: "≤ −2.5", color: "#60A5FA" },
];

export default function MobileMethodologyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 py-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">Methodology</div>
            <div className="mt-0.5 text-[14px] font-bold text-white">How the classification works</div>
          </div>
          <MobileRouteMenu />
        </div>
      </header>

      <main className="flex-1 space-y-5 px-4 py-4 pb-24">

        {/* What this is */}
        <section className="rounded-3xl border border-cyan-500/15 bg-cyan-500/[0.05] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300 mb-2">What Urd Atlas does</div>
          <p className="text-[13px] leading-[1.75] text-slate-100">
            Every day, the pipeline reads raw blockchain data for BTC, ETH, ARB, and BASE —
            scores each metric against that chain&apos;s own 180-day history — and publishes one
            descriptive regime label per chain with a confidence score and driver attribution.
          </p>
          <p className="mt-3 text-[12px] leading-[1.7] text-slate-400">
            Every output is strictly descriptive. No price targets. No forecasts. No recommendations.
            The model describes current network state relative to recent history — nothing more.
          </p>
        </section>

        {/* Pipeline steps */}
        <section>
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            The six pipeline steps
          </div>
          <div className="space-y-2.5">
            {PIPELINE_STEPS.map((step) => (
              <div key={step.n} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-[10px] font-black text-cyan-400 w-5">{step.n}</span>
                  <div>
                    <div className="text-[13px] font-bold text-white">{step.title}</div>
                    <p className="mt-1.5 text-[12px] leading-[1.7] text-slate-300">{step.body}</p>
                    {step.formula && (
                      <div className="mt-2.5 rounded-lg border border-white/8 bg-black/25 px-3 py-2">
                        <code className="font-mono text-[12px] text-cyan-300">{step.formula}</code>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Regime labels */}
        <section>
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            The five regime labels
          </div>
          <div className="space-y-2.5">
            {REGIME_LABELS.map((r) => (
              <div
                key={r.label}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                style={{ borderLeftColor: r.color + "60", borderLeftWidth: 3 }}
              >
                <div className="text-[12px] font-black tracking-wider" style={{ color: r.color }}>
                  {r.label}
                </div>
                <p className="mt-1.5 text-[12px] leading-[1.7] text-slate-200">{r.plain}</p>
                <p className="mt-1.5 text-[11px] leading-[1.65] text-slate-500">{r.technical}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Banding thresholds */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Banding thresholds
          </div>
          <p className="mb-3 text-[12px] leading-[1.7] text-slate-400">
            Both the percentile rank AND the z-score threshold must be met for a band assignment.
            Meeting only one is insufficient.
          </p>
          <div className="space-y-2">
            {BANDING_THRESHOLDS.map((t) => (
              <div key={t.band} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/10 px-3 py-2">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-[11px] font-semibold text-white w-24 shrink-0">{t.band}</span>
                <span className="text-[10px] text-slate-500 w-16">{t.pct} pct</span>
                <code className="text-[10px] font-mono text-slate-400">{t.z}</code>
              </div>
            ))}
          </div>
        </section>

        {/* Axes */}
        <section>
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            The three scorecard axes
          </div>
          <div className="space-y-2.5">
            {[
              {
                axis: "Demand",
                color: "#00FF88",
                question: "How much usage pressure is the chain carrying?",
                metrics: ["tx_count_daily", "unique_active_addresses"],
                body: "High when the chain is being used more than usual. Both metrics must show elevated z-scores and percentiles for Demand to reach a high band.",
              },
              {
                axis: "Friction",
                color: "#FF8C42",
                question: "How costly or difficult is it to use the chain?",
                metrics: ["median_tx_fee_native", "failed_tx_rate"],
                body: "High when fees are elevated or transactions are failing at above-normal rates. BTC proxied differently due to no EVM gas semantics.",
              },
              {
                axis: "Capacity",
                color: "#FF4444",
                question: "How constrained is the chain relative to its range?",
                metrics: ["gas_utilization_pct", "avg_block_time_sec"],
                body: "High when blocks are nearly full or block production is becoming irregular. EVM chains use gas_utilization_pct; BTC uses blocktime instability as proxy.",
              },
            ].map((a) => (
              <div key={a.axis} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />
                  <span className="text-[13px] font-bold text-white">{a.axis}</span>
                </div>
                <p className="text-[11px] text-slate-500 italic mb-2">{a.question}</p>
                <p className="text-[12px] leading-[1.7] text-slate-300">{a.body}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {a.metrics.map((m) => (
                    <code key={m} className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                      {m}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Determinism hash */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 mb-3">
            Determinism hash
          </div>
          <p className="text-[12px] leading-[1.7] text-slate-300">
            Every published Meta artifact includes a SHA-256 fingerprint computed from the
            exact inputs that produced that day&apos;s classification — the Gold values,
            180-day baseline, threshold parameters, and methodology version.
          </p>
          <p className="mt-2.5 text-[12px] leading-[1.7] text-slate-400">
            This hash lets you verify that a past label was not changed after publication.
            Any retroactive reclassification would change the hash — making silent adjustments detectable.
          </p>
          <div className="mt-3 rounded-xl border border-white/6 bg-black/15 px-3 py-2">
            <code className="font-mono text-[10px] text-slate-400">regime.determinism_hash</code>
          </div>
        </section>

        {/* Interpretation boundary */}
        <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300 mb-3">
            Interpretation boundary
          </div>
          <div className="space-y-2">
            {[
              ["✓", "Describes current on-chain network state relative to recent history", "text-emerald-300"],
              ["✓", "Classifies conditions into a stable regime vocabulary", "text-emerald-300"],
              ["✓", "Quantifies evidence quality through confidence scoring", "text-emerald-300"],
              ["✗", "Publishes price data or price targets", "text-red-300"],
              ["✗", "Forecasts what conditions will look like tomorrow", "text-red-300"],
              ["✗", "Recommends buying, selling, or any portfolio action", "text-red-300"],
            ].map(([mark, text, color]) => (
              <div key={text} className="flex items-start gap-2.5">
                <span className={`shrink-0 text-[12px] font-bold ${color}`}>{mark}</span>
                <span className="text-[12px] leading-[1.6] text-slate-300">{text}</span>
              </div>
            ))}
          </div>
        </section>

        <Link href="/mobile/wiki" className="block rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4 text-center">
          <div className="text-[12px] font-bold text-white">Browse the full term wiki →</div>
          <div className="mt-1 text-[11px] text-slate-400">Every field, formula, and concept defined</div>
        </Link>
      </main>

      <MobileBottomNav active="wiki" />
    </div>
  );
}
