// src/app/methodology/previously/page.tsx
import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";

type ChangeRow = {
  area: string;
  current: string;
  previous: string;
  why: string;
  impact: string;
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

const CHANGELOG_ROWS: ChangeRow[] = [
  {
    area: "Methodology presentation",
    current: "Version-aware methodology and dataset traceability are shown explicitly in public documentation.",
    previous: "Methodology context was thinner and easier to read as static prose without explicit traceability emphasis.",
    why: "Users need to see what methodology version governs current published outputs.",
    impact: "Interpretation is more transparent and easier to audit across pages.",
  },
  {
    area: "Status and freshness context",
    current: "Freshness, lag, and expected delay are surfaced directly in status and chain surfaces.",
    previous: "Freshness signals were easier to under-communicate or leave implicit.",
    why: "Published outputs must be interpreted in the context of actual freshness.",
    impact: "Users can distinguish current, delayed, and degraded states more reliably.",
  },
  {
    area: "Track Record",
    current: "Track Record is presented as a descriptive historical regime timeline.",
    previous: "Track Record was closer to a placeholder navigation surface.",
    why: "Historical descriptive context is part of the product promise.",
    impact: "Users can inspect earlier published regime states without leaving the public surface.",
  },
  {
    area: "API documentation",
    current: "Public and authenticated route boundaries are described explicitly, including traceability and canonical contract context.",
    previous: "API documentation was lighter and less aligned with current subscriber/auth flows.",
    why: "The web app now contains clearer public vs subscriber API separation and route-level contract metadata.",
    impact: "Developers and subscribers can understand route intent, auth, and response semantics more clearly.",
  },
  {
    area: "Legal/public documentation",
    current: "Terms, Privacy, About, and Methodology are structured as launch-facing product documents.",
    previous: "These pages existed in more placeholder-like form.",
    why: "Launch readiness requires these surfaces to be explicit and internally consistent.",
    impact: "The public site is more coherent and governance-aligned.",
  },
];

export default async function MethodologyPreviouslyPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Previously</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This page records how methodology-facing presentation, traceability, and descriptive
              product interpretation have changed over time. It is intended to make change visible,
              not hidden.
            </p>
          </div>

          <div className="rounded-xl border px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Current published context
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
        <Section title="Purpose of this page">
          <p>
            Methodology changes should not silently overwrite the user’s understanding of what the
            product is, how it is presented, or how published outputs should be interpreted.
          </p>
          <p>
            This page provides a human-readable summary of important product-facing changes, while
            the main methodology page provides the current descriptive interpretation boundary.
          </p>
        </Section>

        <Section title="Current rule">
          <p>
            Public pages, chain views, status surfaces, public API documentation, and machine-readable
            route contracts should remain aligned with the currently published methodology version and
            should not imply advisory or predictive behavior.
          </p>
          <p>
            Historical or prior states should be visible through explicit documentation rather than
            erased from view.
          </p>
        </Section>

        <section className="rounded-xl border">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-semibold">Product-facing changes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Summary of visible changes between earlier and current product presentation.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Current</th>
                  <th className="px-4 py-3">Previously</th>
                  <th className="px-4 py-3">Why changed</th>
                  <th className="px-4 py-3">Impact</th>
                </tr>
              </thead>
              <tbody>
                {CHANGELOG_ROWS.map((row) => (
                  <tr key={row.area} className="border-b last:border-b-0 align-top">
                    <td className="px-4 py-3 font-medium">{row.area}</td>
                    <td className="px-4 py-3">{row.current}</td>
                    <td className="px-4 py-3">{row.previous}</td>
                    <td className="px-4 py-3">{row.why}</td>
                    <td className="px-4 py-3">{row.impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Section title="Relation to current methodology">
          <p>
            The main{" "}
            <Link href="/methodology" className="underline">
              /methodology
            </Link>{" "}
            page explains the current descriptive contract. This page exists to show what changed in
            the surrounding product presentation, traceability model, and interpretation framing.
          </p>
          <p>
            In other words, <InlineCode>/methodology</InlineCode> describes the current state, while{" "}
            <InlineCode>/methodology/previously</InlineCode> documents important prior presentation
            states and transitions.
          </p>
        </Section>

        <Section title="Interpretation boundary">
          <ul className="list-disc pl-5">
            <li>Earlier presentation states are documentation context, not investment guidance.</li>
            <li>Methodology visibility is intended to increase transparency, not to create forecasts.</li>
            <li>Historical product changes do not imply historical performance claims.</li>
            <li>Public API and traceability changes do not change the product’s descriptive-only boundary.</li>
          </ul>
        </Section>

        <Section title="Related pages">
          <ul className="list-disc pl-5">
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
              <Link href="/about" className="underline">
                /about
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
            This page is a documentation companion to <InlineCode>/methodology</InlineCode> and
            should remain consistent with public product presentation, dataset traceability,
            published descriptive boundaries, and public API contract documentation.
          </p>
        </section>
      </div>
    </main>
  );
}