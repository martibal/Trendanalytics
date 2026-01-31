"use client";

import { InfoBox } from "@/components/info-boxes/InfoBox";

export function Methodology() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Methodology</h1>
        <p className="mt-2 text-sm text-zinc-400">
          This site is strictly descriptive: no price data, no forecasts, no recommendations.
        </p>
      </div>

      <InfoBox
        title="Data model"
        basic="The website reads published JSON files from /public/data/published/v1/."
        advanced="The pipeline publishes three genres: gold (raw daily metrics), derived (precomputed transforms like moving averages), and meta (regime + scorecard + confidence). The dataset index file (dataset.json) provides ‘as-of’ dates per chain and genre."
      />

      <InfoBox
        title="Regimes"
        basic="A regime is a label summarizing recent on-chain conditions (e.g., Stable, Heating, Cooling)."
        advanced="Regimes are determined by a deterministic, chain-specific ruleset. Drivers use robust z-scores (median/MAD) and a momentum term comparing short-vs-long windows. Output is a descriptive classification with explicit inputs (drivers table) and no predictive meaning."
      />

      <InfoBox
        title="Confidence"
        basic="Confidence is a data-quality/coverage score for the selected analysis window."
        advanced="Confidence is computed as a coverage-weighted score of available inputs needed by the scorecard/regime engines. Missing components reduce effective confidence and are surfaced per dimension (coverage_factor, effective_confidence)."
      />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
        <div className="font-semibold">Implementation note</div>
        <p className="mt-2">
          This page is intentionally short for v1. In the next increment we will auto-generate per-metric
          documentation directly from the meta schema and pipeline metadata (definitions, formulas, and versioning).
        </p>
      </div>
    </section>
  );
}
