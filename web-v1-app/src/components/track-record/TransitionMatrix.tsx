// src/components/track-record/TransitionMatrix.tsx
"use client";

const REGIMES = [
  "STABLE",
  "HEATING",
  "CONGESTED",
  "CHEAP",
  "UNKNOWN/DEGRADED",
] as const;

type RegimeLabel = (typeof REGIMES)[number];

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
    case "STABLE":
      return "var(--color-regime-stable)";
    case "HEATING":
      return "var(--color-regime-heating)";
    case "CONGESTED":
      return "var(--color-regime-congested)";
    case "CHEAP":
      return "var(--color-regime-cheap)";
    case "UNKNOWN/DEGRADED":
      return "var(--color-regime-unknown)";
    default:
      return "var(--color-regime-unknown)";
  }
}

function regimeMeaning(regime: string): string {
  switch (regime.toUpperCase()) {
    case "STABLE":
      return "closer to the chain’s usual recent operating range";
    case "HEATING":
      return "hotter-than-usual pressure relative to recent history";
    case "CONGESTED":
      return "elevated pressure or tighter conditions";
    case "CHEAP":
      return "softer-than-usual pressure or looser conditions";
    case "UNKNOWN/DEGRADED":
      return "evidence below the canonical publish floor or otherwise degraded";
    default:
      return "published descriptive regime";
  }
}

export default function TransitionMatrix({
  transitions,
  className,
}: TransitionMatrixProps) {
  const counts: Record<string, Record<string, number>> = {};
  let maxCount = 0;

  for (const from of REGIMES) {
    counts[from] = {};
    for (const to of REGIMES) {
      counts[from][to] = 0;
    }
  }

  for (const t of transitions) {
    const from = t.from?.toUpperCase() as RegimeLabel;
    const to = t.to?.toUpperCase() as RegimeLabel;
    if (counts[from] && counts[from][to] !== undefined) {
      counts[from][to] += 1;
      if (counts[from][to] > maxCount) maxCount = counts[from][to];
    }
  }

  const total = transitions.length;

  if (total === 0) {
    return (
      <div
        className={`rounded-xl border p-6 text-sm text-muted-foreground ${
          className ?? ""
        }`}
      >
        No transition data available for the selected filters.
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-5 ${className ?? ""}`}>
      <div className="mb-4">
        <div className="text-sm font-medium text-foreground">
          Regime Transition Matrix
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Row = from regime · Column = to regime · Count of day-to-day published
          label transitions
        </div>
      </div>

      <div className="mb-4 rounded-xl border bg-muted/10 p-3 text-xs leading-6 text-muted-foreground">
        <div>
          Read the matrix as <strong>switching behavior</strong> inside the selected
          history window.
        </div>
        <div className="mt-1">
          A large diagonal value means the same regime tended to persist from one
          published day to the next. A larger off-diagonal value means the product
          more often switched from one regime into another specific regime.
        </div>
        <div className="mt-1">
          This is descriptive only. It does not say which transition is “good” or
          “bad”; it only shows how the published labels actually changed over time.
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        {REGIMES.map((label) => (
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

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="pb-2 pr-3 text-left font-medium text-muted-foreground">
                From ↓ / To →
              </th>
              {REGIMES.map((to) => (
                <th
                  key={to}
                  className="px-2 pb-2 text-center font-medium"
                  style={{ color: getColor(to) }}
                  title={regimeMeaning(to)}
                >
                  {to.replace("/", "/\u200B")}
                </th>
              ))}
              <th className="pb-2 pl-3 text-right font-medium text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {REGIMES.map((from) => {
              const rowTotal = REGIMES.reduce((sum, to) => sum + counts[from][to], 0);

              return (
                <tr key={from} className="border-t border-border/40">
                  <td
                    className="py-2 pr-3 font-medium"
                    style={{ color: getColor(from) }}
                    title={regimeMeaning(from)}
                  >
                    {from.replace("/", "/\u200B")}
                  </td>

                  {REGIMES.map((to) => {
                    const count = counts[from][to];
                    const intensity = maxCount > 0 ? count / maxCount : 0;
                    const isDiagonal = from === to;

                    return (
                      <td key={to} className="px-2 py-2 text-center">
                        {count > 0 ? (
                          <span
                            className="inline-flex h-7 w-10 items-center justify-center rounded font-medium"
                            title={`${from} → ${to}: ${count} transition${
                              count !== 1 ? "s" : ""
                            }`}
                            style={{
                              backgroundColor: `color-mix(in srgb, ${getColor(
                                to
                              )} ${Math.round(intensity * 60)}%, transparent)`,
                              color:
                                intensity > 0.4
                                  ? getColor(to)
                                  : "hsl(var(--foreground))",
                              fontStyle: isDiagonal ? "italic" : "normal",
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

                  <td className="py-2 pl-3 text-right text-muted-foreground">
                    {rowTotal || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 rounded-lg border bg-muted/10 p-3 text-xs leading-6 text-muted-foreground">
        <div>
          <strong>How to read the diagonal:</strong> diagonal cells mean the product
          stayed in the same published regime on consecutive published days.
        </div>
        <div className="mt-1">
          <strong>How to read off-diagonal cells:</strong> these show specific
          regime switches, for example <em>STABLE → HEATING</em> or{" "}
          <em>HEATING → CONGESTED</em>.
        </div>
        <div className="mt-1">
          Diagonal (italic) = persisted in same regime. Total transitions: {total}.
        </div>
      </div>
    </div>
  );
}
