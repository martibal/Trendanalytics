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
  if (upper === "STABLE")    return "var(--c-stable)";
  if (upper === "HEATING")   return "var(--c-heating)";
  if (upper === "CONGESTED") return "var(--c-congested)";
  if (upper === "CHEAP")     return "var(--c-cheap)";
  return "var(--c-unknown)";
}

function getHex(regime: string): string {
  const upper = regime?.trim().toUpperCase();
  if (upper === "STABLE")    return "#10B981";
  if (upper === "HEATING")   return "#C4843C";
  if (upper === "CONGESTED") return "#9E4040";
  if (upper === "CHEAP")     return "#3b74d8";
  return "#3A4A57";
}

function regimeMeaning(label: string): string {
  if (label === "STABLE")    return "conditions are closer to the chain's typical operating range";
  if (label === "HEATING")   return "usage pressure is rising relative to recent history";
  if (label === "CONGESTED") return "demand/friction conditions are elevated versus the chain's normal range";
  if (label === "CHEAP")     return "activity or pricing pressure is unusually soft relative to recent history";
  return "published evidence is below the canonical confidence floor or otherwise degraded";
}

export default function RegimeTimeline({ entries, className }: RegimeTimelineProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className={`border-t border-[var(--line)] pt-4 text-sm text-[var(--ink2)] ${className ?? ""}`}>
        No timeline data available for the selected filters.
      </div>
    );
  }

  const chronologicalEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  type Run = { regime: string; from: string; to: string; count: number; hex: string };
  const runs: Run[] = [];

  for (const entry of chronologicalEntries) {
    const last = runs[runs.length - 1];
    if (last && last.regime === entry.regime) {
      last.to = entry.date;
      last.count += 1;
    } else {
      runs.push({ regime: entry.regime, from: entry.date, to: entry.date, count: 1, hex: getHex(entry.regime) });
    }
  }

  const total = chronologicalEntries.length;

  return (
    <div className={className}>
      {/* Explanation */}
      <div style={{
        background: "var(--surface2)",
        border: "1px solid var(--line2)",
        borderLeft: "3px solid var(--gold)",
        borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
        padding: "14px 18px",
        marginBottom: "20px",
        fontSize: "13px",
        lineHeight: "1.7",
        color: "var(--ink2)",
      }}>
        This bar shows the sequence of{" "}
        <strong style={{ color: "var(--ink)", fontWeight: 600 }}>published daily regime labels</strong>{" "}
        inside the selected window. It is a descriptive timeline of what the product published on each date.
        Long same-color stretches indicate regime persistence; short stretches indicate faster turnover.
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
        {REGIME_LABELS.map((label) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--ink2)", fontFamily: "var(--mono)" }} title={regimeMeaning(label)}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: getHex(label), flexShrink: 0, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>

      {/* Timeline bar */}
      <div style={{ height: "40px", width: "100%", overflow: "hidden", borderRadius: "3px", display: "flex", border: "1px solid var(--line)" }} role="img" aria-label="Regime timeline bar">
        {runs.map((run, index) => (
          <div
            key={`${run.regime}-${run.from}-${index}`}
            title={`${run.regime}: ${run.from} → ${run.to} (${run.count} row${run.count !== 1 ? "s" : ""})`}
            style={{ width: `${(run.count / total) * 100}%`, backgroundColor: run.hex, opacity: 0.85 }}
          />
        ))}
      </div>

      {/* Date labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontFamily: "var(--mono)", fontSize: "10px", color: "var(--ink3)" }}>
        <span>{chronologicalEntries[0]?.date ?? "—"}</span>
        <span>{chronologicalEntries[chronologicalEntries.length - 1]?.date ?? "—"}</span>
      </div>
      <div style={{ marginTop: "4px", fontFamily: "var(--mono)", fontSize: "10px", color: "var(--ink3)" }}>
        Rows correspond to published chronological entries in the current view.
      </div>

      {/* Runs table */}
      <div style={{ marginTop: "20px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--surface2)" }}>
              {["Regime", "From", "To", "Rows"].map((h, i) => (
                <th key={h} style={{
                  padding: "10px 16px",
                  textAlign: i === 3 ? "right" : "left",
                  fontFamily: "var(--mono)",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((run, index) => (
              <tr key={`${run.regime}-${run.from}-${run.to}-${index}`} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: run.hex, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 600, color: run.hex }}>{run.regime}</span>
                  </span>
                </td>
                <td style={{ padding: "10px 16px", fontFamily: "var(--mono)", fontSize: "11px", color: "var(--ink2)" }}>{run.from}</td>
                <td style={{ padding: "10px 16px", fontFamily: "var(--mono)", fontSize: "11px", color: "var(--ink2)" }}>{run.to}</td>
                <td style={{ padding: "10px 16px", fontFamily: "var(--mono)", fontSize: "11px", color: "var(--ink)", textAlign: "right" }}>{run.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
