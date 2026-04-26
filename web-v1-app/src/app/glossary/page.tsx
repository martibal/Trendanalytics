// src/app/glossary/page.tsx
import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
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
    <section className="rounded-2xl border border-[#9db8d4] bg-[#e7f1fb] p-6">
      <h2 className="text-lg font-black text-[#0d2447]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-[#27476f]">
        {children}
      </div>
    </section>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded bg-[#cfe0f1] px-1.5 py-0.5 text-[#0d2447] font-semibold">
      {children}
    </code>
  );
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
    <main className="min-h-screen bg-[#edf6ff]">
      {/* HERO */}
      <section className="relative overflow-hidden bg-[#031329] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(47,115,255,0.12),transparent_30%)]" />

        <div className="mx-auto max-w-5xl px-6 pt-[120px] pb-16">
          <h1 className="text-[48px] font-black tracking-[-0.04em]">
            Glossary
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-white/80">
            Public definitions for product terminology, fields, and interpretation boundaries.
            Descriptive only — no advisory meaning.
          </p>

          <div className="mt-6 inline-block rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
            <div className="text-white/60">Dataset</div>
            <div className="font-semibold">{dataset?.version ?? "—"}</div>
            <div className="mt-1 text-white/60 text-xs">
              Methodology: {dataset?.methodology_version ?? "—"}
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <Section title="How to use the glossary">
          <p>
            Definitions describe how terms are used inside Urd Atlas — not universal definitions.
          </p>
          <p>
            Use together with{" "}
            <Link href="/methodology" className="text-[#0d2447] underline">
              Methodology
            </Link>
            ,{" "}
            <Link href="/thresholds" className="text-[#0d2447] underline">
              Thresholds
            </Link>
            ,{" "}
            <Link href="/status" className="text-[#0d2447] underline">
              Status
            </Link>
            .
          </p>
        </Section>

        <Section title="Interpretation boundary">
          <ul className="list-disc pl-5 space-y-1">
            <li>No recommendation or prediction.</li>
            <li>No price implication.</li>
            <li>Strictly descriptive.</li>
            <li>Bound to current methodology version.</li>
          </ul>
        </Section>

        <section className="rounded-2xl border border-[#9db8d4] bg-[#e7f1fb] p-6">
          <h2 className="text-lg font-black text-[#0d2447]">Lookup</h2>

          <div className="mt-3 text-sm text-[#27476f]">
            <p>
              Query:{" "}
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
          <ul className="list-disc pl-5 space-y-1">
            <li><Link href="/methodology" className="underline">/methodology</Link></li>
            <li><Link href="/methodology/changelog" className="underline">/methodology/changelog</Link></li>
            <li><Link href="/thresholds" className="underline">/thresholds</Link></li>
            <li><Link href="/status" className="underline">/status</Link></li>
            <li><Link href="/chains" className="underline">/chains</Link></li>
            <li><Link href="/api-docs" className="underline">/api-docs</Link></li>
          </ul>
        </Section>

        <section className="rounded-2xl border border-[#9db8d4] bg-[#dceaf8] p-6 text-sm text-[#27476f]">
          <div className="font-black text-[#0d2447]">Traceability</div>

          <p className="mt-2">
            Definitions must remain aligned with methodology, thresholds, and published outputs.
          </p>

          <p className="mt-2">
            Source: <InlineCode>/api/v1/glossary</InlineCode>
          </p>
        </section>
      </div>
    </main>
  );
}