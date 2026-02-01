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
    <div className="relative -mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-sm md:-mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">At a glance</div>
          <div className="mt-1 text-xs text-zinc-500">
            Quick context about freshness and coverage across published layers.
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] text-zinc-400">
          <div>
            Computed (UTC): <span className="text-zinc-200">{fmtISOOrDash(computedAtUtc)}</span>
          </div>
          <div>
            Methodology: <span className="text-zinc-200">{fmtISOOrDash(methodologyVersion)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">Chains</div>
          <div className="mt-1 text-sm text-zinc-200">{supportedChains.length}</div>
          <div className="mt-1 text-xs text-zinc-500">Supported: {supportedChains.join(", ")}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">Layer as-of (min)</div>
          <div className="mt-2 space-y-1 text-xs text-zinc-400">
            <div>
              meta: <span className="text-zinc-200">{fmtISOOrDash(metaMin)}</span>
            </div>
            <div>
              derived: <span className="text-zinc-200">{fmtISOOrDash(derivedMin)}</span>
            </div>
            <div>
              gold: <span className="text-zinc-200">{fmtISOOrDash(goldMin)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">Coherent bundle date</div>
          <div className="mt-1 text-sm text-zinc-200">{fmtISOOrDash(earliestAcrossLayers)}</div>
          <div className="mt-1 text-xs text-zinc-500">
            We prefer the earliest common date to maximize the chance all layers exist for a given snapshot.
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400">
        <span className="text-zinc-200">Guardrails:</span> descriptive only. Missing values are gaps (null), never zeros.
      </div>
    </div>
  );
}
