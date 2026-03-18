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
    "rounded-full border px-3 py-1 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const active = "bg-muted";
  const inactive = "bg-transparent hover:bg-muted/40";

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-muted-foreground">{label}</div>

      <div className="inline-flex items-center gap-1 rounded-full border p-1">
        <button
          type="button"
          className={`${btnBase} ${level === "Basic" ? active : inactive}`}
          onClick={() => onChange("Basic")}
          aria-pressed={level === "Basic"}
        >
          Basic
        </button>

        <button
          type="button"
          className={`${btnBase} ${level === "Advanced" ? active : inactive}`}
          onClick={() => onChange("Advanced")}
          aria-pressed={level === "Advanced"}
        >
          Advanced
        </button>
      </div>
    </div>
  );
}