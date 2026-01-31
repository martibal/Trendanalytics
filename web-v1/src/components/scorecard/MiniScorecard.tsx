"use client";

import React from "react";

type ExplainMode = "basic" | "advanced";

type Dim = {
  level: string;
  score: number;
  coverage_factor: number;
};

export function MiniScorecard({
  dimensions,
  windowDays,
  explainMode,
}: {
  dimensions: Record<string, Dim>;
  windowDays: number;
  explainMode?: ExplainMode;
}) {
  const mode: ExplainMode = explainMode === "advanced" ? "advanced" : "basic";

  const items = [
    { key: "demand", label: "Demand" },
    { key: "friction", label: "Friction" },
    { key: "capacity", label: "Capacity" },
  ] as const;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map(({ key, label }) => {
        const d = dimensions[key];
        if (!d) return null;

        const covPct = Math.round(d.coverage_factor * 100);
        const score0 = Math.round(d.score);

        const title =
          `${label} · ${windowDays}d · score ${d.score.toFixed(1)} · coverage ${covPct}%` +
          (covPct < 50 ? " · low coverage pulls toward 50" : "");

        return (
          <span
            key={key}
            title={title}
            className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-200"
          >
            <span className="mr-1 text-zinc-400">{label}:</span>
            <span className="font-medium">{d.level}</span>

            {mode === "advanced" ? (
              <span className="ml-2 text-zinc-400 tabular-nums">
                {score0} · {covPct}%
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
