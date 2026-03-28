// src/app/glossary/page.tsx
import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";
import GlossaryIndexClient from "@/components/glossary/GlossaryIndexClient";
import type { GlossaryEntry as CanonicalGlossaryEntry } from "@/data/glossary";

type GlossaryApiEntry = {
  key?: string;
  label?: string;
  category?: string;
  basic?: string;
  advanced?: string;
  units?: string;
  sourcePath?: string;
  fieldPath?: string;
};

type GlossaryResponse =
  | GlossaryApiEntry[]
  | {
      entries?: GlossaryApiEntry[];
      items?: GlossaryApiEntry[];
      data?: GlossaryApiEntry[];
    };

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

async function readGlossaryEntries(): Promise<GlossaryApiEntry[]> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const url = `${base}/api/v1/glossary`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return [];
    }

    const json = (await res.json()) as GlossaryResponse;

    if (Array.isArray(json)) {
      return json;
    }

    if (Array.isArray(json.entries)) {
      return json.entries;
    }

    if (Array.isArray(json.items)) {
      return json.items;
    }

    if (Array.isArray(json.data)) {
      return json.data;
    }

    return [];
  } catch {
    return [];
  }
}

function normalizeQuery(value?: string): string {
  return (value ?? "").trim();
}

function normalizeCategory(
  value?: string
): CanonicalGlossaryEntry["category"] {
  switch (value) {
    case "regime":
    case "confidence":
    case "scorecard":
    case "drivers":
    case "charts":
    case "freshness":
    case "metadata":
      return value;
    default:
      return "metadata";
  }
}

function normalizeEntries(
  entries: GlossaryApiEntry[]
): CanonicalGlossaryEntry[] {
  return entries
    .filter((entry): entry is Required<Pick<GlossaryApiEntry, "key">> & GlossaryApiEntry => {
      return typeof entry.key === "string" && entry.key.trim().length > 0;
    })
    .map((entry) => ({
      key: entry.key,
      label: entry.label ?? entry.key,
      category: normalizeCategory(entry.category),
      description: {
        basic: entry.basic ?? "No basic explanation provided yet.",
        advanced: entry.advanced ?? "No advanced explanation provided yet.",
      },
      units: entry.units,
      sourcePath: entry.sourcePath,
      fieldPath: entry.fieldPath,
    }))
    .sort((a, b) => {
      const ac = a.category.localeCompare(b.category);
      if (ac !== 0) return ac;
      return a.label.localeCompare(b.label);
    });
}

export default async function GlossaryPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const dataset: DatasetManifest | null = await readDatasetManifest();
  const resolvedSearchParams: SearchParams = searchParams ? await searchParams : {};
  const query = normalizeQuery(resolvedSearchParams.q);

  const apiEntries = await readGlossaryEntries();
  const entries = normalizeEntries(apiEntries);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Glossary</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Public definitions for the product’s published terminology, fields, and
              interpretation boundaries. The glossary exists to make the product readable
              for both newer users and more technical users without turning the site into
              an advisory or predictive surface.
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
            The glossary explains what published fields and concepts mean inside the
            product’s descriptive framework. It should be used together with{" "}
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
            , Track Record, and chain pages.
          </p>
          <p>
            Definitions are product-specific. They explain how a term is used in
            TrendAnalytics, not how every analytics product in crypto or finance
            necessarily uses the same word.
          </p>
          <p>
            A practical reading order is: first understand the regime labels and
            confidence terms, then the scorecard axes and driver metrics, and finally
            freshness, lag, and metadata fields. That sequence usually matches the order
            in which a user encounters the product’s reasoning on chain pages.
          </p>
        </Section>

        <Section title="Basic vs Advanced">
          <p>
            <strong className="text-foreground">Basic</strong> explanations are meant to
            answer the question, “What does this mean in plain English, and how should I
            read it on the page?”
          </p>
          <p>
            <strong className="text-foreground">Advanced</strong> explanations are meant to
            answer the question, “What published object does this belong to, what is its
            methodological role, and how does it relate to the rest of the model?”
          </p>
          <p>
            The goal is not to give two different definitions, but two different depths
            of the same definition: one intuitive and one more methodical.
          </p>
        </Section>

        <Section title="Interpretation boundary">
          <ul className="list-disc pl-5">
            <li>No glossary entry should imply a recommendation.</li>
            <li>No glossary entry should imply future price direction.</li>
            <li>No glossary entry should imply that the model can see hidden causes with certainty.</li>
            <li>Definitions should remain descriptive and traceable to published artifacts.</li>
            <li>
              Terms should always be read in the context of the currently published
              methodology version.
            </li>
          </ul>
          <p>
            In other words, the glossary should help the user understand what the product
            is saying, without quietly pushing the user toward an action or pretending to
            know the future.
          </p>
        </Section>

        <Section title="What kinds of terms appear here">
          <p>
            The glossary includes several different classes of terms, and it helps to
            know which kind of thing you are reading:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong className="text-foreground">Regime terms</strong> such as
              STABLE, HEATING, CONGESTED, CHEAP, and UNKNOWN/DEGRADED.
            </li>
            <li>
              <strong className="text-foreground">Confidence terms</strong> that explain
              evidence strength, data quality, label support, and degraded states.
            </li>
            <li>
              <strong className="text-foreground">Scorecard terms</strong> that describe
              axes like Demand, Friction, and Capacity and how their published scores
              should be read.
            </li>
            <li>
              <strong className="text-foreground">Driver terms</strong> that explain why
              a current label looks notable, including fields such as robust z-score,
              percentile, and momentum.
            </li>
            <li>
              <strong className="text-foreground">Freshness terms</strong> that explain
              lag, cadence, stale states, and why a row can be delayed without being
              mathematically invalid.
            </li>
            <li>
              <strong className="text-foreground">Metadata terms</strong> that explain
              revision, source mode, path-level traceability, and contract boundaries.
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
              Search works best when you enter the actual published term you saw on the
              site or in JSON, for example a regime label, a confidence field, a
              scorecard concept, or a lag-related term.
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
              ,{" "}
              <Link href="/glossary?q=driver" className="underline">
                driver
              </Link>
            </p>
          </div>
        </section>

        <GlossaryIndexClient entries={entries} initialQuery={query} />

        <Section title="How this page relates to the rest of the site">
          <p>
            The glossary is the definitions layer. It is where the user should be able
            to check, “What does this term mean exactly?”
          </p>
          <p>
            The{" "}
            <Link href="/methodology" className="underline">
              Methodology
            </Link>{" "}
            page explains the broader logic of the product, the{" "}
            <Link href="/thresholds" className="underline">
              Thresholds
            </Link>{" "}
            page explains canonical cutoffs and threshold logic, the{" "}
            <Link href="/status" className="underline">
              Status
            </Link>{" "}
            page explains freshness and current published availability, and chain pages
            show the current outputs in use.
          </p>
          <p>
            Together, these pages should let a user move from “What is this term?” to
            “How is this term used in the model?” to “What is the product currently
            publishing for a specific chain?”
          </p>
        </Section>

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
            This page is a public definitions surface and should remain aligned with
            methodology, thresholds, status, API docs, Track Record, and chain
            interpretation.
          </p>
          <p className="mt-2">
            Source route: <InlineCode>/api/v1/glossary</InlineCode>
          </p>
          <p className="mt-2">
            The page keeps the currently published glossary contract intact and should
            not silently replace API-provided definitions with unrelated frontend-only
            wording.
          </p>
        </section>
      </div>
    </main>
  );
}
