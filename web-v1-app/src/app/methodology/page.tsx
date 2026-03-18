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
              This page explains the product’s published data structure, descriptive interpretation
              boundary, and version-aware methodology surface. It is intended to help users
              understand what the product publishes and how that output should be read.
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
        <Section title="Methodology boundary">
          <p>
            TrendAnalytics is designed to remain descriptive. Methodology pages, glossary entries,
            chain pages, status pages, track-record views, public API routes, and authenticated file
            delivery are all intended to explain published data and context rather than provide
            advice.
          </p>
          <p>
            This means the product may describe persistence, unusual values, regime context,
            degradation, confidence, lag, and historical comparison, but it should not imply buy,
            sell, hold, rebalance, hedge, forecasting, or portfolio guidance.
          </p>
        </Section>

        <Section title="Published artifact model">
          <p>
            The website reads published artifacts from{" "}
            <InlineCode>/public/data/published/v1</InlineCode>. The public site is a presentation
            layer on top of those artifacts and should not silently recompute hidden model state in
            the browser.
          </p>
          <p>Core published layers are:</p>
          <ul className="list-disc pl-5">
            <li>
              <span className="font-medium text-foreground">Gold</span>: descriptive published base
              metrics.
            </li>
            <li>
              <span className="font-medium text-foreground">Meta</span>: status, confidence,
              scorecard, regime, and explanatory context.
            </li>
            <li>
              <span className="font-medium text-foreground">Derived</span>: derived descriptive
              trend fields such as rolling averages.
            </li>
          </ul>
        </Section>

        <Section title="Versioning and traceability">
          <p>
            Published output should be interpreted in the context of the currently published
            methodology version and the relevant dataset revision state.
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
            Historical changes to methodology should be visible through the product’s revision and
            “previously” surfaces rather than silently replacing the past.
          </p>
        </Section>

        <Section title="Chain interpretation model">
          <p>
            Each chain page presents descriptive current-state context using the latest published
            meta artifact together with canonical gold and derived window bundles.
          </p>
          <p>The intended reading order is:</p>
          <ol className="list-decimal pl-5">
            <li>Check freshness and as-of date.</li>
            <li>Check published regime label and one-line summary.</li>
            <li>Check confidence and lag context.</li>
            <li>Inspect drivers, scorecard axes, and rolling trend bundles.</li>
            <li>Use history and track-record pages to compare present output with earlier published states.</li>
          </ol>
        </Section>

        <Section title="Confidence, lag, and degraded states">
          <p>
            Confidence and lag are descriptive metadata fields, not predictions of accuracy.
            Confidence is meant to communicate interpretive caution around the published state, while
            lag communicates how current the publication is relative to the expected update cycle.
          </p>
          <p>
            Some chains may carry an expected delay relative to others. Degraded or unknown states
            should remain explicit in the UI rather than being normalized away.
          </p>
        </Section>

        <Section title="Scorecard and drivers">
          <p>
            The scorecard is a descriptive decomposition of the current published state into axes
            such as demand, friction, and capacity where applicable.
          </p>
          <p>
            Drivers highlight published fields that are currently unusual or explanatory within the
            current regime context. They should remain traceable to published meta artifacts and not
            be replaced with opaque frontend-only calculations.
          </p>
        </Section>

        <Section title="Derived fields">
          <p>
            Derived fields are published trend-support artifacts rather than advisory indicators.
            They exist to help users understand how current values relate to recent movement and
            smoothing windows.
          </p>
          <p>
            The public site should use canonical published bundles for the selected window rather
            than searching alternative files or repairing missing rows at runtime.
          </p>
        </Section>

        <Section title="Freshness and publication model">
          <p>
            The product is publication-driven. Public status, chain pages, and related surfaces
            should present only what has actually been published, along with freshness and lag
            context where relevant.
          </p>
          <p>
            Runtime behavior should not fabricate unpublished values, backfill missing bundles on the
            fly, or hide staleness from the user.
          </p>
        </Section>

        <Section title="Public API and canonical contracts">
          <p>
            The public API exists to expose descriptive support surfaces for the website and for
            machine-readable inspection of published context. Routes such as{" "}
            <InlineCode>/api/v1/landing</InlineCode>,{" "}
            <InlineCode>/api/v1/status</InlineCode>,{" "}
            <InlineCode>/api/v1/summary/[chain]</InlineCode>,{" "}
            <InlineCode>/api/v1/whn/[chain]</InlineCode>,{" "}
            <InlineCode>/api/v1/glossary</InlineCode>,{" "}
            <InlineCode>/api/v1/units</InlineCode>, and{" "}
            <InlineCode>/api/v1/thresholds/defaults</InlineCode> are part of that descriptive layer.
          </p>
          <p>
            Where relevant, these routes expose traceability metadata such as dataset version, data
            source, source mode, and canonical contract boundaries so users and integrators can see
            what the route is actually representing.
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
            Descriptive analytics, historical context, published artifacts, and methodological
            traceability are the core boundaries of the product.
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
            This page is intended to remain aligned with glossary definitions, status behavior,
            track-record presentation, chain pages, API docs, and the public route contract.
          </p>
        </section>
      </div>
    </main>
  );
}