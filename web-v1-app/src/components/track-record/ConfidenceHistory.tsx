// src/components/track-record/ConfidenceHistory.tsx
"use client";

import React, { useMemo } from "react";

export type ConfidencePoint = {
  date: string;
  confidence: number | null;
};

export type ConfidenceHistoryProps = {
  points: ConfidencePoint[];
  className?: string;
};

const W = 600;
const H = 170;
const PAD = { top: 14, right: 16, bottom: 28, left: 40 };

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return date;
  }
}

function uniqueTickIndices(length: number) {
  const raw = [0, Math.floor(length * 0.25), Math.floor(length * 0.5), Math.floor(length * 0.75), length - 1];
  return [...new Set(raw)].sort((a, b) => a - b);
}

export default function ConfidenceHistory({ points, className }: ConfidenceHistoryProps) {
  const valid = useMemo(
    () =>
      [...points]
        .filter(
          (p): p is { date: string; confidence: number } =>
            typeof p.confidence === "number" && !Number.isNaN(p.confidence)
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [points]
  );

  if (valid.length < 2) {
    return (
      <div className={`rounded-2xl border border-border p-6 text-sm text-muted-foreground ${className ?? ""}`}>
        Insufficient confidence history data for the selected range.
      </div>
    );
  }

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const xScale = (i: number) => PAD.left + (i / Math.max(1, valid.length - 1)) * plotW;
  const yScale = (v: number) => PAD.top + plotH - v * plotH;

  const pathD = valid
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.confidence).toFixed(1)}`)
    .join(" ");

  const areaD = `${pathD} L ${xScale(valid.length - 1).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} L ${xScale(0).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];
  const xTickIndices = uniqueTickIndices(valid.length);
  const avgConfidence = (valid.reduce((s, p) => s + p.confidence, 0) / valid.length).toFixed(2);
  const asOf = valid[valid.length - 1]?.date ?? "—";

  return (
    <div className={`rounded-2xl border border-border bg-card/40 p-5 ${className ?? ""}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-foreground">Confidence History</div>
        <div className="text-xs text-muted-foreground">
          Avg: <span className="font-medium text-foreground">{avgConfidence}</span> · Scale: 0–1 · Units: dimensionless · As-of: {asOf}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="auto"
        className="block"
        aria-label="Confidence history chart"
        role="img"
      >
        <defs>
          <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={yScale(0.4)}
          y2={yScale(0.4)}
          stroke="var(--color-regime-heating)"
          strokeWidth="1"
          strokeDasharray="4 3"
          opacity="0.65"
        />
        <text x={PAD.left + 4} y={yScale(0.4) - 4} fontSize="9" fill="var(--color-regime-heating)" opacity="0.9">
          0.40 threshold
        </text>

        <path d={areaD} fill="url(#confGrad)" />
        <path d={pathD} fill="none" stroke="var(--color-accent)" strokeWidth="1.75" strokeLinejoin="round" />

        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left - 4}
              x2={PAD.left + plotW}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="var(--color-border)"
              strokeOpacity="0.55"
              strokeWidth="0.75"
            />
            <text x={PAD.left - 6} y={yScale(t) + 3} textAnchor="end" fontSize="9" fill="var(--color-text-secondary)">
              {t.toFixed(2)}
            </text>
          </g>
        ))}

        {xTickIndices.map((idx) => {
          const pt = valid[idx];
          if (!pt) return null;
          const x = xScale(idx);
          return (
            <g key={idx}>
              <line
                x1={x}
                x2={x}
                y1={PAD.top + plotH}
                y2={PAD.top + plotH + 4}
                stroke="var(--color-border)"
                strokeOpacity="0.55"
                strokeWidth="0.75"
              />
              <text x={x} y={PAD.top + plotH + 14} textAnchor="middle" fontSize="9" fill="var(--color-text-secondary)">
                {formatDate(pt.date)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 text-xs text-muted-foreground">
        Source: <code className="rounded bg-muted px-1 py-0.5">meta.confidence.confidence_score</code>. Values below 0.40 indicate DEGRADED state.
      </div>
    </div>
  );
}
