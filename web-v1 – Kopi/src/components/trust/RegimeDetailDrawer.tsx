// src/components/trust/RegimeDetailDrawer.tsx
"use client";

import React, { useMemo } from "react";
import { PanelPurpose } from "@/components/info-boxes/PanelPurpose";
import type { RegimeHistoryPoint, Verdict } from "./RegimeTimeline";

function verdictTone(v: Verdict): string {
  if (v === "LIKELY_NOISE") return "border-ui-ok/25 bg-ui-ok/10 text-ui-ok";
  if (v === "STRUCTURAL_SHIFT") return "border-ui-warn/25 bg-ui-warn/10 text-ui-warn";
  return "border-ui-border bg-ui-bg/20 text-ui-muted";
}

function normalizeText(x: unknown): string {
  const s = String(x ?? "").trim();
  return s.length ? s : "—";
}

function fmtPct01(x: number | null): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

function Pill(props: { label: string; value: React.ReactNode; tone?: string; title?: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold",
        props.tone ?? "border-ui-border bg-ui-bg/15 text-ui-muted",
      ].join(" ")}
      title={props.title}
    >
      <span className="text-ui-faint">{props.label}</span>
      <span className="font-mono text-ui-text tabular-nums">{props.value}</span>
    </span>
  );
}

function SectionTitle(props: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">{props.children}</div>;
}

function DriverRow(props: { d: RegimeHistoryPoint["drivers"][number] }) {
  const d = props.d;
  return (
    <div className="rounded-xl border border-ui-border bg-ui-bg/10 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-ui-text">{normalizeText(d.metric)}</div>
          <div className="mt-1 text-[11px] text-ui-faint">
            Axis: <span className="text-ui-muted">{normalizeText(d.axis)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill label="band" value={normalizeText(d.band)} />
          <Pill label="trend" value={normalizeText(d.trend)} />
        </div>
      </div>
    </div>
  );
}

function AxisRow(props: { axis: string; v: { band_high: string; band_low: string; trend: string } }) {
  const { axis, v } = props;
  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-ui-border bg-ui-bg/10 p-3 md:grid-cols-4">
      <div className="text-xs font-semibold text-ui-text">{normalizeText(axis)}</div>
      <div className="text-[11px] text-ui-faint">
        band_high: <span className="font-mono text-ui-muted">{normalizeText(v.band_high)}</span>
      </div>
      <div className="text-[11px] text-ui-faint">
        band_low: <span className="font-mono text-ui-muted">{normalizeText(v.band_low)}</span>
      </div>
      <div className="text-[11px] text-ui-faint">
        trend: <span className="font-mono text-ui-muted">{normalizeText(v.trend)}</span>
      </div>
    </div>
  );
}

export function RegimeDetailDrawer(props: {
  open: boolean;
  point: RegimeHistoryPoint | null;
  onClose?: () => void;

  title?: string;
  id?: string;
}) {
  const { open, point } = props;

  const hasPoint = Boolean(point);

  const axesEntries = useMemo(() => {
    if (!point?.axes) return [];
    return Object.entries(point.axes);
  }, [point]);

  if (!open) return null;

  return (
    <section id={props.id} className="rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ui-text">{props.title ?? "Selected day details"}</div>
          <div className="mt-1 text-xs text-ui-muted">
            {hasPoint ? (
              <>
                Date: <span className="font-mono text-ui-text">{point!.date}</span>
              </>
            ) : (
              "No day selected."
            )}
          </div>
        </div>

        {typeof props.onClose === "function" ? (
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full border border-ui-border bg-ui-bg/15 px-3 py-1 text-[11px] font-semibold text-ui-muted hover:bg-ui-bg/25 focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
          >
            Close
          </button>
        ) : null}
      </div>

      <PanelPurpose
        className="mt-3"
        whatThisShows={
          "Details for the selected historical day: canonical label, three-state verdict (noise/shift/insufficient), " +
          "gate/confidence context, and a compact view of top drivers and axis summaries when available."
        }
        commonlyUsedFor={[
          "Explaining why a given day was classified as noise vs structural shift (or withheld).",
          "Inspecting which drivers and axes were active on historical regime changes.",
          "Auditing whether gating/insufficient periods align with coverage/freshness constraints.",
        ]}
      />

      {!hasPoint ? (
        <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/10 p-4 text-sm text-ui-muted">
          Select a day from the timeline to inspect drivers and axes.
        </div>
      ) : (
        <>
          {/* Summary pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${verdictTone(
                point!.verdict
              )}`}
              title="Three-state descriptive classification (canonical + gate)"
            >
              <span className="text-ui-faint">Verdict</span>
              <span className="text-ui-text">{point!.verdict.replaceAll("_", " ").toLowerCase()}</span>
            </span>

            <Pill label="label" value={normalizeText(point!.label)} />
            <Pill label="confidence" value={fmtPct01(point!.confidence_score)} />
            <Pill label="gate" value={normalizeText(point!.gate_status)} />
          </div>

          {/* Drivers */}
          <div className="mt-4">
            <SectionTitle>Top drivers</SectionTitle>
            <div className="mt-2 space-y-2">
              {point!.drivers && point!.drivers.length ? (
                point!.drivers.map((d, i) => <DriverRow key={`${d.metric}-${i}`} d={d} />)
              ) : (
                <div className="rounded-xl border border-ui-border bg-ui-bg/10 p-3 text-xs text-ui-muted">
                  No drivers available for this day.
                </div>
              )}
            </div>
            <div className="mt-2 text-[11px] text-ui-faint">
              Note: drivers are truncated to a small top-k subset for UI performance; use META export for full details.
            </div>
          </div>

          {/* Axes */}
          <div className="mt-4">
            <SectionTitle>Axes</SectionTitle>
            <div className="mt-2 space-y-2">
              {axesEntries.length ? (
                axesEntries.map(([axis, v]) => <AxisRow key={axis} axis={axis} v={v} />)
              ) : (
                <div className="rounded-xl border border-ui-border bg-ui-bg/10 p-3 text-xs text-ui-muted">
                  No axis summary available for this day.
                </div>
              )}
            </div>
          </div>

          {/* Guardrail */}
          <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/10 p-3 text-[11px] text-ui-faint">
            Guardrail: this panel is descriptive-only and does not imply causality, prediction, or advice.
          </div>
        </>
      )}
    </section>
  );
}