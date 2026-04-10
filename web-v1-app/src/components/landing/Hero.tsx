import Link from "next/link";
import type { ReactNode } from "react";

// ─── Static content — all copy lives here for easy editing ───────────────────

const HEADLINE_TOP = "Daily chain-state data for";
const HEADLINE_CHAINS = ["BTC", "ETH", "ARB", "BASE"];
const HEADLINE_BOTTOM = "that tells you whether conditions are actually changing — or just spiking briefly.";

const SUBLINE =
  "Every day, the pipeline scores each chain's fee environment, block demand, and network friction against its own 180-day history — and publishes a structured regime label with a confidence score. Not a price feed. Not a chart. A documented, reproducible classification of network state.";

// historyDepthDays comes from computeHistoryDepthDays() in page.tsx — reads the live Ethereum manifest.
// No hardcoded fallback: if the manifest is unavailable the count shows as "—".

const WHO_ITS_FOR = [
  "On-chain researchers who need structured regime context — not raw explorer data",
  "Quant teams who want to condition models on documented network state",
  "Infrastructure operators tracking L2 cost environment across ARB and BASE",
  "Anyone building dashboards or pipelines who doesn't want to rebuild ingestion from scratch",
];

const REGIME_LABELS = [
  { label: "STABLE",    color: "text-emerald-400", bg: "bg-emerald-400",  desc: "All dimensions within 180-day norms" },
  { label: "HEATING",   color: "text-yellow-300",  bg: "bg-yellow-300",   desc: "Demand trending structurally above baseline" },
  { label: "CONGESTED", color: "text-red-400",     bg: "bg-red-400",      desc: "Sustained pressure across Capacity + Friction" },
  { label: "CHEAP",     color: "text-blue-400",    bg: "bg-blue-400",     desc: "Fees + demand materially below chain norms" },
];

const JSON_LAYERS = [
  {
    name: "Gold",
    accent: "#F6C347",
    fields: "tx_count · median_fee · gas_utilization · active_addresses · block_time",
    desc: "Raw daily observations in native units. Independently verifiable against any chain explorer.",
  },
  {
    name: "Meta",
    accent: "#A78BFA",
    fields: "status.label · confidence_score · scorecard · regime.drivers · determinism_hash",
    desc: "The regime output — label, confidence gate, three-axis scorecard, ranked drivers with z-scores.",
  },
  {
    name: "Derived",
    accent: "#60A5FA",
    fields: "‹metric›__ma7 · ‹metric›__ma30 · meta_confidence",
    desc: "7-day and 30-day rolling averages for every Gold field. Distinguishes structural shifts from spikes.",
  },
];

// ─── Small primitives ─────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-500">
      {children}
    </div>
  );
}

function Rule() {
  return <div className="h-px w-full bg-white/8" />;
}

// ─── Hero component ───────────────────────────────────────────────────────────

type HeroProps = {
  historyDepthDays?: number | null;
};

export default function Hero({ historyDepthDays }: HeroProps) {
  const days = historyDepthDays;

  return (
    <div className="mb-16">

      {/* ════════════════════════════════════════════════════════════════
          TOP STRIP — trust anchor, always the first thing eyes hit
      ════════════════════════════════════════════════════════════════ */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Published daily since <span className="text-slate-300">December 2024</span></span>
          </span>
          <span className="hidden sm:inline text-white/15">|</span>
          <span><span className="text-slate-300 font-semibold">{days ?? "—"}</span> days of published history</span>
          <span className="hidden sm:inline text-white/15">|</span>
          <span>Every label SHA-256 anchored to its inputs</span>
          <span className="hidden sm:inline text-white/15">|</span>
          <span>Confidence gate: no label published below 0.40</span>
        </div>
        <Link href="/track-record" className="text-[11px] text-cyan-500 hover:underline shrink-0">
          Browse track record →
        </Link>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MAIN HERO — two-column editorial layout
      ════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">

        {/* LEFT — headline + core substance */}
        <div>

          {/* Headline */}
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-500 mb-4">
            On-chain regime classification
          </div>

          <h1 className="text-[2.6rem] font-black leading-[1.08] tracking-[-0.02em] text-white lg:text-[3.2rem]">
            {HEADLINE_TOP}{" "}
            <span className="inline-flex flex-wrap gap-x-3">
              {HEADLINE_CHAINS.map((c, i) => (
                <span key={c}>
                  <span className="text-cyan-400">{c}</span>
                  {i < HEADLINE_CHAINS.length - 1 && (
                    <span className="text-white/20"> ·</span>
                  )}
                </span>
              ))}
            </span>
            <br />
            <span className="text-slate-300 font-semibold text-[2rem] lg:text-[2.4rem] leading-[1.2] tracking-[-0.01em]">
              {HEADLINE_BOTTOM}
            </span>
          </h1>

          <p className="mt-6 text-[15px] leading-[1.85] text-slate-400 max-w-[52ch]">
            {SUBLINE}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#plans"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-bold text-[#050b14] hover:bg-cyan-400 transition-colors"
            >
              See plans
            </Link>
            <Link
              href="#latest-surface"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors"
            >
              Latest published surface →
            </Link>
            <Link
              href="/api-docs/schema"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              JSON schema →
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
            <a href="#what-is-modal" className="hover:text-slate-400 transition-colors">What this is</a>
            <span>·</span>
            <a href="#boundary-modal" className="hover:text-slate-400 transition-colors">Interpretation boundary</a>
            <span>·</span>
            <Link href="/methodology" className="hover:text-slate-400 transition-colors">Full methodology</Link>
          </div>

          {/* ── Regime labels — shown as the actual vocabulary ── */}
          <div className="mt-10">
            <Rule />
            <div className="mt-5">
              <Eyebrow>The four regime labels — one published per chain, per day</Eyebrow>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {REGIME_LABELS.map((r) => (
                  <div key={r.label} className="flex items-start gap-3 rounded-xl border border-white/6 bg-white/[0.025] px-4 py-3">
                    <span className={`mt-[3px] h-2 w-2 shrink-0 rounded-full ${r.bg}`} />
                    <div className="min-w-0">
                      <span className={`text-[11px] font-black tracking-[0.1em] ${r.color}`}>{r.label}</span>
                      <p className="mt-0.5 text-[11px] leading-[1.5] text-slate-500">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-600 leading-5">
                Labels are chain-relative. HEATING on Ethereum means Ethereum is hotter than Ethereum normally is — not hotter than Bitcoin.
                Below confidence 0.40, the model publishes <span className="text-slate-500 font-mono">UNKNOWN/DEGRADED</span> rather than a weak label.
              </p>
            </div>
          </div>

          {/* ── Who it's for ── */}
          <div className="mt-8">
            <Rule />
            <div className="mt-5">
              <Eyebrow>Who uses it</Eyebrow>
              <ul className="mt-4 space-y-2">
                {WHO_ITS_FOR.map((line, i) => (
                  <li key={i} className="flex items-start gap-3 text-[13px] leading-[1.6] text-slate-400">
                    <span className="mt-[5px] h-1 w-4 shrink-0 border-t border-cyan-600/60" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

        {/* RIGHT — JSON layers + archive depth */}
        <div className="flex flex-col gap-5">

          {/* Archive depth — number as the visual anchor */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
            <Eyebrow>Archive depth</Eyebrow>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-[4rem] font-black leading-none tracking-tight text-white tabular-nums">
                {days ?? "—"}
              </span>
              <span className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                published<br />days
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Published daily since December 2024. Pro subscribers get the full archive —
              every label, confidence score, and driver attribution, back to day one.
              Determinism hashes let you verify any past date against the methodology version active at the time.
            </p>
            <Link href="/track-record" className="mt-3 inline-flex text-xs text-cyan-500 hover:underline">
              Browse the track record →
            </Link>
          </div>

          {/* JSON layers */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
            <Eyebrow>Three JSON files per chain, per day</Eyebrow>
            <p className="mt-2 text-xs leading-5 text-slate-500 mb-4">
              Subscribers get API access to Gold, Meta, and Derived — structured, sanitized, ready to use downstream.
            </p>
            <div className="space-y-3">
              {JSON_LAYERS.map((layer) => (
                <div key={layer.name} className="rounded-xl border border-white/6 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black tracking-wide" style={{ color: layer.accent }}>
                      {layer.name}
                    </span>
                    <Link href="/api-docs/schema" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                      schema →
                    </Link>
                  </div>
                  <p className="mt-1.5 text-[10px] font-mono leading-[1.6] text-slate-500 break-all">
                    {layer.fields}
                  </p>
                  <p className="mt-2 text-[11px] leading-[1.5] text-slate-400">
                    {layer.desc}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-white/6 bg-black/20 px-3 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1">Endpoint</div>
              <code className="text-[10px] font-mono text-slate-500">
                GET /api/v1/files/&#123;gold|meta|derived&#125;/&#123;chain&#125;/&#123;window&#125;.json
              </code>
            </div>
          </div>

          {/* Quick nav chips */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Methodology", href: "/methodology" },
              { label: "Track Record", href: "/track-record" },
              { label: "JSON Schema", href: "/api-docs/schema" },
              { label: "API Docs", href: "/api-docs" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5 text-xs font-medium text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition-colors"
              >
                {item.label}
                <span className="text-slate-700">→</span>
              </Link>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}
