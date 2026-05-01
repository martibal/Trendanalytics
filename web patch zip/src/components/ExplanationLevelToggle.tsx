// src/components/ExplanationLevelToggle.tsx
"use client";

import * as React from "react";

export type ExplanationLevel = "Basic" | "Advanced";

export default function ExplanationLevelToggle({
  level,
  onChange,
  label = "Explanation level",
}: {
  level: ExplanationLevel;
  onChange: (next: ExplanationLevel) => void;
  label?: string;
}) {
  const btnBase =
    "rounded-full px-3 py-1.5 text-sm transition-colors focus-ring";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="eyebrow-label">{label}</div>

      <div
        className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 p-1"
        role="group"
        aria-label={label}
      >
        <button
          type="button"
          className={`${btnBase} ${
            level === "Basic"
              ? "bg-muted text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
          onClick={() => onChange("Basic")}
          aria-pressed={level === "Basic"}
        >
          Basic
        </button>

        <button
          type="button"
          className={`${btnBase} ${
            level === "Advanced"
              ? "bg-muted text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
          onClick={() => onChange("Advanced")}
          aria-pressed={level === "Advanced"}
        >
          Advanced
        </button>
      </div>
    </div>
  );
}
