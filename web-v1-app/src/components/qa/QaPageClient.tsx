"use client";

import { useEffect, useMemo, useState } from "react";
import ExplanationLevelToggle, { type ExplanationLevel } from "@/components/ExplanationLevelToggle";
import { cx, urd } from "@/components/site/UrdDesignSystem";
import { qaCategories, qaEntries, type QaCategory, type QaEntry } from "@/lib/qa";
import { subscriptionHistoryQa } from "@/lib/subscriptionHistoryQa";

type ActiveCategory = QaCategory | "All";
const allQaEntries = [...qaEntries, subscriptionHistoryQa];

function matchesEntry(entry: QaEntry, query: string) {
  if (!query) return true;
  const haystack = [entry.question, entry.category, ...entry.basic, ...entry.advanced]
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
    return allQaEntries.filter((entry) => {
      const categoryOk = category === "All" || entry.category === category;
      return categoryOk && matchesEntry(entry, q);
    });
  }, [query, category]);

  const activeEntry = useMemo(
    () => allQaEntries.find((entry) => entry.id === openId) ?? null,
    [openId],
  );

  useEffect(() => {
    if (!openId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openId]);

  const visibleParagraphs =
    level === "Basic" ? activeEntry?.basic ?? [] : activeEntry?.advanced ?? [];

  return (
    <>
      {/* ── Search + filter ── */}
      <section
        className="border-y border-[var(--line)] py-6"
        aria-label="Search and filter"
      >
        <div className="eyebrow mb-4">Search and filter</div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label
              htmlFor="qa-search"
              className="block font-mono text-[10px] font-medium tracking-[.16em] uppercase text-[var(--ink2)] mb-2"
            >
              Search questions and answers
            </label>
            <input
              id="qa-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for confidence, baseline, Meta, thresholds, drivers…"
              className="w-full px-4 py-3 text-sm bg-[var(--surface2)] border border-[var(--line2)] rounded-[var(--radius-sm)] text-[var(--ink)] placeholder:text-[var(--ink3)] outline-none focus:border-[var(--gold-line)] transition-colors"
            />
          </div>
          <div className="font-mono text-[11px] text-[var(--ink3)] lg:text-right">
            {filtered.length} {filtered.length === 1 ? "answer" : "answers"} visible
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory("All")}
            className={cx(
              "ua-vf-tab",
              category === "All" ? "is-active" : "",
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
                "ua-vf-tab",
                category === item.key ? "is-active" : "",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Q&A entries ── */}
      <div className="mt-2">
        {filtered.map((entry) => (
          <article key={entry.id} className="data-row grid-cols-1 py-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="eyebrow mb-2">{entry.category}</div>
                <h2 className="ua-h3">{entry.question}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenId(entry.id);
                  setLevel("Basic");
                }}
                className="btn-ghost flex-shrink-0"
              >
                Read full answer →
              </button>
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--ink2)] max-w-3xl">
              {entry.basic[0]}
            </p>
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center font-mono text-[11px] text-[var(--ink3)] uppercase tracking-[.14em]">
            No entries matched your search and filter.
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {activeEntry && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(8,15,26,.84)] p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeEntry.question}
          onClick={() => setOpenId(null)}
        >
          <div
            className={cx(urd.modalPanel, "max-h-[90vh] overflow-y-auto")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={urd.modalHeader}>
              <div>
                <div className="eyebrow mb-2">{activeEntry.category}</div>
                <h3 className="ua-h3 text-[var(--ink)]">{activeEntry.question}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="btn-ghost h-10 px-3 flex-shrink-0"
                aria-label="Close answer"
              >
                ×
              </button>
            </div>

            <div className="px-6 pt-5 pb-6">
              <div className={cx(urd.infoPanel, "mb-5")}>
                <ExplanationLevelToggle level={level} onChange={setLevel} label="Answer depth" />
              </div>

              <div className="border-t border-[var(--line)] pt-5 space-y-4">
                {visibleParagraphs.map((paragraph, index) => (
                  <p
                    key={`${activeEntry.id}-${level}-${index}`}
                    className="text-sm leading-7 text-[var(--ink2)]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <p className="mt-6 font-mono text-[10px] text-[var(--ink3)] tracking-[.08em]">
                Descriptive only. These answers explain the product and published reference data
                artifacts; they do not constitute forecasts or recommendations.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
