// src/components/landing/Hero.tsx
"use client";

import Link from "next/link";
import RegimeBadge from "@/components/RegimeBadge";
import type { SurfaceRowDisplay } from "@/lib/landingSurface";

type HeroProps = {
  historyDepthDays?: number | null;
  rows?: SurfaceRowDisplay[];
  lastDataLoad?: string | null;
};

const JSON_FILE_CARDS = [
  {
    key: "gold",
    title: "Gold",
    titleClass: "text-amber-300",
    tagClass: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    subtitle: "WHAT HAPPENED",
    glowClass:
      "bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.08),transparent_60%)]",
    fields: [
      { dot: "bg-amber-300", name: "tx_count_daily", note: "daily activity count" },
      { dot: "bg-amber-300", name: "unique_active_addresses", note: "breadth of use" },
      { dot: "bg-amber-300", name: "median_fee_native", note: "daily fee level" },
      { dot: "bg-amber-300", name: "failed_tx_rate", note: "friction signal" },
    ],
    description:
      "Gold tells you what actually happened on-chain on that date.",
  },
  {
    key: "meta",
    title: "Meta",
    titleClass: "text-cyan-300",
    tagClass: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
    subtitle: "WHAT IT MEANS",
    glowClass:
      "bg-[radial-gradient(ellipse_at_top_left,rgba(0,212,255,0.07),transparent_60%)]",
    fields: [
      { dot: "bg-cyan-300", name: "status.label", note: "published regime" },
      { dot: "bg-cyan-300", name: "confidence_score", note: "evidence strength" },
      { dot: "bg-cyan-300", name: "regime.drivers", note: "why the label fired" },
      { dot: "bg-cyan-300", name: "status.one_liner", note: "plain-language read" },
    ],
    description:
      "Meta tells you what the current chain state means right now.",
  },
  {
    key: "derived",
    title: "Derived",
    titleClass: "text-emerald-300",
    tagClass: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    subtitle: "HOW IT IS TRENDING",
    glowClass:
      "bg-[radial-gradient(ellipse_at_top_left,rgba(52,211,153,0.06),transparent_60%)]",
    fields: [
      { dot: "bg-emerald-300", name: "metric__ma7", note: "short trend" },
      { dot: "bg-emerald-300", name: "metric__ma30", note: "medium baseline" },
      { dot: "bg-emerald-300", name: "z_score", note: "historical position" },
      { dot: "bg-emerald-300", name: "percentile_180d", note: "relative context" },
    ],
    description:
      "Derived tells you how the underlying state is moving through time.",
  },
] as const;

const DILIGENCE_STEPS = [
  {
    title: "Inspect sample artifacts",
    body: "Open real published JSON before paying. Confirm the structure is understandable and useful.",
  },
  {
    title: "Read the methodology boundary",
    body: "See what is public, what is independently verifiable, and where the intentionally non-public boundary begins.",
  },
  {
    title: "Check the track record",
    body: "Inspect the published archive to verify continuity, stability, and historical traceability.",
  },
  {
    title: "Match to your workflow",
    body: "Decide whether you want this for notebooks, dashboards, API pulls, or periodic regime review.",
  },
] as const;

function confidenceBandClass(band?: string | null) {
  const base =
    "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold";

  switch ((band ?? "").toLowerCase()) {
    case "good":
      return `${base} border-emerald-400/20 bg-emerald-400/10 text-emerald-300`;
    case "caution":
      return `${base} border-amber-400/20 bg-amber-400/10 text-amber-300`;
    default:
      return `${base} border-slate-600/30 bg-slate-600/20 text-slate-500`;
  }
}

function ChainCard({ row }: { row: SurfaceRowDisplay }) {
  return (
    <Link
      href={row.href}
      className="group flex flex-col rounded-2xl border border-cyan-300/18 bg-gradient-to-b from-[#17324f] via-[#10233a] to-[#0a1627] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.38),0_0_0_1px_rgba(34,211,238,0.03)] transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-300/28 hover:shadow-[0_22px_52px_rgba(0,0,0,0.45),0_0_28px_rgba(34,211,238,0.10)]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[22px] font-extrabold tracking-[-0.02em] text-white">
            {row.label}
          </div>
          <div className="mt-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-cyan-300/85">
            {row.name}
          </div>
        </div>
        <span className={row.statusClass}>{row.statusText}</span>
      </div>

      <div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300/75">
        REGIME
      </div>
      <div className="mb-3">
        <RegimeBadge label={row.publishedRegime ?? "UNKNOWN/DEGRADED"} />
      </div>

      <div className="mb-3 rounded-xl border border-white/6 bg-black/20 p-3">
        <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
          CONFIDENCE
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[28px] font-extrabold tracking-tight text-white">
            {row.confidenceValue}
          </span>
          <span className={confidenceBandClass(row.confidenceBand)}>{row.confidenceBand}</span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/5 bg-black/20 p-2.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
            AS OF
          </div>
          <div className="mt-1 break-words font-mono text-[12px] font-semibold text-white">
            {row.asOf}
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-black/20 p-2.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
            LAG
          </div>
          <div className="mt-1 font-mono text-[12px] font-semibold text-white">
            {row.lagValue}
          </div>
        </div>
      </div>

      <div className="mt-auto font-mono text-[10px] text-slate-500 transition-colors group-hover:text-cyan-300">
        Open chain detail →
      </div>
    </Link>
  );
}

export default function Hero({
  historyDepthDays,
  rows = [],
  lastDataLoad,
}: HeroProps) {
  const publishedDays =
    typeof historyDepthDays === "number" && Number.isFinite(historyDepthDays)
      ? String(historyDepthDays)
      : "—";

  return (
    <section className="w-full">
      {/* Level 1 */}
      <div className="mb-12 border-b border-white/6 pb-6 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <div className="font-mono text-[28px] font-bold leading-none text-cyan-400">
                {publishedDays}
              </div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                PUBLISHED DAYS
              </div>
            </div>

            <div>
              <div className="font-mono text-[14px] font-medium leading-none text-white">
                {lastDataLoad ?? "—"}
              </div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                LAST DATA LOAD
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="h-[6px] w-[6px] rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                  LIVE
                </span>
              </div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
                since Dec 2024
              </div>
            </div>
          </div>

          <Link
            href="/track-record"
            className="font-mono text-[11px] font-semibold text-cyan-400 hover:underline"
          >
            Browse track record →
          </Link>
        </div>
      </div>

      {/* Level 2 */}
      <div className="relative mb-12 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#04080F_0%,#061420_100%)] px-1 py-1">
        <div className="pointer-events-none absolute -right-16 -top-24 h-[900px] w-[900px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.12),transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(0,255,136,0.06),transparent_65%)]" />

        <div className="relative px-2 py-4 sm:px-4 sm:py-6">
          <div className="relative mb-3 inline-block">
            <div className="text-[3.2rem] font-black uppercase leading-none tracking-[0.25em] text-white [text-shadow:0_0_80px_rgba(0,212,255,0.5),0_0_160px_rgba(0,212,255,0.2)] sm:text-[4rem] lg:text-[6rem]">
              URD ATLAS
            </div>
          </div>

          <h1 className="mb-6 text-[2rem] font-bold leading-[1.0] tracking-[-0.03em] text-white sm:text-[2.2rem] lg:text-[2.6rem]">
            <span className="block">Daily JSON that separates</span>
            <span className="block text-cyan-400">noise from structural change</span>
          </h1>

          <div className="flex max-w-[48ch] items-start gap-[14px]">
            <span className="mt-[6px] h-[18px] w-[2px] shrink-0 bg-cyan-400" />
            <p className="text-[17px] leading-[1.9] text-slate-400">
              Urd Atlas ingests daily on-chain data from AWS Public Blockchain Data, runs it
              through a deterministic classification pipeline, and publishes three JSON files per
              chain — Gold, Meta, and Derived — available via API and inspectable on this site.
            </p>
          </div>
        </div>
      </div>

      {/* Level 3 */}
      <div className="mb-12 grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <ChainCard key={row.chain} row={row} />
        ))}
      </div>

      {/* Level 4 */}
      <div className="mb-12">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
          THE THREE JSON FILES
        </div>
        <p className="mb-5 text-[14px] leading-[1.8] text-slate-400">
          Gold tells you what happened. Meta tells you what it means. Derived tells you how it is
          trending.
        </p>

        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
          {JSON_FILE_CARDS.map((card) => (
            <div
              key={card.key}
              className={`relative overflow-hidden rounded-2xl border border-white/7 bg-[#080F1C] p-6 ${card.glowClass}`}
            >
              <div
                className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold ${card.tagClass}`}
              >
                {card.title}
              </div>

              <div className={`mt-4 text-[22px] font-extrabold ${card.titleClass}`}>
                {card.title}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
                {card.subtitle}
              </div>
              <p className="mt-3 text-[13px] leading-[1.7] text-slate-400">{card.description}</p>

              <div className="mt-5 space-y-2.5">
                {card.fields.map((field) => (
                  <div key={field.name} className="flex items-start gap-2.5">
                    <span className={`mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full ${field.dot}`} />
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-slate-300">{field.name}</div>
                      <div className="font-mono text-[10px] text-slate-600">{field.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Level 5 */}
      <details className="mb-12 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.03] px-6 py-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-400">
              PRE-PURCHASE DUE DILIGENCE
            </span>
            <span className="ml-3 text-[13px] font-semibold text-white">
              Get started in 15 minutes — without subscribing.
            </span>
          </div>
          <span className="shrink-0 font-mono text-[11px] text-cyan-400">Show →</span>
        </summary>

        <div className="mt-6 border-t border-white/6 pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {DILIGENCE_STEPS.map((step, index) => (
              <div
                key={step.title}
                className="rounded-xl border border-white/7 bg-black/20 px-4 py-4"
              >
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/25 bg-black font-mono text-[11px] font-bold text-cyan-400">
                    {index + 1}
                  </div>
                  <div className="text-[14px] font-semibold text-white">{step.title}</div>
                </div>
                <div className="text-[12px] leading-[1.7] text-slate-400">{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Level 6 */}
      <div className="w-full">
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] px-5 py-4 shadow-[0_0_0_1px_rgba(0,212,255,0.12),0_0_32px_rgba(0,212,255,0.06),inset_0_1px_0_rgba(0,212,255,0.10)]">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-cyan-400"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <p className="text-[13px] leading-[1.7] text-slate-300">
            <span className="font-bold text-white">Never a weak label presented as strong.</span>{" "}
            When evidence is insufficient, the model publishes{" "}
            <code className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">
              UNKNOWN/DEGRADED
            </code>{" "}
            instead of guessing. You always know what you are working with.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })
            }
            className="inline-flex items-center rounded-lg bg-cyan-400 px-8 py-3 font-mono text-[13px] font-black text-[#04080F] shadow-[0_0_0_1px_rgba(34,211,238,0.5),0_0_20px_rgba(34,211,238,0.3),0_4px_15px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-[2px] hover:shadow-[0_0_0_1px_rgba(34,211,238,0.7),0_0_40px_rgba(34,211,238,0.45),0_8px_24px_rgba(0,0,0,0.55)]"
          >
            See plans →
          </button>

          <button
            type="button"
            onClick={() =>
              document.getElementById("latest-surface")?.scrollIntoView({ behavior: "smooth" })
            }
            className="inline-flex items-center rounded-lg border border-white/10 bg-transparent px-6 py-[11px] font-mono text-[13px] font-medium text-slate-400 transition-all hover:border-cyan-400/25 hover:text-slate-300"
          >
            Inspect free surface
          </button>
        </div>

        <div className="flex flex-wrap gap-5 font-mono text-[11px] text-slate-600">
          <Link href="/api-docs/schema" className="hover:text-slate-300">
            JSON schema →
          </Link>
          <a href="#what-is-modal" className="hover:text-slate-300">
            What this is
          </a>
          <a href="#boundary-modal" className="hover:text-slate-300">
            Interpretation boundary
          </a>
          <Link href="/methodology" className="hover:text-slate-300">
            Full methodology
          </Link>
        </div>
      </div>
    </section>
  );
}