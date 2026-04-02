import Link from "next/link";
import type { ReactNode } from "react";
import RegimeBadge from "@/components/RegimeBadge";
import type { SurfaceRowDisplay } from "@/lib/landingSurface";

type LiveChainsProps = {
  rows: SurfaceRowDisplay[];
};

function HoverInfo({
  tooltip,
  children,
  wrapperClassName = "inline-flex",
  panelClassName = "left-0",
}: {
  tooltip: string;
  children: ReactNode;
  wrapperClassName?: string;
  panelClassName?: string;
}) {
  return (
    <span className={`group/hover relative ${wrapperClassName} cursor-help`}>
      {children}
      <span
        className={`pointer-events-none absolute top-full z-20 mt-2 hidden w-80 rounded-2xl border border-cyan-500/20 bg-[#071322] p-3 text-[11px] leading-5 text-slate-200 shadow-2xl shadow-cyan-950/40 group-hover/hover:block group-focus-within/hover:block ${panelClassName}`}
      >
        {tooltip}
      </span>
    </span>
  );
}

export default function LiveChains({ rows }: LiveChainsProps) {
  return (
    <section id="latest-surface" className="mt-10 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
            Latest published chain surface
          </div>
          <h2 className="mt-1 text-3xl font-semibold">Current published surface</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
            Open any chain to inspect the latest published label, confidence, scorecard, and drivers.
          </p>
          <p className="mt-1 max-w-4xl text-xs leading-6 text-slate-400">
            Hover over the regime badge, confidence, as-of date, lag, and status for quick explanations.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <Link
            key={row.chain}
            href={row.href}
            className="group/card rounded-3xl border bg-card p-5 shadow-sm transition hover:border-cyan-500/30 hover:bg-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-semibold tracking-tight text-white">{row.label}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {row.name}
                </div>
              </div>

              <HoverInfo tooltip={row.statusTooltip} panelClassName="right-0 left-auto">
                <span className={row.statusClass}>{row.statusText}</span>
              </HoverInfo>
            </div>

            <div className="mt-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Published regime
              </div>
              <div className="mt-3">
                {row.publishedRegime ? (
                  <HoverInfo tooltip={row.publishedRegimeTooltip}>
                    <span className="inline-flex">
                      <RegimeBadge label={row.publishedRegime} />
                    </span>
                  </HoverInfo>
                ) : (
                  <span className="text-sm text-muted-foreground">No published label</span>
                )}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{row.takeaway}</p>
            </div>

            <HoverInfo tooltip={row.confidenceTooltip} wrapperClassName="mt-5 block">
              <div className="rounded-2xl border bg-background/50 p-3">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Confidence
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-2xl font-semibold text-white">{row.confidenceValue}</div>
                  <span className={row.confidenceClass}>{row.confidenceBand}</span>
                </div>
              </div>
            </HoverInfo>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <HoverInfo tooltip={row.asOfTooltip} wrapperClassName="block">
                <div className="rounded-xl border bg-background/40 p-3">
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    As of
                  </div>
                  <div className="mt-1 text-sm font-medium text-white">{row.asOf}</div>
                </div>
              </HoverInfo>

              <HoverInfo
                tooltip={row.lagTooltip}
                wrapperClassName="block"
                panelClassName="right-0 left-auto"
              >
                <div className="rounded-xl border bg-background/40 p-3">
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Lag
                  </div>
                  <div className="mt-1 text-sm font-medium text-white">{row.lagValue}</div>
                </div>
              </HoverInfo>
            </div>

            <div className="mt-4 text-xs text-muted-foreground transition group-hover/card:text-cyan-200">
              Open chain detail →
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
