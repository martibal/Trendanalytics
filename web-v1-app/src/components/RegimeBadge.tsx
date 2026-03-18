// src/components/RegimeBadge.tsx
// Governance component: RegimeBadge (Master v3.1 §8.4.1)
// - Pill badge, subtle glow, optional pulse for CONGESTED (motion-safe)
// - Color is derived from published meta.status.color OR regime label mapping
// - Token-backed via src/lib/design-tokens.ts

import type { CSSProperties } from "react";
import { getRegimeColorByLabel, hexToRgba, type HexColor } from "@/lib/design-tokens";

export type RegimeLabel =
  | "STABLE"
  | "HEATING"
  | "CONGESTED"
  | "CHEAP"
  | "UNKNOWN/DEGRADED";

export type StatusColorName = "green" | "yellow" | "red" | "blue" | "gray";

export type RegimeBadgeProps = {
  /** Canonical label from meta.status.label (preferred) */
  label: string;
  /** Canonical color from meta.status.color (preferred when provided) */
  statusColor?: string;
  /** Optional override for hex color (e.g. #00FF88) */
  colorHexOverride?: string;
  className?: string;
  title?: string;
};

const REGIME_HEX_BY_LABEL: Record<RegimeLabel, HexColor> = {
  STABLE: getRegimeColorByLabel("STABLE"),
  HEATING: getRegimeColorByLabel("HEATING"),
  CONGESTED: getRegimeColorByLabel("CONGESTED"),
  CHEAP: getRegimeColorByLabel("CHEAP"),
  "UNKNOWN/DEGRADED": getRegimeColorByLabel("UNKNOWN/DEGRADED"),
};

const HEX_BY_STATUS_COLOR: Record<StatusColorName, HexColor> = {
  green: getRegimeColorByLabel("STABLE"),
  yellow: getRegimeColorByLabel("HEATING"),
  red: getRegimeColorByLabel("CONGESTED"),
  blue: getRegimeColorByLabel("CHEAP"),
  gray: getRegimeColorByLabel("UNKNOWN/DEGRADED"),
};

function normalizeLabel(label: string): RegimeLabel {
  const trimmed = (label || "").trim();
  if (!trimmed) return "UNKNOWN/DEGRADED";

  const upper = trimmed.toUpperCase();

  if (
    upper === "UNKNOWN" ||
    upper === "DEGRADED" ||
    upper === "UNKNOWN / DEGRADED" ||
    upper === "UNKNOWN_DEGRADED" ||
    upper === "UNKNOWN-DEGRADED"
  ) {
    return "UNKNOWN/DEGRADED";
  }

  if (upper === "STABLE") return "STABLE";
  if (upper === "HEATING") return "HEATING";
  if (upper === "CONGESTED") return "CONGESTED";
  if (upper === "CHEAP") return "CHEAP";

  return "UNKNOWN/DEGRADED";
}

function normalizeStatusColorName(statusColor?: string): StatusColorName | null {
  if (typeof statusColor !== "string") return null;

  const normalized = statusColor.trim().toLowerCase();

  if (
    normalized === "green" ||
    normalized === "yellow" ||
    normalized === "red" ||
    normalized === "blue" ||
    normalized === "gray"
  ) {
    return normalized;
  }

  return null;
}

function normalizeHexOverride(colorHexOverride?: string): HexColor | null {
  if (typeof colorHexOverride !== "string") {
    return null;
  }

  const trimmed = colorHexOverride.trim();

  if (!trimmed) {
    return null;
  }

  const isHex = /^#([0-9a-fA-F]{6})$/.test(trimmed);

  if (!isHex) {
    return null;
  }

  return trimmed as HexColor;
}

export function resolveRegimeHex(
  label: string,
  statusColor?: string,
  colorHexOverride?: string
): HexColor {
  const overrideHex = normalizeHexOverride(colorHexOverride);
  if (overrideHex) {
    return overrideHex;
  }

  const statusName = normalizeStatusColorName(statusColor);
  if (statusName) {
    return HEX_BY_STATUS_COLOR[statusName];
  }

  const normalizedLabel = normalizeLabel(label);
  return REGIME_HEX_BY_LABEL[normalizedLabel];
}

function buildBadgeStyle(hex: HexColor): CSSProperties {
  return {
    borderColor: hex,
    backgroundColor: hexToRgba(hex, 0.15),
    color: hex,
    boxShadow: `0 0 0 1px ${hexToRgba(hex, 0.25)}, 0 0 18px ${hexToRgba(hex, 0.14)}`,
  };
}

export default function RegimeBadge({
  label,
  statusColor,
  colorHexOverride,
  className,
  title,
}: RegimeBadgeProps) {
  const normalizedLabel = normalizeLabel(label);
  const hex = resolveRegimeHex(normalizedLabel, statusColor, colorHexOverride);
  const style = buildBadgeStyle(hex);
  const pulseClass =
    normalizedLabel === "CONGESTED"
      ? "motion-safe:animate-pulse"
      : "";

  return (
    <span
      title={title ?? normalizedLabel}
      className={[
        "inline-flex items-center justify-center",
        "h-7 rounded-full border px-3 py-1",
        "text-xs font-semibold tracking-wide uppercase",
        "select-none whitespace-nowrap",
        pulseClass,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-label={`Regime: ${normalizedLabel}`}
    >
      {normalizedLabel}
    </span>
  );
}