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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="font-medium text-foreground">{label}:</span>{" "}
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}

export default function MetricTooltip(props: MetricTooltipProps) {
  const { title, what, why, how, basic, advanced, units, sourcePath, fieldPath, className } = props;

  const hasExplainLevels = Boolean(basic || advanced);
  const [level, setLevel] = useState<ExplanationLevel>("Basic");

  const hasTraceability =
    (typeof units === "string" && units.trim().length > 0) ||
    (typeof sourcePath === "string" && sourcePath.trim().length > 0) ||
    (typeof fieldPath === "string" && fieldPath.trim().length > 0);

  const activeExplanation = hasExplainLevels
    ? level === "Basic"
      ? basic
      : advanced
    : why ?? how;

  return (
    <div
      className={[
        "rounded-2xl border border-border bg-background/70 p-4 text-sm shadow-sm",
        className ?? "",
      ].join(" ")}
      role="note"
      aria-label={`${title} tooltip`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
        </div>

        {hasExplainLevels && (
          <div
            className="inline-flex items-center rounded-full border border-border bg-background/80 p-1 text-xs"
            role="group"
            aria-label="Explanation level"
          >
            <button
              type="button"
              onClick={() => setLevel("Basic")}
              aria-pressed={level === "Basic"}
              className={`rounded-full px-2.5 py-1 transition focus-ring ${
                level === "Basic"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Basic
            </button>
            <button
              type="button"
              onClick={() => setLevel("Advanced")}
              aria-pressed={level === "Advanced"}
              className={`rounded-full px-2.5 py-1 transition focus-ring ${
                level === "Advanced"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Advanced
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-3 leading-6">
        <Row label="What">{what}</Row>

        {activeExplanation && (
          <Row label={hasExplainLevels ? level : why ? "Why" : "How"}>{activeExplanation}</Row>
        )}

        {hasTraceability && (
          <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs">
            <div className="font-medium text-foreground">Traceability</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {typeof units === "string" && units.trim() ? (
                <li>
                  Units: <InlineCode>{units}</InlineCode>
                </li>
              ) : null}
              {typeof sourcePath === "string" && sourcePath.trim() ? (
                <li>
                  Source: <InlineCode>{sourcePath}</InlineCode>
                </li>
              ) : null}
              {typeof fieldPath === "string" && fieldPath.trim() ? (
                <li>
                  Field: <InlineCode>{fieldPath}</InlineCode>
                </li>
              ) : null}
            </ul>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Descriptive only. This tooltip does not infer causes, forecast outcomes, or recommend actions.
        </div>
      </div>
    </div>
  );
}
