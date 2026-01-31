"use client";

import React from "react";

export type ScorecardDimension = {
  score_raw: number | null;
  score: number; // 0..100, 50 neutral
  level: string; // e.g. "Normal", "Balanced"
  effective_confidence: number; // 0..1
  coverage_factor: number; // 0..1
  components: Record<
    string,
    {
      current: number | null;
      z: number | null;
      score_raw: number | null;
    }
  >;
};

export type Scorecard = {
  chain?: string;
  missing?: boolean;
  asof_date: string;
  window_days: number;
  confidence_score: number;
  // IMPORTANT: matches your hook typing (Record<string, ...>)
  dimensions: Record<string, ScorecardDimension>;
  // notes can be either the meta.scorecard object form OR a string[]
  notes?: { interpretation?: string } | string[] | null;
};

function fmtNum(x: number | null | undefined, digits = 2): string {
  if (x === null || x === undefined) return "—";
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(digits);
}

function fmtPct01(x: number | null | undefined): string {
  if (x === null || x === undefined) return "—";
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

function Pill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
      {text}
    </span>
  );
}

function KVP({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs text-zinc-400">
        {k}
        {hint ? (
          <span className="ml-1 text-zinc-600" title={hint}>
            ⓘ
          </span>
        ) : null}
      </div>
      <div className="text-sm text-zinc-100 tabular-nums">{v}</div>
    </div>
  );
}

function DimensionCard({
  title,
  dim,
  windowDays,
  explainMode,
}: {
  title: string;
  dim: ScorecardDimension;
  windowDays: number;
  explainMode: "basic" | "advanced";
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100">{title}</div>
          <div className="mt-1 text-xs text-zinc-400">
            Level: <span className="text-zinc-200">{dim.level}</span>
          </div>
        </div>
        <Pill text={`${windowDays}d window`} />
      </div>

      <div className="mt-4 space-y-2">
        <KVP
          k="Score (0–100)"
          v={fmtNum(dim.score, 1)}
          hint="50 is neutral vs the chain's own history"
        />
        <KVP
          k="Coverage"
          v={fmtPct01(dim.coverage_factor)}
          hint="Share of dimension inputs available for this chain/date"
        />

        {explainMode === "advanced" ? (
          <>
            <KVP
              k="Raw score"
              v={dim.score_raw === null ? "—" : fmtNum(dim.score_raw, 2)}
              hint="Internal pre-normalization score (may be null if no inputs)"
            />
            <KVP
              k="Effective confidence"
              v={fmtNum(dim.effective_confidence, 3)}
              hint="Internal confidence used to pull score toward 50 when low"
            />
          </>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3">
        {explainMode === "advanced" ? (
          <div className="text-xs text-zinc-400">
            Components (available inputs only):
            <ul className="mt-2 space-y-1">
              {Object.entries(dim.components ?? {}).map(([k, c]) => {
                const hasAny =
                  c?.current !== null || c?.z !== null || c?.score_raw !== null;
                return (
                  <li key={k} className="flex justify-between gap-3">
                    <span className="text-zinc-300">{k}</span>
                    <span className="text-zinc-500 tabular-nums">
                      {hasAny ? `current=${c.current ?? "—"} | z=${c.z ?? "—"}` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="text-xs text-zinc-400">
            Descriptive composite based on available on-chain signals. Missing
            inputs reduce coverage and pull scores toward neutral (50).
          </div>
        )}
      </div>
    </div>
  );
}

function getInterpretationNote(notes: Scorecard["notes"]): string | null {
  if (!notes) return null;
  if (Array.isArray(notes)) return notes.join(" ");
  if (typeof notes === "object" && "interpretation" in notes) {
    return notes.interpretation ?? null;
  }
  return null;
}

export function ScorecardView({
  scorecard,
  explainMode,
}: {
  scorecard: Scorecard;
  explainMode: "basic" | "advanced";
}) {
  const dims = scorecard.dimensions ?? {};

  // Pull the canonical three if present; otherwise, render nothing.
  const demand = dims["demand"];
  const friction = dims["friction"];
  const capacity = dims["capacity"];

  const hasAny = Boolean(demand || friction || capacity);
  if (!hasAny) {
    return null;
  }

  const note = getInterpretationNote(scorecard.notes);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-zinc-100">Scorecard</div>
          <div className="mt-1 text-xs text-zinc-400">
            Chain operating profile (descriptive, non-predictive). As-of{" "}
            <span className="text-zinc-200">{scorecard.asof_date}</span>.
          </div>
        </div>
        <Pill text={explainMode === "advanced" ? "Advanced" : "Basic"} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {demand ? (
          <DimensionCard
            title="Demand"
            dim={demand}
            windowDays={scorecard.window_days}
            explainMode={explainMode}
          />
        ) : null}
        {friction ? (
          <DimensionCard
            title="Friction"
            dim={friction}
            windowDays={scorecard.window_days}
            explainMode={explainMode}
          />
        ) : null}
        {capacity ? (
          <DimensionCard
            title="Capacity"
            dim={capacity}
            windowDays={scorecard.window_days}
            explainMode={explainMode}
          />
        ) : null}
      </div>

      {note ? <div className="mt-4 text-xs text-zinc-500">{note}</div> : null}

      <div className="mt-3 text-xs text-zinc-500">
        Interpretation guardrail: scorecard values summarize observed historical context.
        They do not imply causality or future outcomes.
      </div>
    </section>
  );
}
