// src/app/thresholds/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";
import { type ThresholdControlValues } from "@/components/thresholds/ThresholdControls";
import ThresholdControlsClient from "@/components/thresholds/ThresholdControlsClient";

import "server-only";

// ---------------------------------------------------------------------------
// Canonical default values — single source of truth for this page
// ---------------------------------------------------------------------------

const CANONICAL_DEFAULTS: ThresholdControlValues = {
  confidence_threshold: 0.4,
  min_persist_days: 3,
  high_pct: 80,
  high_z: 1.5,
  extreme_high_pct: 95,
  extreme_high_z: 2.5,
  low_pct: 20,
  low_z: -1.5,
  extreme_low_pct: 5,
  extreme_low_z: -2.5,
};

// ---------------------------------------------------------------------------
// Shared UI primitives — identical across all pages
// ---------------------------------------------------------------------------

function ModalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .ta-modal { display: none; }
          .ta-modal:target { display: flex; }
        `,
      }}
    />
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>;
}

function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return (
    <a
      href={`#${id}`}
      className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-500/10"
    >
      {label}
    </a>
  );
}

type ExplainPair = { basic: ReactNode; advanced: ReactNode; traceability?: ReactNode };

function ExplainModal({
  id,
  title,
  subtitle,
  pair,
  traceability,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  pair: ExplainPair;
  traceability?: ReactNode;
}) {
  return (
    <div id={id} className="ta-modal fixed inset-0 z-[80] items-center justify-center p-4">
      <a
        href="#"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-label="Close dialog"
      />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/20 bg-[#071322] shadow-2xl shadow-cyan-950/40">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            {subtitle ? (
              <div className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</div>
            ) : null}
          </div>
          <a
            href="#"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10"
            aria-label="Close dialog"
          >
            ×
          </a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-200">
                Basic
              </div>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.basic}</div>
            </section>
            <details className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5" open>
              <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Advanced
              </summary>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.advanced}</div>
            </details>
          </div>
          {traceability ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-300">
                Traceability
              </div>
              <div className="mt-3 text-sm leading-7 text-slate-200">{traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Explanations
// ---------------------------------------------------------------------------

const whatAreThresholdsExplain: ExplainPair = {
  basic: (
    <>
      <p>
        A threshold is simply a line that separates one category from another. On this site,
        thresholds are the rules that decide when a metric is "high", when it is "extreme",
        when confidence is "good enough", and when a chain should be labelled HEATING instead
        of STABLE.
      </p>
      <p className="mt-3">
        Think of it like a weather service that calls it a heatwave when temperature exceeds
        30°C for three consecutive days. The threshold (30°C, 3 days) is the agreed-upon
        rule. The weather itself is just data. Without the threshold, you have numbers.
        With the threshold, you have a classification.
      </p>
      <p className="mt-3">
        TrendAnalytics publishes its thresholds openly so you can understand exactly how any
        label was produced. If you see CONGESTED on Ethereum, you can come here and trace
        exactly which thresholds were crossed to produce that label.
      </p>
      <p className="mt-3">
        The thresholds on this page are the <span className="font-medium text-white">
        canonical defaults</span> — the values the model actually uses every day. You can
        also use the simulator below to explore what would happen if you moved them, but
        that simulation stays in your browser and never changes what the product publishes.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        Thresholds in TrendAnalytics are deterministic classification boundaries applied to
        the output of the scoring pipeline. They operate at two stages. First, metric-level
        thresholds classify each input signal into band categories (LOW, NORMAL, HIGH,
        EXTREME_HIGH, EXTREME_LOW) based on percentile rank and robust z-score. Second,
        regime-level rules combine these band classifications across axes (Demand, Friction,
        Capacity) to derive the terminal regime label.
      </p>
      <p className="mt-3">
        The dual-criterion band system (percentile OR z-score) is deliberate: it ensures that
        a metric can be flagged as high via either a positional argument (rank in recent
        distribution) or a distance argument (standardised deviation from recent centre),
        whichever fires first. This makes the classification robust to distributional
        irregularities where one criterion may be uninformative.
      </p>
      <p className="mt-3">
        The confidence threshold (0.40) is a pre-classification gate. It is evaluated before
        regime rules are applied, which means no amount of extreme axis scores will produce
        a named regime label when confidence is below the floor. This is an intentional
        epistemic guardrail: the model does not publish strong labels under weak evidence.
      </p>
      <p className="mt-3">
        All canonical threshold values are versioned under the current methodology version
        and are the single source of truth for the published outputs. The interactive
        simulator on this page is a presentation layer that re-applies the same rule logic
        to hypothetical threshold values — it does not touch canonical outputs.
      </p>
    </>
  ),
};

const confidenceThresholdExplain: ExplainPair = {
  basic: (
    <>
      <p>
        The confidence threshold is the most important single number on this page. It is set
        to <span className="font-medium text-white">0.40</span>.
      </p>
      <p className="mt-3">
        If a chain&apos;s confidence score falls below 0.40, the model will not publish a
        named regime label for that day. Instead it publishes UNKNOWN/DEGRADED. The data may
        still be shown for transparency, but you should not treat the classification as
        meaningful.
      </p>
      <p className="mt-3">
        There is also a middle zone between 0.40 and 0.70 called the Caution band. Labels in
        this range are published, but the scorecard scores are pulled toward neutral (50) to
        avoid over-interpreting weak evidence. You will see a yellow warning on chain pages
        when confidence is in this range.
      </p>
      <p className="mt-3">
        Above 0.70 is the Good band. The label is well-supported and the scorecard can be
        read normally.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        The confidence gate (default 0.40) is a pre-classification hard floor. It is
        evaluated as: if <InlineCode>confidence_score &lt; confidence_threshold</InlineCode>,
        then <InlineCode>status.label = UNKNOWN/DEGRADED</InlineCode> regardless of axis
        structure. This logic runs before regime band rules are evaluated.
      </p>
      <p className="mt-3">
        The confidence score itself is the geometric mean of data_quality_score and
        label_confidence_score: <InlineCode>√(dq × lc)</InlineCode>. The geometric mean
        ensures that weakness in either component suppresses the composite — a chain with
        perfect data quality but ambiguous label support will not clear the floor on data
        quality alone.
      </p>
      <p className="mt-3">
        In the Caution band (0.40–0.69), scorecard scores are degraded toward 50 via the
        formula <InlineCode>score = 50 + (score − 50) × effective_confidence</InlineCode>.
        This means the visual scorecard always reflects the epistemic weight of the
        underlying evidence — a high demand score under 0.45 confidence will appear much
        closer to neutral than the same raw score under 0.85 confidence.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc pl-5">
      <li>
        Gate field: <InlineCode>confidence.confidence_score</InlineCode>
      </li>
      <li>
        Hard floor: <InlineCode>0.40</InlineCode> → UNKNOWN/DEGRADED
      </li>
      <li>
        Caution band: <InlineCode>0.40–0.69</InlineCode> → scores degraded toward 50
      </li>
      <li>
        Good band: <InlineCode>≥ 0.70</InlineCode> → full scorecard expression
      </li>
    </ul>
  ),
};

const bandThresholdsExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Band thresholds decide whether a metric is "high", "low", "extreme", or "normal"
        on any given day. The model uses two separate tests — percentile rank and z-score —
        and flags a metric as high if either one crosses the threshold.
      </p>
      <p className="mt-3">
        Here is what the default thresholds mean in plain language:
      </p>
      <ul className="mt-2 list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-white">High</span> — the metric is above the
          80th percentile of the last 90 days, or its z-score is above +1.5. Either
          condition is enough.
        </li>
        <li>
          <span className="font-medium text-white">Extreme high</span> — above the 95th
          percentile, or z-score above +2.5. A stronger signal than merely high.
        </li>
        <li>
          <span className="font-medium text-white">Low</span> — below the 20th percentile,
          or z-score below −1.5.
        </li>
        <li>
          <span className="font-medium text-white">Extreme low</span> — below the 5th
          percentile, or z-score below −2.5.
        </li>
        <li>
          <span className="font-medium text-white">Normal</span> — everything in between.
          No band condition fires.
        </li>
      </ul>
    </>
  ),
  advanced: (
    <>
      <p>
        Band thresholds implement a dual-criterion OR logic:{" "}
        <InlineCode>band = HIGH if pct_90d ≥ high_pct OR z_robust ≥ high_z</InlineCode>.
        This OR structure is intentional — it ensures that a metric can be classified as
        high via either a rank argument (positional in the empirical distribution) or a
        distance argument (standardised deviation from the robust centre). In
        well-behaved distributions these will co-fire; in pathological or sparse
        distributions one criterion may be uninformative.
      </p>
      <p className="mt-3">
        The z_robust criterion uses MAD-based standardisation:{" "}
        <InlineCode>z = 0.6745 × (x − median) / MAD</InlineCode>. The 0.6745 scaling makes
        the statistic asymptotically equivalent to a standard z-score under Gaussian
        assumptions while inheriting outlier robustness from the MAD estimator. Fallback:
        if MAD = 0, standard z-score is used; if std = 0, z = 0.
      </p>
      <p className="mt-3">
        Band outcomes feed directly into axis-level regime rule evaluation. CONGESTED
        requires Capacity = EXTREME_HIGH, or (Capacity = HIGH and Friction = HIGH). HEATING
        requires Demand = HIGH and at least one axis trend = HEATING. CHEAP requires both
        Friction = LOW and Capacity = LOW. These rules are applied after all band
        classifications are complete and after confidence gating.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc pl-5">
      <li>High: <InlineCode>pct_90d ≥ 80</InlineCode> OR <InlineCode>z_robust ≥ 1.5</InlineCode></li>
      <li>Extreme high: <InlineCode>pct_90d ≥ 95</InlineCode> OR <InlineCode>z_robust ≥ 2.5</InlineCode></li>
      <li>Low: <InlineCode>pct_90d ≤ 20</InlineCode> OR <InlineCode>z_robust ≤ −1.5</InlineCode></li>
      <li>Extreme low: <InlineCode>pct_90d ≤ 5</InlineCode> OR <InlineCode>z_robust ≤ −2.5</InlineCode></li>
      <li>Source: <InlineCode>regime_engine.py</InlineCode> · <InlineCode>market_scorecard.py</InlineCode></li>
    </ul>
  ),
};

const regimeRulesExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Once the model has classified each metric into a band (high, low, extreme, etc.),
        it applies a set of rules to decide which regime label to assign. These rules are
        evaluated in a fixed order, and the first one that matches wins.
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li>
          <span className="font-medium text-white">UNKNOWN/DEGRADED</span> — checked first.
          If confidence is below 0.40, this label is assigned and no further rules are
          evaluated.
        </li>
        <li>
          <span className="font-medium text-white">CONGESTED</span> — capacity is extreme
          high, or both capacity and friction are high at the same time.
        </li>
        <li>
          <span className="font-medium text-white">CHEAP</span> — both friction and capacity
          are low.
        </li>
        <li>
          <span className="font-medium text-white">HEATING</span> — demand is high, and at
          least one axis is trending upward (momentum positive).
        </li>
        <li>
          <span className="font-medium text-white">STABLE</span> — none of the above apply.
          The chain looks roughly normal.
        </li>
      </ol>
    </>
  ),
  advanced: (
    <>
      <p>
        The regime classification is a deterministic rule tree evaluated after band
        classification and confidence gating. The evaluation order is:
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li>
          If <InlineCode>confidence_score &lt; confidence_threshold</InlineCode> →{" "}
          <InlineCode>UNKNOWN/DEGRADED</InlineCode> (pre-empts all subsequent rules)
        </li>
        <li>
          If <InlineCode>capacity = EXTREME_HIGH</InlineCode> OR{" "}
          (<InlineCode>capacity = HIGH</InlineCode> AND{" "}
          <InlineCode>friction = HIGH</InlineCode>) → <InlineCode>CONGESTED</InlineCode>
        </li>
        <li>
          If <InlineCode>friction = LOW</InlineCode> AND{" "}
          <InlineCode>capacity = LOW</InlineCode> → <InlineCode>CHEAP</InlineCode>
        </li>
        <li>
          If <InlineCode>demand = HIGH</InlineCode> AND any axis trend is{" "}
          <InlineCode>HEATING</InlineCode> (momentum ≥ 0.15) → <InlineCode>HEATING</InlineCode>
        </li>
        <li>
          Default: <InlineCode>STABLE</InlineCode>
        </li>
      </ol>
      <p className="mt-3">
        The priority ordering ensures CONGESTED cannot be masked by CHEAP conditions, and
        HEATING requires both level elevation and directional acceleration. STABLE is the
        residual category — it does not have positive conditions, it is the absence of all
        other conditions. This design means STABLE is epistemically conservative: the model
        does not claim STABLE when no positive evidence exists; it simply finds no reason
        for a stronger label.
      </p>
    </>
  ),
};

const simulatorExplain: ExplainPair = {
  basic: (
    <>
      <p>
        The simulator lets you adjust the threshold values and see immediately how the
        classification rules would change. All of this happens entirely in your browser —
        nothing you do here affects the published data or the official regime labels.
      </p>
      <p className="mt-3">
        This is useful for two things. First, you can understand how sensitive the labels
        are to threshold choices. Move the confidence floor from 0.40 to 0.60 and see how
        many more days would have been classified as UNKNOWN/DEGRADED. Second, Pro
        subscribers can use adjusted thresholds to generate custom JSON outputs that apply
        their own classification rules to the same underlying data.
      </p>
      <p className="mt-3">
        The canonical defaults are always shown. A Reset button appears whenever you have
        moved away from them, so you can always return to the official values.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        The simulator applies the same deterministic classification rules as the production
        pipeline to hypothetical threshold values. It does not re-fetch data — it operates
        on the threshold parameters only and produces a human-readable preview of how the
        boundary descriptions would change.
      </p>
      <p className="mt-3">
        For Pro subscribers, the custom threshold workflow extends beyond the browser
        preview: the API endpoint <InlineCode>POST /api/v1/files/custom</InlineCode> accepts
        a threshold configuration and returns identity-hashed JSON outputs generated by
        applying those thresholds to the canonical published data. Custom outputs are
        immutable per identity hash, stored per account, and explicitly marked as custom —
        they cannot overwrite canonical meta artifacts.
      </p>
      <p className="mt-3">
        The identity hash is derived from the canonical revision_id plus the threshold
        parameter vector. This means two users who submit identical threshold configurations
        against the same dataset revision will receive the same identity hash and the same
        output — the custom classification is fully reproducible and auditable.
      </p>
    </>
  ),
};

const interpretationBoundaryExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Thresholds are tools for understanding, not tools for trading. The classification
        that comes out of applying a threshold is a description of the network&apos;s current
        state — it says nothing about what will happen to prices, what you should buy, or
        when you should act.
      </p>
      <p className="mt-3">
        A good way to think about it: if Ethereum is CONGESTED, that is a factual statement
        about its network condition right now. Whether that is good or bad for you depends
        entirely on what you are trying to do — something the model does not know and
        deliberately does not attempt to guess.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        The threshold system is a classification mechanism over descriptive on-chain
        observables. It has no causal model of price formation, no return objective, and no
        optimisation target. Threshold values were not selected to maximise any performance
        metric — they were selected to produce stable, interpretable, methodology-consistent
        classifications.
      </p>
      <p className="mt-3">
        This has a direct implication for custom threshold use: adjusting thresholds does
        not constitute a backtested strategy. A user who finds that a stricter confidence
        floor or different band boundaries produce a pattern that correlates with past
        returns has made an observation about a descriptive data series, not validated a
        trading system. The product does not publish the price data or return series required
        to make such a validation meaningful.
      </p>
    </>
  ),
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ThresholdsPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <ModalStyles />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
                Classification rules
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Thresholds
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                The exact values that decide when a metric is "high", when confidence is
                "good enough", and which regime label a chain receives. Published openly so
                every classification can be traced and understood.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <MoreLink id="what-are-modal" label="What are thresholds?" />
                <MoreLink id="regime-rules-modal" label="Regime classification rules" />
                <MoreLink id="boundary-modal" label="Interpretation boundary" />
                <Link
                  href="/methodology"
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  Methodology
                </Link>
              </div>
            </div>

            {dataset ? (
              <div className="min-w-[200px] rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-xs text-slate-300">
                <div className="font-medium uppercase tracking-[0.12em] text-slate-400">
                  Dataset
                </div>
                {dataset.version ? (
                  <div className="mt-2">
                    Revision{" "}
                    <span className="font-semibold text-white">{dataset.version}</span>
                  </div>
                ) : null}
                {dataset.methodology_version ? (
                  <div className="mt-1">
                    Methodology{" "}
                    <InlineCode>{dataset.methodology_version}</InlineCode>
                  </div>
                ) : null}
                <div className="mt-2 border-t border-white/10 pt-2 text-slate-400">
                  Source: <InlineCode>{currentDataSource()}</InlineCode>
                </div>
              </div>
            ) : null}
          </div>

          {/* Reading map */}
          <div className="mt-6 rounded-2xl border border-white/8 bg-white/3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                  How to read this page
                </div>
                <div className="mt-2 text-sm text-slate-100">
                  Canonical values → Confidence gate → Band thresholds → Regime rules → Simulator
                </div>
              </div>
              <MoreLink id="what-are-modal" label="Full explanation" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Canonical values at a glance ─────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Canonical defaults
            </div>
            <h2 className="mt-1 text-3xl font-semibold">The values the model uses today</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              These are the exact threshold values in the currently published methodology.
              Every regime label on every chain page was produced using these numbers.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {/* Confidence gate */}
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-amber-300">
                Confidence gate
              </div>
              <MoreLink id="confidence-modal" />
            </div>
            <div className="mt-4 text-3xl font-semibold text-white sm:text-5xl">0.40</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Below this value, the regime label becomes UNKNOWN/DEGRADED regardless of
              axis structure. The most important single threshold on the site.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-2 py-2">
                <div className="font-semibold text-red-300">&lt; 0.40</div>
                <div className="mt-1 text-muted-foreground">Degraded</div>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-2 py-2">
                <div className="font-semibold text-amber-300">0.40–0.69</div>
                <div className="mt-1 text-muted-foreground">Caution</div>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2 py-2">
                <div className="font-semibold text-emerald-300">≥ 0.70</div>
                <div className="mt-1 text-muted-foreground">Good</div>
              </div>
            </div>
          </div>

          {/* High band */}
          <div className="rounded-3xl border p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                High band
              </div>
              <MoreLink id="bands-modal" />
            </div>
            <div className="mt-4 flex items-end gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Percentile</div>
                <div className="text-2xl font-semibold text-white sm:text-4xl">≥ 80</div>
              </div>
              <div className="mb-1 text-muted-foreground">or</div>
              <div>
                <div className="text-xs text-muted-foreground">Z-score</div>
                <div className="text-2xl font-semibold text-white sm:text-4xl">≥ 1.5</div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Either criterion fires the HIGH band. Extreme high: ≥ 95th percentile or
              z ≥ 2.5. Low mirrors these values on the negative side.
            </p>
          </div>

          {/* Regime rules summary */}
          <div className="rounded-3xl border p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                Regime rules
              </div>
              <MoreLink id="regime-rules-modal" />
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-red-400">①</span>
                <span className="text-slate-300">
                  <span className="font-medium text-white">UNKNOWN/DEGRADED</span> — confidence &lt; 0.40
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-red-400">②</span>
                <span className="text-slate-300">
                  <span className="font-medium text-white">CONGESTED</span> — capacity extreme high, or capacity+friction both high
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-blue-400">③</span>
                <span className="text-slate-300">
                  <span className="font-medium text-white">CHEAP</span> — friction+capacity both low
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-amber-400">④</span>
                <span className="text-slate-300">
                  <span className="font-medium text-white">HEATING</span> — demand high + any axis trending up
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-emerald-400">⑤</span>
                <span className="text-slate-300">
                  <span className="font-medium text-white">STABLE</span> — none of the above
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Full band table */}
        <div className="mt-4 rounded-3xl border shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                All band thresholds
              </div>
              <h3 className="mt-1 text-xl font-semibold">Complete canonical values</h3>
            </div>
            <MoreLink id="bands-modal" label="How bands work" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Band</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Percentile criterion</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Z-score criterion</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Logic</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Role in regime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  {
                    band: "EXTREME_HIGH",
                    pct: "≥ 95th",
                    z: "≥ +2.5",
                    logic: "OR",
                    role: "Triggers CONGESTED alone (capacity axis)",
                    color: "text-red-300",
                  },
                  {
                    band: "HIGH",
                    pct: "≥ 80th",
                    z: "≥ +1.5",
                    logic: "OR",
                    role: "CONGESTED (capacity+friction), HEATING (demand)",
                    color: "text-amber-300",
                  },
                  {
                    band: "NORMAL",
                    pct: "20th–80th",
                    z: "−1.5 to +1.5",
                    logic: "—",
                    role: "Default — no band condition fires",
                    color: "text-slate-300",
                  },
                  {
                    band: "LOW",
                    pct: "≤ 20th",
                    z: "≤ −1.5",
                    logic: "OR",
                    role: "CHEAP (friction+capacity both low)",
                    color: "text-blue-300",
                  },
                  {
                    band: "EXTREME_LOW",
                    pct: "≤ 5th",
                    z: "≤ −2.5",
                    logic: "OR",
                    role: "Stronger low signal — feeds CHEAP",
                    color: "text-cyan-300",
                  },
                ].map((row) => (
                  <tr key={row.band} className="hover:bg-muted/10">
                    <td className={`px-5 py-3 font-mono text-xs font-semibold ${row.color}`}>
                      {row.band}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-300">{row.pct}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-300">{row.z}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{row.logic}</td>
                    <td className="px-5 py-3 text-xs text-slate-300">{row.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-5 py-3 text-xs text-muted-foreground">
            Source: <InlineCode>regime_engine.py</InlineCode> ·{" "}
            <InlineCode>market_scorecard.py</InlineCode> · Methodology version{" "}
            <InlineCode>{dataset?.methodology_version ?? "—"}</InlineCode>
          </div>
        </div>
      </section>

      {/* ── Simulator ────────────────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Local exploration
            </div>
            <h2 className="mt-1 text-3xl font-semibold">Threshold simulator</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              Adjust the sliders to explore how different threshold values would change the
              classification rules. Everything here runs in your browser — nothing changes
              what the product actually publishes.
            </p>
          </div>
          <MoreLink id="simulator-modal" label="How the simulator works" />
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3 text-sm text-amber-200 mb-6">
          <span className="font-medium">Local simulation only.</span> Adjusting these
          controls does not overwrite canonical published methodology, public regime labels,
          or default API outputs. All changes are local to your browser session.
        </div>

        <ThresholdControlsClient initialValues={CANONICAL_DEFAULTS} />
      </section>

      {/* ── Navigation strip ─────────────────────────────────────────────── */}
      <section className="mt-10 rounded-3xl border p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
          Related
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/methodology", label: "Methodology", desc: "Full model documentation" },
            { href: "/glossary", label: "Glossary", desc: "Definitions for every term" },
            { href: "/chains", label: "Chains", desc: "See thresholds in action — current labels" },
            { href: "/track-record", label: "Track Record", desc: "Historical label archive" },
            { href: "/status", label: "Status", desc: "Pipeline and freshness health" },
            { href: "/api-docs", label: "API Docs", desc: "Custom threshold output contract" },
          ].map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between rounded-2xl border bg-background/40 px-4 py-3 transition hover:border-cyan-500/30 hover:bg-muted/30"
            >
              <div>
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
              </div>
              <span className="text-xs text-muted-foreground transition group-hover:text-cyan-200">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Data contract ─────────────────────────────────────────────────── */}
      <details className="mt-8 rounded-2xl border p-5">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          Data contract and traceability
        </summary>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <div>Data source: <InlineCode>{currentDataSource()}</InlineCode></div>
          <div>
            Dataset manifest:{" "}
            <InlineCode>data/published/v1/dataset.json</InlineCode>
          </div>
          <div>
            Threshold values are fixed per methodology version. Changes to thresholds
            require a methodology version bump and are documented in{" "}
            <Link href="/methodology/previously" className="underline hover:text-foreground">
              /methodology/previously
            </Link>
            .
          </div>
          <div>
            The interactive simulator does not make network requests and does not persist
            state. It is a client-side presentation layer only.
          </div>
        </div>
      </details>

      {/* ── All modals ────────────────────────────────────────────────────── */}
      <ExplainModal
        id="what-are-modal"
        title="What are thresholds?"
        subtitle="How classification rules work and why they are published openly."
        pair={whatAreThresholdsExplain}
      />

      <ExplainModal
        id="confidence-modal"
        title="The confidence gate — 0.40"
        subtitle="The most important threshold on the site and how it works."
        pair={confidenceThresholdExplain}
        traceability={confidenceThresholdExplain.traceability}
      />

      <ExplainModal
        id="bands-modal"
        title="Band thresholds"
        subtitle="How metrics are classified as high, low, extreme, or normal."
        pair={bandThresholdsExplain}
        traceability={bandThresholdsExplain.traceability}
      />

      <ExplainModal
        id="regime-rules-modal"
        title="Regime classification rules"
        subtitle="The exact rules that produce STABLE, HEATING, CONGESTED, CHEAP, and UNKNOWN/DEGRADED."
        pair={regimeRulesExplain}
      />

      <ExplainModal
        id="simulator-modal"
        title="How the threshold simulator works"
        subtitle="What the interactive controls do and what they do not do."
        pair={simulatorExplain}
      />

      <ExplainModal
        id="boundary-modal"
        title="Interpretation boundary"
        subtitle="What thresholds are and are not for."
        pair={interpretationBoundaryExplain}
      />
    </main>
  );
}
