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
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return date; }
}

function bandLabel(value: number) {
  if (value >= 0.7) return "strong support";
  if (value >= 0.4) return "usable with caution";
  return "degraded";
}

export default function ConfidenceHistory({ points, className }: ConfidenceHistoryProps) {
  const valid = useMemo(
    () => points.filter((p): p is { date: string; confidence: number } =>
      typeof p.confidence === "number" && !Number.isNaN(p.confidence)),
    [points]
  );

  if (valid.length < 2) {
    return (
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: "16px", fontSize: "13px", color: "var(--ink2)" }} className={className ?? ""}>
        Insufficient confidence history data for the selected range.
      </div>
    );
  }

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const xScale = (i: number) => PAD.left + (i / (valid.length - 1)) * plotW;
  const yScale = (v: number) => PAD.top + plotH - v * plotH;

  const pathD = valid.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.confidence).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${xScale(valid.length - 1).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} L ${xScale(0).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];
  const xTickIndices = [0, Math.floor(valid.length * 0.25), Math.floor(valid.length * 0.5), Math.floor(valid.length * 0.75), valid.length - 1];
  const avgConfidence = (valid.reduce((s, p) => s + p.confidence, 0) / valid.length).toFixed(2);
  const latest = valid[valid.length - 1];

  return (
    <div className={className}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "start", gap: "12px", marginBottom: "14px" }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 500, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "4px" }}>Confidence History</div>
          <div style={{ fontSize: "12px", color: "var(--ink2)" }}>Evidence support for the published daily label over time.</div>
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "var(--ink2)", textAlign: "right" }}>
          Avg: <span style={{ color: "var(--ink)" }}>{avgConfidence}</span>
          {" · "}Latest: <span style={{ color: "var(--ink)" }}>{latest.confidence.toFixed(3)}</span>
          {" · "}{bandLabel(latest.confidence)}
        </div>
      </div>

      {/* Explanation */}
      <div style={{
        background: "var(--surface2)", border: "1px solid var(--line2)",
        borderLeft: "3px solid var(--gold)", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
        padding: "12px 16px", marginBottom: "16px", fontSize: "12px", lineHeight: "1.7", color: "var(--ink2)",
      }}>
        This chart does <strong style={{ color: "var(--ink)" }}>not</strong> show whether a past label later proved
        correct. It shows how much published evidence supported the label on each day.
        The dashed line at <strong style={{ color: "var(--ink)" }}>0.40</strong> is the canonical floor below which
        the state should be read as{" "}
        <code style={{ fontFamily: "var(--mono)", fontSize: "11px", background: "var(--surface3)", padding: "1px 5px", borderRadius: "2px", color: "var(--ink)" }}>UNKNOWN/DEGRADED</code>.
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" className="block" aria-label="Confidence history chart" role="img">
        <defs>
          <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 0.70 line */}
        <line x1={PAD.left} x2={PAD.left + plotW} y1={yScale(0.7)} y2={yScale(0.7)} stroke="var(--c-stable)" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
        <text x={PAD.left + 4} y={yScale(0.7) - 4} fontSize="9" fill="var(--c-stable)" opacity="0.8">0.70 stronger support</text>

        {/* 0.40 line */}
        <line x1={PAD.left} x2={PAD.left + plotW} y1={yScale(0.4)} y2={yScale(0.4)} stroke="var(--c-heating)" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
        <text x={PAD.left + 4} y={yScale(0.4) - 4} fontSize="9" fill="var(--c-heating)" opacity="0.9">0.40 degraded floor</text>

        <path d={areaD} fill="url(#confGrad)" />
        <path d={pathD} fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinejoin="round" />

        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left - 4} x2={PAD.left + plotW} y1={yScale(t)} y2={yScale(t)} stroke="var(--line)" strokeWidth="0.5" />
            <text x={PAD.left - 6} y={yScale(t) + 3} textAnchor="end" fontSize="9" fill="var(--ink3)">{t.toFixed(2)}</text>
          </g>
        ))}

        {xTickIndices.map((idx) => {
          const pt = valid[idx];
          if (!pt) return null;
          const x = xScale(idx);
          return (
            <g key={idx}>
              <line x1={x} x2={x} y1={PAD.top + plotH} y2={PAD.top + plotH + 4} stroke="var(--line)" strokeWidth="0.5" />
              <text x={x} y={PAD.top + plotH + 14} textAnchor="middle" fontSize="9" fill="var(--ink3)">{formatDate(pt.date)}</text>
            </g>
          );
        })}
      </svg>

      {/* Footer note */}
      <div style={{
        background: "var(--surface2)", border: "1px solid var(--line2)",
        borderRadius: "var(--radius-sm)", padding: "12px 16px",
        marginTop: "12px", fontSize: "12px", lineHeight: "1.7", color: "var(--ink2)",
      }}>
        <div><strong style={{ color: "var(--ink)" }}>How to read the bands:</strong> above 0.70 means stronger published support; 0.40–0.70 means usable but read cautiously; below 0.40 means evidence is too weak for a normal-confidence published state.</div>
        <div style={{ marginTop: "6px" }}>
          Source: <code style={{ fontFamily: "var(--mono)", fontSize: "11px", background: "var(--surface3)", padding: "1px 5px", borderRadius: "2px", color: "var(--ink)" }}>meta.confidence.confidence_score</code>
        </div>
      </div>
    </div>
  );
}
