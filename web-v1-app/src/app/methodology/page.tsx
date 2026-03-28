// src/app/methodology/page.tsx
import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

function KeyValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <span className="font-medium text-foreground">{label}:</span> {value}
    </div>
  );
}

export default async function MethodologyPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  const supportedChains = Array.isArray(dataset?.chains)
    ? dataset.chains
    : Array.isArray(dataset?.supported_chains)
      ? dataset.supported_chains
      : [];

  const supportedGenres = Array.isArray(dataset?.supported_genres)
    ? dataset.supported_genres
    : [];

  const supportedWindows = Array.isArray(dataset?.windows_supported)
    ? dataset.windows_supported
    : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Methodology</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This page explains what the product publishes, how those published
              outputs are intended to be read, and where the main descriptive
              labels come from. It is a methodology and interpretation page, not a
              strategy page.
            </p>
          </div>

          <div className="rounded-xl border px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Published context
            </div>
            <div className="mt-1 font-medium text-foreground">
              Dataset: {dataset?.version ?? "—"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Methodology: {dataset?.methodology_version ?? "—"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Data source: {currentDataSource()}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        <Section title="What this product is actually doing">
          <p>
            TrendAnalytics is a <strong>descriptive on-chain interpretation layer</strong>.
            It does not publish price targets, trade signals, or portfolio advice.
            Instead, it takes published chain metrics and turns them into a more
            readable view of current operating conditions.
          </p>
          <p>
            In practice, the product tries to answer questions like:
          </p>
          <ul className="list-disc pl-5">
            <li>Does the chain currently look closer to normal conditions or a more unusual state?</li>
            <li>Do current readings look more like rising pressure, congestion, cheap conditions, or a stable baseline?</li>
            <li>How much published evidence supports the current label?</li>
            <li>Is the latest row current, delayed, or degraded?</li>
          </ul>
        </Section>

        <Section title="Interpretation boundary">
          <p>
            The entire product is meant to remain descriptive. That means it may
            describe persistence, unusual values, regime context, degraded states,
            confidence, lag, and historical comparison — but it should not imply
            buy, sell, hold, rebalance, hedge, forecasting, or portfolio guidance.
          </p>
          <p>
            A useful way to think about the boundary is: the product explains what
            the published data currently looks like and how that compares with recent
            history. It does not tell the user what to do about it.
          </p>
        </Section>

        <Section title="Published artifact model">
          <p>
            The website reads canonical published artifacts from{" "}
            <InlineCode>/public/data/published/v1</InlineCode>. The public site is
            a presentation layer on top of those artifacts and should not silently
            recompute hidden model state in the browser.
          </p>
          <p>Core published layers are:</p>
          <ul className="list-disc pl-5">
            <li>
              <span className="font-medium text-foreground">Gold</span>: the base
              descriptive published metric layer, such as activity, fees, block
              behavior, and other raw chain measurements.
            </li>
            <li>
              <span className="font-medium text-foreground">Derived</span>: published
              trend-support fields such as rolling averages that help place the latest
              daily reading in short-term and medium-term context.
            </li>
            <li>
              <span className="font-medium text-foreground">Meta</span>: the interpretive
              layer containing status, confidence, scorecard, drivers, freshness context,
              and explanatory structure.
            </li>
          </ul>
          <p>
            The product’s most readable “what does this mean?” surfaces usually come
            from the <InlineCode>meta</InlineCode> layer, but they remain traceable to
            the underlying published Gold and Derived layers.
          </p>
        </Section>

        <Section title="Versioning and traceability">
          <p>
            Published output should always be interpreted in the context of the
            currently published methodology version and the relevant dataset revision
            state.
          </p>
          <div className="grid gap-2">
            <KeyValue label="Dataset version" value={dataset?.version ?? "—"} />
            <KeyValue label="Published at" value={dataset?.published_at ?? "—"} />
            <KeyValue label="Methodology version" value={dataset?.methodology_version ?? "—"} />
            <KeyValue
              label="Supported chains"
              value={supportedChains.length > 0 ? supportedChains.join(", ") : "—"}
            />
            <KeyValue
              label="Supported genres"
              value={supportedGenres.length > 0 ? supportedGenres.join(", ") : "—"}
            />
            <KeyValue
              label="Supported windows"
              value={
                supportedWindows.length > 0
                  ? supportedWindows.map((value) => `${value}d`).join(", ")
                  : "—"
              }
            />
          </div>
          <p>
            Historical changes to methodology should be visible through revision-aware
            surfaces such as Track Record and <Link href="/methodology/previously" className="underline">/methodology/previously</Link>,
            rather than being silently blended away.
          </p>
        </Section>

        <Section title="How to read a chain page">
          <p>
            Each chain page combines the latest published Meta artifact with canonical
            Gold and Derived bundles. The intended reading order is:
          </p>
          <ol className="list-decimal pl-5">
            <li>Check freshness and the as-of date.</li>
            <li>Read the published regime label and one-line summary.</li>
            <li>Check confidence and lag context.</li>
            <li>Inspect scorecard axes and driver rows to see what supports the label.</li>
            <li>Use history and Track Record to compare the present state with earlier published states.</li>
          </ol>
          <p>
            This order matters because confidence, lag, and drivers explain how much
            weight the user should put on the visible label and what kinds of signals
            are currently doing the explanatory work.
          </p>
        </Section>

        <Section title="Regime labels">
          <p>
            The regime label is the product’s compact description of the chain’s
            current published state. It is not a prediction of what happens next.
          </p>
          <ul className="list-disc pl-5">
            <li><strong className="text-foreground">STABLE</strong>: conditions look closer to the chain’s usual recent operating range.</li>
            <li><strong className="text-foreground">HEATING</strong>: pressure appears to be building relative to recent history.</li>
            <li><strong className="text-foreground">CONGESTED</strong>: conditions look materially tighter or more pressured than usual.</li>
            <li><strong className="text-foreground">CHEAP</strong>: conditions look softer, looser, or lower-pressure relative to recent history.</li>
            <li><strong className="text-foreground">UNKNOWN/DEGRADED</strong>: the currently published evidence is not strong enough to support a normal-confidence regime label.</li>
          </ul>
          <p>
            These labels are meant to help a user read the present state more quickly.
            They are descriptive summaries of the current published evidence, not
            hidden forecasts.
          </p>
        </Section>

        <Section title="Confidence, lag, and degraded states">
          <p>
            Confidence and lag are related, but they are not the same thing.
          </p>
          <p>
            <strong className="text-foreground">Confidence</strong> is an evidence score for
            the current published label. It should be read as “how much published data
            and internal signal structure support this label right now?” It is not a
            prediction score and not the probability that a label will persist.
          </p>
          <p>
            <strong className="text-foreground">Lag</strong> is a freshness measure. It tells
            the user how far the published row sits behind the current reference point.
            A row can be on schedule but still low-confidence, and a row can be delayed
            without being mathematically invalid.
          </p>
          <p>
            In the current reading model:
          </p>
          <ul className="list-disc pl-5">
            <li>Values below the canonical 0.40 publish floor should be treated as <InlineCode>UNKNOWN/DEGRADED</InlineCode>.</li>
            <li>Values from 0.40 to 0.70 still support a published label, but with more caution.</li>
            <li>Values above 0.70 indicate stronger support from the published evidence.</li>
          </ul>
          <p>
            Some chains, especially L2s, may also carry an expected publication lag
            relative to BTC and ETH. Slower cadence does not automatically mean broken data.
          </p>
        </Section>

        <Section title="Scorecard and drivers">
          <p>
            The scorecard is a descriptive decomposition of the current published state
            into axes such as Demand, Friction, and Capacity.
          </p>
          <p>
            A practical interpretation is:
          </p>
          <ul className="list-disc pl-5">
            <li><strong className="text-foreground">Demand</strong>: how much usage pressure the chain appears to be carrying.</li>
            <li><strong className="text-foreground">Friction</strong>: how costly, tight, or execution-difficult the current state appears to be.</li>
            <li><strong className="text-foreground">Capacity</strong>: how constrained or unconstrained the chain appears relative to its recent operating range.</li>
          </ul>
          <p>
            Drivers are the “because” layer under the scorecard and regime label. They
            highlight which specific published metrics currently stand out most strongly
            relative to recent history, so the user can see what is pushing the current state.
          </p>
        </Section>

        <Section title="Derived fields">
          <p>
            Derived fields are published trend-support artifacts rather than advisory
            indicators. They help the user compare the latest daily reading with
            recent smoothed context such as 7-day and 30-day behavior.
          </p>
          <p>
            This is useful because a single day can move sharply without representing
            a persistent change. Derived windows help the user see whether the latest
            reading is isolated or part of a broader move.
          </p>
          <p>
            The public site should therefore use canonical published bundles for the
            selected window rather than searching alternative files or repairing missing
            rows at runtime.
          </p>
        </Section>

        <Section title="Freshness and publication model">
          <p>
            The product is publication-driven. Public status, chain pages, Track Record,
            and related surfaces should present what has actually been published, along
            with freshness and lag context where relevant.
          </p>
          <p>
            Runtime behavior should not fabricate unpublished values, backfill missing
            bundles on the fly, or hide staleness from the user. A visible stale or
            degraded state is often more trustworthy than a silently normalized one.
          </p>
        </Section>

        <Section title="Public API and canonical contracts">
          <p>
            The public API exists to expose descriptive support surfaces for the website
            and for machine-readable inspection of published context. Routes such as{" "}
            <InlineCode>/api/v1/landing</InlineCode>,{" "}
            <InlineCode>/api/v1/status</InlineCode>,{" "}
            <InlineCode>/api/v1/summary/[chain]</InlineCode>,{" "}
            <InlineCode>/api/v1/whn/[chain]</InlineCode>,{" "}
            <InlineCode>/api/v1/glossary</InlineCode>,{" "}
            <InlineCode>/api/v1/units</InlineCode>, and{" "}
            <InlineCode>/api/v1/thresholds/defaults</InlineCode> are part of that
            descriptive layer.
          </p>
          <p>
            Where relevant, these routes expose traceability metadata such as dataset
            version, data source, source mode, and canonical contract boundaries so
            users and integrators can see what the route is actually representing.
          </p>
        </Section>

        <Section title="Interpretation limits">
          <ul className="list-disc pl-5">
            <li>No price data should be introduced.</li>
            <li>No forecasting language should be introduced.</li>
            <li>No normative conclusions should be introduced.</li>
            <li>No unexplained model outputs should be introduced.</li>
          </ul>
          <p>
            Descriptive analytics, historical context, published artifacts, and
            methodological traceability are the core boundaries of the product.
          </p>
        </Section>

        <Section title="Related pages">
          <ul className="list-disc pl-5">
            <li>
              <Link href="/methodology/previously" className="underline">
                /methodology/previously
              </Link>
            </li>
            <li>
              <Link href="/glossary" className="underline">
                /glossary
              </Link>
            </li>
            <li>
              <Link href="/status" className="underline">
                /status
              </Link>
            </li>
            <li>
              <Link href="/chains" className="underline">
                /chains
              </Link>
            </li>
            <li>
              <Link href="/track-record" className="underline">
                /track-record
              </Link>
            </li>
            <li>
              <Link href="/api-docs" className="underline">
                /api-docs
              </Link>
            </li>
          </ul>
        </Section>

        <section className="rounded-xl border p-6 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Traceability</div>
          <p className="mt-2">
            Dataset context on this page is drawn from{" "}
            <InlineCode>/public/data/published/v1/dataset.json</InlineCode>.
          </p>
          <p className="mt-2">
            This page is intended to remain aligned with glossary definitions, status
            behavior, Track Record presentation, chain pages, API docs, and the public
            route contract.
          </p>
        </section>
      </div>
    </main>
  );
}
