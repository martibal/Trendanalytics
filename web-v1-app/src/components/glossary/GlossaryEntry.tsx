// src/components/glossary/GlossaryEntry.tsx
"use client";

import { useState } from "react";
import type { GlossaryEntry as GlossaryEntryType } from "@/data/glossary";

function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>;
}

function categoryLabel(category: GlossaryEntryType["category"]): string {
  switch (category) {
    case "regime":     return "Regime";
    case "confidence": return "Confidence";
    case "scorecard":  return "Scorecard";
    case "drivers":    return "Drivers";
    case "charts":     return "Charts";
    case "freshness":  return "Freshness";
    case "metadata":   return "Metadata";
    default:           return category;
  }
}

export type GlossaryEntryProps = {
  entry: GlossaryEntryType;
};

export default function GlossaryEntry({ entry }: GlossaryEntryProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border transition-colors hover:border-border/80">
      {/* Closed state: always visible — label, key, category */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{entry.label}</span>
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
              {categoryLabel(entry.category)}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Key: <InlineCode>{entry.key}</InlineCode>
          </div>
        </div>

        <svg
          className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Open state: full detail */}
      {open && (
        <div className="border-t px-5 pb-5 pt-4">
          <div className="grid gap-4 text-sm">
            {/* Basic */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basic</div>
              <div className="mt-1 leading-6 text-muted-foreground">{entry.description.basic}</div>
            </div>

            {/* Advanced */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Advanced</div>
              <div className="mt-1 leading-6 text-muted-foreground">{entry.description.advanced}</div>
            </div>

            {/* Traceability */}
            {(entry.units || entry.sourcePath || entry.fieldPath) && (
              <div className="rounded-lg border bg-muted/20 p-3 text-xs">
                <div className="font-medium text-foreground">Traceability</div>
                <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
                  {entry.units && (
                    <li>Units: <InlineCode>{entry.units}</InlineCode></li>
                  )}
                  {entry.sourcePath && (
                    <li>Source path: <InlineCode>{entry.sourcePath}</InlineCode></li>
                  )}
                  {entry.fieldPath && (
                    <li>Field path: <InlineCode>{entry.fieldPath}</InlineCode></li>
                  )}
                </ul>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Governance note: this entry is descriptive only and does not modify, infer, or recommend any value.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
