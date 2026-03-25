// src/components/ui/ScoreGauge.tsx
"use client";

import React, { useId } from "react";
import {
  getDesignTokenHex,
  getRegimeColorByLabel,
  hexToRgba,
} from "@/lib/design-tokens";

export type ScoreGaugeProps = {
  /** 0..100 (will be clamped) */
  score: number;
  /** Dimension name, e.g. "Demand" | "Friction" | "Capacity" */
  label: string;
  /** Optional smaller line under the label (descriptive only) */
  note?: string;
  /** Pixel width (normative default 180) */
  widthPx?: number;
  className?: string;
  title?: string;
};

function clamp01(x: number) {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

/**
 * SVG arc math — gauge convention:
 * angleDeg=0 points UP (12 o'clock), increases clockwise.
 * Half-moon gauge: startAngle=-180 (left/9 o'clock) → endAngle=0 (right/3 o'clock)
 * drawn clockwise (sweep=1) through the top.
 */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end   = polarToCartesian(cx, cy, r, endAngle);

  const largeArcFlag = endAngle - startAngle >= 180 ? "1" : "0";

  return [
    "M", start.x, start.y,
    "A", r, r, 0, largeArcFlag, 1,
    end.x, end.y,
  ].join(" ");
}

export default function ScoreGauge({
  score,
  label,
  note,
  widthPx = 180,
  className,
  title,
}: ScoreGaugeProps) {
  const instanceId = useId();

  const s = clampScore(score);
  const t = clamp01(s / 100);

  // Geometry (scaled by width)
  const vbW = 220;
  const vbH = 140;
  const cx = 110;
  const cy = 118;
  const r = 78;

  // Track: full half-moon from left (-180°) to right (+180°) clockwise through the top
  const trackD = describeArc(cx, cy, r, -180, 180);

  // Active arc: from left (-180°) to current score position
  // score=0 → endAngle=-180 (empty), score=100 → endAngle=+180 (full)
  const activeEndAngle = -180 + 360 * t;
  const activeD = t > 0 ? describeArc(cx, cy, r, -180, activeEndAngle) : "";

  // Normative styling
  const strokeW = 8;
  const gradientId = `scoreGaugeGradient-${instanceId.replace(/[:]/g, "")}`;

  const trackColor = getDesignTokenHex("--color-border");
  const lowColor = getRegimeColorByLabel("CONGESTED");
  const midColor = getRegimeColorByLabel("HEATING");
  const highColor = getRegimeColorByLabel("STABLE");
  const valueColor = getDesignTokenHex("--color-text-primary");
  const labelColor = getDesignTokenHex("--color-text-secondary");
  const glowColor = hexToRgba(getDesignTokenHex("--color-accent"), 0.16);

  const aria = `${label} score: ${Math.round(s)} out of 100`;

  return (
    <div
      className={className ?? ""}
      title={title ?? aria}
      aria-label={aria}
      role="img"
    >
      <svg
        width={widthPx}
        height={Math.round(widthPx * (vbH / vbW) * 0.85)}
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="block"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={lowColor} />
            <stop offset="50%" stopColor={midColor} />
            <stop offset="100%" stopColor={highColor} />
          </linearGradient>
          <filter id={`scoreGaugeGlow-${instanceId.replace(/[:]/g, "")}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* base track */}
        <path
          d={trackD}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* active glow */}
        {activeD ? (
          <path
            d={activeD}
            fill="none"
            stroke={glowColor}
            strokeWidth={strokeW + 4}
            strokeLinecap="round"
            filter={`url(#scoreGaugeGlow-${instanceId.replace(/[:]/g, "")})`}
          />
        ) : null}

        {/* active track */}
        {activeD ? (
          <path
            d={activeD}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        ) : null}

        {/* center value */}
        <text
          x={cx}
          y={86}
          textAnchor="middle"
          fontSize="26"
          fontWeight="700"
          fill={valueColor}
        >
          {Math.round(s)}
        </text>

        {/* dimension label */}
        <text
          x={cx}
          y={110}
          textAnchor="middle"
          fontSize="10"
          letterSpacing="1.2"
          fill={labelColor}
        >
          {String(label ?? "").toUpperCase()}
        </text>

        {note ? (
          <text
            x={cx}
            y={126}
            textAnchor="middle"
            fontSize="9"
            fill={labelColor}
          >
            {note}
          </text>
        ) : null}
      </svg>
    </div>
  );
}