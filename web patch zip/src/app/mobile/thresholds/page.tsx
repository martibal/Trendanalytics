import Link from "next/link";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";

const BAND_ROWS = [
  { band: "Extreme high", pct: "≥ 95th percentile", z: "≥ +2.5", color: "#FF4444", bg: "rgba(255,68,68,0.08)" },
  { band: "High", pct: "≥ 80th percentile", z: "≥ +1.5", color: "#FF8C42", bg: "rgba(255,140,66,0.08)" },
  { band: "Normal", pct: "20th – 80th", z: "−1.5 to +1.5", color: "#94A3B8", bg: "rgba(148,163,184,0.06)" },
  { band: "Low", pct: "≤ 20th percentile", z: "≤ −1.5", color: "#3B82F6", bg: "rgba(59,130,246,0.08)" },
  { band: "Extreme low", pct: "≤ 5th percentile", z: "≤ −2.5", color: "#60A5FA", bg: "rgba(96,165,250,0.08)" },
];

const FRESHNESS_POLICY = [
  {
    chain: "BTC / ETH",
    expected: "~1 day",
    soft: "> 2 days",
    hard: "> 4 days",
    note: "Daily cadence — any lag over 2 days warrants attention.",
  },
  {
    chain: "ARB / BASE",
    expected: "~7 days",
    soft: "> 10 days",
    hard: "> 15 days",
    note: "L2 chains intentionally publish on slower cadence. 7-day lag is normal.",
  },
];

const CONFIDENCE_COMPONENTS = [
  { key: "current_row_coverage", desc: "Fraction of expected metrics present in today's Gold row" },
  { key: "recent_metric_coverage", desc: "Coverage quality over the recent window, not just today" },
  { key: "history_depth", desc: "Whether the 180-day baseline has sufficient data" },
  { key: "recent_density", desc: "Proportion of recent days with published data" },
  { key: "freshness_asof", desc: "How current the data is relative to expected cadence" },
];

export default function MobileThresholdsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="flex items-center gap-3 py-3">
          <Link href="/mobile" className="pr-1 text-lg text-slate-400">←</Link>
          <div className="flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">Thresholds</div>
            <div className="text-[14px] font-bold text-white">Published classification rules</div>
          </div>
          <Link href="/thresholds?view=desktop" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-slate-200">
            Full ↗
          </Link>
        </div>
      </header>

      <main className="flex-1 space-y-5 px-4 py-4 pb-24">

        {/* Intro */}
        <section className="rounded-3xl border border-cyan-500/15 bg-cyan-500/[0.05] p-5">
          <p className="text-[13px] leading-[1.75] text-slate-100">
            All thresholds used in the classification are public, documented, and versioned.
            Nothing in the model is hidden. The values below are the canonical defaults
            that govern what gets published every day.
          </p>
        </section>

        {/* Banding thresholds */}
        <section>
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Signal banding — canonical defaults
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
            <div className="grid grid-cols-3 border-b border-white/8 px-3 py-2">
              <span className="text-[10px] font-bold text-slate-500">Band</span>
              <span className="text-[10px] font-bold text-slate-500">Percentile</span>
              <span className="text-[10px] font-bold text-slate-500">z-score</span>
            </div>
            {BAND_ROWS.map((row) => (
              <div
                key={row.band}
                className="grid grid-cols-3 border-b border-white/5 px-3 py-2.5 last:border-0"
                style={{ backgroundColor: row.bg }}
              >
                <span className="text-[11px] font-bold" style={{ color: row.color }}>{row.band}</span>
                <span className="text-[10px] text-slate-300">{row.pct}</span>
                <code className="text-[10px] font-mono text-slate-300">{row.z}</code>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-600 leading-[1.6]">
            Both the percentile threshold AND the z-score threshold must be met for a band assignment. Meeting only one is insufficient.
          </p>
        </section>

        {/* Confidence gate */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Confidence gate
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/8 text-[24px] font-black text-white">
              0.40
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">Minimum publish threshold</div>
              <div className="mt-1 text-[11px] leading-[1.6] text-slate-400">
                Below 0.40, the model publishes UNKNOWN/DEGRADED instead of a named label.
                No weak label is ever presented as strong evidence.
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { range: "≥ 0.70", band: "Good", color: "#00FF88", desc: "Strong evidence across all components. Label is well-supported." },
              { range: "0.40 – 0.70", band: "Caution", color: "#FFD700", desc: "Sufficient to publish. Read with more care than a high-confidence row." },
              { range: "< 0.40", band: "Degraded", color: "#6B7280", desc: "Below gate. UNKNOWN/DEGRADED published. Not a silent failure — it is the honest state." },
            ].map((b) => (
              <div key={b.band} className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/10 px-3 py-2.5">
                <code className="shrink-0 font-mono text-[10px] text-slate-500 w-16 mt-0.5">{b.range}</code>
                <div>
                  <span className="text-[11px] font-bold" style={{ color: b.color }}>{b.band}</span>
                  <p className="mt-0.5 text-[11px] leading-[1.55] text-slate-400">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Confidence components */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Confidence components
          </div>
          <p className="mb-3 text-[12px] leading-[1.7] text-slate-400">
            The confidence score is built from five components. All must be healthy for a high score.
          </p>
          <div className="space-y-2">
            {CONFIDENCE_COMPONENTS.map((c) => (
              <div key={c.key} className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/60" />
                <div>
                  <code className="text-[10px] font-mono text-cyan-300">{c.key}</code>
                  <p className="mt-0.5 text-[11px] leading-[1.55] text-slate-400">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Persistence filter */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Persistence filter
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/8 text-[18px] font-black text-white">
              3d
            </div>
            <div className="text-[12px] leading-[1.65] text-slate-300">
              A signal must appear in an elevated band for at least 3 consecutive days before contributing to a regime change.
            </div>
          </div>
          <p className="text-[12px] leading-[1.7] text-slate-400">
            Combined with MA7 vs MA30 momentum: when the 7-day average runs ahead of the 30-day average, the signal is directionally confirmed. Single-day spikes never become a named regime.
          </p>
          <p className="mt-2.5 text-[11px] leading-[1.65] text-slate-500">
            This means labels are deliberately lagging — they confirm persistence before publishing. That is a feature, not a limitation.
          </p>
        </section>

        {/* Freshness policy */}
        <section>
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Freshness / lag policy per chain
          </div>
          <div className="space-y-2.5">
            {FRESHNESS_POLICY.map((p) => (
              <div key={p.chain} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[13px] font-bold text-white mb-2">{p.chain}</div>
                <div className="grid grid-cols-3 gap-2 mb-2.5">
                  {[
                    { label: "Expected", value: p.expected, color: "#00FF88" },
                    { label: "Soft warn", value: p.soft, color: "#FFD700" },
                    { label: "Hard fail", value: p.hard, color: "#FF4444" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl border border-white/6 bg-black/15 p-2 text-center">
                      <div className="text-[9px] text-slate-600">{label}</div>
                      <div className="text-[12px] font-bold mt-0.5" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] leading-[1.6] text-slate-500">{p.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 180-day baseline */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            The 180-day rolling baseline
          </div>
          <p className="text-[12px] leading-[1.7] text-slate-300">
            Every metric is scored against the 180 most recently published daily values for that metric on that specific chain. This window is long enough to capture seasonal variation but short enough to adapt over months.
          </p>
          <div className="mt-3 space-y-2">
            {[
              "Captures roughly two quarters of real usage cycles",
              "Rolls forward daily — events from 7+ months ago leave the window",
              "Chain-specific — Bitcoin uses Bitcoin's own 180 days, not Ethereum's",
              "A 30-day baseline would be too reactive; 180 days is the calibrated choice",
            ].map((point) => (
              <div key={point} className="flex items-start gap-2.5">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/50" />
                <span className="text-[12px] leading-[1.6] text-slate-300">{point}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Navigate */}
        <div className="flex gap-3">
          <Link href="/mobile/methodology" className="flex-1 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-center">
            <div className="text-[12px] font-bold text-white">Methodology</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Full pipeline walkthrough</div>
          </Link>
          <Link href="/mobile/wiki" className="flex-1 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-center">
            <div className="text-[12px] font-bold text-white">Wiki</div>
            <div className="text-[10px] text-slate-500 mt-0.5">All terms defined</div>
          </Link>
        </div>
      </main>

      <MobileBottomNav active="wiki" />
    </div>
  );
}
