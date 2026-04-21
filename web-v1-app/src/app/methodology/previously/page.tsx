import Link from "next/link";
import { currentDataSource } from "@/lib/storage";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";

export default async function MethodologyPreviouslyPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 rounded-3xl border p-8 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Legacy route</div>
        <h1 className="mt-3 text-4xl font-semibold text-white">Methodology Previously</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">This legacy route is retained so older links do not break. The authoritative public destinations are now the changelog and provenance pages.</p>
        <div className="mt-4 text-sm text-muted-foreground">Methodology: {dataset?.methodology_version ?? "—"} · Runtime backend: {currentDataSource()} (deployment detail)</div>
      </header>
      <div className="grid gap-6">
        <section className="rounded-2xl border p-6 shadow-sm"><h2 className="text-xl font-semibold text-white">Use these pages instead</h2><ul className="mt-4 list-disc pl-5 text-sm leading-7 text-muted-foreground"><li><Link href="/methodology/changelog" className="underline">/methodology/changelog</Link> for public methodology change history.</li><li><Link href="/methodology/provenance" className="underline">/methodology/provenance</Link> for provenance, revisions, and archival identity.</li></ul></section>
      </div>
    </main>
  );
}
