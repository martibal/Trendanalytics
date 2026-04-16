"use client";

import Link from "next/link";

const CHAINS = ["BTC", "ETH", "ARB", "BASE"] as const;
const LABEL_CHIPS = ["STABLE", "HEATING", "CONGESTED", "CHEAP"] as const;

type SubscriberPoint = {
  label: string;
  detail: string;
  highlight?: string;
};

const SUBSCRIBER_POINTS: SubscriberPoint[] = [
  {
    label: "Daily JSON via API",
    detail:
      "Gold, Meta, and Derived files for each chain — delivered the same day they publish.",
  },
  {
    label: "Regime label + confidence",
    detail:
      "STABLE, HEATING, CONGESTED, or CHEAP — gated by a 0–1 evidence score.",
  },
  {
    label: "Driver attribution",
    detail:
      "The metrics behind each label, with z-scores and percentiles.",
    highlight: "So you know why, not just what.",
  },
  {
    label: "Verified historical archive",
    detail:
      "90 days on Basic, 365 days on Pro. Every past label is hash-anchored.",
  },
];

type HeroProps = { historyDepthDays?: number | null };

export default function Hero({ historyDepthDays }: HeroProps) {
  const days = historyDepthDays;

  return (
    <div className="mb-14">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-slate-300">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.75)]" />
            <span className="font-semibold text-white">
              Published every day since December 2024
            </span>
          </span>
          <span className="hidden text-white/15 sm:inline">|</span>
          <span className="font-bold text-cyan-300">{days ?? "—"} published days</span>
          <span className="hidden text-white/15 sm:inline">|</span>
          <span>4 chains · Gold · Meta · Derived</span>
        </div>

        <Link
          href="/track-record"
          className="shrink-0 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 hover:underline"
        >
          Browse track record →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div>
          <div className="mb-6 flex flex-wrap items-center gap-2.5">
            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
              On-chain regime classification
            </span>
            <span className="text-white/15">·</span>
            {CHAINS.map((chain) => (
              <span
                key={chain}
                className="rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black tracking-widest text-cyan-300"
              >
                {chain}
              </span>
            ))}
          </div>

          <div className="relative inline-flex items-center">
            <div className="pointer-events-none absolute inset-x-6 -bottom-3 h-10 rounded-full bg-cyan-400/18 blur-2xl" />
            <div className="relative inline-flex items-center gap-4">
              <span className="text-[2.95rem] font-black uppercase leading-none tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 via-cyan-200 to-cyan-400 sm:text-[3.65rem] lg:text-[4.5rem]">
                Urd Atlas
              </span>
              <span className="hidden h-px w-16 bg-gradient-to-r from-cyan-200/90 via-cyan-300/35 to-transparent sm:block" />
            </div>
          </div>

          <div className="mt-6 max-w-[48rem]">
            <h1 className="text-[2.3rem] font-black leading-[0.95] tracking-[-0.05em] text-white sm:text-[3rem] lg:text-[3.85rem]">
              <span className="block">Daily JSON that separates</span>
              <span className="block">blockchain noise from structural change</span>
            </h1>
          </div>

          <p className="mt-8 max-w-[56ch] text-[18px] leading-[1.85] text-slate-100 sm:text-[20px]">
            Get structured regime labels, confidence scores, and driver context for BTC,
            ETH, ARB, and BASE — delivered daily as ready-to-use JSON. Built for
            researchers, investors, and API-first users who want current chain state
            without building the pipeline themselves.
          </p>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3.5">
            <span className="mt-0.5 shrink-0 text-base">🔒</span>
            <p className="text-[13px] leading-[1.7] text-slate-200">
              <span className="font-bold text-white">Never a weak label presented as strong.</span>{" "}
              When evidence is insufficient, the model publishes{" "}
              <code className="rounded bg-white/8 px-1 py-0.5 font-mono text-[11px] text-slate-100">
                UNKNOWN/DEGRADED
              </code>{" "}
              instead of guessing. You always know what you are working with.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {LABEL_CHIPS.map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-slate-200"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                What subscribers get
              </div>
              <p className="mt-2 text-[13px] leading-[1.75] text-slate-200">
                Gold, Meta, and Derived JSON for each chain — with regime labels,
                confidence, and driver attribution already assembled and documented.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Why pay for it
              </div>
              <p className="mt-2 text-[13px] leading-[1.75] text-slate-200">
                You are paying for the classification layer, confidence gate, daily
                publication, and inspectable archive — not just raw observations.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300/80">
                    Start from
                  </span>
                  <span className="text-[32px] font-black leading-none text-white">
                    $29
                    <span className="text-[15px] font-semibold text-slate-400">/mo</span>
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  One chain · 90-day history · Cancel anytime
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("plans")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="inline-flex items-center rounded-full bg-cyan-400 px-7 py-3 text-sm font-black text-[#06111b] shadow-[0_0_20px_rgba(34,211,238,0.28)] transition hover:bg-cyan-300"
                >
                  See plans →
                </button>
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("latest-surface")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                  Inspect free surface
                </button>
              </div>
            </div>

            <div className="mt-5 border-t border-white/8 pt-5">
              <p className="text-[13px] leading-[1.7] text-slate-300">
                <span className="font-semibold text-white">Building this yourself</span>{" "}
                — data ingestion, chain-relative normalization, confidence logic,
                persistence filter, daily publication, and archive handling — typically
                takes weeks of engineering time.{" "}
                <span className="font-semibold text-white">
                  Urd Atlas delivers it for $29/mo.
                </span>
              </p>
            </div>

            <div className="mt-5 border-t border-white/8 pt-5">
              <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                After subscribing
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="text-cyan-400">1.</span> Create account
                </span>
                <span className="text-white/10">→</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-cyan-400">2.</span> Choose plan + chain
                </span>
                <span className="text-white/10">→</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-cyan-400">3.</span> Generate API key
                </span>
                <span className="text-white/10">→</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-cyan-400">4.</span> Pull JSON in minutes
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Most subscribers make their first successful API call within 10 minutes of
                subscribing.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-6 text-[11px] text-slate-400">
            <Link href="/api-docs/schema" className="transition-colors hover:text-white">
              JSON schema →
            </Link>
            <a href="#what-is-modal" className="transition-colors hover:text-white">
              What this is
            </a>
            <a href="#boundary-modal" className="transition-colors hover:text-white">
              Interpretation boundary
            </a>
            <Link href="/methodology" className="transition-colors hover:text-white">
              Full methodology
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-cyan-400/15 bg-gradient-to-b from-cyan-400/[0.08] to-cyan-400/[0.02] p-6">
            <div className="mb-2 text-[9px] font-black uppercase tracking-[0.28em] text-cyan-300/70">
              Published archive
            </div>
            <div className="flex items-end gap-3">
              <div className="text-[56px] font-black leading-none tracking-[-0.04em] text-white">
                {days ?? "—"}
              </div>
              <div className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                days
              </div>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-500">
              every day · no gaps · since December 2024
            </div>
            <p className="mt-4 text-[12px] leading-[1.7] text-slate-200">
              Every label is inspectable, hash-anchored, and verifiable. Not a
              reconstruction — the same published artifact subscribers receive in their
              daily JSON.
            </p>
            <Link
              href="/track-record"
              className="mt-3 inline-flex text-[11px] font-semibold text-cyan-300 hover:underline"
            >
              Browse the track record →
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">
              What subscribers get
            </div>
            <div className="space-y-3.5">
              {SUBSCRIBER_POINTS.map(({ label, detail, highlight }) => (
                <div key={label} className="flex gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
                  <div>
                    <div className="text-[12px] font-bold text-white">{label}</div>
                    <p className="mt-0.5 text-[11px] leading-[1.6] text-slate-400">
                      {detail}
                    </p>
                    {highlight ? (
                      <p className="mt-0.5 text-[11px] font-bold text-cyan-300">
                        {highlight}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-[11px] font-medium text-slate-300 transition hover:border-cyan-400/30 hover:text-white"
              >
                {item.label}
                <span className="text-[10px] text-slate-500">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}