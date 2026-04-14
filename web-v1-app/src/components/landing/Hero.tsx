"use client";

// import Link from "next/link";
// import type { ReactNode } from "react";

"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// ─── Copy ─────────────────────────────────────────────────────────────────────

const CHAINS = ["BTC", "ETH", "ARB", "BASE"];

const BRAND = "Urd Atlas";

const HERO_TITLE = "Separating blockchain noise from structural change";

const SUBLINE =
  "Daily published Gold, Meta, and Derived JSON for Bitcoin, Ethereum, Arbitrum, and Base — with regime labels, confidence scores, and full driver attribution. Descriptive only. No price, no forecasts, no recommendations.";

const REGIME_LABELS = [
  {
    label: "STABLE",
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
    dot: "bg-emerald-400",
    glow: "shadow-[0_0_12px_rgba(52,211,153,0.15)]",
    weight: "normal",
    desc: "All dimensions within this chain's 180-day norms. No structural deviation detected.",
  },
  {
    label: "HEATING",
    color: "text-yellow-300",
    border: "border-yellow-400/20",
    bg: "bg-yellow-400/5",
    dot: "bg-yellow-300",
    glow: "shadow-[0_0_12px_rgba(253,224,71,0.12)]",
    weight: "normal",
    desc: "Demand trending above baseline. 7-day momentum is running ahead of 30-day average — sustained, not a spike.",
  },
  {
    label: "CONGESTED",
    color: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/8",
    dot: "bg-red-400",
    glow: "shadow-[0_0_16px_rgba(239,68,68,0.18)]",
    weight: "heavy",
    desc: "Sustained pressure across Capacity and Friction simultaneously. Fees significantly above this chain's historical range.",
  },
  {
    label: "CHEAP",
    color: "text-blue-400",
    border: "border-blue-500/20",
    bg: "bg-blue-500/5",
    dot: "bg-blue-400",
    glow: "shadow-[0_0_12px_rgba(96,165,250,0.12)]",
    weight: "normal",
    desc: "Fees and demand materially below this chain's historical norms. Network lightly loaded.",
  },
];

const JSON_LAYERS = [
  {
    name: "Gold",
    color: "#F6C347",
    tag: "Raw source",
    fields: [
      "tx_count_daily",
      "median_tx_fee_native",
      "gas_utilization_pct",
      "unique_active_addresses",
      "avg_block_time_sec",
      "+ 5 more",
    ],
    desc: "Native units, unmodified. Independently verifiable against any chain explorer. The authoritative source Meta and Derived are built from.",
  },
  {
    name: "Meta",
    color: "#A78BFA",
    tag: "Regime output",
    fields: [
      "status.label",
      "confidence_score",
      "scorecard.*",
      "regime.drivers[]",
      "determinism_hash",
      "+ 20 more",
    ],
    desc: "The full analytical output — regime label, confidence gate, three-axis scorecard (Demand / Friction / Capacity), and ranked drivers with z-scores.",
  },
  {
    name: "Derived",
    color: "#60A5FA",
    tag: "Trend series",
    fields: ["‹metric›__ma7", "‹metric›__ma30", "meta_confidence"],
    desc: "7-day and 30-day rolling averages for every Gold metric. Separates structural shifts from spikes that revert by tomorrow.",
  },
];

// ─── Primitives ───────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 text-[9px] font-black uppercase tracking-[0.28em] text-cyan-500/70">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="my-10 border-t border-white/6" />;
}



// ─── Hero ─────────────────────────────────────────────────────────────────────

type HeroProps = { historyDepthDays?: number | null };

export default function Hero({ historyDepthDays }: HeroProps) {
  const days = historyDepthDays;

  return (
    <div className="mb-16">
      {/* ── Trust strip ── */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/6 pb-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
            <span>
              Published daily since{" "}
              <span className="font-semibold text-slate-300">December 2024</span>
            </span>
          </span>
          <span className="hidden text-white/10 sm:inline">|</span>
          <span>
            <span className="font-semibold text-slate-300">{days ?? "—"}</span>{" "}
            days of published history
          </span>
          <span className="hidden text-white/10 sm:inline">|</span>
          <span>Expected refresh windows: around 09:00 and 21:00 Europe/Oslo</span>
          <span className="hidden text-white/10 sm:inline">|</span>
          <span>Confidence gate — no label published below 0.40</span>
          <span className="hidden text-white/10 sm:inline">|</span>
          <span>Every label hash-anchored to its exact inputs</span>
        </div>
        <Link
          href="/track-record"
          className="shrink-0 text-[11px] text-cyan-500 hover:underline"
        >
          Browse track record →
        </Link>
      </div>

      {/* ── Main two-column grid ── */}
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* ════ LEFT COLUMN ════ */}
        <div className="flex flex-col">
          {/* Chain badges + eyebrow */}
          <div className="mb-6 flex flex-wrap items-center gap-2.5">
            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-600">
              On-chain regime classification
            </span>
            <span className="text-white/10">·</span>
            {CHAINS.map((c) => (
              <span
                key={c}
                className="rounded-md border border-cyan-500/25 bg-cyan-500/8 px-2 py-0.5 text-[10px] font-black tracking-widest text-cyan-400"
              >
                {c}
              </span>
            ))}
          </div>

          {/* H1 */}
          <div className="max-w-[58rem]">
            <div className="text-[2.1rem] font-black uppercase leading-none tracking-[0.16em] text-cyan-400 sm:text-[2.6rem] lg:text-[3.2rem]">
              {BRAND}
            </div>

            <h1 className="mt-5 max-w-[12.5ch] text-balance text-[2.85rem] font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-[3.6rem] lg:text-[4.35rem]">
              {HERO_TITLE}
            </h1>
          </div>

          {/* Subline */}
          <p className="mt-7 max-w-[56ch] text-[15px] leading-[1.9] text-slate-400">
            {SUBLINE}
          </p>

          {/* ── CTAs ── */}
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex items-center rounded-full bg-cyan-500 px-8 py-3 text-sm font-black text-[#040a12] shadow-[0_0_24px_rgba(6,182,212,0.35)] transition hover:bg-cyan-400 hover:shadow-[0_0_32px_rgba(6,182,212,0.5)]"
            >
              See plans
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("latest-surface")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex items-center rounded-full border border-white/12 bg-white/4 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white"
            >
              Latest published surface →
            </button>
          </div>

          {/* Tertiary links */}
          <div className="mt-4 flex flex-wrap gap-5 text-[11px] text-slate-600">
            <Link
              href="/api-docs/schema"
              className="transition-colors hover:text-slate-400"
            >
              JSON schema →
            </Link>
            <a
              href="#what-is-modal"
              className="transition-colors hover:text-slate-400"
            >
              What this is
            </a>
            <a
              href="#boundary-modal"
              className="transition-colors hover:text-slate-400"
            >
              Interpretation boundary
            </a>
            <Link
              href="/methodology"
              className="transition-colors hover:text-slate-400"
            >
              Full methodology
            </Link>
          </div>

          <Divider />

          {/* ── Regime labels ── */}
          <SectionLabel>
            The four regime labels — one published per chain, per day
          </SectionLabel>

          <div className="grid grid-cols-2 gap-2">
            {REGIME_LABELS.map((r) => (
              <div
                key={r.label}
                className={`rounded-2xl border ${r.border} ${r.bg} ${r.glow} p-4`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${r.dot}`} />
                  <span
                    className={`text-[11px] font-black tracking-[0.12em] ${r.color}`}
                  >
                    {r.label}
                  </span>
                  {r.weight === "heavy" && (
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-red-400/40">
                      ↑ highest
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[12px] leading-[1.6] text-slate-400">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] leading-[1.75] text-slate-600">
            All labels are chain-relative — HEATING on Ethereum means Ethereum is
            running hotter than Ethereum normally does, not hotter than Bitcoin.
            Below confidence 0.40, the model publishes{" "}
            <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              UNKNOWN/DEGRADED
            </code>{" "}
            rather than a weak label presented as strong.
          </p>

          <Divider />

          {/* ── Pipeline steps ── */}
          <SectionLabel>How the pipeline works — three steps, every day</SectionLabel>

          <div className="space-y-2.5">
            {[
              {
                n: "01",
                title: "Raw data ingested",
                body: "Transaction counts, fees, block times, gas utilization, and active addresses — assembled into Gold JSON in native units. Independently verifiable against any chain explorer.",
              },
              {
                n: "02",
                title: "Scored against 180-day chain history",
                body: "Every metric is z-scored against that chain's own rolling 180-day baseline — not a universal benchmark. A persistence filter using 7-day vs 30-day momentum separates structural shifts from single-day noise.",
              },
              {
                n: "03",
                title: "Label published with confidence gate",
                body: "If confidence ≥ 0.40 the model publishes a named regime label with a SHA-256 determinism hash. Below threshold: UNKNOWN/DEGRADED. Never a weak label presented as strong.",
              },
            ].map((step) => (
              <div
                key={step.n}
                className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-4"
              >
                <span className="mt-0.5 w-5 shrink-0 text-[10px] font-black tabular-nums text-cyan-600/70">
                  {step.n}
                </span>
                <div>
                  <div className="text-[12px] font-bold text-white">
                    {step.title}
                  </div>
                  <p className="mt-1 text-[11px] leading-[1.65] text-slate-500">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div className="flex flex-col gap-4">
          {/* Archive depth */}
          <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-7">
            <SectionLabel>Archive depth</SectionLabel>
            <div className="flex items-end gap-3 leading-none">
              <span className="text-[5.5rem] font-black leading-none tracking-[-0.04em] tabular-nums text-white">
                {days ?? "—"}
              </span>
              <div className="mb-1.5 text-[10px] font-bold uppercase leading-[1.5] tracking-[0.2em] text-slate-500">
                published
                <br />
                days
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-[1.75] text-slate-500">
              Published daily since December 2024. Pro subscribers get the full
              archive — every label, confidence score, and driver set, back to
              day one. Every past date is verifiable via its determinism hash.
            </p>
            <Link
              href="/track-record"
              className="mt-3 inline-flex text-[12px] font-semibold text-cyan-500 hover:underline"
            >
              Browse the track record →
            </Link>
          </div>

          {/* JSON layers */}
          <div className="rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-6">
            <SectionLabel>Three JSON files · per chain · per day</SectionLabel>
            <p className="mb-5 text-[12px] leading-[1.65] text-slate-500">
              Subscribers get API access to all three. Every field is documented
              in the schema reference before you subscribe.
            </p>

            <div className="space-y-3">
              {JSON_LAYERS.map((layer) => (
                <div
                  key={layer.name}
                  className="rounded-xl border border-white/6 bg-black/25 p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="text-[13px] font-black"
                      style={{ color: layer.color }}
                    >
                      {layer.name}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        color: layer.color,
                        backgroundColor: `${layer.color}18`,
                      }}
                    >
                      {layer.tag}
                    </span>
                    <Link
                      href="/api-docs/schema"
                      className="ml-auto text-[10px] text-slate-600 transition-colors hover:text-slate-400"
                    >
                      schema →
                    </Link>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {layer.fields.map((f) => (
                      <code
                        key={f}
                        className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-slate-400"
                      >
                        {f}
                      </code>
                    ))}
                  </div>

                  <p className="text-[11px] leading-[1.6] text-slate-500">
                    {layer.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/5 bg-black/30 px-4 py-3">
              <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
                API endpoint
              </div>
              <code className="break-all font-mono text-[10px] text-slate-500">
                GET /api/v1/files/&#123;gold|meta|derived&#125;/&#123;chain&#125;/&#123;window&#125;/latest.json
              </code>
            </div>
          </div>

          {/* Nav links */}
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
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[12px] font-medium text-slate-400 transition hover:border-cyan-500/25 hover:text-cyan-400"
              >
                {item.label}
                <span className="text-xs text-slate-700">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}