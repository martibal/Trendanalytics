// src/app/thresholds/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { type ThresholdControlValues } from "@/components/thresholds/ThresholdControls";
import ThresholdControlsClient from "@/components/thresholds/ThresholdControlsClient";
import { UrdHashModal, UrdHashModalClose, UrdHashModalTrigger } from "@/components/site/UrdHashModal";

import "server-only";

export const revalidate = 0;

// ---------------------------------------------------------------------------
// Canonical default values
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
// UI primitives
// ---------------------------------------------------------------------------

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="code-block inline-block px-2 py-0.5 text-[12px]">{children}</code>;
}

function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return <UrdHashModalTrigger id={id} className="text-link">{label} →</UrdHashModalTrigger>;
}

type ExplainPair = { basic: ReactNode; advanced: ReactNode; traceability?: ReactNode };

function ExplainModal({ id, title, subtitle, pair, traceability }: {
  id: string; title: string; subtitle?: ReactNode;
  pair: ExplainPair; traceability?: ReactNode;
}) {
  return (
    <UrdHashModal id={id}>
      <UrdHashModalClose className="absolute inset-0 bg-[rgba(8,15,26,.84)]" ariaLabel="Close dialog">
        <span className="sr-only">Close dialog</span>
      </UrdHashModalClose>
      <div className="modal-panel relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden">
        <div className="modal-head shrink-0">
          <div>
            <h3 className="ua-h3 text-[var(--ink)]">{title}</h3>
            {subtitle ? <div className="mt-2 text-sm leading-6 text-[var(--ink2)]">{subtitle}</div> : null}
          </div>
          <UrdHashModalClose className="btn-ghost h-10 px-3 shrink-0">×</UrdHashModalClose>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="border-t-2 border-[var(--c-stable)] pt-4">
              <div className="eyebrow mb-3">Basic</div>
              <div className="text-sm leading-7 text-[var(--ink2)]">{pair.basic}</div>
            </section>
            <details className="border-t-2 border-[var(--gold)] pt-4">
              <summary className="eyebrow cursor-pointer mb-3">Advanced</summary>
              <div className="text-sm leading-7 text-[var(--ink2)]">{pair.advanced}</div>
            </details>
          </div>
          {traceability ? (
            <div className="mt-6 border-t border-[var(--line)] pt-5">
              <div className="eyebrow mb-3">Traceability</div>
              <div className="text-sm leading-7 text-[var(--ink2)]">{traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </UrdHashModal>
  );
}

// ---------------------------------------------------------------------------
// Explanations — unchanged from original
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
        Urd Atlas publishes its thresholds openly so you can understand exactly how any
        label was produced. If you see CONGESTED on Ethereum, you can come here and trace
        exactly which thresholds were crossed to produce that label.
      </p>
      <p className="mt-3">
        The thresholds on this page are the <span className="font-medium text-[var(--ink)]">
        canonical defaults</span> — the values the model actually uses every day. You can
        also use the simulator below to explore what would happen if you moved them, but
        that simulation stays in your browser and never changes what the product publishes.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        Thresholds in Urd Atlas are deterministic classification boundaries applied to
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
        to <span className="font-medium text-[var(--ink)]">0.40</span>.
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
        avoid over-interpreting weak evidence. You will see a warning on chain pages
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
    <ul className="list-disc pl-5 text-sm text-[var(--ink2)] space-y-1">
      <li>Gate field: <InlineCode>confidence.confidence_score</InlineCode></li>
      <li>Hard floor: <InlineCode>0.40</InlineCode> → UNKNOWN/DEGRADED</li>
      <li>Caution band: <InlineCode>0.40–0.69</InlineCode> → scores degraded toward 50</li>
      <li>Good band: <InlineCode>≥ 0.70</InlineCode> → full scorecard expression</li>
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
      <p className="mt-3">Here is what the default thresholds mean in plain language:</p>
      <ul className="mt-2 list-disc space-y-2 pl-5">
        <li><span className="font-medium text-[var(--ink)]">High</span> — the metric is above the 80th percentile of the last 90 days, or its z-score is above +1.5. Either condition is enough.</li>
        <li><span className="font-medium text-[var(--ink)]">Extreme high</span> — above the 95th percentile, or z-score above +2.5. A stronger signal than merely high.</li>
        <li><span className="font-medium text-[var(--ink)]">Low</span> — below the 20th percentile, or z-score below −1.5.</li>
        <li><span className="font-medium text-[var(--ink)]">Extreme low</span> — below the 5th percentile, or z-score below −2.5.</li>
        <li><span className="font-medium text-[var(--ink)]">Normal</span> — everything in between. No band condition fires.</li>
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
        distance argument (standardised deviation from the robust centre).
      </p>
      <p className="mt-3">
        The z_robust criterion uses MAD-based standardisation:{" "}
        <InlineCode>z = 0.6745 × (x − median) / MAD</InlineCode>. The 0.6745 scaling makes
        the statistic asymptotically equivalent to a standard z-score under Gaussian
        assumptions while inheriting outlier robustness from the MAD estimator.
      </p>
      <p className="mt-3">
        Band outcomes feed directly into axis-level regime rule evaluation. CONGESTED
        requires Capacity = EXTREME_HIGH, or (Capacity = HIGH and Friction = HIGH). HEATING
        requires Demand = HIGH and at least one axis trend = HEATING. CHEAP requires both
        Friction = LOW and Capacity = LOW.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc pl-5 text-sm text-[var(--ink2)] space-y-1">
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
        <li><span className="font-medium text-[var(--ink)]">UNKNOWN/DEGRADED</span> — checked first. If confidence is below 0.40, this label is assigned and no further rules are evaluated.</li>
        <li><span className="font-medium text-[var(--ink)]">CONGESTED</span> — capacity is extreme high, or both capacity and friction are high at the same time.</li>
        <li><span className="font-medium text-[var(--ink)]">CHEAP</span> — both friction and capacity are low.</li>
        <li><span className="font-medium text-[var(--ink)]">HEATING</span> — demand is high, and at least one axis is trending upward (momentum positive).</li>
        <li><span className="font-medium text-[var(--ink)]">STABLE</span> — none of the above apply. The chain looks roughly normal.</li>
      </ol>
    </>
  ),
  advanced: (
    <>
      <p>The regime classification is a deterministic rule tree evaluated after band classification and confidence gating. The evaluation order is:</p>
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li>If <InlineCode>confidence_score &lt; confidence_threshold</InlineCode> → <InlineCode>UNKNOWN/DEGRADED</InlineCode> (pre-empts all subsequent rules)</li>
        <li>If <InlineCode>capacity = EXTREME_HIGH</InlineCode> OR (<InlineCode>capacity = HIGH</InlineCode> AND <InlineCode>friction = HIGH</InlineCode>) → <InlineCode>CONGESTED</InlineCode></li>
        <li>If <InlineCode>friction = LOW</InlineCode> AND <InlineCode>capacity = LOW</InlineCode> → <InlineCode>CHEAP</InlineCode></li>
        <li>If <InlineCode>demand = HIGH</InlineCode> AND any axis trend is <InlineCode>HEATING</InlineCode> (momentum ≥ 0.15) → <InlineCode>HEATING</InlineCode></li>
        <li>Default: <InlineCode>STABLE</InlineCode></li>
      </ol>
      <p className="mt-3">
        The priority ordering ensures CONGESTED cannot be masked by CHEAP conditions, and
        HEATING requires both level elevation and directional acceleration. STABLE is the
        residual category — it does not have positive conditions, it is the absence of all
        other conditions.
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
        many more days would have been classified as UNKNOWN/DEGRADED. Second, Research
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
        For Research subscribers, the custom threshold workflow extends beyond the browser
        preview: the API endpoint <InlineCode>POST /api/v1/files/custom</InlineCode> accepts
        a threshold configuration and returns identity-hashed JSON outputs generated by
        applying those thresholds to the canonical published data. Custom outputs are
        immutable per identity hash, stored per account, and explicitly marked as custom.
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
        trading system.
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
    <main className="ua-page">

      {/* ── Hero ── */}
      <header className="hero border-b border-[var(--line)]">
        <div className="page-shell">
          <div className="eyebrow mb-4">Classification rules</div>
          <h1 className="ua-h1">Thresholds</h1>
          <p className="lead mt-4 max-w-2xl">
            The exact values that decide when a metric is high, when confidence is good enough,
            and which regime label a chain receives. Published openly so every classification
            can be traced and understood.
          </p>
          <p className="mt-3 text-sm text-[var(--ink2)] max-w-2xl">
            Most regime-classification products do not publish their thresholds. Urd Atlas does,
            so every label can be reconstructed and checked.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <MoreLink id="what-are-modal" label="What are thresholds?" />
            <MoreLink id="regime-rules-modal" label="Regime classification rules" />
            <MoreLink id="boundary-modal" label="Interpretation boundary" />
            <Link href="/methodology" className="text-link">Methodology →</Link>
          </div>
        </div>
      </header>

      <div className="page-shell py-12 space-y-16">

        {/* ── Canonical values ── */}
        <section>
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Canonical defaults</div>
              <h2 className="ua-h2">The values the model uses today</h2>
            </div>
            <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
              These are the exact threshold values in the currently published methodology.
              Every regime label on every chain page was produced using these numbers.
            </p>
          </div>

          <div className="fact-row mb-8" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>

            {/* Confidence gate */}
            <div className="fact-item">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="eyebrow">Confidence gate</div>
                <MoreLink id="confidence-modal" />
              </div>
              <div className="font-mono text-[48px] font-medium text-[var(--c-heating)] leading-none mb-4">0.40</div>
              <p className="text-sm leading-7 text-[var(--ink2)]">
                Below this value, the regime label becomes UNKNOWN/DEGRADED regardless of
                axis structure. The most important single threshold on the site.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div style={{ background: "rgba(158,64,64,.12)", border: "1px solid rgba(158,64,64,.25)", borderRadius: "3px", padding: "8px 4px" }}>
                  <div className="font-mono text-[11px] font-medium" style={{ color: "var(--c-congested)" }}>&lt; 0.40</div>
                  <div className="text-[10px] text-[var(--ink3)] mt-1">Degraded</div>
                </div>
                <div style={{ background: "rgba(196,132,60,.12)", border: "1px solid rgba(196,132,60,.25)", borderRadius: "3px", padding: "8px 4px" }}>
                  <div className="font-mono text-[11px] font-medium" style={{ color: "var(--c-heating)" }}>0.40–0.69</div>
                  <div className="text-[10px] text-[var(--ink3)] mt-1">Caution</div>
                </div>
                <div style={{ background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.25)", borderRadius: "3px", padding: "8px 4px" }}>
                  <div className="font-mono text-[11px] font-medium" style={{ color: "var(--c-stable)" }}>≥ 0.70</div>
                  <div className="text-[10px] text-[var(--ink3)] mt-1">Good</div>
                </div>
              </div>
            </div>

            {/* High band */}
            <div className="fact-item">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="eyebrow">High band</div>
                <MoreLink id="bands-modal" />
              </div>
              <div style={{ display: "flex", alignItems: "end", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <div className="text-[11px] text-[var(--ink3)] mb-1">Percentile</div>
                  <div className="font-mono text-[36px] font-medium text-[var(--ink)] leading-none">≥ 80</div>
                </div>
                <div className="text-[var(--ink3)] mb-2 text-sm">or</div>
                <div>
                  <div className="text-[11px] text-[var(--ink3)] mb-1">Z-score</div>
                  <div className="font-mono text-[36px] font-medium text-[var(--ink)] leading-none">≥ 1.5</div>
                </div>
              </div>
              <p className="text-sm leading-7 text-[var(--ink2)]">
                Either criterion fires the HIGH band. Extreme high: ≥ 95th percentile or
                z ≥ 2.5. Low mirrors these values on the negative side.
              </p>
            </div>

            {/* Regime rules */}
            <div className="fact-item">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="eyebrow">Regime rules</div>
                <MoreLink id="regime-rules-modal" />
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  { num: "①", label: "UNKNOWN/DEGRADED", rule: "confidence < 0.40", color: "var(--c-unknown)" },
                  { num: "②", label: "CONGESTED", rule: "capacity extreme high, or capacity+friction both high", color: "var(--c-congested)" },
                  { num: "③", label: "CHEAP", rule: "friction+capacity both low", color: "var(--c-cheap)" },
                  { num: "④", label: "HEATING", rule: "demand high + any axis trending up", color: "var(--c-heating)" },
                  { num: "⑤", label: "STABLE", rule: "none of the above", color: "var(--c-stable)" },
                ].map(({ num, label, rule, color }) => (
                  <li key={label} style={{ display: "flex", alignItems: "start", gap: "8px" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "11px", color, flexShrink: 0, marginTop: "2px" }}>{num}</span>
                    <span className="text-[var(--ink2)]">
                      <span style={{ fontWeight: 500, color }}>{label}</span> — {rule}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Full band table */}
          <div className="border-t border-[var(--line)]">
            <div className="flex flex-wrap items-center justify-between gap-3 py-5 border-b border-[var(--line)]">
              <div>
                <div className="eyebrow mb-1">All band thresholds</div>
                <h3 className="ua-h3">Complete canonical values</h3>
              </div>
              <MoreLink id="bands-modal" label="How bands work" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    {["Band", "Percentile criterion", "Z-score criterion", "Logic", "Role in regime"].map((h) => (
                      <th key={h} className="px-0 py-3 pr-6 text-left font-mono text-[10px] font-medium uppercase tracking-[.16em] text-[var(--gold)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { band: "EXTREME_HIGH", pct: "≥ 95th", z: "≥ +2.5", logic: "OR", role: "Triggers CONGESTED alone (capacity axis)", color: "var(--c-congested)" },
                    { band: "HIGH",         pct: "≥ 80th", z: "≥ +1.5", logic: "OR", role: "CONGESTED (capacity+friction), HEATING (demand)", color: "var(--c-heating)" },
                    { band: "NORMAL",       pct: "20th–80th", z: "−1.5 to +1.5", logic: "—", role: "Default — no band condition fires", color: "var(--ink3)" },
                    { band: "LOW",          pct: "≤ 20th", z: "≤ −1.5", logic: "OR", role: "CHEAP (friction+capacity both low)", color: "var(--c-cheap)" },
                    { band: "EXTREME_LOW",  pct: "≤ 5th",  z: "≤ −2.5", logic: "OR", role: "Stronger low signal — feeds CHEAP", color: "var(--c-cheap)" },
                  ].map((row) => (
                    <tr key={row.band} className="border-b border-[var(--line)] hover:bg-[var(--surface3)] transition-colors">
                      <td className="py-3 pr-6"><span className="font-mono text-[11px] font-medium" style={{ color: row.color }}>{row.band}</span></td>
                      <td className="py-3 pr-6 font-mono text-[12px] text-[var(--ink2)]">{row.pct}</td>
                      <td className="py-3 pr-6 font-mono text-[12px] text-[var(--ink2)]">{row.z}</td>
                      <td className="py-3 pr-6 text-[12px] text-[var(--ink2)]">{row.logic}</td>
                      <td className="py-3 text-[12px] text-[var(--ink2)]">{row.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[var(--line)] py-3 font-mono text-[10px] text-[var(--ink3)]">
              Source: <InlineCode>regime_engine.py</InlineCode> · <InlineCode>market_scorecard.py</InlineCode> · Methodology version <InlineCode>{dataset?.methodology_version ?? "—"}</InlineCode>
            </div>
          </div>

          {/* Dataset info */}
          {dataset ? (
            <div className="fact-row mt-6" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              {dataset.version ? (
                <div className="fact-item">
                  <strong>Dataset revision</strong>
                  <div className="mt-2 font-mono text-[16px] text-[var(--ink)]">{dataset.version}</div>
                </div>
              ) : null}
              {dataset.methodology_version ? (
                <div className="fact-item">
                  <strong>Methodology version</strong>
                  <div className="mt-2"><InlineCode>{dataset.methodology_version}</InlineCode></div>
                </div>
              ) : null}
              {dataset.published_at ? (
                <div className="fact-item">
                  <strong>Published</strong>
                  <div className="mt-2 font-mono text-[13px] text-[var(--ink)]">{dataset.published_at.slice(0, 10)}</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* ── Simulator ── */}
        <section>
          <div className="section-head mb-8">
            <div>
              <div className="eyebrow mb-3">Local exploration</div>
              <h2 className="ua-h2">Threshold simulator</h2>
              <MoreLink id="simulator-modal" label="How the simulator works" />
            </div>
            <p className="text-sm leading-7 text-[var(--ink2)] max-w-xl">
              Adjust the sliders to explore how different threshold values would change the
              classification rules. Everything here runs in your browser — nothing changes
              what the product actually publishes.
            </p>
          </div>

          <div style={{
            background: "rgba(196,132,60,.08)", border: "1px solid rgba(196,132,60,.25)",
            borderRadius: "var(--radius-sm)", padding: "12px 18px",
            fontFamily: "var(--mono)", fontSize: "11px", color: "var(--c-heating)",
            marginBottom: "24px",
          }}>
            Local simulation only. Adjusting these controls does not overwrite canonical published
            methodology, public regime labels, or default API outputs. All changes are local to your browser session.
          </div>

          <ThresholdControlsClient initialValues={CANONICAL_DEFAULTS} />
        </section>

        {/* ── Related ── */}
        <section className="border-t border-[var(--line)] pt-8">
          <div className="eyebrow mb-6">Related</div>
          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: "/methodology", label: "Methodology", desc: "Full model documentation" },
              { href: "/glossary", label: "Glossary", desc: "Definitions for every term" },
              { href: "/chains", label: "Chains", desc: "See thresholds in action — current labels" },
              { href: "/track-record", label: "Track Record", desc: "Historical label archive" },
              { href: "/status", label: "Status", desc: "Pipeline and freshness health" },
              { href: "/api-docs", label: "API Docs", desc: "Custom threshold output contract" },
            ].map(({ href, label, desc }) => (
              <Link key={href} href={href} className="data-row pr-6" style={{ display: "block", padding: "16px 24px 16px 0" }}>
                <div className="text-[var(--ink)] text-sm font-medium">{label}</div>
                <div className="mt-1 text-[11px] text-[var(--ink3)]">{desc}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Data contract ── */}
        <details className="border-t border-[var(--line)] pt-6">
          <summary className="eyebrow cursor-pointer">Data contract and traceability</summary>
          <div className="mt-4 space-y-2 text-sm text-[var(--ink2)]">
            <div>Dataset manifest: <InlineCode>data/published/v1/dataset.json</InlineCode></div>
            <div>Threshold values are fixed per methodology version. Changes to thresholds require a methodology version bump.</div>
            <div>The interactive simulator does not make network requests and does not persist state. It is a client-side presentation layer only.</div>
          </div>
        </details>

      </div>

      {/* ── Modals ── */}
      <ExplainModal id="what-are-modal" title="What are thresholds?" subtitle="How classification rules work and why they are published openly." pair={whatAreThresholdsExplain} />
      <ExplainModal id="confidence-modal" title="The confidence gate — 0.40" subtitle="The most important threshold on the site and how it works." pair={confidenceThresholdExplain} traceability={confidenceThresholdExplain.traceability} />
      <ExplainModal id="bands-modal" title="Band thresholds" subtitle="How metrics are classified as high, low, extreme, or normal." pair={bandThresholdsExplain} traceability={bandThresholdsExplain.traceability} />
      <ExplainModal id="regime-rules-modal" title="Regime classification rules" subtitle="The exact rules that produce STABLE, HEATING, CONGESTED, CHEAP, and UNKNOWN/DEGRADED." pair={regimeRulesExplain} />
      <ExplainModal id="simulator-modal" title="How the threshold simulator works" subtitle="What the interactive controls do and what they do not do." pair={simulatorExplain} />
      <ExplainModal id="boundary-modal" title="Interpretation boundary" subtitle="What thresholds are and are not for." pair={interpretationBoundaryExplain} />
    </main>
  );
}
