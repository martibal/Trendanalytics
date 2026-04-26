// src/components/track-record/RegimeTimeline.tsx
"use client";

export type TimelineEntry = {
  date: string;
  regime: string;
  confidence: number | null;
};

export type RegimeTimelineProps = {
  entries: TimelineEntry[];
  className?: string;
};

const REGIME_LABELS = [
  "STABLE",
  "HEATING",
  "CONGESTED",
  "CHEAP",
  "UNKNOWN/DEGRADED",
] as const;

function getColor(regime: string): string {
  const upper = regime?.trim().toUpperCase();

  if (upper === "STABLE") return "#1f9f72";
  if (upper === "HEATING") return "#c49a00";
  if (upper === "CONGESTED") return "#d24a4a";
  if (upper === "CHEAP") return "#3b74d8";

  return "#64748b";
}

function regimeMeaning(label: string): string {
  if (label === "STABLE") {
    return "conditions are closer to the chain’s typical operating range";
  }
  if (label === "HEATING") {
    return "usage pressure is rising relative to recent history";
  }
  if (label === "CONGESTED") {
    return "demand/friction conditions are elevated versus the chain’s normal range";
  }
  if (label === "CHEAP") {
    return "activity or pricing pressure is unusually soft relative to recent history";
  }
  return "published evidence is below the canonical confidence floor or otherwise degraded";
}

export default function RegimeTimeline({
  entries,
  className,
}: RegimeTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <div
        className={`rounded-xl border border-[#b6cce3] bg-[#e7f1fb] p-6 text-sm font-medium text-[#27476f] ${
          className ?? ""
        }`}
      >
        No timeline data available for the selected filters.
      </div>
    );
  }

  const chronologicalEntries = [...entries].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  type Run = {
    regime: string;
    from: string;
    to: string;
    count: number;
    color: string;
  };

  const runs: Run[] = [];

  for (const entry of chronologicalEntries) {
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

  const total = chronologicalEntries.length;

  return (
    <div className={className}>
      <div className="mb-4 rounded-xl border border-[#b6cce3] bg-[#dceaf8] p-4 text-sm font-medium leading-7 text-[#1f3f68]">
        <div>
          This bar shows the sequence of{" "}
          <strong className="font-extrabold text-[#0d2447]">
            published daily regime labels
          </strong>{" "}
          inside the selected window. It is a descriptive timeline of what the
          product published on each date.
        </div>
        <div className="mt-1">
          Read it as persistence and switching behavior over time: long
          same-color stretches indicate the same published regime persisted
          across many days; short stretches indicate faster regime turnover.
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        {REGIME_LABELS.map((label) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-xs font-bold text-[#27476f]"
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
        className="flex h-10 w-full overflow-hidden rounded-xl border border-[#8fb0d1] bg-[#cfe0f1]"
        role="img"
        aria-label="Regime timeline bar"
      >
        {runs.map((run, index) => (
          <div
            key={`${run.regime}-${run.from}-${index}`}
            title={`${run.regime}: ${run.from} → ${run.to} (${run.count} row${
              run.count !== 1 ? "s" : ""
            })`}
            style={{
              width: `${(run.count / total) * 100}%`,
              backgroundColor: run.color,
              opacity: 0.9,
            }}
          />
        ))}
      </div>

      <div className="mt-2 flex justify-between text-xs font-semibold text-[#27476f]">
        <span>{chronologicalEntries[0]?.date ?? "—"}</span>
        <span>
          {chronologicalEntries[chronologicalEntries.length - 1]?.date ?? "—"}
        </span>
      </div>

      <div className="mt-2 text-xs font-medium text-[#27476f]">
        Rows correspond to published chronological entries in the current view.
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-[#8fb0d1] bg-[#e7f1fb]">
        <table className="w-full text-sm text-[#0d2447]">
          <thead>
            <tr className="border-b border-[#8fb0d1] bg-[#cfe0f1] text-left text-xs font-black uppercase tracking-[0.08em] text-[#0d2447]">
              <th className="px-4 py-3">Regime</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3 text-right">Rows</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, index) => (
              <tr
                key={`${run.regime}-${run.from}-${run.to}-${index}`}
                className="border-b border-[#9db8d4] last:border-0 hover:bg-[#dceaf8]"
              >
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: run.color }}
                      aria-hidden="true"
                    />
                    <span className="font-black" style={{ color: run.color }}>
                      {run.regime}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[#27476f]">
                  {run.from}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[#27476f]">
                  {run.to}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-[#27476f]">
                  {run.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}