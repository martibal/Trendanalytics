// src/app/about/page.tsx
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

export default async function AboutPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">About</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              TrendAnalytics is a descriptive blockchain analytics product focused on separating
              regime change from noise across supported chains. It is designed to explain what is
              happening in published data, not to tell the user what to do.
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
        <Section title="What the product does">
          <p>
            TrendAnalytics publishes descriptive regime context for supported chains. It emphasizes
            persistence, context, staleness, historical comparison, and transparent published
            methodology rather than short-term price action.
          </p>
          <p>
            The public website is intended to help users interpret the current state of published
            on-chain conditions and inspect how those conditions compare with recent historical
            output.
          </p>
        </Section>

        <Section title="What the product does not do">
          <ul className="list-disc pl-5">
            <li>No price charts.</li>
            <li>No forecasts.</li>
            <li>No targets.</li>
            <li>No portfolio advice.</li>
            <li>No buy / sell / hold recommendations.</li>
            <li>No opaque model outputs presented without explanation.</li>
          </ul>
          <p>
            Every page and endpoint is intended to remain strictly descriptive and non-advisory.
          </p>
        </Section>

        <Section title="Published data layers">
          <p>
            The website is powered by published artifacts under{" "}
            <InlineCode>/public/data/published/v1</InlineCode>.
          </p>
          <ul className="list-disc pl-5">
            <li>
              <span className="font-medium text-foreground">Gold</span>: descriptive published base
              metrics.
            </li>
            <li>
              <span className="font-medium text-foreground">Meta</span>: confidence, status,
              scorecard, regime, and explanatory context.
            </li>
            <li>
              <span className="font-medium text-foreground">Derived</span>: published rolling trend
              fields such as moving averages.
            </li>
          </ul>
          <p>
            The public website reads these published artifacts directly. It does not recompute the
            underlying model in the browser.
          </p>
        </Section>

        <Section title="How the site is structured">
          <ul className="list-disc pl-5">
            <li>
              <Link href="/chains" className="underline">
                /chains
              </Link>{" "}
              provides chain-level entry points.
            </li>
            <li>
              <Link href="/status" className="underline">
                /status
              </Link>{" "}
              provides publication freshness and system health context.
            </li>
            <li>
              <Link href="/track-record" className="underline">
                /track-record
              </Link>{" "}
              provides historical descriptive outputs over time.
            </li>
            <li>
              <Link href="/methodology" className="underline">
                /methodology
              </Link>{" "}
              and{" "}
              <Link href="/glossary" className="underline">
                /glossary
              </Link>{" "}
              explain terms, structures, and interpretation boundaries.
            </li>
            <li>
              <Link href="/api-docs" className="underline">
                /api-docs
              </Link>{" "}
              documents machine-readable access patterns for published files.
            </li>
          </ul>
        </Section>

        <Section title="Public site vs subscriber access">
          <p>
            The public site is read-only and intended to explain published outputs. Subscriber
            features extend that experience with authenticated access, account management, API keys,
            and entitlement-gated JSON delivery.
          </p>
          <p>
            Subscriber functionality is surfaced through{" "}
            <InlineCode>/dashboard</InlineCode> and authenticated API routes such as{" "}
            <InlineCode>/api/v1/files/[...path]</InlineCode>.
          </p>
        </Section>

        <Section title="Methodology and transparency">
          <p>
            TrendAnalytics is designed around transparent published artifacts. The intent is that the
            user should be able to see what was published, what window it reflects, what methodology
            version applies, and what freshness or confidence caveats matter for interpretation.
          </p>
          <p>
            Methodology changes should be versioned and historical outputs should be interpreted in
            the context of the relevant methodology version and published revision state.
          </p>
          <p>
            See{" "}
            <Link href="/methodology" className="underline">
              Methodology
            </Link>
            ,{" "}
            <Link href="/methodology/previously" className="underline">
              Previously
            </Link>
            , and{" "}
            <Link href="/glossary" className="underline">
              Glossary
            </Link>{" "}
            for more detail.
          </p>
        </Section>

        <Section title="Freshness and expected delay">
          <p>
            Publication freshness is chain-dependent. Bitcoin and Ethereum are typically more current,
            while Arbitrum and Base may have an expected publication lag.
          </p>
          <p>
            Freshness is communicated through status pages, chain pages, public API routes, and
            published metadata rather than hidden from the user.
          </p>
        </Section>

        <Section title="Public API and traceability">
          <p>
            The public API exposes descriptive support routes such as{" "}
            <InlineCode>/api/v1/landing</InlineCode>,{" "}
            <InlineCode>/api/v1/status</InlineCode>,{" "}
            <InlineCode>/api/v1/summary/[chain]</InlineCode>, and{" "}
            <InlineCode>/api/v1/whn/[chain]</InlineCode>.
          </p>
          <p>
            These routes are intended to expose published context, not hidden runtime state. Where
            relevant, they include traceability fields such as dataset version, source mode, and
            canonical contract boundaries.
          </p>
        </Section>

        <Section title="Data attribution">
          <p>
            TrendAnalytics is built on public blockchain-derived data and internal published
            transformations of those artifacts.
          </p>
          <p>
            Where required, attribution to AWS Public Blockchain Data or other upstream sources
            should remain present in documentation and product context.
          </p>
        </Section>

        <Section title="Interpretation boundary">
          <p>
            The product is intended to help users inspect whether current conditions look persistent,
            unusual, stable, degraded, or regime-like in relation to published historical context.
          </p>
          <p>
            That boundary matters: descriptive pattern context is not the same thing as predictive or
            advisory output.
          </p>
        </Section>

        <Section title="Related pages">
          <ul className="list-disc pl-5">
            <li>
              <Link href="/chains" className="underline">
                /chains
              </Link>
            </li>
            <li>
              <Link href="/status" className="underline">
                /status
              </Link>
            </li>
            <li>
              <Link href="/track-record" className="underline">
                /track-record
              </Link>
            </li>
            <li>
              <Link href="/methodology" className="underline">
                /methodology
              </Link>
            </li>
            <li>
              <Link href="/glossary" className="underline">
                /glossary
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
            This page is descriptive product documentation and should remain aligned with the
            methodology, glossary, status, API docs, and legal pages.
          </p>
        </section>
      </div>
    </main>
  );
}