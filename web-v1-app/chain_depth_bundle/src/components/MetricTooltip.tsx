// src/components/MetricTooltip.tsx
"use client";

import { useState, type ReactNode } from "react";

export type ExplanationLevel = "Basic" | "Advanced";

export type MetricTooltipProps = {
  title: string;
  what: ReactNode;
  why?: ReactNode;
  how?: ReactNode;
  basic?: ReactNode;
  advanced?: ReactNode;
  units?: string;
  sourcePath?: string;
  fieldPath?: string;
  className?: string;
};

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>;
}

export default function MetricTooltip(props: MetricTooltipProps) {
  const {
    title,
    what,
    why,
    how,
    basic,
    advanced,
    units,
    sourcePath,
    fieldPath,
    className,
  } = props;

  const hasLevels = Boolean(basic || advanced);
  const [level, setLevel] = useState<ExplanationLevel>("Basic");

  const activeBody = hasLevels
    ? level === "Advanced"
      ? advanced
      : basic
    : why ?? how;

  return (
    <div
      className={[
        "rounded-2xl border bg-background p-4 text-sm shadow-sm",
        className ?? "",
      ].join(" ")}
      role="note"
      aria-label={`${title} explainer`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium text-foreground">{title}</div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">{what}</div>
        </div>

        {hasLevels ? (
          <div className="inline-flex rounded-xl border bg-muted/30 p-1 text-xs">
            <button
              type="button"
              onClick={() => setLevel("Basic")}
              aria-pressed={level === "Basic"}
              className={`rounded-lg px-3 py-1.5 transition ${
                level === "Basic"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Basic
            </button>
            <button
              type="button"
              onClick={() => setLevel("Advanced")}
              aria-pressed={level === "Advanced"}
              className={`rounded-lg px-3 py-1.5 transition ${
                level === "Advanced"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Advanced
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 leading-6">
        {why ? (
          <div className="rounded-xl border bg-muted/10 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Why it matters
            </div>
            <div className="mt-2 text-muted-foreground">{why}</div>
          </div>
        ) : null}

        {activeBody ? (
          <div className="rounded-xl border bg-muted/10 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {hasLevels
                ? level === "Advanced"
                  ? "Advanced explanation"
                  : "Basic explanation"
                : how
                ? "How to read it"
                : "Explanation"}
            </div>
            <div className="mt-2 text-muted-foreground">{activeBody}</div>
          </div>
        ) : null}

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
          Governance note: this explainer is descriptive only. It does not infer future
          conditions, does not revise the published output, and does not provide
          recommendations.
        </div>
      </div>
    </div>
  );
}
