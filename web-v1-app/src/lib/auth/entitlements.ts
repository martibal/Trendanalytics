// src/lib/auth/entitlements.ts
import type { ChainId } from "@/config/chains";

export type SubscriptionTier = "public" | "basic" | "pro";
export type SubscriptionStatus = "active" | "inactive";
export type FileGenre = "gold" | "meta" | "derived";
export type WindowToken = "latest" | "7d" | "30d" | "90d" | "180d" | "365d";

export type EntitlementInput = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  entitledChain: ChainId | null;
  historyUnlocked: boolean;
};

export type EntitlementSnapshot = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  entitledChain: ChainId | null;
  historyUnlocked: boolean;
  allowedChains: ChainId[];
  allowedGenres: FileGenre[];
  allowedWindows: WindowToken[];
  maxWindowDays: number;
  historyDepthDays: number | null;
  fullHistory: boolean;
  customThresholdFeeds: boolean;
};

export type EntitlementDecisionCode =
  | "ok"
  | "inactive_subscription"
  | "forbidden_chain"
  | "forbidden_genre"
  | "forbidden_window"
  | "forbidden_history_range"
  | "invalid_date_range";

export type EntitlementDecision = {
  ok: boolean;
  code: EntitlementDecisionCode;
  snapshot: EntitlementSnapshot;
  detail?: string;
};

export type FileRequestScope = {
  chain: ChainId;
  genre: FileGenre;
  window: WindowToken;
  startDate?: string | null;
  endDate?: string | null;
};

const ALL_CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];
const ALL_GENRES: FileGenre[] = ["gold", "meta", "derived"];
const BASIC_WINDOWS: WindowToken[] = ["latest", "7d", "30d", "90d"];
const PRO_WINDOWS: WindowToken[] = ["latest", "7d", "30d", "90d", "180d", "365d"];

const WINDOW_TO_DAYS: Record<Exclude<WindowToken, "latest">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
};

function cloneChains(chains: ChainId[]): ChainId[] {
  return [...chains];
}

function cloneGenres(genres: FileGenre[]): FileGenre[] {
  return [...genres];
}

function cloneWindows(windows: WindowToken[]): WindowToken[] {
  return [...windows];
}

export function windowTokenToDays(window: WindowToken): number | null {
  if (window === "latest") return null;
  return WINDOW_TO_DAYS[window];
}

export function isWindowToken(value: string): value is WindowToken {
  return value === "latest" || value === "7d" || value === "30d" || value === "90d" || value === "180d" || value === "365d";
}

export function buildEntitlementSnapshot(input: EntitlementInput): EntitlementSnapshot {
  if (input.tier === "pro") {
    return {
      tier: "pro",
      status: input.status,
      entitledChain: null,
      historyUnlocked: input.historyUnlocked,
      allowedChains: cloneChains(ALL_CHAINS),
      allowedGenres: cloneGenres(ALL_GENRES),
      allowedWindows: cloneWindows(PRO_WINDOWS),
      maxWindowDays: 365,
      historyDepthDays: input.historyUnlocked ? null : 365,
      fullHistory: input.historyUnlocked,
      customThresholdFeeds: true,
    };
  }

  if (input.tier === "basic") {
    const allowedChains = input.entitledChain ? [input.entitledChain] : [];
    return {
      tier: "basic",
      status: input.status,
      entitledChain: input.entitledChain,
      historyUnlocked: input.historyUnlocked,
      allowedChains,
      allowedGenres: cloneGenres(ALL_GENRES),
      allowedWindows: cloneWindows(BASIC_WINDOWS),
      maxWindowDays: 90,
      historyDepthDays: input.historyUnlocked ? null : 90,
      fullHistory: input.historyUnlocked,
      customThresholdFeeds: false,
    };
  }

  return {
    tier: "public",
    status: input.status,
    entitledChain: null,
    historyUnlocked: false,
    allowedChains: [],
    allowedGenres: [],
    allowedWindows: [],
    maxWindowDays: 0,
    historyDepthDays: 0,
    fullHistory: false,
    customThresholdFeeds: false,
  };
}

export function canAccessChain(snapshot: EntitlementSnapshot, chain: ChainId): boolean {
  return snapshot.allowedChains.includes(chain);
}

export function canAccessGenre(snapshot: EntitlementSnapshot, genre: FileGenre): boolean {
  return snapshot.allowedGenres.includes(genre);
}

export function canAccessWindow(snapshot: EntitlementSnapshot, window: WindowToken): boolean {
  return snapshot.allowedWindows.includes(window);
}

export function getHistoryDepthLabel(snapshot: EntitlementSnapshot): string {
  if (snapshot.tier === "public") return "No subscriber history access";
  if (snapshot.fullHistory) return "Full available history";
  if (snapshot.historyDepthDays == null) return "Full available history";
  return `${snapshot.historyDepthDays} days`;
}

export function getEntitledChainLabel(snapshot: EntitlementSnapshot): string {
  if (snapshot.tier === "pro") return "All chains";
  if (snapshot.tier === "basic") return snapshot.entitledChain ?? "Selection required";
  return "No API entitlement";
}

export function validateDateRangeWithinHistory(
  snapshot: EntitlementSnapshot,
  startDate?: string | null,
  endDate?: string | null
): { ok: boolean; code: EntitlementDecisionCode; detail?: string } {
  if (!startDate && !endDate) {
    return { ok: true, code: "ok" };
  }

  if (!startDate || !endDate) {
    return {
      ok: false,
      code: "invalid_date_range",
      detail: "Both startDate and endDate must be present when date-range access is requested.",
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      ok: false,
      code: "invalid_date_range",
      detail: "Date range contains an invalid ISO date.",
    };
  }

  if (end < start) {
    return {
      ok: false,
      code: "invalid_date_range",
      detail: "endDate must be on or after startDate.",
    };
  }

  if (snapshot.fullHistory || snapshot.historyDepthDays == null) {
    return { ok: true, code: "ok" };
  }

  const inclusiveDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;

  if (inclusiveDays > snapshot.historyDepthDays) {
    return {
      ok: false,
      code: "forbidden_history_range",
      detail: `Requested date span ${inclusiveDays}d exceeds allowed history depth ${snapshot.historyDepthDays}d.`,
    };
  }

  return { ok: true, code: "ok" };
}

export function evaluateFileEntitlement(
  entitlement: EntitlementInput,
  scope: FileRequestScope
): EntitlementDecision {
  const snapshot = buildEntitlementSnapshot(entitlement);

  if (snapshot.tier === "public") {
    return {
      ok: false,
      code: "inactive_subscription",
      snapshot,
      detail: "Public users do not have authenticated file-delivery access.",
    };
  }

  if (snapshot.status !== "active") {
    return {
      ok: false,
      code: "inactive_subscription",
      snapshot,
      detail: "Subscription is not active.",
    };
  }

  if (!canAccessChain(snapshot, scope.chain)) {
    return {
      ok: false,
      code: "forbidden_chain",
      snapshot,
      detail: `Chain '${scope.chain}' is outside the subscriber entitlement.`,
    };
  }

  if (!canAccessGenre(snapshot, scope.genre)) {
    return {
      ok: false,
      code: "forbidden_genre",
      snapshot,
      detail: `Genre '${scope.genre}' is outside the subscriber entitlement.`,
    };
  }

  if (!canAccessWindow(snapshot, scope.window)) {
    return {
      ok: false,
      code: "forbidden_window",
      snapshot,
      detail: `Window '${scope.window}' is outside the subscriber entitlement.`,
    };
  }

  const dateRangeDecision = validateDateRangeWithinHistory(
    snapshot,
    scope.startDate,
    scope.endDate
  );

  if (!dateRangeDecision.ok) {
    return {
      ok: false,
      code: dateRangeDecision.code,
      snapshot,
      detail: dateRangeDecision.detail,
    };
  }

  return {
    ok: true,
    code: "ok",
    snapshot,
  };
}

export function createPublicEntitlement(): EntitlementInput {
  return {
    tier: "public",
    status: "inactive",
    entitledChain: null,
    historyUnlocked: false,
  };
}

export function createBasicEntitlement(
  entitledChain: ChainId | null,
  options?: {
    status?: SubscriptionStatus;
    historyUnlocked?: boolean;
  }
): EntitlementInput {
  return {
    tier: "basic",
    status: options?.status ?? "active",
    entitledChain,
    historyUnlocked: options?.historyUnlocked ?? false,
  };
}

export function createProEntitlement(options?: {
  status?: SubscriptionStatus;
  historyUnlocked?: boolean;
}): EntitlementInput {
  return {
    tier: "pro",
    status: options?.status ?? "active",
    entitledChain: null,
    historyUnlocked: options?.historyUnlocked ?? false,
  };
}