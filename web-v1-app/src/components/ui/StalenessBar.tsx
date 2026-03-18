// src/components/ui/StalenessBar.tsx
"use client";

import React from "react";

export type ChainId = "bitcoin" | "ethereum" | "arbitrum" | "base";

export type StalenessState = "OK" | "WARN" | "FAIL";

export type StalenessPolicy = {
  expected_lag_days: number;
  soft_warn_lag_days: number;
  hard_fail_lag_days: number;
};

const POLICY: Record<ChainId, StalenessPolicy> = {
  bitcoin: { expected_lag_days: 1, soft_warn_lag_days: 2, hard_fail_lag_days: 4 }, // 48h/96h
  ethereum: { expected_lag_days: 1, soft_warn_lag_days: 2, hard_fail_lag_days: 4 }, // 48h/96h
  arbitrum: { expected_lag_days: 7, soft_warn_lag_days: 10, hard_fail_lag_days: 15 },
  base: { expected_lag_days: 7, soft_warn_lag_days: 10, hard_fail_lag_days: 15 },
};

export function getStalenessPolicy(chain: ChainId): StalenessPolicy {
  return POLICY[chain];
}

export function computeStalenessState(chain: ChainId, lagDays: number | null | undefined): StalenessState {
  if (typeof lagDays !== "number" || Number.isNaN(lagDays)) return "OK";

  const p = POLICY[chain];
  if (lagDays > p.hard_fail_lag_days) return "FAIL";
  if (lagDays > p.soft_warn_lag_days) return "WARN";
  return "OK";
}

function chainShort(chain: ChainId) {
  switch (chain) {
    case "bitcoin":
      return "BTC";
    case "ethereum":
      return "ETH";
    case "arbitrum":
      return "ARB";
    case "base":
      return "BASE";
  }
}

function barClass(state: StalenessState) {
  // Descriptive visual treatment only (no advice)
  const base = "rounded-xl border px-4 py-3 text-sm";
  if (state === "FAIL") return `${base} border-red-200 bg-red-50`;
  if (state === "WARN") return `${base} border-yellow-200 bg-yellow-50`;
  return `${base} border-muted bg-muted/20`;
}

function badgeClass(state: StalenessState) {
  const base = "rounded-full border px-2 py-1 text-xs font-medium";
  if (state === "FAIL") return `${base} border-red-300 bg-red-100`;
  if (state === "WARN") return `${base} border-yellow-300 bg-yellow-100`;
  return `${base} border-muted bg-muted`;
}

function stateLabel(state: StalenessState) {
  if (state === "FAIL") return "HARD STALENESS";
  if (state === "WARN") return "SOFT STALENESS";
  return "ON SCHEDULE";
}

function messageFor(props: { chain: ChainId; state: StalenessState; lagDays?: number | null }) {
  const { chain, state, lagDays } = props;
  const p = POLICY[chain];

  // Governance copy aligned to Master doc language (descriptive-only)
  if (state === "FAIL") {
    return `Updates appear significantly delayed relative to the expected schedule. The latest available day is shown; interpretation may be less reliable. Check System Status for details.`;
  }
  if (state === "WARN") {
    return `Updates appear delayed beyond the expected schedule. The latest available day is shown; check System Status for details.`;
  }

  // OK state: only show an informational banner for chains with expected delay (ARB/BASE),
  // otherwise the bar can be hidden by the caller (default).
  if (chain === "arbitrum" || chain === "base") {
    const obs = typeof lagDays === "number" ? `${lagDays}d` : "—";
    return `This chain is published with an expected delay of approximately ${p.expected_lag_days} days. The latest available day is shown. (Observed lag: ${obs})`;
  }

  const obs = typeof lagDays === "number" ? `${lagDays}d` : "—";
  return `Observed lag: ${obs}. Expected publish lag is ~${p.expected_lag_days} day(s).`;
}

export type StalenessBarProps = {
  chain: ChainId;
  /** Observed lag in days (meta.confidence.lag_days_vs_utc_today) */
  lagDays?: number | null;
  /** Optional "as of" date string (e.g., meta.updated_through) for display context */
  asOfDate?: string;
  /**
   * If true, show even when OK (useful on /status).
   * If false (default), only show when WARN/FAIL; for ARB/BASE it will show OK as "Expected Delay".
   */
  showWhenOk?: boolean;
  className?: string;
};

export default function StalenessBar({ chain, lagDays, asOfDate, showWhenOk = false, className }: StalenessBarProps) {
  const state = computeStalenessState(chain, lagDays);

  const shouldShow =
    state !== "OK" ? true : showWhenOk ? true : chain === "arbitrum" || chain === "base";

  if (!shouldShow) return null;

  const p = POLICY[chain];
  const obs = typeof lagDays === "number" && !Number.isNaN(lagDays) ? lagDays : null;

  return (
    <div className={`${barClass(state)} ${className ?? ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={badgeClass(state)}>{stateLabel(state)}</span>
          <span className="text-muted-foreground text-xs">
            {chainShort(chain)} policy: expected {p.expected_lag_days}d · soft {p.soft_warn_lag_days}d · hard {p.hard_fail_lag_days}d
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          {asOfDate ? (
            <>
              Data as of <span className="font-medium text-foreground">{asOfDate}</span>
            </>
          ) : (
            <>Data as of —</>
          )}
          {obs !== null ? (
            <>
              {" "}
              · Observed lag <span className="font-medium text-foreground">{obs}d</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-2 text-sm text-muted-foreground">{messageFor({ chain, state, lagDays })}</div>

      <div className="mt-2 text-xs text-muted-foreground">
        Source: <code className="rounded bg-muted px-1 py-0.5">meta.confidence.lag_days_vs_utc_today</code> and{" "}
        <code className="rounded bg-muted px-1 py-0.5">meta.updated_through</code>. This banner never hides data.
      </div>
    </div>
  );
}