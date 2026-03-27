// src/components/MetricInfoBox.tsx
"use client";

import * as React from "react";
import { type ExplanationLevel } from "@/components/ExplanationLevelToggle";

export type MetricInfoBoxProps = {
  title: string;
  what: React.ReactNode;
  basic: React.ReactNode;
  advanced: React.ReactNode;
  sourcePath?: string;
  fieldPath?: string;
  units?: string;
  level: ExplanationLevel;
  defaultOpen?: boolean;
};

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>;
}

export default function MetricInfoBox(props: MetricInfoBoxProps) {
  const { title, what, basic, advanced, sourcePath, fieldPath, units, level, defaultOpen = false } = props;

  const hasTraceability =
    typeof units === "string" ||
    typeof sourcePath === "string" ||
    typeof fieldPath === "string";

  const activeExplanation = level === "Basic" ? basic : advanced;

  return (
    <details className="rounded-xl border" open={defaultOpen}>
      <summary className="cursor-pointer select-none px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">
            Level:{" "}
            <span className="font-medium text-foreground">{level}</span>
          </div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">What:</span> {what}
        </div>
      </summary>

      <div className="border-t px-4 pb-4 pt-3">
        <div className="grid gap-3 text-sm leading-6 text-muted-foreground">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-foreground">{level}</div>
            <div className="mt-1">{activeExplanation}</div>
          </div>

          {hasTraceability && (
            <div className="rounded-lg border bg-muted/20 p-3 text-xs">
              <div className="font-medium text-foreground">Traceability</div>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {typeof units === "string" && units.trim() && (
                  <li>Units: <InlineCode>{units}</InlineCode></li>
                )}
                {typeof sourcePath === "string" && sourcePath.trim() && (
                  <li>Source: <InlineCode>{sourcePath}</InlineCode></li>
                )}
                {typeof fieldPath === "string" && fieldPath.trim() && (
                  <li>Field: <InlineCode>{fieldPath}</InlineCode></li>
                )}
              </ul>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Governance note: this box is descriptive and does not modify or infer values.
          </div>
        </div>
      </div>
    </details>
  );
}
