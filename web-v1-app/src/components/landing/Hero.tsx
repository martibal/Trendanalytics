// src/components/landing/Hero.tsx
// Drop-in replacement. Requires no new dependencies.
"use client";

import Link from "next/link";

const CHAINS = ["BTC", "ETH", "ARB", "BASE"] as const;

const WHAT_POINTS = [
  {
    label: "Daily JSON via API",
    detail: "Gold, Meta, and Derived files for each chain — delivered the same day they publish.",
  },
  {
    label: "Regime label + confidence",
    detail: "STABLE, HEATING, CONGESTED, or CHEAP — gated by a 0–1 evidence score.",
  },
  {
    label: "Driver attribution",
    detail: "The metrics behind each label, with z-scores and percentiles.",
    highlight: "So you know why, not just what.",
  },
  {
    label: "Verified historical archive",
    detail: "90 days on Basic, 365 days on Pro. Every past label is hash-anchored.",
  },
];

type HeroProps = { historyDepthDays?: number | null; lastDataLoad?: string | null };

export default function Hero({ historyDepthDays, lastDataLoad }: HeroProps) {
  const days = historyDepthDays;

  return (
    <div className="mb-14">
      {/* Trust bar */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-slate-400">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            <span className="font-semibold text-white">Published every day since December 2024</span>
          </span>
          <span className="hidden text-white/12 sm:inline">|</span>
          <span>
            <span className="font-bold text-cyan-300">{days ?? "—"}</span> published days
          </span>
          <span className="hidden text-white/12 sm:inline">|</span>
          <span>4 chains · Gold · Meta · Derived</span>
          {lastDataLoad && (
            <>
              <span className="hidden text-white/12 sm:inline">|</span>
              <span className="rounded border border-white/8 bg-white/[0.04] px-2 py-0.5 text-slate-400">
                Last data load: {lastDataLoad}
              </span>
            </>
          )}
        </div>
        <Link
          href="/track-record"
          className="shrink-0 font-mono text-[11px] font-semibold text-cyan-300 hover:underline"
        >
          Browse track record →
        </Link>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        {/* LEFT */}
        <div>
          {/* Eyebrow */}
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">
              On-chain regime classification
            </span>
            <span className="text-white/12">·</span>
            <div className="flex gap-1.5">
              {CHAINS.map((c) => (
                <span
                  key={c}
                  className="rounded border border-cyan-400/25 bg-cyan-400/8 px-2 py-0.5 font-mono text-[9px] font-black tracking-widest text-cyan-300"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Brand name */}
          <div className="relative mb-4 inline-flex items-center gap-4">
            <div className="pointer-events-none absolute inset-x-4 -bottom-2 h-8 rounded-full bg-cyan-400/15 blur-2xl" />
            <span className="relative text-[3rem] font-black uppercase leading-none tracking-[0.22em] bg-gradient-to-b from-cyan-100 via-cyan-200 to-cyan-400 bg-clip-text text-transparent sm:text-[3.8rem] lg:text-[4.8rem]">
              Urd Atlas
            </span>
            <span className="hidden h-px w-14 bg-gradient-to-r from-cyan-200/80 via-cyan-300/30 to-transparent sm:block" />
          </div>

          {/* H1 */}
          <h1 className="mb-7 text-[1.9rem] font-black leading-[1.05] tracking-[-0.03em] text-white sm:text-[2.4rem] lg:text-[3rem]">
            Separate blockchain{" "}
            <span className="bg-gradient-to-br from-cyan-200 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
              noise from structural change
            </span>
          </h1>

          {/* Lead */}
          <p className="mb-9 max-w-[54ch] text-[17px] leading-[1.85] text-slate-300 sm:text-[18px]">
            Daily regime labels, confidence scores, and driver attribution for BTC, ETH, ARB, and
            BASE — delivered as ready-to-use JSON. Everything you need to understand current chain
            state, nothing you have to build yourself.
          </p>

          {/* Gate box */}
          <div className="mb-7 flex items-start gap-3 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] px-4 py-3.5">
            <span className="mt-0.5 shrink-0 text-[15px]">🔒</span>
            <p className="text-[13px] leading-[1.7] text-slate-300">
              <span className="font-bold text-white">Never a weak label presented as strong.</span>{" "}
              When evidence is insufficient, the model publishes{" "}
              <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[11px] text-emerald-300">
                UNKNOWN/DEGRADED
              </code>{" "}
              instead of guessing. You always know what you are working with.
            </p>
          </div>

          {/* CTA */}
          <div className="mb-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center rounded-lg bg-cyan-400 px-7 py-3 font-mono text-sm font-black text-[#04080F] shadow-[0_0_24px_rgba(34,211,238,0.28)] transition hover:shadow-[0_0_36px_rgba(34,211,238,0.42)] hover:-translate-y-px"
            >
              See plans →
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById("latest-surface")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.03] px-5 py-3 font-mono text-sm font-medium text-slate-400 transition hover:border-cyan-400/25 hover:text-slate-200"
            >
              Inspect free surface
            </button>
          </div>

          <div className="flex flex-wrap gap-5 font-mono text-[11px] text-slate-500">
            <Link href="/api-docs/schema" className="hover:text-slate-300">JSON schema →</Link>
            <a href="#what-is-modal" className="hover:text-slate-300">What this is</a>
            <a href="#boundary-modal" className="hover:text-slate-300">Interpretation boundary</a>
            <Link href="/methodology" className="hover:text-slate-300">Full methodology</Link>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-4">
          {/* Archive stat */}
          <div className="rounded-2xl border border-cyan-400/18 bg-gradient-to-br from-cyan-400/[0.08] to-transparent p-6">
            <div className="mb-2 font-mono text-[9px] font-black uppercase tracking-[0.28em] text-cyan-300/60">
              Published archive
            </div>
            <div className="flex items-end gap-2">
              <span className="text-[64px] font-black leading-none tracking-[-0.04em] text-white">
                {days ?? "—"}
              </span>
              <span className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                days
              </span>
            </div>
            <div className="mt-1 font-mono text-[10px] text-slate-600">
              every day · no gaps · since December 2024
            </div>
            <p className="mt-4 text-[12px] leading-[1.75] text-slate-300">
              Every label is inspectable, hash-anchored, and verifiable. Not a reconstruction — the
              same published artifact subscribers receive in their daily JSON.
            </p>
            <Link
              href="/track-record"
              className="mt-3 inline-block font-mono text-[11px] font-semibold text-cyan-300 hover:underline"
            >
              Browse the track record →
            </Link>
          </div>

          {/* What you get */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
            <div className="mb-4 font-mono text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">
              What subscribers get
            </div>
            <div className="space-y-3.5">
              {WHAT_POINTS.map(({ label, detail, highlight }) => (
                <div key={label} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/60" />
                  <div>
                    <div className="text-[12px] font-semibold text-white">{label}</div>
                    <p className="mt-0.5 text-[11px] leading-[1.6] text-slate-500">{detail}</p>
                    {highlight && (
                      <p className="mt-0.5 font-mono text-[10px] font-bold text-cyan-300">
                        {highlight}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
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
                className="flex items-center justify-between rounded-xl border border-white/7 bg-white/[0.02] px-4 py-2.5 font-mono text-[11px] text-slate-400 transition hover:border-cyan-400/25 hover:text-slate-200"
              >
                {item.label}
                <span className="text-[10px] text-slate-600">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
