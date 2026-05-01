// src/lib/utils/freshness.ts

export type FreshnessState = "ok" | "warn" | "fail" | "unknown";

export type FreshnessPolicy = {
  expectedLagDays: number;
  warnAfterDays: number;
  failAfterDays: number;
};

export type FreshnessResult = {
  state: FreshnessState;
  ageDays: number | null;
  expectedLagDays: number;
  warnAfterDays: number;
  failAfterDays: number;
  asOfDate: string | null;
  detail: string;
};

export const FRESHNESS_POLICIES: Record<string, FreshnessPolicy> = {
  bitcoin: {
    expectedLagDays: 1,
    warnAfterDays: 2,
    failAfterDays: 4,
  },
  ethereum: {
    expectedLagDays: 1,
    warnAfterDays: 2,
    failAfterDays: 4,
  },
  arbitrum: {
    expectedLagDays: 7,
    warnAfterDays: 10,
    failAfterDays: 15,
  },
  base: {
    expectedLagDays: 7,
    warnAfterDays: 10,
    failAfterDays: 15,
  },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function normalizeAsOfDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function getFreshnessPolicy(chainId: string | null | undefined): FreshnessPolicy {
  if (!chainId) {
    return {
      expectedLagDays: 1,
      warnAfterDays: 2,
      failAfterDays: 4,
    };
  }

  return (
    FRESHNESS_POLICIES[chainId] ?? {
      expectedLagDays: 1,
      warnAfterDays: 2,
      failAfterDays: 4,
    }
  );
}

export function computeAgeDays(
  asOfDate: string | Date | null | undefined,
  now: string | Date = new Date()
): number | null {
  const asOf = normalizeAsOfDate(asOfDate);
  const current = normalizeAsOfDate(now);

  if (!asOf || !current) {
    return null;
  }

  const diffMs = current.getTime() - asOf.getTime();
  const nonNegativeMs = Math.max(0, diffMs);

  return Math.floor(nonNegativeMs / MS_PER_DAY);
}

export function computeFreshnessState(
  ageDays: number | null,
  policy: FreshnessPolicy
): FreshnessState {
  if (ageDays == null || Number.isNaN(ageDays) || !Number.isFinite(ageDays)) {
    return "unknown";
  }

  if (ageDays >= policy.failAfterDays) {
    return "fail";
  }

  if (ageDays >= policy.warnAfterDays) {
    return "warn";
  }

  return "ok";
}

export function getFreshnessDetail(state: FreshnessState, ageDays: number | null): string {
  if (state === "unknown") {
    return "Freshness could not be determined because the as-of date is missing or invalid.";
  }

  if (state === "fail") {
    return `Data appears significantly stale (${ageDays}d old).`;
  }

  if (state === "warn") {
    return `Data appears delayed beyond the expected schedule (${ageDays}d old).`;
  }

  return `Data freshness is within the expected schedule (${ageDays}d old).`;
}

export function evaluateFreshness(params: {
  chainId: string | null | undefined;
  asOfDate: string | Date | null | undefined;
  now?: string | Date;
}): FreshnessResult {
  const policy = getFreshnessPolicy(params.chainId);
  const ageDays = computeAgeDays(params.asOfDate, params.now ?? new Date());
  const state = computeFreshnessState(ageDays, policy);

  return {
    state,
    ageDays,
    expectedLagDays: policy.expectedLagDays,
    warnAfterDays: policy.warnAfterDays,
    failAfterDays: policy.failAfterDays,
    asOfDate:
      normalizeAsOfDate(params.asOfDate)?.toISOString().slice(0, 10) ?? null,
    detail: getFreshnessDetail(state, ageDays),
  };
}

export function isFreshnessWarning(state: FreshnessState): boolean {
  return state === "warn" || state === "fail";
}

export function freshnessStateLabel(state: FreshnessState): string {
  switch (state) {
    case "ok":
      return "OK";
    case "warn":
      return "WARN";
    case "fail":
      return "FAIL";
    default:
      return "UNKNOWN";
  }
}