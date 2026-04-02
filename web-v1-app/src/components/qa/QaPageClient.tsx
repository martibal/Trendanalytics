
"use client";

import { useEffect, useMemo, useState } from "react";
import ExplanationLevelToggle, { type ExplanationLevel } from "@/components/ExplanationLevelToggle";
import { qaCategories, qaEntries, type QaCategory, type QaEntry } from "@/lib/qa";

type ActiveCategory = QaCategory | "All";

function matchesEntry(entry: QaEntry, query: string) {
  if (!query) return true;
  const haystack = [
    entry.question,
    entry.category,
    ...entry.basic,
    ...entry.advanced,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export default function QaPageClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ActiveCategory>("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [level, setLevel] = useState<ExplanationLevel>("Basic");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return qaEntries.filter((entry) => {
      const categoryOk = category === "All" || entry.category === category;
      return categoryOk && matchesEntry(entry, q);
    });
  }, [query, category]);

  const activeEntry = useMemo(
    () => qaEntries.find((entry) => entry.id === openId) ?? null,
    [openId],
  );

  useEffect(() => {
    if (!openId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openId]);

  const visibleParagraphs = level === "Basic" ? activeEntry?.basic ?? [] : activeEntry?.advanced ?? [];

  return (
    <>
      <section className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_40%)] p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
          Search and filter
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label htmlFor="qa-search" className="text-sm font-medium text-white">
              Search questions and answers
            </label>
            <input
              id="qa-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for confidence, baseline, Meta, thresholds, drivers..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
            />
          </div>
          <div className="text-sm text-slate-400 lg:text-right">
            {filtered.length} {filtered.length === 1 ? "answer" : "answers"} visible
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory("All")}
            className={category === "All"
              ? "rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200"
              : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 hover:text-slate-200"}
          >
            All
          </button>
          {qaCategories.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setCategory(item.key)}
              className={category === item.key
                ? "rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200"
                : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400 hover:text-slate-200"}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4">
        {filtered.map((entry) => (
          <article key={entry.id} className="rounded-3xl border bg-card/50 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                  {entry.category}
                </div>
                <h2 className="mt-2 text-xl font-semibold text-white">{entry.question}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenId(entry.id);
                  setLevel("Basic");
                }}
                className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/10"
              >
                Read full answer →
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/3 px-4 py-4 text-sm leading-7 text-slate-300">
              {entry.basic[0]}
            </div>
          </article>
        ))}

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-8 text-center text-sm text-slate-400">
            No Q&amp;A entries matched your current search and category filter.
          </div>
        ) : null}
      </section>

      {activeEntry ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={activeEntry.question}
          onClick={() => setOpenId(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-cyan-500/20 bg-[#071322] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                  {activeEntry.category}
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-white">{activeEntry.question}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10"
                aria-label="Close answer"
              >
                ×
              </button>
            </div>

            <div className="mt-5">
              <ExplanationLevelToggle level={level} onChange={setLevel} label="Answer depth" />
            </div>

            <div className="mt-5 rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="space-y-4 text-sm leading-7 text-slate-100">
                {visibleParagraphs.map((paragraph, index) => (
                  <p key={`${activeEntry.id}-${level}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="mt-5 text-xs text-slate-400">
              Descriptive only. These answers explain the product and published artifacts; they do not constitute forecasts or recommendations.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
