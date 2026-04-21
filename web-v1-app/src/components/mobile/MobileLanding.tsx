// src/components/mobile/MobileLanding.tsx
import Link from "next/link";
import RegimeBadge from "@/components/RegimeBadge";
import type { SurfaceRowDisplay } from "@/lib/landingSurface";

type MobileLandingProps = {
  rows: SurfaceRowDisplay[];
  historyDepthDays?: number | null;
  lastUpdatedLabel?: string | null;
};

const jsonCards = [
  {
    title: "Gold",
    body: "Raw daily observations in native units. The authoritative source behind everything else.",
    href: "/api-docs/schema#gold",
    className: "border-yellow-500/20 bg-yellow-500/5",
  },
  {
    title: "Meta",
    body: "The core product: regime label, confidence, scorecard, and drivers in reusable JSON.",
    href: "/api-docs/schema#meta",
    className: "border-purple-500/20 bg-purple-500/5",
  },
  {
    title: "Derived",
    body: "MA7 and MA30 trend series for every Gold metric. Useful for persistence and chart context.",
    href: "/api-docs/schema#derived",
    className: "border-blue-500/20 bg-blue-500/5",
  },
] as const;

const nextLinks = [
  { title: "Q&A", body: "Definitions, thresholds, confidence, and why the labels mean what they mean.", href: "/faq" },
  { title: "Methodology", body: "Read the full model logic, thresholds, and interpretation boundary.", href: "/methodology" },
  { title: "Track Record", body: "Inspect what was actually published over time, not just the latest row.", href: "/track-record" },
  { title: "JSON Schema", body: "See every field in Gold, Meta, and Derived before you subscribe.", href: "/api-docs/schema" },
] as const;

export default function MobileLanding({ rows, historyDepthDays, lastUpdatedLabel }: MobileLandingProps) {
  const days = historyDepthDays;

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 lg:hidden">

      {/* ── Hero card ── */}
      <section className="overflow-hidden rounded-3xl border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(2,8,23,0.98),rgba(3,15,30,0.96))] p-5 shadow-[0_20px_60px_rgba(2,12,27,0.45)]">

        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]" />
          Daily chain-state JSON
        </div>

        {lastUpdatedLabel ? (
          <div className="mt-3 inline-flex items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-medium text-cyan-50">
            Last data load: {lastUpdatedLabel}
          </div>
        ) : null}

        <h1 className="mt-4 text-[2.1rem] font-black leading-[1.0] tracking-[-0.04em] text-white">
          Separating blockchain noise from structural change
        </h1>

        <p className="mt-4 text-[15px] leading-7 text-slate-200">
          Get structured regime labels, confidence scores, and driver context for BTC, ETH, ARB,
          and BASE — delivered daily as ready-to-use JSON. Everything you need to understand
          current chain state, nothing you have to build yourself.
        </p>

        {/* Confidence gate — key differentiator */}
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
          <span className="mt-0.5 shrink-0">🔒</span>
          <p className="text-[12px] leading-[1.7] text-slate-300">
            <span className="font-bold text-white">Never a weak label presented as strong.</span>{" "}
            When evidence is insufficient, the model publishes{" "}
            <code className="rounded bg-white/8 px-1 font-mono text-[11px]">UNKNOWN/DEGRADED</code>{" "}
            instead of guessing.
          </p>
        </div>

        {/* Archive depth — prominent trust signal */}
        <div className="mt-4 rounded-[1.6rem] border border-cyan-400/18 bg-[linear-gradient(135deg,rgba(8,47,73,0.34),rgba(255,255,255,0.03))] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/70">
            Published archive
          </div>
          <div className="mt-2 flex items-end gap-2">
            <div className="text-5xl font-black leading-none tracking-[-0.05em] text-white">{days ?? "—"}</div>
            <div className="pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">days</div>
          </div>
          <p className="mt-2 text-[12px] leading-[1.6] text-slate-300">
            Published every day since December 2024 — no gaps. Every label is hash-anchored
            and inspectable in the track record.
          </p>
          <Link href="/track-record" className="mt-2 inline-flex text-[11px] font-semibold text-cyan-300 hover:underline">
            Browse track record →
          </Link>
        </div>

        {/* Build vs buy */}
        <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 mb-2">Why pay for it</div>
          <p className="text-[12px] leading-[1.7] text-slate-300">
            Building this yourself — data ingestion, normalization, confidence logic, daily
            publication, and archive handling — typically takes weeks of engineering time.{" "}
            <span className="font-bold text-white">Urd Atlas delivers it for $29/mo.</span>
          </p>
        </div>

        {/* Price anchor + primary CTA — visible before fold */}
        <div className="mt-5">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300/80">Start from</span>
            <span className="text-[26px] font-black text-white">$29<span className="text-[13px] font-semibold text-slate-400">/mo</span></span>
            <span className="text-[11px] text-slate-500">· Cancel anytime</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="#plans-mobile"
              className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-black text-[#06111b] shadow-[0_0_20px_rgba(34,211,238,0.25)]"
            >
              See plans →
            </Link>
            <Link
              href="/api-docs/schema"
              className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-200"
            >
              Inspect the JSON schema
            </Link>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Most subscribers make their first API call within 10 minutes of subscribing.
          </p>
        </div>
      </section>


      {/* ── Chain surface ── */}
      <section className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-200">Latest published surface</div>
            <h2 className="mt-1 text-2xl font-semibold text-white">Current chain context</h2>
          </div>
        </div>
        <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-3">
            {rows.map((row) => (
              <Link key={row.chain} href={row.href}
                className="w-[84vw] max-w-[320px] shrink-0 rounded-3xl border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold text-white">{row.label}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{row.name}</div>
                  </div>
                  <span className={row.statusClass}>{row.statusText}</span>
                </div>
                <div className="mt-4">
                  {row.publishedRegime ? (
                    <RegimeBadge label={row.publishedRegime} />
                  ) : (
                    <span className="text-sm text-muted-foreground">No published label</span>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border bg-background/40 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Confidence</div>
                    <div className="mt-1 font-semibold text-white">{row.confidenceValue}</div>
                    <div className="mt-1"><span className={row.confidenceClass}>{row.confidenceBand}</span></div>
                  </div>
                  <div className="rounded-xl border bg-background/40 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">As of</div>
                    <div className="mt-1 font-semibold text-white">{row.asOf}</div>
                    <div className="mt-1 text-xs text-slate-400">Lag {row.lagValue}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-300">{row.takeaway}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>


      {/* ── Plans ── */}
      <section id="plans-mobile" className="mt-6 rounded-3xl border border-cyan-500/15 bg-white/[0.02] p-5">
        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300/75">Subscriber plans</div>
        <h2 className="mt-1 text-2xl font-semibold text-white">Pick the plan that fits your workflow</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">
          Free lets you inspect the public surface on-site. Paid plans unlock direct API access to
          Gold, Meta, and Derived JSON — delivered daily.
        </p>

        {/* Free vs paid explainer */}
        <div className="mt-4 space-y-1.5 text-[11px]">
          {[
            { tier: "Free", desc: "Inspect published surface on-site. No API access.", color: "text-slate-300" },
            { tier: "Basic — $29/mo", desc: "API access · 1 chain · 90-day JSON history.", color: "text-cyan-300" },
            { tier: "Pro — $79/mo", desc: "API access · 4 chains · 365-day JSON history.", color: "text-purple-300" },
          ].map((t) => (
            <div key={t.tier} className="flex items-start gap-2 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
              <span className={`shrink-0 font-black ${t.color}`}>{t.tier}</span>
              <span className="text-slate-500">{t.desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Not sure? Start with Basic — upgrade to Pro at any time. Cancel anytime.
        </p>

        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs leading-6 text-amber-100/85">
          Payments are temporarily inactive while business registration is being finalized.
        </div>

        <div className="mt-4 space-y-3">
          {[
            {
              name: "Free", price: "$0", note: "Inspect the public surface first.",
              detail: "Track record, status, methodology, glossary, thresholds, and schema.",
              href: "/track-record", cta: "Open public surface", isFree: true,
              className: "border-white/10 bg-white/5",
            },
            {
              name: "Basic", price: "$29/mo", note: "One chain · 90-day JSON access.",
              detail: "Best for focused single-chain monitoring, research, and downstream workflow use.",
              href: "/sign-up", cta: "Payments open soon", isFree: false,
              className: "border-cyan-500/25 bg-cyan-500/8",
            },
            {
              name: "Pro", price: "$79/mo", note: "Four chains · 365-day JSON access.",
              detail: `Best for multi-chain monitoring, heavier API use, and broader research workflows. Standard Pro includes 365 days of subscriber API history. The public track record can be longer because it reflects the full published archive.`,
              href: "/sign-up", cta: "Payments open soon", isFree: false,
              className: "border-purple-500/25 bg-purple-500/8",
            },
          ].map((plan) => (
            plan.isFree ? (
              <Link key={plan.name} href={plan.href} className={`block rounded-2xl border p-4 ${plan.className}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-white">{plan.name}</div>
                    <div className="mt-0.5 text-[12px] text-slate-300">{plan.note}</div>
                  </div>
                  <div className="text-lg font-black text-white">{plan.price}</div>
                </div>
                <p className="mt-2 text-[12px] leading-[1.6] text-slate-300">{plan.detail}</p>
                <div className="mt-3 text-sm font-semibold text-cyan-200">{plan.cta} →</div>
              </Link>
            ) : (
              <div key={plan.name} className={`rounded-2xl border p-4 ${plan.className}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-white">{plan.name}</div>
                    <div className="mt-0.5 text-[12px] text-slate-300">{plan.note}</div>
                  </div>
                  <div className="text-lg font-black text-white">{plan.price}</div>
                </div>
                <p className="mt-2 text-[12px] leading-[1.6] text-slate-300">{plan.detail}</p>
                <div className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-500 opacity-70">
                  {plan.cta}
                </div>
              </div>
            )
          ))}
        </div>
      </section>
      {/* ── Three JSON files ── */}
      <section className="mt-6 rounded-3xl border p-5">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-200">The three files</div>
        <h2 className="mt-1 text-2xl font-semibold text-white">Gold, Meta, Derived</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          Meta is the commercial heart of the product. Gold lets you verify inputs.
          Derived gives you smoothed trend context.
        </p>
        <div className="mt-4 space-y-3">
          {jsonCards.map((card) => (
            <Link key={card.title} href={card.href} className={`block rounded-2xl border p-4 ${card.className}`}>
              <div className="text-base font-semibold text-white">{card.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{card.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Go deeper ── */}
      <section className="mt-6 rounded-3xl border p-5">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-cyan-200">Go deeper before subscribing</div>
        <div className="mt-4 space-y-3">
          {nextLinks.map((item) => (
            <Link key={item.title} href={item.href} className="block rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-base font-semibold text-white">{item.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
