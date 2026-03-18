// src/components/MetricTooltip.tsx
"use client";

import type { ReactNode } from "react";

export type MetricTooltipProps = {
  title: string;
  what: ReactNode;
  why?: ReactNode;
  how?: ReactNode;
  units?: string;
  sourcePath?: string;
  fieldPath?: string;
  className?: string;
};

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="font-medium text-foreground">{label}:</span>{" "}
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}

export default function MetricTooltip(props: MetricTooltipProps) {
  const {
    title,
    what,
    why,
    how,
    units,
    sourcePath,
    fieldPath,
    className,
  } = props;

  const hasTraceability =
    (typeof units === "string" && units.trim().length > 0) ||
    (typeof sourcePath === "string" && sourcePath.trim().length > 0) ||
    (typeof fieldPath === "string" && fieldPath.trim().length > 0);

  return (
    <div
      className={[
        "rounded-xl border bg-background p-4 text-sm shadow-sm",
        className ?? "",
      ].join(" ")}
      role="note"
      aria-label={`${title} tooltip`}
    >
      <div className="font-medium text-foreground">{title}</div>

      <div className="mt-3 grid gap-3 leading-6">
        <Row label="What">{what}</Row>

        {why ? <Row label="Why">{why}</Row> : null}
        {how ? <Row label="How">{how}</Row> : null}

        {hasTraceability ? (
          <div className="rounded-lg border bg-muted/20 p-3 text-xs">
            <div className="font-medium text-foreground">Traceability</div>

            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
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
          Governance note: this tooltip is descriptive only and does not change, infer, or
          recommend any value.
        </div>
      </div>
    </div>
  );
}