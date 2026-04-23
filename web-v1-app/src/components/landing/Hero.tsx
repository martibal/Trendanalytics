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
    eyebrow: "What happened",
    accent: "text-amber-300",
    border: "border-amber-400/15",
    glow:
      "bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.10),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]",
    body: "Daily factual inputs in native units. This is the authoritative record of observed chain activity on that date.",
    bullets: [
      "tx_count_daily",
      "unique_active_addresses",
      "median_fee_native",
      "failed_tx_rate",
    ],
  },
  {
    key: "meta",
    title: "Meta",
    eyebrow: "What it means",
    accent: "text-cyan-300",
    border: "border-cyan-400/15",
    glow:
      "bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.12),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]",
    body: "The commercial core: published regime, confidence, scorecard, drivers, and concise interpretation in reusable JSON.",
    bullets: [
      "status.label",
      "confidence_score",
      "regime.drivers",
      "status.one_liner",
    ],
  },
  {
    key: "derived",
    title: "Derived",
    eyebrow: "How it is trending",
    accent: "text-emerald-300",
    border: "border-emerald-400/15",
    glow:
      "bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.10),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]",
    body: "Smoothed trend context and relative position through time, so recent change can be read against a more stable baseline.",
    bullets: ["metric__ma7", "metric__ma30", "z_score", "percentile_180d"],
  },
] as const;

const HERO_POINTS = [
  "Daily published JSON for BTC, ETH, ARB, and BASE",
  "Deterministic classification pipeline with explicit confidence",
  "Public track record and inspectable schema before purchase",
] as const;

const TRUST_POINTS = [
  "Weak evidence degrades to UNKNOWN/DEGRADED instead of being dressed up as certainty.",
  "Every subscriber workflow starts from the same published JSON that you can inspect on-site.",
  "The methodology explains the descriptive boundary clearly: current state, not recommendations.",
] as const;

function confidenceBandClass(band?: string | null) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-bold";

  switch ((band ?? "").toLowerCase()) {
    case "good":
      return `${base} border-emerald-400/20 bg-emerald-400/10 text-emerald-300`;
    case "caution":
      return `${base} border-amber-400/20 bg-amber-400/10 text-amber-300`;
    default:
      return `${base} border-slate-600/30 bg-slate-600/20 text-slate-400`;
  }
}

function StatCard({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur-sm">
      <div className="text-[26px] font-black tracking-[-0.03em] text-white">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
        {label}
      </div>
      {note ? <div className="mt-2 text-xs leading-5 text-slate-400">{note}</div> : null}
    </div>
  );
}

function ChainCard({ row }: { row: SurfaceRowDisplay }) {
  return (
    <Link
      href={row.href}
      className="group flex h-full flex-col rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,23,39,0.98),rgba(8,15,28,0.98))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.32)] transition-all duration-200 hover:-translate-y-1 hover:border-cyan-300/25 hover:shadow-[0_28px_70px_rgba(0,0,0,0.42)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[22px] font-bold tracking-[-0.03em] text-white">{row.label}</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/75">
            {row.name}
          </div>
        </div>
        <span className={row.statusClass}>{row.statusText}</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
            Published regime
          </div>
          <div className="mt-2">
            <RegimeBadge label={row.publishedRegime ?? "UNKNOWN/DEGRADED"} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
            Confidence
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[26px] font-black tracking-tight text-white">
              {row.confidenceValue}
            </span>
            <span className={confidenceBandClass(row.confidenceBand)}>{row.confidenceBand}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
            As of
          </div>
          <div className="mt-2 font-mono text-[12px] font-semibold text-white">{row.asOf}</div>
        </div>
        <div className="rounded-2xl border border-white/6 bg-black/20 p-4">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
            Lag
          </div>
          <div className="mt-2 font-mono text-[12px] font-semibold text-white">
            {row.lagValue}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">{row.takeaway}</p>

      <div className="mt-auto pt-4 font-mono text-[11px] text-slate-500 transition-colors group-hover:text-cyan-300">
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
      <div className="relative overflow-hidden border-b border-white/6 bg-[linear-gradient(180deg,#08111F_0%,#0A1730_42%,#08111A_100%)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_20%_18%,rgba(0,212,255,0.18),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(0,255,136,0.07),transparent_35%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.06]" />
        </div>

        <div className="relative mx-auto max-w-[1280px] px-6 pb-20 pt-8 lg:px-8 lg:pb-24 lg:pt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100/90">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.85)]" />
              Daily chain-state JSON
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 font-mono">
                4 chains
              </span>
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 font-mono">
                Hash-anchored track record
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:items-start">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
                Urd Atlas
              </div>

              <h1 className="mt-5 max-w-4xl text-[2.9rem] font-black leading-[0.98] tracking-[-0.05em] text-white sm:text-[3.8rem] xl:text-[4.7rem]">
                Separate blockchain noise from structural change.
              </h1>

              <p className="mt-6 max-w-3xl text-[18px] leading-8 text-slate-300">
                Urd Atlas publishes daily JSON for BTC, ETH, ARB, and BASE so you can read current
                chain state without building your own ingestion, normalization, confidence, and
                regime-classification stack.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <StatCard
                  value={publishedDays}
                  label="Published days"
                  note="Public archive since Dec 2024"
                />
                <StatCard
                  value={lastDataLoad ?? "—"}
                  label="Last data load"
                  note="Rendered in Oslo time"
                />
                <StatCard
                  value="UNKNOWN/DEGRADED"
                  label="Weak evidence policy"
                  note="Low-quality evidence is not promoted"
                />
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("latest-surface")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="inline-flex items-center rounded-full bg-cyan-400 px-6 py-3 text-[13px] font-black text-[#06111B] shadow-[0_10px_30px_rgba(34,211,238,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(34,211,238,0.36)]"
                >
                  See current chain state →
                </button>

                <Link
                  href="/api-docs/schema"
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.05] px-6 py-3 text-[13px] font-semibold text-slate-100 transition hover:border-cyan-300/25 hover:bg-white/[0.08]"
                >
                  Inspect sample JSON
                </Link>
              </div>

              <div className="mt-6 space-y-2.5">
                {HERO_POINTS.map((point) => (
                  <div key={point} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200/70">
                    Product snapshot
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                    Three files. Three jobs.
                  </div>
                </div>
                <Link
                  href="/track-record"
                  className="font-mono text-[11px] font-semibold text-cyan-200 hover:text-cyan-100"
                >
                  Track record →
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {JSON_FILE_CARDS.map((card) => (
                  <div
                    key={card.key}
                    className={`rounded-2xl border p-4 ${card.border} ${card.glow}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className={`text-base font-bold ${card.accent}`}>{card.title}</div>
                        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          {card.eyebrow}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 font-mono text-[10px] text-slate-300">
                        JSON
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{card.body}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {card.bullets.map((bullet) => (
                        <span
                          key={bullet}
                          className="rounded-full border border-white/8 bg-black/15 px-2.5 py-1 font-mono text-[10px] text-slate-300"
                        >
                          {bullet}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-10 max-w-[1200px] px-6 lg:-mt-14">
        <div className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,18,31,0.96),rgba(7,13,24,0.96))] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.30)] backdrop-blur-sm lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
                Why trust the output
              </div>
              <h2 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.03em] text-white sm:text-[1.8rem]">
                The public site is a proof layer, not just a sales layer.
              </h2>
            </div>

            <div className="flex flex-wrap gap-3 text-[11px]">
              <Link href="/methodology" className="text-cyan-300 hover:text-cyan-200">
                Methodology →
              </Link>
              <Link href="/api-docs/schema" className="text-cyan-300 hover:text-cyan-200">
                Schema →
              </Link>
              <Link href="/service" className="text-cyan-300 hover:text-cyan-200">
                Service policy →
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {TRUST_POINTS.map((point) => (
              <div
                key={point}
                className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300"
              >
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="latest-surface" className="mx-auto mt-12 max-w-[1200px] px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
              Latest published surface
            </div>
            <h2 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.03em] text-white sm:text-[2.15rem]">
              Current chain state at a glance
            </h2>
          </div>
          <div className="text-sm leading-6 text-slate-400">
            Open any chain to inspect the full descriptive surface and the latest published row.
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => (
            <ChainCard key={row.chain} row={row} />
          ))}
        </div>
      </div>
    </section>
  );
}