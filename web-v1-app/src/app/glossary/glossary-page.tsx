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
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Glossary</div>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Every term, defined
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Plain-language and technical definitions for every field and concept in the product.
            Each entry is written at two levels — accessible to new readers, precise enough for
            analysts who want to verify the methodology.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Dataset: <span className="text-slate-300">{dataset?.version ?? "—"}</span></span>
            <span>Methodology: <span className="text-slate-300">{dataset?.methodology_version ?? "—"}</span></span>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        <section className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.06),transparent_40%)] p-6">
          <p className="text-sm leading-7 text-slate-300">
            Every term in the Urd Atlas product has a precise meaning. This glossary documents
            what each field and concept means in this specific context — not how other products
            use the same terms. If a term is still unclear after reading the glossary, the{" "}
            <Link href="/methodology" className="text-cyan-400 hover:underline">Methodology</Link>
            {" "}page provides the full model context.
          </p>
        </section>

        <Section title="Interpretation boundary">
          <ul className="list-disc pl-5">
            <li>No glossary entry should imply a recommendation.</li>
            <li>No glossary entry should imply future price direction.</li>
            <li>Definitions should remain descriptive and traceable to published reference data artifacts.</li>
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