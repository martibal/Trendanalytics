"use client";

import { useEffect, useMemo, useState } from "react";
import ExplanationLevelToggle, { type ExplanationLevel } from "@/components/ExplanationLevelToggle";
import { cx, urd } from "@/components/site/UrdDesignSystem";
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
      <section className="rounded-3xl border border-[#9db8d4] bg-[#eaf3fb] p-6 text-[#0a1d3a] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
          Search and filter
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label htmlFor="qa-search" className="text-sm font-black text-[#0d2447]">
              Search questions and answers
            </label>
            <input
              id="qa-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for confidence, baseline, Meta, thresholds, drivers..."
              className="mt-2 w-full rounded-2xl border border-[#b6cce3] bg-[#eef6ff] px-4 py-3 text-sm font-semibold text-[#0d2447] outline-none placeholder:text-[#557099] focus:border-blue-500 focus:bg-white"
            />
          </div>
          <div className="text-sm font-semibold text-[#557099] lg:text-right">
            {filtered.length} {filtered.length === 1 ? "answer" : "answers"} visible
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory("All")}
            className={cx(
              "rounded-full border px-4 py-2 text-sm font-black transition",
              category === "All"
                ? "border-blue-300 bg-cyan-100 text-blue-800"
                : "border-[#b6cce3] bg-[#eef6ff] text-[#557099] hover:border-blue-300 hover:bg-white hover:text-blue-800",
            )}
          >
            All
          </button>
          {qaCategories.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setCategory(item.key)}
              className={cx(
                "rounded-full border px-4 py-2 text-sm font-black transition",
                category === item.key
                  ? "border-blue-300 bg-cyan-100 text-blue-800"
                  : "border-[#b6cce3] bg-[#eef6ff] text-[#557099] hover:border-blue-300 hover:bg-white hover:text-blue-800",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4">
        {filtered.map((entry) => (
          <article
            key={entry.id}
            className="rounded-3xl border border-[#9db8d4] bg-[#eaf3fb] p-6 text-[#0a1d3a] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                  {entry.category}
                </div>
                <h2 className="mt-2 text-xl font-black tracking-[-0.02em] text-[#0d2447]">
                  {entry.question}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenId(entry.id);
                  setLevel("Basic");
                }}
                className="inline-flex items-center rounded-full border border-[#9db8d4] bg-[#eef6ff] px-4 py-2 text-sm font-black text-[#0d2447] transition hover:bg-white hover:text-blue-800"
              >
                Read full answer →
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-[#b6cce3] bg-[#eef6ff] px-4 py-4 text-sm font-semibold leading-7 text-[#27476f]">
              {entry.basic[0]}
            </div>
          </article>
        ))}

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#9db8d4] bg-[#eaf3fb] p-8 text-center text-sm font-semibold text-[#557099]">
            No Q&amp;A entries matched your current search and category filter.
          </div>
        ) : null}
      </section>

      {activeEntry ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#031329]/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={activeEntry.question}
          onClick={() => setOpenId(null)}
        >
          <div
            className={cx(urd.modalPanel, "max-h-[90vh] overflow-y-auto p-6")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                  {activeEntry.category}
                </div>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#0d2447]">
                  {activeEntry.question}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#9db8d4] bg-[#eef6ff] text-xl font-black text-[#0d2447] transition hover:bg-white hover:text-blue-800"
                aria-label="Close answer"
              >
                ×
              </button>
            </div>

            <div className={cx(urd.infoPanel, "mt-5")}>
              <ExplanationLevelToggle level={level} onChange={setLevel} label="Answer depth" />
            </div>

            <div className={cx(urd.infoPanelStrong, "mt-5")}>
              <div className="space-y-4 text-sm font-semibold leading-7 text-[#24466f]">
                {visibleParagraphs.map((paragraph, index) => (
                  <p key={`${activeEntry.id}-${level}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="mt-5 text-xs font-semibold text-[#557099]">
              Descriptive only. These answers explain the product and published reference data artifacts; they do not constitute forecasts or recommendations.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
