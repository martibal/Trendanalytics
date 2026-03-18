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

const CATEGORY_OPTIONS: Array<{
  value: GlossaryFilterCategory;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "regime", label: "Regime" },
  { value: "confidence", label: "Confidence" },
  { value: "scorecard", label: "Scorecard" },
  { value: "drivers", label: "Drivers" },
  { value: "charts", label: "Charts" },
  { value: "freshness", label: "Freshness" },
  { value: "metadata", label: "Metadata" },
];

export default function GlossaryFilter(props: GlossaryFilterProps) {
  const {
    initialQuery = "",
    initialCategory = "all",
    onChange,
    className,
  } = props;

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<GlossaryFilterCategory>(initialCategory);

  const state = useMemo<GlossaryFilterState>(
    () => ({
      query,
      category,
    }),
    [query, category]
  );

  function emit(next: GlossaryFilterState) {
    onChange?.(next);
  }

  return (
    <section
      className={[
        "rounded-2xl border p-5",
        className ?? "",
      ].join(" ")}
      aria-label="Glossary filters"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Glossary filters</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Client-side filter controls for narrowing glossary entries by keyword and category.
          </p>
        </div>

        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Client UI
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
        <div>
          <label htmlFor="glossary-filter-query" className="text-sm font-medium text-foreground">
            Search
          </label>
          <input
            id="glossary-filter-query"
            type="text"
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              emit({ query: next, category });
            }}
            placeholder="Search glossary terms..."
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground"
          />
        </div>

        <div>
          <label htmlFor="glossary-filter-category" className="text-sm font-medium text-foreground">
            Category
          </label>
          <select
            id="glossary-filter-category"
            value={category}
            onChange={(event) => {
              const next = event.target.value as GlossaryFilterCategory;
              setCategory(next);
              emit({ query, category: next });
            }}
            className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground">
        Current state: query=<span className="font-medium text-foreground">{state.query || "—"}</span>, category=
        <span className="font-medium text-foreground"> {state.category}</span>
      </div>
    </section>
  );
}