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

  const active = level === "Advanced" ? advanced : basic;

  return (
    <details className="rounded-2xl border" open={defaultOpen}>
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">
            Level: <span className="font-medium text-foreground">{level}</span>
          </div>
        </div>
        <div className="mt-2 text-sm leading-6 text-muted-foreground">{what}</div>
      </summary>

      <div className="border-t px-4 pb-4 pt-4">
        <div className="grid gap-4 text-sm leading-6 text-muted-foreground">
          <div className="rounded-xl border bg-muted/10 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {level === "Advanced" ? "Advanced explanation" : "Basic explanation"}
            </div>
            <div className="mt-2">{active}</div>
          </div>

          {(units || sourcePath || fieldPath) && (
            <div className="rounded-xl border p-4 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Traceability</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {units ? (
                  <li>
                    Units: <InlineCode>{units}</InlineCode>
                  </li>
                ) : null}
                {sourcePath ? (
                  <li>
                    Source: <InlineCode>{sourcePath}</InlineCode>
                  </li>
                ) : null}
                {fieldPath ? (
                  <li>
                    Field: <InlineCode>{fieldPath}</InlineCode>
                  </li>
                ) : null}
              </ul>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Governance note: this box is descriptive only. It explains the published field
            and why it is surfaced; it does not alter or infer values.
          </div>
        </div>
      </div>
    </details>
  );
}
