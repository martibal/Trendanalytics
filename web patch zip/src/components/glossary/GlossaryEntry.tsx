// src/components/glossary/GlossaryEntry.tsx
"use client";

import { useState } from "react";

type GlossaryCategory =
  | "regime"
  | "confidence"
  | "scorecard"
  | "drivers"
  | "charts"
  | "freshness"
  | "metadata";

type GlossaryEntryData = {
  key: string;
  label: string;
  category: GlossaryCategory;
  description: { basic: string; advanced: string };
  units?: string;
  sourcePath?: string;
  fieldPath?: string;
};

const CATEGORY_COLORS: Record<GlossaryCategory, string> = {
  regime:     "border-purple-500/30 bg-purple-500/10 text-purple-300",
  confidence: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  scorecard:  "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  drivers:    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  charts:     "border-blue-500/30 bg-blue-500/10 text-blue-300",
  freshness:  "border-orange-500/30 bg-orange-500/10 text-orange-300",
  metadata:   "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  regime:     "Regime",
  confidence: "Confidence",
  scorecard:  "Scorecard",
  drivers:    "Drivers",
  charts:     "Charts",
  freshness:  "Freshness",
  metadata:   "Metadata",
};

function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
      {children}
    </code>
  );
}

export default function GlossaryEntry({ entry }: { entry: GlossaryEntryData }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"basic" | "advanced">("basic");

  const catColor = CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.metadata;
  const catLabel = CATEGORY_LABELS[entry.category] ?? entry.category;
  const text = mode === "basic" ? entry.description.basic : entry.description.advanced;
  const hasContent =
    (entry.description.basic && entry.description.basic !== "No basic explanation provided yet.") ||
    (entry.description.advanced && entry.description.advanced !== "No advanced explanation provided yet.");

  return (
    <article className={`rounded-2xl border transition-colors ${open ? "border-white/15 bg-card" : "border-border bg-background/40 hover:border-white/10"}`}>
      {/* ── Collapsed header — always visible ─────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {/* Label */}
          <span className="text-sm font-semibold text-white">{entry.label}</span>

          {/* Category pill */}
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${catColor}`}>
            {catLabel}
          </span>

          {/* Units pill */}
          {entry.units ? (
            <span className="hidden rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
              {entry.units}
            </span>
          ) : null}

          {/* No content warning */}
          {!hasContent ? (
            <span className="rounded-full border border-rose-500/20 bg-rose-500/5 px-2 py-0.5 text-[10px] text-rose-400">
              no description yet
            </span>
          ) : null}
        </div>

        {/* Key + chevron */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:block">
            {entry.key}
          </span>
          <svg
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* ── Expanded body ──────────────────────────────────────────── */}
      {open ? (
        <div className="border-t border-white/8 px-5 pb-5 pt-4">
          {/* Key line (mobile) */}
          <div className="mb-3 font-mono text-[10px] text-muted-foreground sm:hidden">
            Key: <InlineCode>{entry.key}</InlineCode>
          </div>

          {/* Mode toggle */}
          <div className="mb-4 flex items-center gap-2">
            <div className="inline-flex rounded-xl border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setMode("basic")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  mode === "basic"
                    ? "bg-emerald-500/15 text-emerald-200 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={mode === "basic"}
              >
                Basic
              </button>
              <button
                type="button"
                onClick={() => setMode("advanced")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  mode === "advanced"
                    ? "bg-cyan-500/15 text-cyan-200 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={mode === "advanced"}
              >
                Advanced
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              {mode === "basic" ? "Plain language" : "Methodological depth"}
            </span>
          </div>

          {/* Description */}
          <div className={`rounded-2xl border p-4 ${mode === "basic" ? "border-emerald-500/20 bg-emerald-500/5" : "border-cyan-500/20 bg-cyan-500/5"}`}>
            <p className="text-sm leading-7 text-slate-100">
              {text || (
                <span className="italic text-muted-foreground">
                  No {mode} explanation provided yet.
                </span>
              )}
            </p>
          </div>

          {/* Traceability */}
          {(entry.sourcePath || entry.fieldPath) ? (
            <div className="mt-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-xs text-muted-foreground">
              <span className="font-medium uppercase tracking-[0.1em] text-slate-400">
                Traceability
              </span>
              <div className="mt-2 space-y-1">
                {entry.fieldPath ? (
                  <div>
                    Field: <InlineCode>{entry.fieldPath}</InlineCode>
                  </div>
                ) : null}
                {entry.sourcePath ? (
                  <div>
                    Source: <InlineCode>{entry.sourcePath}</InlineCode>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
