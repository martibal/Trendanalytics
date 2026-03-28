// src/components/ui/ExplainableCard.tsx
"use client";

import type { ReactNode } from "react";

export type ExplainableCardProps = {
  title: string;
  short: ReactNode;
  basic: ReactNode;
  advanced: ReactNode;
  whyCare?: ReactNode;
  badge?: ReactNode;
  level: "Basic" | "Advanced";
  defaultOpen?: boolean;
  traceability?: ReactNode;
  caveats?: ReactNode;
};

export default function ExplainableCard({
  title,
  short,
  basic,
  advanced,
  whyCare,
  badge,
  level,
  defaultOpen = false,
  traceability,
  caveats,
}: ExplainableCardProps) {
  const active = level === "Advanced" ? advanced : basic;

  return (
    <details className="rounded-2xl border p-5 shadow-sm" open={defaultOpen}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-foreground">{title}</div>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">{short}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {badge}
            <span>More</span>
          </div>
        </div>
      </summary>

      <div className="mt-4 grid gap-4 border-t pt-4 text-sm leading-6 text-muted-foreground">
        {whyCare ? (
          <div className="rounded-xl border bg-muted/10 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Why this is on the page
            </div>
            <div className="mt-2">{whyCare}</div>
          </div>
        ) : null}

        <div className="rounded-xl border bg-muted/10 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {level === "Advanced" ? "Advanced explanation" : "Basic explanation"}
          </div>
          <div className="mt-2">{active}</div>
        </div>

        {traceability ? (
          <div className="rounded-xl border p-4">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Traceability
            </div>
            <div className="mt-2 text-xs leading-6">{traceability}</div>
          </div>
        ) : null}

        {caveats ? (
          <div className="rounded-xl border p-4">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Caveats
            </div>
            <div className="mt-2 text-xs leading-6">{caveats}</div>
          </div>
        ) : null}
      </div>
    </details>
  );
}
