// src/components/ui/ScoreGauge.tsx
"use client";

import React, { useId } from "react";
import {
  getDesignTokenHex,
  getRegimeColorByLabel,
  hexToRgba,
} from "@/lib/design-tokens";

export type ScoreGaugeProps = {
  /**
   * Supports either:
   * - 0..100
   * - 0..1 (auto-normalized to 0..100)
   */
  score: number;
  /** Dimension name, e.g. "Demand" | "Friction" | "Capacity" | "Confidence" */
  label: string;
  /** Optional smaller descriptive line */
  note?: string;
  /** Pixel width (normative default 180) */
  widthPx?: number;
  className?: string;
  title?: string;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function normalizeScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  // Accept both normalized 0..1 and standard 0..100 inputs.
  if (score >= 0 && score <= 1) {
    return clampPercent(score * 100);
  }

  return clampPercent(score);
}

function describeTopArc(
  cx: number,
  cy: number,
  r: number,
  progress01: number
): { trackD: string; activeD: string; dotX: number; dotY: number } {
  const leftX = cx - r;
  const rightX = cx + r;

  // Top half track: left -> right via top
  const trackD = `M ${leftX} ${cy} A ${r} ${r} 0 0 1 ${rightX} ${cy}`;

  const p = Math.max(0, Math.min(1, progress01));

  // Angle moves along the TOP half:
  // p=0   => 180° (left)
  // p=0.5 => 270° (top)
  // p=1   => 360° (right)
  const theta = Math.PI + Math.PI * p;

  const dotX = cx + r * Math.cos(theta);
  const dotY = cy + r * Math.sin(theta);

  const activeD =
    p <= 0
      ? ""
      : `M ${leftX} ${cy} A ${r} ${r} 0 0 1 ${dotX} ${dotY}`;

  return { trackD, activeD, dotX, dotY };
}

export default function ScoreGauge({
  score,
  label,
  note,
  widthPx = 180,
  className,
  title,
}: ScoreGaugeProps) {
  const instanceId = useId().replace(/[:]/g, "");
  const normalized = normalizeScore(score);
  const progress = normalized / 100;

  const vbW = 220;
  const vbH = 140;

  // Geometry tuned for a true "half-moon" top gauge.
  const cx = 110;
  const cy = 108;
  const r = 72;
  const strokeW = 12;

  const { trackD, activeD, dotX, dotY } = describeTopArc(cx, cy, r, progress);

  const gradientId = `scoreGaugeGradient-${instanceId}`;
  const glowId = `scoreGaugeGlow-${instanceId}`;

  const trackColor = getDesignTokenHex("--color-border");
  const lowColor = getRegimeColorByLabel("CONGESTED");
  const midColor = getRegimeColorByLabel("HEATING");
  const highColor = getRegimeColorByLabel("STABLE");
  const valueColor = getDesignTokenHex("--color-text-primary");
  const labelColor = getDesignTokenHex("--color-text-secondary");
  const mutedColor = hexToRgba(labelColor, 0.8);
  const glowColor = hexToRgba(getDesignTokenHex("--color-accent"), 0.18);
  const dotFill = getDesignTokenHex("--color-bg-card");
  const dotStroke = getDesignTokenHex("--color-accent");

  const valueText = `${Math.round(normalized)}`;
  const aria = `${label} score: ${valueText} out of 100`;

  return (
    <div
      className={className ?? ""}
      title={title ?? aria}
      aria-label={aria}
      role="img"
    >
      <svg
        width={widthPx}
        height={Math.round(widthPx * (vbH / vbW))}
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="block overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={lowColor} />
            <stop offset="50%" stopColor={midColor} />
            <stop offset="100%" stopColor={highColor} />
          </linearGradient>

          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
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
          stroke={hexToRgba(trackColor, 0.9)}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* active glow */}
        {activeD ? (
          <path
            d={activeD}
            fill="none"
            stroke={glowColor}
            strokeWidth={strokeW + 6}
            strokeLinecap="round"
            filter={`url(#${glowId})`}
          />
        ) : null}

        {/* active arc */}
        {activeD ? (
          <path
            d={activeD}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        ) : null}

        {/* endpoint marker */}
        {activeD ? (
          <circle
            cx={dotX}
            cy={dotY}
            r={6}
            fill={dotFill}
            stroke={dotStroke}
            strokeWidth={2}
          />
        ) : null}

        {/* value */}
        <text
          x={cx}
          y={92}
          textAnchor="middle"
          fontSize="28"
          fontWeight="700"
          fill={valueColor}
        >
          {valueText}
        </text>

        {/* label */}
        <text
          x={cx}
          y={112}
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
            y={127}
            textAnchor="middle"
            fontSize="9"
            fill={mutedColor}
          >
            {note}
          </text>
        ) : null}
      </svg>
    </div>
  );
}