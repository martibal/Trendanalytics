// src/components/RegimeBadge.tsx
// Token-backed text label. No pill background, no shadow.

import type { CSSProperties } from "react";
import { getRegimeColorByLabel, type HexColor } from "@/lib/design-tokens";

export type RegimeLabel =
  | "STABLE"
  | "HEATING"
  | "CONGESTED"
  | "CHEAP"
  | "UNKNOWN/DEGRADED";

export type StatusColorName = "green" | "yellow" | "red" | "blue" | "gray";

export type RegimeBadgeProps = {
  label: string;
  statusColor?: string;
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
  const upper = (label || "").trim().toUpperCase();
  if (upper === "STABLE") return "STABLE";
  if (upper === "HEATING") return "HEATING";
  if (upper === "CONGESTED") return "CONGESTED";
  if (upper === "CHEAP") return "CHEAP";
  return "UNKNOWN/DEGRADED";
}

function normalizeStatusColorName(statusColor?: string): StatusColorName | null {
  if (typeof statusColor !== "string") return null;
  const normalized = statusColor.trim().toLowerCase();
  if (normalized === "green" || normalized === "yellow" || normalized === "red" || normalized === "blue" || normalized === "gray") return normalized;
  return null;
}

function normalizeHexOverride(colorHexOverride?: string): HexColor | null {
  if (typeof colorHexOverride !== "string") return null;
  const trimmed = colorHexOverride.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(trimmed)) return trimmed as HexColor;
  return null;
}

export function resolveRegimeHex(label: string, statusColor?: string, colorHexOverride?: string): HexColor {
  const overrideHex = normalizeHexOverride(colorHexOverride);
  if (overrideHex) return overrideHex;
  const statusName = normalizeStatusColorName(statusColor);
  if (statusName) return HEX_BY_STATUS_COLOR[statusName];
  return REGIME_HEX_BY_LABEL[normalizeLabel(label)];
}

function buildBadgeStyle(hex: HexColor): CSSProperties {
  return {
    color: hex,
    borderBottomColor: hex,
  };
}

export default function RegimeBadge({ label, statusColor, colorHexOverride, className, title }: RegimeBadgeProps) {
  const normalizedLabel = normalizeLabel(label);
  const hex = resolveRegimeHex(normalizedLabel, statusColor, colorHexOverride);
  return (
    <span
      title={title ?? normalizedLabel}
      className={["regime-token", className ?? ""].filter(Boolean).join(" ")}
      style={buildBadgeStyle(hex)}
      aria-label={`Regime: ${normalizedLabel}`}
    >
      {normalizedLabel}
    </span>
  );
}
