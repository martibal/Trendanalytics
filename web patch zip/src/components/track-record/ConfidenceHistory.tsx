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
const H = 200;
const PAD = { top: 16, right: 16, bottom: 34, left: 40 };

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

function bandLabel(value: number) {
  if (value >= 0.7) return "strong support";
  if (value >= 0.4) return "usable with caution";
  return "degraded";
}

export default function ConfidenceHistory({
  points,
  className,
}: ConfidenceHistoryProps) {
  const valid = useMemo(
    () =>
      points.filter(
        (p): p is { date: string; confidence: number } =>
          typeof p.confidence === "number" && !Number.isNaN(p.confidence)
      ),
    [points]
  );

  if (valid.length < 2) {
    return (
      <div
        className={`rounded-xl border p-6 text-sm text-muted-foreground ${
          className ?? ""
        }`}
      >
        Insufficient confidence history data for the selected range.
      </div>
    );
  }

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const xScale = (i: number) => PAD.left + (i / (valid.length - 1)) * plotW;
  const yScale = (v: number) => PAD.top + plotH - v * plotH;

  const pathD = valid
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(
          p.confidence
        ).toFixed(1)}`
    )
    .join(" ");

  const areaD = `${pathD} L ${xScale(valid.length - 1).toFixed(1)} ${(
    PAD.top + plotH
  ).toFixed(1)} L ${xScale(0).toFixed(1)} ${(PAD.top + plotH).toFixed(
    1
  )} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];
  const xTickIndices = [
    0,
    Math.floor(valid.length * 0.25),
    Math.floor(valid.length * 0.5),
    Math.floor(valid.length * 0.75),
    valid.length - 1,
  ];

  const avgConfidence = (
    valid.reduce((s, p) => s + p.confidence, 0) / valid.length
  ).toFixed(2);
  const latest = valid[valid.length - 1];
  const latestBand = bandLabel(latest.confidence);

  return (
    <div className={`rounded-xl border p-5 ${className ?? ""}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-foreground">
            Confidence History
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Evidence support for the published daily label over time.
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Avg: <span className="font-medium text-foreground">{avgConfidence}</span>
          {" "}· Latest:{" "}
          <span className="font-medium text-foreground">
            {latest.confidence.toFixed(3)}
          </span>
          {" "}({latestBand}) · Scale: 0–1
        </div>
      </div>

      <div className="mb-3 rounded-lg border bg-muted/10 p-3 text-xs leading-6 text-muted-foreground">
        This chart does <strong>not</strong> show whether a past label later proved
        “right” or “wrong.” It shows how much published evidence supported the label
        on each published day. The dashed line at <strong>0.40</strong> is the
        canonical floor below which the state should be read as{" "}
        <code className="rounded bg-muted px-1 py-0.5">UNKNOWN/DEGRADED</code>.
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
            <stop
              offset="0%"
              stopColor="var(--color-accent)"
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor="var(--color-accent)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <line
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={yScale(0.7)}
          y2={yScale(0.7)}
          stroke="hsl(var(--border))"
          strokeWidth="0.8"
          strokeDasharray="3 3"
          opacity="0.7"
        />
        <text
          x={PAD.left + 4}
          y={yScale(0.7) - 4}
          fontSize="9"
          fill="hsl(var(--muted-foreground))"
          opacity="0.9"
        >
          0.70 stronger support
        </text>

        <line
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={yScale(0.4)}
          y2={yScale(0.4)}
          stroke="var(--color-warn)"
          strokeWidth="1"
          strokeDasharray="4 3"
          opacity="0.7"
        />
        <text
          x={PAD.left + 4}
          y={yScale(0.4) - 4}
          fontSize="9"
          fill="var(--color-warn)"
          opacity="0.9"
        >
          0.40 degraded floor
        </text>

        <path d={areaD} fill="url(#confGrad)" />
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left - 4}
              x2={PAD.left + plotW}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
            />
            <text
              x={PAD.left - 6}
              y={yScale(t) + 3}
              textAnchor="end"
              fontSize="9"
              fill="hsl(var(--muted-foreground))"
            >
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
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
              />
              <text
                x={x}
                y={PAD.top + plotH + 14}
                textAnchor="middle"
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
              >
                {formatDate(pt.date)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 rounded-lg border bg-muted/10 p-3 text-xs leading-6 text-muted-foreground">
        <div>
          <strong>How to read the bands:</strong> above 0.70 means the current
          label has stronger published support; 0.40–0.70 means the label is still
          usable but should be read more cautiously; below 0.40 means evidence is
          too weak for a normal-confidence published state.
        </div>
        <div className="mt-1">
          Source:{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            meta.confidence.confidence_score
          </code>
        </div>
      </div>
    </div>
  );
}
