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
    "rounded-2xl border px-4 py-4 sm:px-5 sm:py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]";

  if (state === "FAIL") {
    return `${base} border-red-300 bg-red-50`;
  }
  if (state === "WARN") {
    return `${base} border-amber-300 bg-amber-50`;
  }
  if (state === "DEGRADED") {
    return `${base} border-slate-300 bg-slate-100`;
  }
  if (state === "UNKNOWN") {
    return `${base} border-[var(--urd-border-soft)] bg-[#edf5fb]`;
  }
  return `${base} border-[var(--urd-border-soft)] bg-[#edf5fb]`;
}

function badgeClass(state: StalenessState) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase";

  if (state === "FAIL") {
    return `${base} border-red-400 bg-red-100 text-red-950`;
  }
  if (state === "WARN") {
    return `${base} border-amber-400 bg-amber-100 text-amber-950`;
  }
  if (state === "DEGRADED") {
    return `${base} border-slate-500 bg-slate-200 text-slate-950`;
  }
  if (state === "UNKNOWN") {
    return `${base} border-[var(--urd-border)] bg-[var(--urd-raised)] text-[var(--urd-text-strong)]`;
  }
  return `${base} border-[var(--urd-border)] bg-[var(--urd-raised)] text-[var(--urd-text-strong)]`;
}

function titleClass(state: StalenessState) {
  if (state === "FAIL") return "text-red-950";
  if (state === "WARN") return "text-amber-950";
  if (state === "DEGRADED") return "text-slate-950";
  return "text-[var(--urd-text-strong)]";
}

function metaClass(state: StalenessState) {
  if (state === "FAIL") return "text-red-800";
  if (state === "WARN") return "text-amber-800";
  if (state === "DEGRADED") return "text-slate-700";
  return "text-[var(--urd-text-muted)]";
}

function bodyClass(state: StalenessState) {
  if (state === "FAIL") return "text-red-900";
  if (state === "WARN") return "text-amber-900";
  if (state === "DEGRADED") return "text-slate-800";
  return "text-[var(--urd-text-muted)]";
}

function codeClass(state: StalenessState) {
  if (state === "FAIL") {
    return "rounded bg-red-100 px-1 py-0.5 text-[11px] text-red-900";
  }
  if (state === "WARN") {
    return "rounded bg-amber-100 px-1 py-0.5 text-[11px] text-amber-900";
  }
  return "rounded bg-[var(--urd-panel-strong)] px-1 py-0.5 text-[11px] text-[var(--urd-text-strong)]";
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
              <span className={titleClass(state)}>
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

        <div className="min-w-[240px] rounded-xl border border-[var(--urd-border)] bg-[var(--urd-panel-strong)] px-4 py-4 text-xs font-medium leading-6 text-[var(--urd-text-body)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          <div>
            Data as of{" "}
            <span className="font-black text-[var(--urd-text-strong)]">
              {asOfDate && asOfDate.trim().length > 0 ? asOfDate : "—"}
            </span>
          </div>
          <div>
            Observed lag <span className="font-black text-[var(--urd-text-strong)]">{obs}</span>
          </div>
          {typeof confidenceScore === "number" ? (
            <div>
              Confidence{" "}
              <span className="font-black text-[var(--urd-text-strong)]">
                {confidenceScore.toFixed(3)}
              </span>
            </div>
          ) : null}

          <div className="mt-2 border-t border-[var(--urd-border)] pt-2">
            <div>
              <span className="font-black text-[var(--urd-text-strong)]">Expected:</span>{" "}
              ~{p.expected_lag_days}d
            </div>
            <div>
              <span className="font-black text-[var(--urd-text-strong)]">Soft warning:</span>{" "}
              &gt; {p.soft_warn_lag_days}d
            </div>
            <div>
              <span className="font-black text-[var(--urd-text-strong)]">Hard fail:</span>{" "}
              &gt; {p.hard_fail_lag_days}d
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
