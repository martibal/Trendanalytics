// src/components/MetricInfoBox.tsx
"use client";

import * as React from "react";
import { type ExplanationLevel } from "@/components/ExplanationLevelToggle";
import MetricTooltip from "@/components/MetricTooltip";

export type MetricInfoBoxProps = {
  title: string;

  /**
   * Short, descriptive definition. Must not be advisory.
   * Shown regardless of level (acts as a stable anchor).
   */
  what: React.ReactNode;

  /**
   * Basic explanation (simple language).
   */
  basic: React.ReactNode;

  /**
   * Advanced explanation (method, formulas, edge cases).
   */
  advanced: React.ReactNode;

  /**
   * Optional: show the source path for traceability.
   * Example: /public/data/published/v1/meta/<chain>/latest.json
   */
  sourcePath?: string;

  /**
   * Optional: show the JSON field path for traceability.
   * Example: scorecard.dimensions.demand.score
   */
  fieldPath?: string;

  /**
   * Optional: show units or transformation notes.
   */
  units?: string;

  /**
   * Controlled by parent (e.g., chain page).
   */
  level: ExplanationLevel;

  /**
   * Optional: default collapsed.
   */
  defaultOpen?: boolean;
};

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

export default function MetricInfoBox(props: MetricInfoBoxProps) {
  const {
    title,
    what,
    basic,
    advanced,
    sourcePath,
    fieldPath,
    units,
    level,
    defaultOpen = false,
  } = props;

  const hasTraceability =
    typeof units === "string" ||
    typeof sourcePath === "string" ||
    typeof fieldPath === "string";

  const activeExplanation = level === "Basic" ? basic : advanced;

  return (
    <details className="rounded-xl border p-4" open={defaultOpen}>
      <summary className="cursor-pointer select-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">
            Level: <span className="font-medium text-foreground">{level}</span>
          </div>
        </div>

        <div className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">What:</span> {what}
        </div>
      </summary>

      <div className="mt-3 grid gap-3 text-sm leading-6 text-muted-foreground">
        {level === "Basic" ? (
          <div>
            <div className="text-xs font-medium text-foreground">Basic</div>
            <div className="mt-1">{basic}</div>
          </div>
        ) : (
          <div>
            <div className="text-xs font-medium text-foreground">Advanced</div>
            <div className="mt-1">{advanced}</div>
          </div>
        )}

        <MetricTooltip
          title={title}
          what={what}
          why={activeExplanation}
          units={units}
          sourcePath={sourcePath}
          fieldPath={fieldPath}
        />

        {hasTraceability ? (
          <div className="rounded-lg border bg-muted/20 p-3 text-xs">
            <div className="font-medium text-foreground">Traceability</div>

            <ul className="mt-2 list-disc pl-5">
              {typeof units === "string" && units.trim().length > 0 ? (
                <li>
                  Units: <InlineCode>{units}</InlineCode>
                </li>
              ) : null}

              {typeof sourcePath === "string" && sourcePath.trim().length > 0 ? (
                <li>
                  Source: <InlineCode>{sourcePath}</InlineCode>
                </li>
              ) : null}

              {typeof fieldPath === "string" && fieldPath.trim().length > 0 ? (
                <li>
                  Field: <InlineCode>{fieldPath}</InlineCode>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        <div className="text-xs text-muted-foreground">
          Governance note: this box is descriptive and does not modify or infer values.
        </div>
      </div>
    </details>
  );
}