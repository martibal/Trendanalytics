"use client";

import { useMemo, useState } from "react";
import type { GlossaryEntry as GlossaryEntryType } from "@/data/glossary";

export type GlossaryIndexClientProps = {
  entries: GlossaryEntryType[];
  initialQuery?: string;
  className?: string;
};

type FilterState = {
  query: string;
  category: string;
};

function normalizeCategory(value?: string | null) {
  const next = (value ?? "").trim().toLowerCase();
  return next.length > 0 ? next : "all";
}

function categoryLabel(value: string) {
  if (value === "all") return "All";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function matchesCategory(entry: GlossaryEntryType, category: string) {
  if (category === "all") return true;
  return normalizeCategory(entry.category) === category;
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

function EntryMeta({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <div className="grid gap-1 border-t border-[rgba(232,224,208,.07)] pt-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#C49230]">
        {label}
      </dt>
      <dd className="min-w-0 break-words font-mono text-[12px] leading-6 text-[#7A8A96]">
        {value}
      </dd>
    </div>
  );
}

function GlossaryRow({ entry }: { entry: GlossaryEntryType }) {
  return (
    <details className="group border-b border-[rgba(232,224,208,.07)] py-5">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-6 outline-none">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h3 className="font-[var(--serif)] text-[24px] font-normal leading-[1.16] tracking-[-0.02em] text-[#E8E0D0] transition group-hover:text-[#D9AB4A]">
              {entry.label}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">
              {entry.category}
            </span>
          </div>

          <p className="mt-3 max-w-3xl text-[15px] leading-[1.78] text-[#7A8A96]">
            {entry.description.basic}
          </p>
        </div>

        <span className="mt-1 shrink-0 font-mono text-[16px] leading-none text-[#C49230] transition group-open:rotate-180">
          +
        </span>
      </summary>

      <div className="mt-6 grid gap-7 pl-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10">
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">
            Basic
          </div>
          <p className="mt-3 text-[15px] leading-[1.82] text-[#7A8A96]">
            {entry.description.basic}
          </p>
        </section>

        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">
            Advanced
          </div>
          <p className="mt-3 text-[15px] leading-[1.82] text-[#7A8A96]">
            {entry.description.advanced}
          </p>
        </section>
      </div>

      {(entry.units || entry.sourcePath || entry.fieldPath) && (
        <dl className="mt-7 grid gap-4">
          <EntryMeta label="Unit" value={entry.units} />
          <EntryMeta label="Source" value={entry.sourcePath} />
          <EntryMeta label="Field" value={entry.fieldPath} />
        </dl>
      )}
    </details>
  );
}

export default function GlossaryIndexClient({
  entries,
  initialQuery = "",
  className,
}: GlossaryIndexClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    query: initialQuery,
    category: "all",
  });

  const categories = useMemo(() => {
    const unique = new Set<string>();
    entries.forEach((entry) => unique.add(normalizeCategory(entry.category)));

    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [entries]);

  const visibleEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          matchesCategory(entry, filters.category) &&
          matchesQuery(entry, filters.query),
      ),
    [entries, filters],
  );

  return (
    <section className={className}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .glossary-list summary::-webkit-details-marker { display: none; }
            .glossary-list details[open] summary > span:last-child { transform: rotate(45deg); }
          `,
        }}
      />

      <div className="border-t border-b border-[rgba(232,224,208,.07)] py-6">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">
              Search glossary
            </span>
            <input
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
              placeholder="Search terms, descriptions, keys..."
              className="mt-3 w-full rounded-[3px] border border-[rgba(232,224,208,.14)] bg-[#111E30] px-4 py-3 font-sans text-[15px] text-[#E8E0D0] outline-none transition placeholder:text-[#3A4A57] focus:border-[rgba(196,146,48,.35)]"
            />
          </label>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">
              Category
            </span>
            <select
              value={filters.category}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              className="mt-3 w-full rounded-[3px] border border-[rgba(232,224,208,.14)] bg-[#111E30] px-4 py-3 font-sans text-[15px] text-[#E8E0D0] outline-none transition focus:border-[rgba(196,146,48,.35)]"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[13px] leading-6 text-[#7A8A96]">
        <span>
          Showing{" "}
          <span className="font-mono text-[#E8E0D0]">
            {visibleEntries.length}
          </span>{" "}
          of{" "}
          <span className="font-mono text-[#E8E0D0]">{entries.length}</span>{" "}
          entr{entries.length === 1 ? "y" : "ies"}
        </span>

        {filters.query.trim().length > 0 || filters.category !== "all" ? (
          <button
            type="button"
            onClick={() => setFilters({ query: "", category: "all" })}
            className="border-b border-[rgba(196,146,48,.20)] pb-[1px] font-mono text-[11px] uppercase tracking-[0.08em] text-[#C49230] transition hover:border-[#C49230] hover:text-[#D9AB4A]"
          >
            Reset filters
          </button>
        ) : null}
      </div>

      <div className="glossary-list mt-5 border-t border-[rgba(232,224,208,.07)]">
        {visibleEntries.length > 0 ? (
          visibleEntries.map((entry) => (
            <GlossaryRow key={entry.key} entry={entry} />
          ))
        ) : (
          <div className="border-b border-[rgba(232,224,208,.07)] py-10">
            <div className="font-[var(--serif)] text-[26px] text-[#E8E0D0]">
              No matching entry.
            </div>
            <p className="mt-3 max-w-2xl text-[15px] leading-[1.82] text-[#7A8A96]">
              No glossary entry matched the current filters. Try a broader term
              such as confidence, regime, scorecard, lag, or freshness.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}