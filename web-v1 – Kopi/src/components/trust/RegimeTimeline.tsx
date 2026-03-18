// src/components/trust/RegimeTimeline.tsx
"use client";

import React, { useMemo } from "react";
import { PanelPurpose } from "@/components/info-boxes/PanelPurpose";

export type Verdict = "LIKELY_NOISE" | "STRUCTURAL_SHIFT" | "INSUFFICIENT_DATA";

export type RegimeHistoryPoint = {
  date: string; // YYYY-MM-DD
  label: string; // canonical label (may be "—")
  verdict: Verdict;
  confidence_score: number | null;
  gate_status: string | null;
  drivers: Array<{ metric: string; axis?: string; band?: string; trend?: string }>;
  axes?: Record<string, { band_high: string; band_low: string; trend: string }>;
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">{children}</div>;
}

function Chip({
  label,
  value,
  tone = "neutral",
  title,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn";
  title?: string;
}) {
  const cls =
    tone === "ok"
      ? "border-ui-ok/25 bg-ui-ok/10 text-ui-ok"
      : tone === "warn"
      ? "border-[rgb(var(--tone-heat)/0.25)] bg-[rgb(var(--tone-heat)/0.10)] text-[rgb(var(--tone-heat)/0.95)]"
      : "border-ui-border bg-ui-bg/15 text-ui-muted";

  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold leading-none tracking-wide",
        cls,
      ].join(" ")}
    >
      <span className="text-ui-faint">{label}</span>
      <span className="text-ui-text">{value}</span>
    </span>
  );
}

function fmtPct01(x: number | null): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

function verdictTone(v: Verdict): { pill: "ok" | "warn" | "neutral"; dot: string } {
  // purely visual tone; no normative language
  if (v === "LIKELY_NOISE") {
    return { pill: "ok", dot: "bg-ui-ok/70" };
  }
  if (v === "STRUCTURAL_SHIFT") {
    // match HTML palette: use heat tone family
    return { pill: "warn", dot: "bg-[rgb(var(--tone-heat)/0.75)]" };
  }
  return { pill: "neutral", dot: "bg-ui-muted/50" };
}

function prettyVerdict(v: Verdict) {
  if (v === "LIKELY_NOISE") return "Likely noise";
  if (v === "STRUCTURAL_SHIFT") return "Structural shift";
  return "Insufficient data";
}

function shortLabel(label: string) {
  const s = String(label ?? "—").trim();
  if (!s) return "—";
  if (s.length <= 14) return s;
  return s.slice(0, 14) + "…";
}

function isISODate(x: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(x);
}

export function RegimeTimeline(props: {
  points: RegimeHistoryPoint[];
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;

  // Optional: show a compact header line above the timeline.
  title?: string;

  // Optional: if you want to deep-link from elsewhere
  id?: string;
}) {
  const { points, selectedDate, onSelectDate } = props;

  const safePoints = useMemo(() => {
    // Defensive: keep only ascending ISO dates; if caller sends unsorted, we sort.
    const arr = Array.isArray(points) ? points.filter((p) => p && isISODate(p.date)) : [];
    arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return arr;
  }, [points]);

  const range = useMemo(() => {
    if (!safePoints.length) return { start: null as string | null, end: null as string | null };
    return { start: safePoints[0].date, end: safePoints[safePoints.length - 1].date };
  }, [safePoints]);

  const selected = useMemo(() => {
    if (!selectedDate) return null;
    return safePoints.find((p) => p.date === selectedDate) ?? null;
  }, [safePoints, selectedDate]);

  return (
    <section id={props.id} className="ui-card ui-lift p-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>Timeline</Eyebrow>
          <div className="mt-2 text-sm font-semibold text-ui-text">{props.title ?? "Historical regime timeline"}</div>
          <div className="mt-1 text-xs text-ui-muted">
            Range: <span className="font-mono text-ui-text">{range.start ?? "—"}</span> →{" "}
            <span className="font-mono text-ui-text">{range.end ?? "—"}</span>{" "}
            <span className="text-ui-faint">({safePoints.length} days)</span>
          </div>
        </div>

        {selected ? (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Chip label="Selected" value={selected.date} />
            <Chip
              label="Verdict"
              value={prettyVerdict(selected.verdict)}
              tone={verdictTone(selected.verdict).pill}
              title="Three-state descriptive classification (canonical + gate)"
            />
            <Chip label="Label" value={shortLabel(selected.label)} />
            <Chip label="Confidence" value={fmtPct01(selected.confidence_score)} />
            <Chip label="Gate" value={selected.gate_status ?? "—"} />
          </div>
        ) : (
          <div className="text-xs text-ui-faint md:text-right">Click a day to inspect details.</div>
        )}
      </div>

      <PanelPurpose
        className="mt-4"
        whatThisShows={
          "A day-by-day history of the canonical regime label and a three-state descriptive verdict (noise / structural shift / insufficient data), " +
          "including confidence and gate status where available."
        }
        commonlyUsedFor={[
          "Validating whether regime changes persist or flip frequently across history.",
          "Spotting periods with degraded gating (insufficient data) and correlating them with coverage/freshness constraints.",
          "Selecting a specific historical date to inspect drivers, axes, and signals in more detail.",
        ]}
      />

      {/* Timeline strip */}
      <div className="mt-5 ui-inset p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <Eyebrow>Strip</Eyebrow>
            <div className="mt-1 text-xs text-ui-faint">Hover for details · click to select a day</div>
          </div>

          <div className="text-[11px] text-ui-faint">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-ui-ok/70" aria-hidden="true" /> likely noise
            </span>
            <span className="mx-2 text-ui-faint">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-[rgb(var(--tone-heat)/0.75)]" aria-hidden="true" /> structural shift
            </span>
            <span className="mx-2 text-ui-faint">·</span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-ui-muted/50" aria-hidden="true" /> insufficient
            </span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1">
            {safePoints.length === 0 ? (
              <div className="py-6 text-xs text-ui-muted">No history available.</div>
            ) : (
              safePoints.map((p) => {
                const tone = verdictTone(p.verdict);
                const active = selectedDate === p.date;

                const title =
                  `Date: ${p.date}\n` +
                  `Verdict: ${prettyVerdict(p.verdict)}\n` +
                  `Label: ${p.label ?? "—"}\n` +
                  `Confidence: ${fmtPct01(p.confidence_score)}\n` +
                  `Gate: ${p.gate_status ?? "—"}`;

                return (
                  <button
                    key={p.date}
                    type="button"
                    onClick={() => onSelectDate?.(p.date)}
                    title={title}
                    className={[
                      "group relative h-7 w-3.5 shrink-0 rounded-md border transition",
                      "focus:outline-none focus:ring-2 focus:ring-ui-accent/30",
                      active ? "border-ui-border-soft bg-ui-surface2" : "border-ui-border bg-ui-bg/10 hover:bg-ui-bg/20",
                    ].join(" ")}
                    aria-label={`Inspect ${p.date}`}
                    aria-pressed={active}
                  >
                    <span
                      className={[
                        "absolute left-1/2 top-1/2 h-3.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm",
                        tone.dot,
                        active ? "opacity-100" : "opacity-85 group-hover:opacity-100",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-3 text-[11px] text-ui-faint">
          Tip: locate stable stretches vs frequent flips, then inspect specific dates for the drivers/axes behind the label.
        </div>
      </div>
    </section>
  );
}