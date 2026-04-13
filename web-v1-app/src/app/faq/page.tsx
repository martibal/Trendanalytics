import QaPageClient from "@/components/qa/QaPageClient";
import { qaEntries, qaCategories } from "@/lib/qa";

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
          Q&amp;A
        </div>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
          Questions skeptics ask before they trust the output
        </h1>
        <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-300">
          This page answers the practical and technical questions users are likely to ask about noise,
          regime change, confidence, baselines, JSON artifacts, and traceability.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-400">
          <span>{qaEntries.length} answers</span>
          <span>·</span>
          <span>{qaCategories.length} categories</span>
          <span>·</span>
          <span>Basic and Advanced explanation levels</span>
          <span>·</span>
          <span>Expected refresh windows: around 09:00 and 21:00 Europe/Oslo</span>
        </div>
      </header>

      <QaPageClient />
    </main>
  );
}