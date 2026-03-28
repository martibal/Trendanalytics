// src/components/glossary/GlossaryEntry.tsx
"use client";

import { useMemo, useState } from "react";

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
  description: {
    basic: string;
    advanced: string;
  };
  units?: string;
  sourcePath?: string;
  fieldPath?: string;
};

function categoryLabel(category: GlossaryCategory): string {
  switch (category) {
    case "regime":
      return "Regime";
    case "confidence":
      return "Confidence";
    case "scorecard":
      return "Scorecard";
    case "drivers":
      return "Drivers";
    case "charts":
      return "Charts";
    case "freshness":
      return "Freshness";
    case "metadata":
    default:
      return "Metadata";
  }
}

function categoryMeaning(category: GlossaryCategory): string {
  switch (category) {
    case "regime":
      return "Terms that describe the current published state of a chain, such as STABLE, HEATING, CONGESTED, CHEAP, or UNKNOWN/DEGRADED.";
    case "confidence":
      return "Terms that explain how much published evidence supports the visible state and when that state should be read more cautiously.";
    case "scorecard":
      return "Terms related to axis-level summaries such as Demand, Friction, and Capacity and their role in the current interpretation layer.";
    case "drivers":
      return "Terms that help explain why the current regime looks notable, including unusualness, percentile position, and momentum context.";
    case "charts":
      return "Terms that explain how visualized history, windows, and plotted series should be interpreted on the site.";
    case "freshness":
      return "Terms related to lag, publication cadence, stale states, delayed rows, and what it means for a row to still be usable but less current.";
    case "metadata":
    default:
      return "Terms that describe traceability, revision context, source paths, contract boundaries, and other supporting published fields.";
  }
}

function readingHint(category: GlossaryCategory): string {
  switch (category) {
    case "regime":
      return "Read this term together with confidence, lag, and drivers rather than as a standalone conclusion.";
    case "confidence":
      return "Read confidence as evidence strength for the current published state, not as a forecast or a probability of future continuation.";
    case "scorecard":
      return "Read scorecard terms as descriptive decomposition of the current state, not as hidden ratings of chain quality.";
    case "drivers":
      return "Read driver terms as the “because” behind the visible regime, not as isolated trading indicators.";
    case "charts":
      return "Read chart terms as aids for context and comparison over time, not as predictive technical analysis.";
    case "freshness":
      return "Read freshness terms relative to chain-specific publication cadence; delayed does not automatically mean invalid.";
    case "metadata":
    default:
      return "Read metadata terms as traceability context that helps you understand where a published value came from and how to interpret it safely.";
  }
}

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

export default function GlossaryEntry({
  entry,
}: {
  entry: GlossaryEntryData;
}) {
  const [mode, setMode] = useState<"basic" | "advanced">("basic");

  const categoryText = useMemo(
    () => categoryMeaning(entry.category),
    [entry.category]
  );

  const hintText = useMemo(
    () => readingHint(entry.category),
    [entry.category]
  );

  const mainText =
    mode === "basic" ? entry.description.basic : entry.description.advanced;

  return (
    <article className="rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {entry.label}
            </h3>
            <span className="rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {categoryLabel(entry.category)}
            </span>
            {entry.units ? (
              <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                Units: {entry.units}
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            Key: <InlineCode>{entry.key}</InlineCode>
          </div>
        </div>

        <div className="inline-flex rounded-xl border bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setMode("basic")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              mode === "basic"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
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
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
            aria-pressed={mode === "advanced"}
          >
            Advanced
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-muted/10 p-4">
        <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {mode === "basic" ? "Plain-language reading" : "Methodological reading"}
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{mainText}</p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border p-4">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Category context
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {categoryText}
          </p>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            How to use this definition
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {hintText}
          </p>
        </div>
      </div>

      {entry.sourcePath || entry.fieldPath ? (
        <div className="mt-4 rounded-xl border p-4 text-sm">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Traceability
          </div>

          <div className="mt-2 space-y-2 text-muted-foreground">
            {entry.sourcePath ? (
              <div>
                <span className="font-medium text-foreground">Source path:</span>{" "}
                <InlineCode>{entry.sourcePath}</InlineCode>
              </div>
            ) : null}

            {entry.fieldPath ? (
              <div>
                <span className="font-medium text-foreground">Field path:</span>{" "}
                <InlineCode>{entry.fieldPath}</InlineCode>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
