// src/components/landing/LiveChains.tsx
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
        className={`pointer-events-none absolute top-full z-30 mt-2 hidden w-72 rounded-xl border border-cyan-500/20 bg-[#06101e] p-3 text-[11px] leading-[1.65] text-slate-300 shadow-2xl group-hover/tip:block group-focus-within/tip:block ${
          align === "right" ? "right-0" : "left-0"
        }`}
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
        className={`pointer-events-none absolute top-full z-30 mt-2 hidden w-72 rounded-xl border border-cyan-500/20 bg-[#06101e] p-3 text-[11px] leading-[1.65] text-slate-300 shadow-2xl group-hover/tip:block group-focus-within/tip:block ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        {tooltip}
      </span>
    </span>
  );
}

export default function LiveChains({ rows }: { rows: SurfaceRowDisplay[] }) {
  return (
    <section id="latest-surface" className="mt-10 scroll-mt-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-500">
            Latest published chain surface
          </div>
          <h2 className="text-3xl font-black leading-tight tracking-[-0.02em] text-white">
            The current published regime, per chain.
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-[1.8] text-slate-300">
            This is what the pipeline published most recently — regime label, confidence, and
            freshness metadata for each chain. Exactly what subscribers receive in their daily reference data JSON.
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

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <Link
            key={row.chain}
            href={row.href}
            className="group/card relative flex flex-col rounded-2xl border border-cyan-300/18 bg-gradient-to-b from-[#132640] via-[#0F1E34] to-[#0A1526] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.38),0_0_0_1px_rgba(34,211,238,0.03)] transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-300/28 hover:shadow-[0_22px_52px_rgba(0,0,0,0.45),0_0_28px_rgba(34,211,238,0.10)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-2xl bg-gradient-to-b from-cyan-300/7 to-transparent" />

            <div className="relative mb-5 flex items-start justify-between gap-2 border-b border-cyan-300/10 pb-4">
              <div>
                <div className="text-[22px] font-black tracking-[-0.02em] text-white">
                  {row.label}
                </div>
                <div className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  {row.name}
                </div>
              </div>
              <Tooltip tooltip={row.statusTooltip} align="right">
                <span className={row.statusClass}>{row.statusText}</span>
              </Tooltip>
            </div>

            <div className="relative">
              <div className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                Published regime
              </div>
              {row.publishedRegime ? (
                <Tooltip tooltip={row.publishedRegimeTooltip}>
                  <span className="inline-flex">
                    <RegimeBadge label={row.publishedRegime} />
                  </span>
                </Tooltip>
              ) : (
                <span className="text-sm text-slate-500">No published label</span>
              )}
              <p className="mt-1.5 text-[11px] leading-[1.55] text-slate-300">{row.takeaway}</p>
              {row.degradationNote ? (
                <Tooltip tooltip={row.degradationTooltip ?? row.degradationNote}>
                  <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/8 px-3 py-2 font-mono text-[10px] leading-[1.55] text-amber-200">
                    {row.degradationNote}
                  </div>
                </Tooltip>
              ) : null}
            </div>

            <BlockTooltip tooltip={row.confidenceTooltip}>
              <div className="mt-4 rounded-xl border border-white/7 bg-[#091423] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-slate-400">
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

            <div className="mt-2 grid grid-cols-2 gap-2">
              <BlockTooltip tooltip={row.asOfTooltip}>
                <div className="rounded-lg border border-white/7 bg-[#091423] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
                    As of
                  </div>
                  <div className="mt-1 font-mono text-[12px] font-semibold text-white">
                    {row.asOf}
                  </div>
                </div>
              </BlockTooltip>
              <BlockTooltip tooltip={row.lagTooltip} align="right">
                <div className="rounded-lg border border-white/7 bg-[#091423] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
                    Lag
                  </div>
                  <div className="mt-1 font-mono text-[12px] font-semibold text-white">
                    {row.lagValue}
                  </div>
                </div>
              </BlockTooltip>
            </div>

            <div className="mt-4 font-mono text-[10px] font-medium text-cyan-300/80 transition group-hover/card:text-cyan-300">
              Open chain detail →
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}