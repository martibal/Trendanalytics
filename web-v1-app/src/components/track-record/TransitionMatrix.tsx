// src/components/track-record/TransitionMatrix.tsx
"use client";

const REGIMES = ["STABLE", "HEATING", "CONGESTED", "CHEAP", "UNKNOWN/DEGRADED"] as const;
type RegimeLabel = (typeof REGIMES)[number];

export type TransitionEntry = { from: string; to: string; };
export type TransitionMatrixProps = { transitions: TransitionEntry[]; className?: string; };

function getHex(regime: string): string {
  switch (regime.toUpperCase()) {
    case "STABLE":           return "#10B981";
    case "HEATING":          return "#C4843C";
    case "CONGESTED":        return "#9E4040";
    case "CHEAP":            return "#3b74d8";
    case "UNKNOWN/DEGRADED": return "#3A4A57";
    default:                 return "#3A4A57";
  }
}

function regimeMeaning(regime: string): string {
  switch (regime.toUpperCase()) {
    case "STABLE":           return "closer to the chain's usual recent operating range";
    case "HEATING":          return "hotter-than-usual pressure relative to recent history";
    case "CONGESTED":        return "elevated pressure or tighter conditions";
    case "CHEAP":            return "softer-than-usual pressure or looser conditions";
    case "UNKNOWN/DEGRADED": return "evidence below the canonical publish floor";
    default:                 return "published descriptive regime";
  }
}

export default function TransitionMatrix({ transitions, className }: TransitionMatrixProps) {
  const counts: Record<string, Record<string, number>> = {};
  let maxCount = 0;

  for (const from of REGIMES) {
    counts[from] = {};
    for (const to of REGIMES) counts[from][to] = 0;
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
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: "16px", fontSize: "13px", color: "var(--ink2)" }} className={className ?? ""}>
        No transition data available for the selected filters.
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 500, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "4px" }}>Regime Transition Matrix</div>
        <div style={{ fontSize: "12px", color: "var(--ink2)" }}>Row = from regime · Column = to regime · Count of day-to-day published label transitions</div>
      </div>

      {/* Explanation */}
      <div style={{
        background: "var(--surface2)", border: "1px solid var(--line2)",
        borderLeft: "3px solid var(--gold)", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
        padding: "12px 16px", marginBottom: "16px", fontSize: "12px", lineHeight: "1.7", color: "var(--ink2)",
      }}>
        A large diagonal value means the same regime tended to persist from one published day to the next.
        A larger off-diagonal value means the product more often switched from one regime into another specific regime.
        This is descriptive only.
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
        {REGIMES.map((label) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--ink2)", fontFamily: "var(--mono)" }} title={regimeMeaning(label)}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: getHex(label), flexShrink: 0, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>

      {/* Matrix */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ minWidth: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ paddingBottom: "10px", paddingRight: "12px", textAlign: "left", fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink3)", fontWeight: 500 }}>
                From ↓ / To →
              </th>
              {REGIMES.map((to) => (
                <th key={to} style={{ padding: "0 8px 10px", textAlign: "center", fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: ".06em", color: getHex(to), fontWeight: 600 }} title={regimeMeaning(to)}>
                  {to.replace("/", "/\u200B")}
                </th>
              ))}
              <th style={{ paddingBottom: "10px", paddingLeft: "12px", textAlign: "right", fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink3)", fontWeight: 500 }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {REGIMES.map((from) => {
              const rowTotal = REGIMES.reduce((sum, to) => sum + counts[from][to], 0);
              return (
                <tr key={from} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 12px 10px 0", fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 600, color: getHex(from) }} title={regimeMeaning(from)}>
                    {from.replace("/", "/\u200B")}
                  </td>
                  {REGIMES.map((to) => {
                    const count = counts[from][to];
                    const intensity = maxCount > 0 ? count / maxCount : 0;
                    const isDiagonal = from === to;
                    const hex = getHex(to);
                    return (
                      <td key={to} style={{ padding: "8px", textAlign: "center" }}>
                        {count > 0 ? (
                          <span
                            title={`${from} → ${to}: ${count} transition${count !== 1 ? "s" : ""}`}
                            style={{
                              display: "inline-flex", width: "40px", height: "28px",
                              alignItems: "center", justifyContent: "center",
                              borderRadius: "3px", fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 500,
                              fontStyle: isDiagonal ? "italic" : "normal",
                              background: `color-mix(in srgb, ${hex} ${Math.round(intensity * 50)}%, var(--surface2))`,
                              color: intensity > 0.3 ? hex : "var(--ink2)",
                            }}
                          >
                            {count}
                          </span>
                        ) : (
                          <span style={{ color: "var(--ink3)", fontFamily: "var(--mono)", fontSize: "11px" }}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: "10px 0 10px 12px", textAlign: "right", fontFamily: "var(--mono)", fontSize: "11px", color: "var(--ink3)" }}>
                    {rowTotal || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        background: "var(--surface2)", border: "1px solid var(--line2)", borderRadius: "var(--radius-sm)",
        padding: "12px 16px", marginTop: "12px", fontSize: "12px", lineHeight: "1.7", color: "var(--ink2)",
      }}>
        <div><strong style={{ color: "var(--ink)" }}>Diagonal (italic):</strong> product stayed in the same published regime on consecutive days.</div>
        <div style={{ marginTop: "4px" }}><strong style={{ color: "var(--ink)" }}>Off-diagonal:</strong> specific regime switches, e.g. STABLE → HEATING or HEATING → CONGESTED.</div>
        <div style={{ marginTop: "4px", color: "var(--ink3)", fontFamily: "var(--mono)", fontSize: "10px" }}>Total transitions: {total}</div>
      </div>
    </div>
  );
}
