import Link from "next/link";

type LandingHeroProps = {
  datasetVersion: string | null;
  publishedAt: string | null;
  methodologyVersion: string | null;
};

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium text-foreground">{value ?? "—"}</div>
    </div>
  );
}

export default function LandingHero(props: LandingHeroProps) {
  const { datasetVersion, publishedAt, methodologyVersion } = props;

  return (
    <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)]">
        <div>
          <div className="text-sm font-medium text-primary">On-chain reference data</div>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Daily reference data for BTC, ETH, ARB, and BASE.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
            Urd Atlas publishes Gold, Derived, and Meta reference layers for Bitcoin, Ethereum,
            Arbitrum, and Base. Meta carries the currently published regime, confidence, freshness, and
            supporting drivers without price, forecasts, or advisory language.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/chains" className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90">
              Open chains
            </Link>
            <Link href="/track-record" className="inline-flex h-11 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted">
              Open track record
            </Link>
            <Link href="/status" className="inline-flex h-11 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted">
              System status
            </Link>
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-background/80 p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Published reference data
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Stat label="Dataset" value={datasetVersion} />
            <Stat label="Published at" value={publishedAt} />
            <Stat label="Methodology" value={methodologyVersion} />
          </div>
        </aside>
      </div>
    </section>
  );
}
