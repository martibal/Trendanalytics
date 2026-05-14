// src/lib/design-tokens.ts
import type { ChainId } from "@/config/chains";

export type HexColor = `#${string}`;

export type ThemeMode = "light" | "dark";

export type RegimeColorKey =
  | "stable"
  | "heating"
  | "congested"
  | "cheap"
  | "unknown";

export type SemanticColorKey =
  | "bgPrimary"
  | "bgCard"
  | "bgLight"
  | "accent"
  | "textPrimary"
  | "textSecondary"
  | "border";

export type DesignTokenName =
  | "--color-bg-primary"
  | "--color-bg-card"
  | "--color-bg-light"
  | "--color-accent"
  | "--color-text-primary"
  | "--color-text-secondary"
  | "--color-border"
  | "--color-regime-stable"
  | "--color-regime-heating"
  | "--color-regime-congested"
  | "--color-regime-cheap"
  | "--color-regime-unknown"
  | "--color-chain-bitcoin"
  | "--color-chain-ethereum"
  | "--color-chain-arbitrum"
  | "--color-chain-base";

export type DesignTokenEntry = {
  name: DesignTokenName;
  hex: HexColor;
  usage: string;
};

export type ThemeColorScale = {
  background: HexColor;
  card: HexColor;
  textPrimary: HexColor;
  textSecondary: HexColor;
  border: HexColor;
  accent: HexColor;
};

export const DESIGN_TOKEN_VALUES = {
  "--color-bg-primary": "#080F1A",
  "--color-bg-card": "#111E30",
  "--color-bg-light": "#0D1F35",
  "--color-accent": "#C49230",
  "--color-text-primary": "#E8E0D0",
  "--color-text-secondary": "#7A8A96",
  "--color-border": "#3A4A57",
  "--color-regime-stable": "#10B981",
  "--color-regime-heating": "#C4843C",
  "--color-regime-congested": "#9E4040",
  "--color-regime-cheap": "#3D7099",
  "--color-regime-unknown": "#525E6E",
  "--color-chain-bitcoin": "#C49230",
  "--color-chain-ethereum": "#7A8A96",
  "--color-chain-arbitrum": "#3D7099",
  "--color-chain-base": "#2A6E7A",
} as const satisfies Record<DesignTokenName, HexColor>;

export const DESIGN_TOKENS: readonly DesignTokenEntry[] = [
  {
    name: "--color-bg-primary",
    hex: DESIGN_TOKEN_VALUES["--color-bg-primary"],
    usage: "Page background (dark)",
  },
  {
    name: "--color-bg-card",
    hex: DESIGN_TOKEN_VALUES["--color-bg-card"],
    usage: "Cards and panels (dark)",
  },
  {
    name: "--color-bg-light",
    hex: DESIGN_TOKEN_VALUES["--color-bg-light"],
    usage: "Page background (light)",
  },
  {
    name: "--color-accent",
    hex: DESIGN_TOKEN_VALUES["--color-accent"],
    usage: "Links, active elements, dividers",
  },
  {
    name: "--color-text-primary",
    hex: DESIGN_TOKEN_VALUES["--color-text-primary"],
    usage: "Primary text (dark)",
  },
  {
    name: "--color-text-secondary",
    hex: DESIGN_TOKEN_VALUES["--color-text-secondary"],
    usage: "Secondary text and labels",
  },
  {
    name: "--color-border",
    hex: DESIGN_TOKEN_VALUES["--color-border"],
    usage: "Borders and dividers",
  },
  {
    name: "--color-regime-stable",
    hex: DESIGN_TOKEN_VALUES["--color-regime-stable"],
    usage: "STABLE regime",
  },
  {
    name: "--color-regime-heating",
    hex: DESIGN_TOKEN_VALUES["--color-regime-heating"],
    usage: "HEATING regime",
  },
  {
    name: "--color-regime-congested",
    hex: DESIGN_TOKEN_VALUES["--color-regime-congested"],
    usage: "CONGESTED regime",
  },
  {
    name: "--color-regime-cheap",
    hex: DESIGN_TOKEN_VALUES["--color-regime-cheap"],
    usage: "CHEAP regime",
  },
  {
    name: "--color-regime-unknown",
    hex: DESIGN_TOKEN_VALUES["--color-regime-unknown"],
    usage: "UNKNOWN/DEGRADED regime",
  },
  {
    name: "--color-chain-bitcoin",
    hex: DESIGN_TOKEN_VALUES["--color-chain-bitcoin"],
    usage: "Bitcoin accent",
  },
  {
    name: "--color-chain-ethereum",
    hex: DESIGN_TOKEN_VALUES["--color-chain-ethereum"],
    usage: "Ethereum accent",
  },
  {
    name: "--color-chain-arbitrum",
    hex: DESIGN_TOKEN_VALUES["--color-chain-arbitrum"],
    usage: "Arbitrum accent",
  },
  {
    name: "--color-chain-base",
    hex: DESIGN_TOKEN_VALUES["--color-chain-base"],
    usage: "Base accent",
  },
] as const;

export const THEME_COLORS: Readonly<Record<ThemeMode, ThemeColorScale>> = {
  dark: {
    background: DESIGN_TOKEN_VALUES["--color-bg-primary"],
    card: DESIGN_TOKEN_VALUES["--color-bg-card"],
    textPrimary: DESIGN_TOKEN_VALUES["--color-text-primary"],
    textSecondary: DESIGN_TOKEN_VALUES["--color-text-secondary"],
    border: DESIGN_TOKEN_VALUES["--color-border"],
    accent: DESIGN_TOKEN_VALUES["--color-accent"],
  },
  light: {
    background: DESIGN_TOKEN_VALUES["--color-bg-light"],
    card: "#FFFFFF",
    textPrimary: "#0A0E1A",
    textSecondary: "#475569",
    border: "#D9E2EC",
    accent: DESIGN_TOKEN_VALUES["--color-accent"],
  },
} as const;

export const SEMANTIC_COLORS: Readonly<Record<SemanticColorKey, HexColor>> = {
  bgPrimary: DESIGN_TOKEN_VALUES["--color-bg-primary"],
  bgCard: DESIGN_TOKEN_VALUES["--color-bg-card"],
  bgLight: DESIGN_TOKEN_VALUES["--color-bg-light"],
  accent: DESIGN_TOKEN_VALUES["--color-accent"],
  textPrimary: DESIGN_TOKEN_VALUES["--color-text-primary"],
  textSecondary: DESIGN_TOKEN_VALUES["--color-text-secondary"],
  border: DESIGN_TOKEN_VALUES["--color-border"],
} as const;

export const REGIME_COLORS: Readonly<Record<RegimeColorKey, HexColor>> = {
  stable: DESIGN_TOKEN_VALUES["--color-regime-stable"],
  heating: DESIGN_TOKEN_VALUES["--color-regime-heating"],
  congested: DESIGN_TOKEN_VALUES["--color-regime-congested"],
  cheap: DESIGN_TOKEN_VALUES["--color-regime-cheap"],
  unknown: DESIGN_TOKEN_VALUES["--color-regime-unknown"],
} as const;

export const CHAIN_ACCENT_COLORS: Readonly<Record<ChainId, HexColor>> = {
  bitcoin: DESIGN_TOKEN_VALUES["--color-chain-bitcoin"],
  ethereum: DESIGN_TOKEN_VALUES["--color-chain-ethereum"],
  arbitrum: DESIGN_TOKEN_VALUES["--color-chain-arbitrum"],
  base: DESIGN_TOKEN_VALUES["--color-chain-base"],
} as const;

export const REGIME_LABEL_TO_COLOR_KEY = {
  STABLE: "stable",
  HEATING: "heating",
  CONGESTED: "congested",
  CHEAP: "cheap",
  "UNKNOWN/DEGRADED": "unknown",
} as const;

export type SupportedRegimeLabel = keyof typeof REGIME_LABEL_TO_COLOR_KEY;

export function isSupportedRegimeLabel(value: string): value is SupportedRegimeLabel {
  return value in REGIME_LABEL_TO_COLOR_KEY;
}

export function getDesignTokenHex(name: DesignTokenName): HexColor {
  return DESIGN_TOKEN_VALUES[name];
}

export function getSemanticColor(key: SemanticColorKey): HexColor {
  return SEMANTIC_COLORS[key];
}

export function getThemeColors(mode: ThemeMode): ThemeColorScale {
  return THEME_COLORS[mode];
}

export function getChainAccentColor(chain: ChainId): HexColor {
  return CHAIN_ACCENT_COLORS[chain];
}

export function getRegimeColorByKey(key: RegimeColorKey): HexColor {
  return REGIME_COLORS[key];
}

export function getRegimeColorByLabel(label: string | null | undefined): HexColor {
  if (!label) {
    return REGIME_COLORS.unknown;
  }

  if (isSupportedRegimeLabel(label)) {
    return REGIME_COLORS[REGIME_LABEL_TO_COLOR_KEY[label]];
  }

  return REGIME_COLORS.unknown;
}

export function hexToRgb(hex: HexColor): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return { r, g, b };
}

export function hexToRgbString(hex: HexColor): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

export function hexToRgba(hex: HexColor, alpha: number): string {
  const safeAlpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

export function withAlpha(hex: HexColor, alpha: number): string {
  return hexToRgba(hex, alpha);
}

export function buildCssVariableMap(): Record<DesignTokenName, HexColor> {
  return { ...DESIGN_TOKEN_VALUES };
}

export function buildInlineCssVariables(): Record<DesignTokenName, HexColor> {
  return buildCssVariableMap();
}