// src/components/ui/StalenessBar.tsx
"use client";

export type ChainId = "bitcoin" | "ethereum" | "arbitrum" | "base";

export type StalenessState = "OK" | "WARN" | "FAIL" | "UNKNOWN" | "DEGRADED";

export type StalenessPolicy = {
  expected_lag_days: number;
  soft_warn_lag_days: number;
  hard_fail_lag_days: number;
};

const POLICY: Record<ChainId, StalenessPolicy> = {
  bitcoin: {
    expected_lag_days: 1,
    soft_warn_lag_days: 2,
    hard_fail_lag_days: 4,
  },
  ethereum: {
    expected_lag_days: 1,
    soft_warn_lag_days: 2,
    hard_fail_lag_days: 4,
  },
  arbitrum: {
    expected_lag_days: 7,
    soft_warn_lag_days: 10,
    hard_fail_lag_days: 15,
  },
  base: {
    expected_lag_days: 7,
    soft_warn_lag_days: 10,
    hard_fail_lag_days: 15,
  },
};

export function getStalenessPolicy(chain: ChainId): StalenessPolicy {
  return POLICY[chain];
}

export function computeStalenessState(
  chain: ChainId,
  lagDays: number | null | undefined,
  confidenceScore?: number | null
): StalenessState {
  if (typeof confidenceScore === "number" && confidenceScore < 0.4) {
    return "DEGRADED";
  }

  if (typeof lagDays !== "number" || Number.isNaN(lagDays)) {
    return "UNKNOWN";
  }

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

function containerClass(state: StalenessState) {
  const base =
    "rounded-2xl border px-4 py-4 sm:px-5 sm:py-4 shadow-sm backdrop-blur-sm";

  if (state === "FAIL") {
    return `${base} border-red-500/35 bg-red-500/12`;
  }
  if (state === "WARN") {
    return `${base} border-amber-500/35 bg-amber-500/12`;
  }
  if (state === "DEGRADED") {
    return `${base} border-slate-400/40 bg-slate-500/14`;
  }
  if (state === "UNKNOWN") {
    return `${base} border-border bg-muted/60`;
  }
  return `${base} border-border bg-muted/30`;
}

function badgeClass(state: StalenessState) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase";

  if (state === "FAIL") {
    return `${base} border-red-500/40 bg-red-500/15 text-red-200 dark:text-red-200`;
  }
  if (state === "WARN") {
    return `${base} border-amber-500/40 bg-amber-500/15 text-amber-200 dark:text-amber-200`;
  }
  if (state === "DEGRADED") {
    return `${base} border-slate-300/40 bg-slate-300/10 text-slate-100 dark:text-slate-100`;
  }
  if (state === "UNKNOWN") {
    return `${base} border-border bg-background/50 text-foreground`;
  }
  return `${base} border-border bg-background/50 text-foreground`;
}

function titleClass(state: StalenessState) {
  if (state === "FAIL") return "text-red-100 dark:text-red-100";
  if (state === "WARN") return "text-amber-100 dark:text-amber-100";
  if (state === "DEGRADED") return "text-slate-50 dark:text-slate-50";
  return "text-foreground";
}

function metaClass(state: StalenessState) {
  if (state === "FAIL") return "text-red-100/85 dark:text-red-100/85";
  if (state === "WARN") return "text-amber-100/85 dark:text-amber-100/85";
  if (state === "DEGRADED") return "text-slate-100/85 dark:text-slate-100/85";
  return "text-muted-foreground";
}

function bodyClass(state: StalenessState) {
  if (state === "FAIL") return "text-red-50/95 dark:text-red-50/95";
  if (state === "WARN") return "text-amber-50/95 dark:text-amber-50/95";
  if (state === "DEGRADED") return "text-slate-50/95 dark:text-slate-50/95";
  return "text-muted-foreground";
}

function codeClass(state: StalenessState) {
  if (state === "FAIL" || state === "WARN" || state === "DEGRADED") {
    return "rounded bg-black/20 px-1 py-0.5 text-[11px] text-white/90";
  }
  return "rounded bg-muted px-1 py-0.5 text-[11px]";
}

function stateLabel(state: StalenessState) {
  if (state === "FAIL") return "Hard staleness";
  if (state === "WARN") return "Soft staleness";
  if (state === "DEGRADED") return "Unknown / degraded";
  if (state === "UNKNOWN") return "Freshness unknown";
  return "On schedule";
}

function stateHeading(state: StalenessState) {
  if (state === "FAIL") return "Published data appears materially delayed";
  if (state === "WARN") return "Published data appears delayed";
  if (state === "DEGRADED") return "Published state should be treated as degraded";
  if (state === "UNKNOWN") return "Freshness could not be classified";
  return "Published data is on its expected schedule";
}

function messageFor(props: {
  chain: ChainId;
  state: StalenessState;
  lagDays?: number | null;
  confidenceScore?: number | null;
}) {
  const { chain, state, lagDays, confidenceScore } = props;
  const p = POLICY[chain];

  if (state === "DEGRADED") {
    return "Confidence is below the canonical 0.40 publish threshold. That means the latest row can still be shown for traceability, but the published state should be read as UNKNOWN/DEGRADED rather than as a normal-confidence output. This is an evidence-quality warning, not a claim that the raw files are missing.";
  }

  if (state === "FAIL") {
    return "Observed lag is materially above the chain’s normal publication policy. The latest available row is still shown, but freshness is now outside the hard-fail boundary, so the user should read the current state as unusually delayed relative to normal publishing cadence.";
  }

  if (state === "WARN") {
    return "Observed lag is above the chain’s usual publication policy but not yet beyond the hard-fail boundary. The latest available row is still shown, but freshness should be read with more caution until the next expected publication arrives.";
  }

  if (state === "UNKNOWN") {
    return "The currently published lag fields are not sufficient to classify freshness cleanly. The latest visible state is still rendered, but freshness should be treated as unknown rather than silently assumed to be current.";
  }

  if (chain === "arbitrum" || chain === "base") {
    const obs = typeof lagDays === "number" ? `${lagDays}d` : "—";
    return `This chain is intentionally published on a slower cadence than BTC and ETH. For ${chainShort(
      chain
    )}, an observed lag around ${p.expected_lag_days} days is part of the normal publication policy, not automatically a problem. Observed lag in the current row: ${obs}.`;
  }

  const obs = typeof lagDays === "number" ? `${lagDays}d` : "—";
  return `Observed lag is ${obs}. For ${chainShort(
    chain
  )}, normal publication policy is approximately ${p.expected_lag_days} day(s), so this row still sits inside expected schedule.${
    typeof confidenceScore === "number"
      ? ` Published confidence: ${confidenceScore.toFixed(3)}.`
      : ""
  }`;
}

export type StalenessBarProps = {
  chain: ChainId;
  lagDays?: number | null;
  asOfDate?: string;
  confidenceScore?: number | null;
  showWhenOk?: boolean;
  className?: string;
};

export default function StalenessBar({
  chain,
  lagDays,
  asOfDate,
  confidenceScore,
  showWhenOk = false,
  className,
}: StalenessBarProps) {
  const state = computeStalenessState(chain, lagDays, confidenceScore);

  const shouldShow =
    state !== "OK"
      ? true
      : showWhenOk
        ? true
        : chain === "arbitrum" || chain === "base";

  if (!shouldShow) return null;

  const p = POLICY[chain];
  const obs =
    typeof lagDays === "number" && !Number.isNaN(lagDays) ? `${lagDays}d` : "—";

  return (
    <section className={`${containerClass(state)} ${className ?? ""}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={badgeClass(state)}>{stateLabel(state)}</span>
            <span className={`text-xs ${metaClass(state)}`}>
              {chainShort(chain)} policy: expected {p.expected_lag_days}d · soft{" "}
              {p.soft_warn_lag_days}d · hard {p.hard_fail_lag_days}d
            </span>
          </div>

          <h3 className={`mt-2 text-sm font-semibold sm:text-base ${titleClass(state)}`}>
            {stateHeading(state)}
          </h3>

          <p className={`mt-2 max-w-3xl text-sm leading-6 ${bodyClass(state)}`}>
            {messageFor({ chain, state, lagDays, confidenceScore })}
          </p>

          <div className={`mt-3 text-xs leading-6 ${metaClass(state)}`}>
            <div>
              <span className="font-medium text-foreground dark:text-white">
                How to read this:
              </span>{" "}
              freshness and confidence are related but different.
            </div>
            <div className="mt-1">
              <span className={codeClass(state)}>lag_days</span> tells you how far the published row sits behind the
              reference date. <span className={codeClass(state)}>confidence_score</span> tells you how much evidence
              supports the current published label. A row can be on schedule but still degraded if confidence falls
              below the canonical publish floor.
            </div>
          </div>
        </div>

        <div
          className={`min-w-[240px] rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-xs ${metaClass(
            state
          )}`}
        >
          <div>
            Data as of{" "}
            <span className="font-semibold text-foreground dark:text-white">
              {asOfDate && asOfDate.trim().length > 0 ? asOfDate : "—"}
            </span>
          </div>
          <div className="mt-1">
            Observed lag{" "}
            <span className="font-semibold text-foreground dark:text-white">{obs}</span>
          </div>
          {typeof confidenceScore === "number" ? (
            <div className="mt-1">
              Confidence{" "}
              <span className="font-semibold text-foreground dark:text-white">
                {confidenceScore.toFixed(3)}
              </span>
            </div>
          ) : null}
          <div className="mt-2 border-t border-white/10 pt-2">
            <div>
              <span className="font-medium text-foreground dark:text-white">
                Expected:
              </span>{" "}
              ~{p.expected_lag_days}d
            </div>
            <div className="mt-1">
              <span className="font-medium text-foreground dark:text-white">
                Soft warning:
              </span>{" "}
              &gt; {p.soft_warn_lag_days}d
            </div>
            <div className="mt-1">
              <span className="font-medium text-foreground dark:text-white">
                Hard fail:
              </span>{" "}
              &gt; {p.hard_fail_lag_days}d
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
