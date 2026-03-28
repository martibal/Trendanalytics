// src/components/track-record/RegimeTimeline.tsx
"use client";

import { getRegimeColorByLabel } from "@/lib/design-tokens";

export type TimelineEntry = {
  date: string;
  regime: string;
  confidence: number | null;
};

export type RegimeTimelineProps = {
  entries: TimelineEntry[];
  className?: string;
};

const REGIME_LABELS = ["STABLE", "HEATING", "CONGESTED", "CHEAP", "UNKNOWN/DEGRADED"] as const;

function getColor(regime: string): string {
  const upper = regime?.trim().toUpperCase();
  if (upper === "STABLE") return getRegimeColorByLabel("STABLE");
  if (upper === "HEATING") return getRegimeColorByLabel("HEATING");
  if (upper === "CONGESTED") return getRegimeColorByLabel("CONGESTED");
  if (upper === "CHEAP") return getRegimeColorByLabel("CHEAP");
  return getRegimeColorByLabel("UNKNOWN/DEGRADED");
}

function regimeMeaning(label: string): string {
  if (label === "STABLE") return "conditions are closer to the chain’s typical operating range";
  if (label === "HEATING") return "usage pressure is rising relative to recent history";
  if (label === "CONGESTED") return "demand/friction conditions are elevated versus the chain’s normal range";
  if (label === "CHEAP") return "activity or pricing pressure is unusually soft relative to recent history";
  return "published evidence is below the canonical confidence floor or otherwise degraded";
}

export default function RegimeTimeline({ entries, className }: RegimeTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className={`rounded-xl border p-6 text-sm text-muted-foreground ${className ?? ""}`}>
        No timeline data available for the selected filters.
      </div>
    );
  }

  type Run = { regime: string; from: string; to: string; count: number; color: string };
  const runs: Run[] = [];
  for (const entry of entries) {
    const last = runs[runs.length - 1];
    if (last && last.regime === entry.regime) {
      last.to = entry.date;
      last.count += 1;
    } else {
      runs.push({
        regime: entry.regime,
        from: entry.date,
        to: entry.date,
        count: 1,
        color: getColor(entry.regime),
      });
    }
  }

  const total = entries.length;

  return (
    <div className={className}>
      <div className="mb-4 rounded-xl border bg-muted/10 p-3 text-xs leading-6 text-muted-foreground">
        <div>
          This bar shows the sequence of <strong>published daily regime labels</strong> inside the selected window.
          It is a descriptive timeline of what the product published on each date.
        </div>
        <div className="mt-1">
          Read it as persistence and switching behavior over time: long same-color stretches indicate the same
          published regime persisted across many days; short stretches indicate faster regime turnover.
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        {REGIME_LABELS.map((label) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            title={regimeMeaning(label)}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getColor(label) }}
              aria-hidden="true"
            />
            {label}
          </span>
        ))}
      </div>

      <div
        className="flex h-10 w-full overflow-hidden rounded-xl border"
        role="img"
        aria-label="Regime timeline bar"
      >
        {runs.map((run, i) => (
          <div
            key={i}
            title={`${run.regime}: ${run.from} → ${run.to} (${run.count} row${run.count !== 1 ? "s" : ""})`}
            style={{
              width: `${(run.count / total) * 100}%`,
              backgroundColor: run.color,
              opacity: 0.85,
            }}
          />
        ))}
      </div>

      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
        <span>{entries[0]?.date ?? "—"}</span>
        <span>{entries[entries.length - 1]?.date ?? "—"}</span>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Rows correspond to published chronological entries in the current view.
      </div>

      <div className="mt-6 rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Regime</th>
              <th className="px-4 py-2 font-medium">From</th>
              <th className="px-4 py-2 font-medium">To</th>
              <th className="px-4 py-2 font-medium text-right">Rows</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: run.color }}
                      aria-hidden="true"
                    />
                    <span className="font-medium" style={{ color: run.color }}>
                      {run.regime}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{run.from}</td>
                <td className="px-4 py-2 text-muted-foreground">{run.to}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">{run.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
