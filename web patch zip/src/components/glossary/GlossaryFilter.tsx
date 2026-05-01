// src/components/glossary/GlossaryFilter.tsx
"use client";

import { useMemo, useState } from "react";

export type GlossaryFilterCategory =
  | "all"
  | "regime"
  | "confidence"
  | "scorecard"
  | "drivers"
  | "charts"
  | "freshness"
  | "metadata";

export type GlossaryFilterState = {
  query: string;
  category: GlossaryFilterCategory;
};

export type GlossaryFilterProps = {
  initialQuery?: string;
  initialCategory?: GlossaryFilterCategory;
  onChange?: (state: GlossaryFilterState) => void;
  className?: string;
};

const CATEGORY_OPTIONS: Array<{ value: GlossaryFilterCategory; label: string }> = [
  { value: "all",        label: "All" },
  { value: "regime",     label: "Regime" },
  { value: "confidence", label: "Confidence" },
  { value: "scorecard",  label: "Scorecard" },
  { value: "drivers",    label: "Drivers" },
  { value: "charts",     label: "Charts" },
  { value: "freshness",  label: "Freshness" },
  { value: "metadata",   label: "Metadata" },
];

export default function GlossaryFilter(props: GlossaryFilterProps) {
  const { initialQuery = "", initialCategory = "all", onChange, className } = props;

  const [query, setQuery]       = useState(initialQuery);
  const [category, setCategory] = useState<GlossaryFilterCategory>(initialCategory);

  const state = useMemo<GlossaryFilterState>(() => ({ query, category }), [query, category]);

  function emit(next: GlossaryFilterState) {
    onChange?.(next);
  }

  function handleReset() {
    setQuery("");
    setCategory("all");
    emit({ query: "", category: "all" });
  }

  const isDirty = query.trim() !== "" || category !== "all";

  return (
    <section
      className={["rounded-2xl border p-5", className ?? ""].join(" ")}
      aria-label="Glossary filters"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Filter glossary</h2>
        {isDirty && (
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Reset filters
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.6fr_0.8fr]">
        {/* Search */}
        <div>
          <label htmlFor="glossary-filter-query" className="text-sm font-medium text-foreground">
            Search
          </label>
          <div className="relative mt-2">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="glossary-filter-query"
              type="text"
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                emit({ query: next, category });
              }}
              placeholder="Search terms, descriptions, keys…"
              className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="glossary-filter-category" className="text-sm font-medium text-foreground">
            Category
          </label>
          <select
            id="glossary-filter-category"
            value={category}
            onChange={(e) => {
              const next = e.target.value as GlossaryFilterCategory;
              setCategory(next);
              emit({ query, category: next });
            }}
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-1 focus:ring-ring"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filter pills */}
      {isDirty && (
        <div className="mt-3 flex flex-wrap gap-2">
          {query.trim() && (
            <span className="inline-flex items-center gap-1 rounded-full border border-ring/40 bg-ring/10 px-2.5 py-1 text-xs text-foreground">
              Search: <strong>{query}</strong>
            </span>
          )}
          {category !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-ring/40 bg-ring/10 px-2.5 py-1 text-xs text-foreground">
              Category: <strong>{category}</strong>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
