// src/components/mobile/MobileWikiClient.tsx
"use client";

import { useState, useCallback } from "react";
import { searchWiki, type WikiEntry, type WikiCategory } from "@/lib/mobile/wiki";

type WikiCategoryMeta = {
  key: WikiCategory;
  label: string;
  description: string;
};

const CATEGORY_ICONS: Record<WikiCategory, string> = {
  regime: "◉",
  confidence: "◎",
  scorecard: "▦",
  calculations: "∑",
  json: "{ }",
  pipeline: "⟳",
  chains: "⬡",
};

const CATEGORY_COLORS: Record<WikiCategory, string> = {
  regime: "#22d3ee",
  confidence: "#a78bfa",
  scorecard: "#34d399",
  calculations: "#fbbf24",
  json: "#f472b6",
  pipeline: "#60a5fa",
  chains: "#fb923c",
};

function EntryCard({
  entry,
  onSelect,
}: {
  entry: WikiEntry;
  onSelect: (e: WikiEntry) => void;
}) {
  const color = CATEGORY_COLORS[entry.category];
  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="w-full text-left rounded-2xl border border-white/8 bg-white/[0.03] p-4 active:bg-white/[0.06] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-white">{entry.label}</div>
          <p className="mt-1 text-[11px] leading-[1.65] text-slate-400 line-clamp-2">
            {entry.basic}
          </p>
        </div>
        <span
          className="shrink-0 rounded-lg px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider mt-0.5"
          style={{ color, backgroundColor: color + "18" }}
        >
          {entry.category}
        </span>
      </div>
      {entry.fieldPath && (
        <div className="mt-2 font-mono text-[9px] text-slate-600">
          {entry.fieldPath}
        </div>
      )}
    </button>
  );
}

function EntryDetail({
  entry,
  onClose,
  onRelated,
}: {
  entry: WikiEntry;
  onClose: () => void;
  onRelated: (key: string) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const color = CATEGORY_COLORS[entry.category];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0A0E1A] pt-safe-top">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 text-lg pr-1"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-white">{entry.label}</div>
          <div
            className="text-[10px] font-bold mt-0.5"
            style={{ color }}
          >
            {entry.category}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-safe-bottom space-y-4">

        {/* Basic */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 mb-2">
            Plain language
          </div>
          <p className="text-[13px] leading-[1.7] text-slate-200">
            {entry.basic}
          </p>
        </div>

        {/* Advanced (collapsible) */}
        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              Technical detail
            </span>
            <span className="text-slate-400 text-sm">
              {showAdvanced ? "▲" : "▼"}
            </span>
          </button>
          {showAdvanced && (
            <div className="px-4 pb-4">
              <p className="text-[12px] leading-[1.7] text-slate-300">
                {entry.advanced}
              </p>
            </div>
          )}
        </div>

        {/* Field path */}
        {entry.fieldPath && (
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
            <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">
              JSON field
            </div>
            <code className="font-mono text-[11px] text-slate-300">
              {entry.fieldPath}
            </code>
          </div>
        )}

        {/* Related terms */}
        {entry.related && entry.related.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider">
              Related
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.related.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onRelated(key)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-300 active:bg-white/[0.08]"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MobileWikiClient({
  entries,
  categories,
}: {
  entries: WikiEntry[];
  categories: WikiCategoryMeta[];
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<WikiCategory | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<WikiEntry | null>(null);

  const results = query.trim()
    ? searchWiki(query)
    : activeCategory
    ? entries.filter((e) => e.category === activeCategory)
    : entries;

  const handleRelated = useCallback(
    (key: string) => {
      const found = entries.find((e) => e.key === key);
      if (found) setSelectedEntry(found);
    },
    [entries]
  );

  return (
    <>
      {/* Entry detail overlay */}
      {selectedEntry && (
        <EntryDetail
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onRelated={handleRelated}
        />
      )}

      {/* Search */}
      <div className="sticky top-[60px] z-10 bg-[#0A0E1A] px-4 py-2.5 border-b border-white/5">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveCategory(null);
          }}
          placeholder="Search terms, fields, or concepts..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-[13px] text-white placeholder-slate-500 outline-none focus:border-cyan-500/40 focus:bg-white/[0.07]"
        />
      </div>

      {/* Category filter (hidden when searching) */}
      {!query && (
        <div className="overflow-x-auto border-b border-white/5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2 px-4 py-2.5 min-w-max">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                activeCategory === null
                  ? "bg-white/10 text-white"
                  : "text-slate-500"
              }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const color = CATEGORY_COLORS[cat.key];
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(isActive ? null : cat.key)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-colors"
                  style={{
                    backgroundColor: isActive ? color + "22" : "transparent",
                    color: isActive ? color : "#64748b",
                    border: isActive ? `1px solid ${color}44` : "1px solid transparent",
                  }}
                >
                  <span>{CATEGORY_ICONS[cat.key]}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="px-4 py-3 space-y-2.5">
        {results.length === 0 ? (
          <div className="py-12 text-center text-[12px] text-slate-600">
            No results for &quot;{query}&quot;
          </div>
        ) : (
          results.map((entry) => (
            <EntryCard
              key={entry.key}
              entry={entry}
              onSelect={setSelectedEntry}
            />
          ))
        )}
      </div>
    </>
  );
}
