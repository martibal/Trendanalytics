// src/components/landing/LiveChains.tsx
// Drop-in replacement. No new dependencies.
import Link from "next/link";
import type { ReactNode } from "react";
import RegimeBadge from "@/components/RegimeBadge";
import type { SurfaceRowDisplay } from "@/lib/landingSurface";

function Tooltip({
  tooltip,
  children,
  align = "left",
}: {
  tooltip: string;
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <span className="group/tip relative inline-flex cursor-help">
      {children}
      <span
        className={`pointer-events-none absolute top-full z-30 mt-2 hidden w-72 rounded-xl border border-cyan-500/20 bg-[#06101e] p-3 text-[11px] leading-[1.65] text-slate-300 shadow-2xl group-hover/tip:block group-focus-within/tip:block ${align === "right" ? "right-0" : "left-0"}`}
      >
        {tooltip}
      </span>
    </span>
  );
}

function BlockTooltip({
  tooltip,
  children,
  align = "left",
}: {
  tooltip: string;
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <span className="group/tip relative block cursor-help">
      {children}
      <span
        className={`pointer-events-none absolute top-full z-30 mt-2 hidden w-72 rounded-xl border border-cyan-500/20 bg-[#06101e] p-3 text-[11px] leading-[1.65] text-slate-300 shadow-2xl group-hover/tip:block group-focus-within/tip:block ${align === "right" ? "right-0" : "left-0"}`}
      >
        {tooltip}
      </span>
    </span>
  );
}

export default function LiveChains({ rows }: { rows: SurfaceRowDisplay[] }) {
  return (
    <section id="latest-surface" className="mt-10 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-500 mb-2">
            Latest published chain surface
          </div>
          <h2 className="text-3xl font-black tracking-[-0.02em] text-white leading-tight">
            The current published regime, per chain.
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-[1.8] text-slate-400">
            This is what the pipeline published most recently — regime label, confidence, and
            freshness metadata for each chain. Exactly what subscribers receive in their daily JSON.
            Hover any field for a plain-language explanation.
          </p>
        </div>
        <Link
          href="/track-record"
          className="shrink-0 font-mono text-[11px] font-semibold text-cyan-400 hover:underline"
        >
          Full track record →
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <Link
            key={row.chain}
            href={row.href}
            className="group/card flex flex-col rounded-2xl border border-white/7 bg-[#080F1C] p-5 transition-all duration-150 hover:border-cyan-500/25 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,212,255,0.07)]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-5">
              <div>
                <div className="text-[22px] font-black tracking-[-0.02em] text-white">
                  {row.label}
                </div>
                <div className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500 mt-0.5">
                  {row.name}
                </div>
              </div>
              <Tooltip tooltip={row.statusTooltip} align="right">
                <span className={row.statusClass}>{row.statusText}</span>
              </Tooltip>
            </div>

            {/* Regime */}
            <div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-500/80 mb-1.5">
                Published regime
              </div>
              {row.publishedRegime ? (
                <Tooltip tooltip={row.publishedRegimeTooltip}>
                  <span className="inline-flex">
                    <RegimeBadge label={row.publishedRegime} />
                  </span>
                </Tooltip>
              ) : (
                <span className="text-sm text-slate-600">No published label</span>
              )}
              <p className="mt-1.5 text-[11px] leading-[1.55] text-slate-500">{row.takeaway}</p>
            </div>

            {/* Confidence */}
            <BlockTooltip tooltip={row.confidenceTooltip}>
              <div className="mt-4 rounded-xl border border-white/6 bg-black/20 p-3">
                <div className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-slate-600">
                  Confidence
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[22px] font-black tracking-tight text-white">
                    {row.confidenceValue}
                  </span>
                  <span className={row.confidenceClass}>{row.confidenceBand}</span>
                </div>
              </div>
            </BlockTooltip>

            {/* As of / Lag */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <BlockTooltip tooltip={row.asOfTooltip}>
                <div className="rounded-lg border border-white/5 bg-black/20 p-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-600">
                    As of
                  </div>
                  <div className="mt-1 font-mono text-[12px] font-semibold text-white">
                    {row.asOf}
                  </div>
                </div>
              </BlockTooltip>
              <BlockTooltip tooltip={row.lagTooltip} align="right">
                <div className="rounded-lg border border-white/5 bg-black/20 p-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-600">
                    Lag
                  </div>
                  <div className="mt-1 font-mono text-[12px] font-semibold text-white">
                    {row.lagValue}
                  </div>
                </div>
              </BlockTooltip>
            </div>

            <div className="mt-4 font-mono text-[10px] font-medium text-slate-600 transition group-hover/card:text-cyan-400">
              Open chain detail →
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
