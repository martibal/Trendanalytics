"use client";

import { useState } from "react";

export type GlossaryFilterCategory =
  | "all"
  | "confidence"
  | "drivers"
  | "charts";

export type GlossaryFilterState = {
  query: string;
  category: GlossaryFilterCategory;
};

export default function GlossaryFilter({
  initialQuery,
  initialCategory,
  onChange,
}: {
  initialQuery?: string;
  initialCategory?: GlossaryFilterCategory;
  onChange: (state: GlossaryFilterState) => void;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [category, setCategory] = useState<GlossaryFilterCategory>(
    initialCategory ?? "all"
  );

  function update(q: string, c: GlossaryFilterCategory) {
    setQuery(q);
    setCategory(c);
    onChange({ query: q, category: c });
  }

  return (
    <div className="rounded-2xl border border-[#9db8d4] bg-[#eaf3ff] p-5">
      <div className="mb-3 text-sm font-semibold text-[#0d2447]">
        Filter glossary
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        {/* SEARCH */}
        <input
          value={query}
          onChange={(e) => update(e.target.value, category)}
          placeholder="Search terms, descriptions, keys..."
          className="w-full rounded-xl border border-[#9db8d4] bg-white px-4 py-3 text-sm text-[#0d2447] outline-none focus:border-[#5b8fd1]"
        />

        {/* CATEGORY */}
        <select
          value={category}
          onChange={(e) =>
            update(query, e.target.value as GlossaryFilterCategory)
          }
          className="rounded-xl border border-[#9db8d4] bg-white px-4 py-3 text-sm text-[#0d2447] outline-none focus:border-[#5b8fd1]"
        >
          <option value="all">All</option>
          <option value="confidence">Confidence</option>
          <option value="drivers">Drivers</option>
          <option value="charts">Charts</option>
        </select>
      </div>
    </div>
  );
}