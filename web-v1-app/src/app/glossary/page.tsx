// src/app/glossary/page.tsx
import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";
import GlossaryIndexClient from "@/components/glossary/GlossaryIndexClient";
import {
  loadGlossaryApiEntries,
  normalizeGlossaryEntries,
} from "@/lib/glossary/entries";

type SearchParams = {
  q?: string;
};

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

function normalizeQuery(value?: string): string {
  return (value ?? "").trim();
}

export default async function GlossaryPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const dataset: DatasetManifest | null = await readDatasetManifest();
  const resolvedSearchParams: SearchParams = searchParams ? await searchParams : {};
  const query = normalizeQuery(resolvedSearchParams.q);

  const apiEntries = await loadGlossaryApiEntries();
  const entries = normalizeGlossaryEntries(apiEntries);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Glossary</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Public definitions for the product’s published terminology, fields, and interpretation
              boundaries. The glossary exists to make the product readable without turning it into an
              advisory or predictive surface.
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
        <Section title="How to use the glossary">
          <p>
            The glossary explains what published fields and concepts mean inside the product’s
            descriptive framework. It should be used together with{" "}
            <Link href="/methodology" className="underline">
              Methodology
            </Link>
            ,{" "}
            <Link href="/thresholds" className="underline">
              Thresholds
            </Link>
            ,{" "}
            <Link href="/status" className="underline">
              Status
            </Link>
            , and chain pages.
          </p>
          <p>
            Definitions are product-specific. They describe how the term is used in TrendAnalytics,
            not how every other analytics product necessarily uses the same term.
          </p>
        </Section>

        <Section title="Interpretation boundary">
          <ul className="list-disc pl-5">
            <li>No glossary entry should imply a recommendation.</li>
            <li>No glossary entry should imply future price direction.</li>
            <li>Definitions should remain descriptive and traceable to published artifacts.</li>
            <li>
              Terms should be read in the context of the currently published methodology version.
            </li>
          </ul>
        </Section>

        <section className="rounded-xl border p-6">
          <h2 className="text-lg font-semibold">Lookup</h2>
          <div className="mt-3 text-sm text-muted-foreground">
            <p>
              Initial query:{" "}
              <InlineCode>{query.length > 0 ? query : "none"}</InlineCode>
            </p>
            <p className="mt-2">
              Examples:{" "}
              <Link href="/glossary?q=confidence" className="underline">
                confidence
              </Link>
              ,{" "}
              <Link href="/glossary?q=regime" className="underline">
                regime
              </Link>
              ,{" "}
              <Link href="/glossary?q=scorecard" className="underline">
                scorecard
              </Link>
              ,{" "}
              <Link href="/glossary?q=lag" className="underline">
                lag
              </Link>
            </p>
          </div>
        </section>

        <GlossaryIndexClient entries={entries} initialQuery={query} />

        <Section title="Related pages">
          <ul className="list-disc pl-5">
            <li>
              <Link href="/methodology" className="underline">
                /methodology
              </Link>
            </li>
            <li>
              <Link href="/methodology/previously" className="underline">
                /methodology/previously
              </Link>
            </li>
            <li>
              <Link href="/thresholds" className="underline">
                /thresholds
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
              <Link href="/api-docs" className="underline">
                /api-docs
              </Link>
            </li>
          </ul>
        </Section>

        <section className="rounded-xl border p-6 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Traceability</div>
          <p className="mt-2">
            This page is a public definitions surface and should remain aligned with methodology,
            thresholds, status, API docs, and chain interpretation.
          </p>
          <p className="mt-2">
            Source route: <InlineCode>/api/v1/glossary</InlineCode>
          </p>
        </section>
      </div>
    </main>
  );
}