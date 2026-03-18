"use client";

import type { ChainId } from "@/lib/types";

function minNonEmptyISO(dates: Array<string | undefined | null>): string | null {
  const xs = dates.filter((x): x is string => typeof x === "string" && x.length > 0);
  if (xs.length === 0) return null;
  // ISO YYYY-MM-DD compares lexicographically
  return xs.sort()[0] ?? null;
}

function fmtISOOrDash(x: unknown) {
  return typeof x === "string" && x.length ? x : "—";
}

export function AtAGlanceSummaryCard(props: {
  computedAtUtc?: string;
  methodologyVersion?: string;
  supportedChains: ChainId[];
  asofMeta: Record<string, string | undefined>;
  asofDerived: Record<string, string | undefined>;
  asofGold: Record<string, string | undefined>;
}) {
  const { computedAtUtc, methodologyVersion, supportedChains, asofMeta, asofDerived, asofGold } = props;

  const metaMin = minNonEmptyISO(Object.values(asofMeta));
  const derivedMin = minNonEmptyISO(Object.values(asofDerived));
  const goldMin = minNonEmptyISO(Object.values(asofGold));

  const earliestAcrossLayers = minNonEmptyISO([metaMin, derivedMin, goldMin]);

  return (
    <div className="ui-card ui-lift relative -mt-8 rounded-3xl border border-ui-border bg-ui-bg/20 p-6 md:-mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ui-text">At a glance</div>
          <div className="mt-1 text-xs text-ui-faint">Quick context about freshness and coverage across published layers.</div>
        </div>

        {/* Top-right metadata pill */}
        <div className="rounded-2xl border border-ui-border bg-ui-bg/30 px-4 py-3 text-[11px] text-ui-muted backdrop-blur">
          <div>
            Computed (UTC): <span className="text-ui-text">{fmtISOOrDash(computedAtUtc)}</span>
          </div>
          <div>
            Methodology: <span className="text-ui-text">{fmtISOOrDash(methodologyVersion)}</span>
          </div>
        </div>
      </div>

      {/* Three cards */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-ui-border bg-ui-bg/15 px-4 py-3 transition hover:bg-ui-bg/25">
          <div className="text-[11px] uppercase tracking-wide text-ui-faint">Chains</div>
          <div className="mt-1 text-sm text-ui-text">{supportedChains.length}</div>
          <div className="mt-1 text-xs text-ui-faint">Supported: {supportedChains.join(", ")}</div>
        </div>

        <div className="rounded-2xl border border-ui-border bg-ui-bg/15 px-4 py-3 transition hover:bg-ui-bg/25">
          <div className="text-[11px] uppercase tracking-wide text-ui-faint">Layer as-of (min)</div>
          <div className="mt-2 space-y-1 text-xs text-ui-muted">
            <div>
              meta: <span className="text-ui-text">{fmtISOOrDash(metaMin)}</span>
            </div>
            <div>
              derived: <span className="text-ui-text">{fmtISOOrDash(derivedMin)}</span>
            </div>
            <div>
              gold: <span className="text-ui-text">{fmtISOOrDash(goldMin)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ui-border bg-ui-bg/15 px-4 py-3 transition hover:bg-ui-bg/25">
          <div className="text-[11px] uppercase tracking-wide text-ui-faint">Coherent bundle date</div>
          <div className="mt-1 text-sm text-ui-text">{fmtISOOrDash(earliestAcrossLayers)}</div>
          <div className="mt-1 text-xs text-ui-faint">
            We prefer the earliest common date to maximize the chance all layers exist for a given snapshot.
          </div>
        </div>
      </div>

      {/* Guardrails strip */}
      <div className="mt-5 rounded-2xl border border-ui-border bg-ui-bg/15 px-4 py-3 text-xs text-ui-muted">
        <span className="text-ui-text">Guardrails:</span> descriptive only. Missing values are gaps (null), never zeros.
      </div>
    </div>
  );
}