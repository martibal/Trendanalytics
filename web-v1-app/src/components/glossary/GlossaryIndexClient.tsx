"use client";

import { useMemo, useState } from "react";
import GlossaryEntry from "@/components/glossary/GlossaryEntry";
import GlossaryFilter, {
  type GlossaryFilterCategory,
  type GlossaryFilterState,
} from "@/components/glossary/GlossaryFilter";
import type { GlossaryEntry as GlossaryEntryType } from "@/data/glossary";

export type GlossaryIndexClientProps = {
  entries: GlossaryEntryType[];
  initialQuery?: string;
  className?: string;
};

function matchesCategory(entry: GlossaryEntryType, category: GlossaryFilterCategory) {
  if (category === "all") return true;
  return entry.category === category;
}

function matchesQuery(entry: GlossaryEntryType, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    entry.key,
    entry.label,
    entry.category,
    entry.description.basic,
    entry.description.advanced,
    entry.units ?? "",
    entry.sourcePath ?? "",
    entry.fieldPath ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export default function GlossaryIndexClient({
  entries,
  initialQuery = "",
  className,
}: GlossaryIndexClientProps) {
  const [filters, setFilters] = useState<GlossaryFilterState>({
    query: initialQuery,
    category: "all",
  });

  const visibleEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          matchesCategory(e, filters.category) &&
          matchesQuery(e, filters.query)
      ),
    [entries, filters]
  );

  return (
    <div
      className={[
        className ?? "",
        // 🔥 GLOBAL CONTRAST FIX
        "[&_div]:text-[#0d2447]",
        "[&_p]:text-[#27476f]",
        "[&_span]:text-[#0d2447]",
        "[&_input]:bg-[#dceaf8]",
        "[&_select]:bg-[#dceaf8]",
        "[&_input]:text-[#0d2447]",
        "[&_select]:text-[#0d2447]",
        "[&_input]:border-[#9db8d4]",
        "[&_select]:border-[#9db8d4]",
        // 🔥 REMOVE DARK SEARCH BAR
        "[&_input]:bg-[#dceaf8]",
        // 🔥 FIX ENTRY ROWS
        "[&_.rounded-xl.border]:bg-[#dceaf8]",
        "[&_.rounded-xl.border]:border-[#9db8d4]",
        "[&_.rounded-xl.border]:text-[#0d2447]",
      ].join(" ")}
    >
      <GlossaryFilter
        initialQuery={initialQuery}
        initialCategory="all"
        onChange={setFilters}
      />

      {/* COUNT */}
      <div className="mt-4 flex items-center justify-between px-1 text-sm text-[#27476f]">
        <span>
          Showing{" "}
          <span className="font-semibold text-[#0d2447]">
            {visibleEntries.length}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-[#0d2447]">
            {entries.length}
          </span>{" "}
          entr{entries.length === 1 ? "y" : "ies"}
        </span>
      </div>

      {/* LIST */}
      <div className="mt-3 grid gap-2">
        {visibleEntries.length > 0 ? (
          visibleEntries.map((entry) => (
            <GlossaryEntry key={entry.key} entry={entry} />
          ))
        ) : (
          <div className="rounded-xl border border-[#9db8d4] bg-[#dceaf8] p-8 text-center text-sm text-[#27476f]">
            <svg
              className="mx-auto mb-3 h-8 w-8 text-[#6f96bd]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            No glossary entries matched the current filters.
          </div>
        )}
      </div>
    </div>
  );
}