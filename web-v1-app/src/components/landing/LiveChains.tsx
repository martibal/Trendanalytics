import Link from "next/link";
import RegimeBadge from "@/components/RegimeBadge";
import type { SurfaceRowDisplay } from "@/lib/landingSurface";

type LiveChainsProps = {
  rows: SurfaceRowDisplay[];
};

export default function LiveChains({ rows }: LiveChainsProps) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
            Live chain surface
          </div>
          <h2 className="mt-1 text-3xl font-semibold">Current published surface</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
            Open any chain to inspect the current label, confidence, scorecard, and drivers.
          </p>
        </div>
        {/* <Link
          href="/chains"
          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
        >
          Browse all chains →
        </Link> */}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <Link
            key={row.chain}
            href={row.href}
            className="group rounded-3xl border bg-card p-5 shadow-sm transition hover:border-cyan-500/30 hover:bg-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-semibold tracking-tight text-white">{row.label}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {row.name}
                </div>
              </div>
              <span className={row.statusClass}>{row.status}</span>
            </div>

            <div className="mt-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Published regime
              </div>
              <div className="mt-3">
                {row.publishedRegime ? (
                  <RegimeBadge label={row.publishedRegime} />
                ) : (
                  <span className="text-sm text-muted-foreground">No published label</span>
                )}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{row.takeaway}</p>
            </div>

            <div className="mt-5 rounded-2xl border bg-background/50 p-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Confidence
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-2xl font-semibold text-white">{row.confidenceValue}</div>
                <span className={row.confidenceClass}>{row.confidenceBand}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-background/40 p-3">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  As of
                </div>
                <div className="mt-1 text-sm font-medium text-white">{row.asOf}</div>
              </div>
              <div className="rounded-xl border bg-background/40 p-3">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Lag
                </div>
                <div className="mt-1 text-sm font-medium text-white">{row.lagValue}</div>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground transition group-hover:text-cyan-200">
              See why →
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
