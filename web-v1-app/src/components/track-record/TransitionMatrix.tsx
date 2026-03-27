// src/components/track-record/TransitionMatrix.tsx
"use client";

const REGIMES = ["STABLE", "HEATING", "CONGESTED", "CHEAP", "UNKNOWN/DEGRADED"] as const;
type RegimeLabel = typeof REGIMES[number];

export type TransitionEntry = {
  from: string;
  to: string;
};

export type TransitionMatrixProps = {
  transitions: TransitionEntry[];
  className?: string;
};

function getColor(regime: string): string {
  switch (regime.toUpperCase()) {
    case "STABLE":           return "var(--color-regime-stable)";
    case "HEATING":          return "var(--color-regime-heating)";
    case "CONGESTED":        return "var(--color-regime-congested)";
    case "CHEAP":            return "var(--color-regime-cheap)";
    case "UNKNOWN/DEGRADED": return "var(--color-regime-unknown)";
    default:                 return "var(--color-regime-unknown)";
  }
}

export default function TransitionMatrix({ transitions, className }: TransitionMatrixProps) {
  // Build count matrix
  const counts: Record<string, Record<string, number>> = {};
  let maxCount = 0;

  for (const r of REGIMES) {
    counts[r] = {};
    for (const r2 of REGIMES) counts[r][r2] = 0;
  }

  for (const t of transitions) {
    const from = t.from?.toUpperCase() as RegimeLabel;
    const to   = t.to?.toUpperCase() as RegimeLabel;
    if (counts[from] && counts[from][to] !== undefined) {
      counts[from][to]++;
      if (counts[from][to] > maxCount) maxCount = counts[from][to];
    }
  }

  const total = transitions.length;

  if (total === 0) {
    return (
      <div className={`rounded-xl border p-6 text-sm text-muted-foreground ${className ?? ""}`}>
        No transition data available for the selected filters.
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-5 ${className ?? ""}`}>
      <div className="mb-4">
        <div className="text-sm font-medium text-foreground">Regime Transition Matrix</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Row = from regime · Column = to regime · Count of daily transitions
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="pb-2 pr-3 text-left text-muted-foreground font-medium">From ↓ / To →</th>
              {REGIMES.map((to) => (
                <th key={to} className="pb-2 px-2 text-center font-medium" style={{ color: getColor(to) }}>
                  {to.replace("/", "/\u200B")}
                </th>
              ))}
              <th className="pb-2 pl-3 text-right text-muted-foreground font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {REGIMES.map((from) => {
              const rowTotal = REGIMES.reduce((s, to) => s + counts[from][to], 0);
              return (
                <tr key={from} className="border-t border-border/40">
                  <td className="py-2 pr-3 font-medium" style={{ color: getColor(from) }}>
                    {from.replace("/", "/\u200B")}
                  </td>
                  {REGIMES.map((to) => {
                    const count = counts[from][to];
                    const intensity = maxCount > 0 ? count / maxCount : 0;
                    const isDiag = from === to;
                    return (
                      <td key={to} className="px-2 py-2 text-center">
                        {count > 0 ? (
                          <span
                            className="inline-flex h-7 w-10 items-center justify-center rounded font-medium"
                            title={`${from} → ${to}: ${count} times`}
                            style={{
                              backgroundColor: `color-mix(in srgb, ${getColor(to)} ${Math.round(intensity * 60)}%, transparent)`,
                              color: intensity > 0.4 ? getColor(to) : "hsl(var(--foreground))",
                              fontStyle: isDiag ? "italic" : "normal",
                            }}
                          >
                            {count}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2 pl-3 text-right text-muted-foreground">{rowTotal || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Diagonal (italic) = persisted in same regime. Total transitions: {total}.
      </div>
    </div>
  );
}
