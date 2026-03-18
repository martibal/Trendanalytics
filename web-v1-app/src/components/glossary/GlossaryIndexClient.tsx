// src/components/glossary/GlossaryIndexClient.tsx
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

function matchesCategory(
  entry: GlossaryEntryType,
  category: GlossaryFilterCategory
) {
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

export default function GlossaryIndexClient(
  props: GlossaryIndexClientProps
) {
  const { entries, initialQuery = "", className } = props;

  const [filters, setFilters] = useState<GlossaryFilterState>({
    query: initialQuery,
    category: "all",
  });

  const visibleEntries = useMemo(() => {
    return entries.filter(
      (entry) =>
        matchesCategory(entry, filters.category) &&
        matchesQuery(entry, filters.query)
    );
  }, [entries, filters]);

  return (
    <div className={className}>
      <GlossaryFilter
        initialQuery={initialQuery}
        initialCategory="all"
        onChange={setFilters}
      />

      <div className="mt-6 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {visibleEntries.length}
        </span>{" "}
        of{" "}
        <span className="font-medium text-foreground">{entries.length}</span>{" "}
        glossary entr{entries.length === 1 ? "y" : "ies"}.
      </div>

      <div className="mt-6 grid gap-4">
        {visibleEntries.length > 0 ? (
          visibleEntries.map((entry) => (
            <GlossaryEntry key={entry.key} entry={entry} />
          ))
        ) : (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            No glossary entries matched the current filters.
          </div>
        )}
      </div>
    </div>
  );
}