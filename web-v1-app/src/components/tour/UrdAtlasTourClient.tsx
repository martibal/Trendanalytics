"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type ExplanationLevel = "beginner" | "analyst";

type PipelineStep = {
  id: string;
  number: string;
  label: string;
  beginnerTitle: string;
  analystTitle: string;
  beginnerSummary: string;
  analystSummary: string;
  beginnerBullets: string[];
  analystBullets: string[];
  beginnerVisual: ReactNode;
  analystVisual: ReactNode;
  beginnerTrust: string;
  analystTrust: string;
};

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "public-data",
    number: "01",
    label: "Public data",
    beginnerTitle: "Start with public blockchain activity",
    analystTitle: "Source layer: public chain activity, not market data",
    beginnerSummary:
      "Every supported chain produces public activity every day: blocks, transactions, fees, timing, and execution behavior. Urd Atlas starts there. It does not start with price charts, social media, news, or trading sentiment.",
    analystSummary:
      "The source layer is public blockchain activity. Urd Atlas excludes price data, exchange data, social sentiment, private wallet scoring, and advisory signals. The input universe is limited to chain activity evidence that can be aggregated into daily reference rows.",
    beginnerBullets: [
      "The product studies the network itself.",
      "It asks whether usage, cost, or capacity behavior has changed.",
      "It does not try to tell users whether to buy or sell anything.",
    ],
    analystBullets: [
      "Source observations are chain-specific and normalized before publication.",
      "BTC, ETH, ARB, and BASE do not expose the same evidence surface.",
      "Raw source rows are not redistributed; published artifacts are aggregated, derived, or interpreted JSON.",
    ],
    beginnerVisual: <SourceVisual mode="beginner" />,
    analystVisual: <SourceVisual mode="analyst" />,
    beginnerTrust:
      "This answers the first trust question: Urd Atlas is not a price model. It is a network-behavior reference layer.",
    analystTrust:
      "Boundary: the public product is downstream of raw source data. It publishes reproducible artifact semantics, not raw-source redistribution.",
  },
  {
    id: "ingestion",
    number: "02",
    label: "Ingestion",
    beginnerTitle: "Collect and organize the raw activity",
    analystTitle: "Ingestion and chain-profile normalization",
    beginnerSummary:
      "Raw blockchain data is too large and uneven to read directly. The pipeline organizes it by chain and date so each day can be compared against the chain's own history.",
    analystSummary:
      "Ingestion loads source observations into the internal pipeline and prepares chain-specific feature surfaces. The normalization step matters because Bitcoin, Ethereum L1, and L2 environments have different valid concepts.",
    beginnerBullets: [
      "The raw input is cleaned into a daily working shape.",
      "Each chain is handled according to how that chain actually works.",
      "Bitcoin is not treated as if it has Ethereum gas fields.",
    ],
    analystBullets: [
      "Chain profile determines which fields are required, optional, or structurally non-applicable.",
      "Confidence v2 excludes structurally non-applicable fields from data-quality denominators.",
      "Known publication lag is handled as chain policy, not automatically as evidence failure.",
    ],
    beginnerVisual: <IngestionVisual mode="beginner" />,
    analystVisual: <IngestionVisual mode="analyst" />,
    beginnerTrust:
      "This avoids the common mistake of comparing chains as if all chains expose identical data.",
    analystTrust:
      "This is where profile-aware confidence begins: the evidence surface is chain-specific before label scoring is considered.",
  },
  {
    id: "features",
    number: "03",
    label: "Daily features",
    beginnerTitle: "Turn raw data into daily measurements",
    analystTitle: "Daily feature aggregation",
    beginnerSummary:
      "The pipeline compresses the raw activity into daily measurements: transaction activity, fee pressure, timing, and chain-specific execution context.",
    analystSummary:
      "Raw observations are aggregated into daily feature rows keyed by chain and UTC date. These rows become the measurement substrate used by Gold, Derived, Meta, and Briefs.",
    beginnerBullets: [
      "One row means one chain on one UTC date.",
      "Measurements are descriptive, not predictive.",
      "The point is to make daily network behavior readable.",
    ],
    analystBullets: [
      "Daily aggregation is the step between high-volume source rows and stable customer artifacts.",
      "Fields used downstream are profile-aware; unavailable or non-applicable concepts are not forced into every chain.",
      "The published product begins after raw-to-daily aggregation, not at the raw table level.",
    ],
    beginnerVisual: <FeatureVisual mode="beginner" />,
    analystVisual: <FeatureVisual mode="analyst" />,
    beginnerTrust:
      "This answers: what happened on this chain on this date?",
    analystTrust:
      "This provides the unit of observation for all downstream deterministic transforms and regime classification.",
  },
  {
    id: "gold",
    number: "04",
    label: "Gold JSON",
    beginnerTitle: "Gold records what happened",
    analystTitle: "Gold JSON: the daily observation artifact",
    beginnerSummary:
      "Gold is the measurement layer. It says what happened on a specific chain on a specific date before Urd Atlas adds trend context or regime interpretation.",
    analystSummary:
      "Gold JSON is the daily observation layer. It publishes direct daily chain aggregates or robust daily summaries and does not contain regime labels, forecasts, recommendations, or price fields.",
    beginnerBullets: [
      "What was transaction activity?",
      "What did fees look like?",
      "How did block timing or capacity behavior look?",
    ],
    analystBullets: [
      "Gold is keyed by chain and UTC date.",
      "Gold is the base layer for Derived transforms and Meta classification.",
      "Gold should be read as measurement, not interpretation.",
    ],
    beginnerVisual: <ArtifactVisual mode="beginner" artifact="Gold" />,
    analystVisual: <ArtifactVisual mode="analyst" artifact="Gold" />,
    beginnerTrust:
      "Gold makes the product inspectable from the measurement layer upward.",
    analystTrust:
      "Gold is the first customer-facing layer in the artifact contract and the first stable join target for external workflows.",
  },
  {
    id: "derived",
    number: "05",
    label: "Derived JSON",
    beginnerTitle: "Derived adds trend context",
    analystTitle: "Derived JSON: deterministic trend transforms",
    beginnerSummary:
      "Derived answers a simple question: is today high, low, or normal compared with recent days? It adds rolling trend context without changing what Gold measured.",
    analystSummary:
      "Derived JSON applies deterministic transforms to Gold, such as moving averages and horizon comparisons. It contextualizes recent behavior but does not classify or recommend.",
    beginnerBullets: [
      "Short-term behavior can be compared with medium-term behavior.",
      "The layer helps separate one-day noise from broader movement.",
      "It still does not predict future prices or future chain activity.",
    ],
    analystBullets: [
      "Typical fields follow transform families such as metric__ma7 and metric__ma30.",
      "Derived outputs are deterministic given the Gold history and methodology version.",
      "Derived is trend context, not a separate model.",
    ],
    beginnerVisual: <TrendVisual mode="beginner" />,
    analystVisual: <TrendVisual mode="analyst" />,
    beginnerTrust:
      "Derived explains why a recent value matters instead of leaving users with an isolated daily number.",
    analystTrust:
      "Derived provides transparent horizon context used for charting, state interpretation, and downstream feature joins.",
  },
  {
    id: "meta",
    number: "06",
    label: "Meta JSON",
    beginnerTitle: "Meta decides what the current state means",
    analystTitle: "Meta JSON: regime, scorecard, confidence, drivers",
    beginnerSummary:
      "Meta is the interpretation layer. It decides whether the chain looks stable, heating, congested, cheap, or too unclear to label confidently.",
    analystSummary:
      "Meta combines scorecard state, regime logic, confidence decomposition, driver evidence, freshness, status text, methodology version, and determinism fields.",
    beginnerBullets: [
      "STABLE means the chain has not crossed a meaningful regime threshold.",
      "HEATING means demand pressure is building.",
      "CONGESTED means friction or capacity pressure is elevated.",
      "UNKNOWN/DEGRADED means weak evidence is not forced into a strong label.",
    ],
    analystBullets: [
      "Regime labels are produced from chain-relative demand, friction, and capacity evidence.",
      "Confidence v2 uses sqrt(data_quality_score × label_confidence_score).",
      "Label confidence is label-specific and uses raw regime/scorecard evidence, not confidence-degraded display scores.",
    ],
    beginnerVisual: <MetaVisual mode="beginner" />,
    analystVisual: <MetaVisual mode="analyst" />,
    beginnerTrust:
      "Meta is where Urd Atlas refuses to overclaim: if the evidence is weak, UNKNOWN/DEGRADED is a valid output.",
    analystTrust:
      "Meta is the primary analytical artifact and the layer most subscribers will join against their own daily research tables.",
  },
  {
    id: "briefs",
    number: "07",
    label: "Briefs JSON",
    beginnerTitle: "Briefs explain the latest state in readable form",
    analystTitle: "Briefs JSON: readable summaries generated from Meta",
    beginnerSummary:
      "Briefs are for users who do not want to inspect every JSON field. They translate the latest published evidence into short readable summaries.",
    analystSummary:
      "Briefs are generated from published Meta evidence. They do not override Meta, create a separate prediction model, or add advisory interpretation.",
    beginnerBullets: [
      "What changed?",
      "What drove the latest state?",
      "How stable has the latest label been?",
    ],
    analystBullets: [
      "Briefs include site-level, cross-chain, and per-chain context.",
      "Briefs are useful for reporting and direct reading workflows.",
      "If Meta changes after a methodology rebuild, Briefs are regenerated from the revised evidence.",
    ],
    beginnerVisual: <BriefVisual mode="beginner" />,
    analystVisual: <BriefVisual mode="analyst" />,
    beginnerTrust:
      "Briefs make the technical artifact set readable without replacing the data.",
    analystTrust:
      "Briefs are downstream of Meta, so they inherit provenance, methodology version, and evidence constraints from the published artifact set.",
  },
  {
    id: "publication",
    number: "08",
    label: "Website + API",
    beginnerTitle: "Publish the same JSON to the website and API",
    analystTitle: "Published artifact set consumed by website and API",
    beginnerSummary:
      "The website reads from the same published JSON files that subscribers can inspect. The public pages are not a separate marketing story layered on top of hidden results.",
    analystSummary:
      "Published artifacts are materialized under the public dataset structure with latest files, history windows, manifests, methodology version, freshness context, and deterministic identity where applicable.",
    beginnerBullets: [
      "The site display comes from the published data.",
      "Subscribers can inspect the JSON directly.",
      "Sample files let users validate the structure before subscribing.",
    ],
    analystBullets: [
      "The customer surface is the artifact contract: Gold, Derived, Meta, and Briefs.",
      "Website state, API access, samples, and track record should resolve back to the same published artifact semantics.",
      "Changelog entries document output-affecting methodology changes and historical republish events.",
    ],
    beginnerVisual: <PublicationVisual mode="beginner" />,
    analystVisual: <PublicationVisual mode="analyst" />,
    beginnerTrust:
      "This closes the trust loop: the explanation, the JSON, and the website all point to the same published layer.",
    analystTrust:
      "This is where production observability matters: manifests, latest pointers, historical rows, method versioning, and subscriber cache guidance.",
  },
];

const LEVEL_COPY = {
  beginner: {
    eyebrow: "Beginner explanation",
    title: "See the whole process without needing to know statistics.",
    subtitle:
      "This view explains what happens at each stage in plain language: what goes in, what comes out, and why it matters.",
  },
  analyst: {
    eyebrow: "Analyst explanation",
    title: "Inspect the artifact contract, evidence flow, controls, and failure modes.",
    subtitle:
      "This view uses the same pipeline as the beginner version, but expands each stage into the methodological contract a quant or technical reviewer needs: evidence boundary, transform semantics, confidence decomposition, regime/scorecard separation, provenance, verification focus, and subscriber/cache implications.",
  },
} as const;

const ANALYST_EXPANSIONS: Record<
  string,
  {
    interpretation: string[];
    verification: string[];
    caveats: string[];
  }
> = {
  "public-data": {
    interpretation: [
      "The source boundary is deliberately narrower than a general crypto analytics product. Urd Atlas treats public chain activity as the only valid evidence surface for regime classification. It does not mix in price, exchange liquidity, news, social data, wallet scoring, or discretionary market narratives. This matters because downstream labels can then be read as statements about network behavior rather than market direction.",
      "For a quant reviewer, the important distinction is that source evidence is chain-native and chain-relative. Bitcoin, Ethereum, Arbitrum, and Base do not expose identical observations or identical semantics, so the input surface is not forced into one universal schema before interpretation. The shared product contract begins at the published artifact layers, not at an imagined identical raw-source table.",
    ],
    verification: [
      "Check that product copy and artifact fields do not imply price, recommendation, or forecast semantics.",
      "Inspect Gold/Meta samples to confirm the public files describe activity, fees, capacity, confidence, labels, and provenance rather than price returns.",
      "Confirm that methodology pages disclose the trust boundary: auditable meaning and behavior without raw-source redistribution.",
    ],
    caveats: [
      "Public source data availability is not identical across chains.",
      "A missing chain-specific concept should not automatically be treated as missing evidence.",
      "The product is not designed to reconstruct raw source rows from published aggregates.",
    ],
  },
  ingestion: {
    interpretation: [
      "Ingestion is where chain profiles start to matter. The pipeline cannot evaluate BTC, ETH, and L2 networks by pretending they all expose the same EVM execution fields. The evidence surface has to be normalized into what is valid for each chain before data quality can be judged fairly.",
      "This is also the conceptual root of Confidence v2. Data quality is not measured as a blind count of every desirable metric. It is measured against the required metrics for the active chain profile. Structurally non-applicable fields are excluded from denominators, while optional fields remain visible without reducing confidence when they are not part of the current evidence surface.",
    ],
    verification: [
      "For BTC, confirm that gas utilization, failed transaction rate, median gas price, and EVM capacity fields are treated as structurally non-applicable rather than missing.",
      "For L2s, confirm that expected publication lag is treated as chain policy and not automatically as a data-quality failure.",
      "Check confidence.components.data_quality.required_metrics against the fields actually used for that chain profile.",
    ],
    caveats: [
      "Profile-aware does not mean lenient. If a required metric for that profile is missing or stale, confidence should still fall.",
      "Optional non-penalized fields should remain documented so users understand what is and is not part of the current confidence denominator.",
      "Changing the evidence surface is methodology-sensitive and should be reflected in changelog and methodology versioning.",
    ],
  },
  features: {
    interpretation: [
      "Daily feature aggregation is the step that converts high-volume source observations into the unit Urd Atlas can publish and reason about: one chain, one UTC date, one daily feature row. This is the bridge between raw operational data and the customer-facing reference-data model.",
      "The goal is not to preserve every raw observation. The goal is to create stable daily measurements that can support deterministic transforms, regime logic, confidence scoring, and published JSON. Because all downstream layers are daily, this stage also enforces the product cadence: Urd Atlas is intentionally not an intraday spike detector.",
    ],
    verification: [
      "Check that every published row can be read as chain + UTC date, not an intraday timestamped signal.",
      "Inspect whether downstream labels, Briefs, and history windows consistently reference the same daily as-of date.",
      "Verify that freshness and lag fields are explicit so users can compare BTC/ETH and L2 chains without assuming equal update cadence.",
    ],
    caveats: [
      "Daily aggregation intentionally discards intraday sequence information.",
      "A daily artifact can still move day to day; daily does not mean smoothed into long regimes unless a downstream user applies that filter.",
      "The aggregation layer should not be interpreted as a complete raw-data audit trail.",
    ],
  },
  gold: {
    interpretation: [
      "Gold is the first public artifact layer and should be read as measurement rather than interpretation. It answers what was observed for a chain/date after daily aggregation, before trend context, confidence gating, status text, or regime interpretation is applied.",
      "For quant use, Gold is the cleanest join layer when users want raw daily network measurements without the analytical overlay. It is the base from which Derived and parts of Meta can be traced conceptually, even though the full private feature pipeline is not disclosed in cloneable detail.",
    ],
    verification: [
      "Check field names, units, nullability, and chain-specific availability against the schema and Field Dictionary.",
      "Confirm that Gold rows do not contain labels, recommendations, or price-derived values.",
      "Use Gold as the first layer when testing whether downstream changes are measurement-driven or interpretation-driven.",
    ],
    caveats: [
      "Gold is not raw source data and should not be marketed as raw redistribution.",
      "Some fields are robust summaries rather than literal arithmetic claims.",
      "Gold field availability can vary by chain profile and should be interpreted with methodology notes.",
    ],
  },
  derived: {
    interpretation: [
      "Derived is the deterministic context layer. It does not introduce a discretionary model or a new prediction target. It applies documented transforms to Gold so recent observations can be read relative to nearby history, typically through rolling windows and horizon comparisons.",
      "For analysts, the key point is that Derived separates measurement from interpretation while still making trend state easier to consume. A user can inspect Gold for the base measurement and Derived for the same measurement in recent-context form before reading Meta categorical interpretation.",
    ],
    verification: [
      "Check that common transform families such as metric__ma7 and metric__ma30 behave as deterministic functions of the Gold history.",
      "Confirm that Derived does not contain advice, price forecasts, or non-deterministic language.",
      "Use Derived to audit whether a trend-sensitive label such as HEATING has plausible short-vs-medium horizon support.",
    ],
    caveats: [
      "Derived context is not the same as a regime label.",
      "Rolling averages can smooth shocks and should not be read as raw daily values.",
      "At archive boundaries, early-window behavior needs explicit interpretation because less lookback history may be available.",
    ],
  },
  meta: {
    interpretation: [
      "Meta is the primary analytical artifact. It combines regime label, confidence, scorecard, drivers, freshness context, status text, methodology version, and traceability fields into one published daily interpretation row. This is the layer most subscribers will use when they want daily regime context joined into their own research tables.",
      "The important methodological distinction is that scorecard pressure and regime labels are related but not identical. Scorecard dimensions describe axis pressure on a bounded display scale. Regime labels require rule confirmation. A STABLE label can therefore coexist with elevated scorecard demand when demand pressure is visible but the HEATING rule threshold is not crossed.",
      "Confidence v2 splits the confidence problem into data quality and label confidence. data_quality_score asks whether the required evidence surface for this chain is complete, fresh, and dense enough. label_confidence_score asks whether the evidence clearly supports the specific published label. The public composite remains sqrt(data_quality_score × label_confidence_score), so weakness in either part suppresses the final score.",
    ],
    verification: [
      "Inspect confidence.methodology_version and confirm it is confidence_v2_profile_evidence for updated rows.",
      "Check confidence.formula, data_quality_score, label_confidence_score, and confidence_score for mathematical consistency.",
      "Review confidence.components.data_quality.required_metrics and structurally_not_applicable to verify chain-profile behavior.",
      "Compare scorecard.dimensions.<axis>.score_raw, score, and effective_confidence to see how low confidence pulls display scores toward 50.",
      "Read status.one_liner and status.explanation_support to confirm adjacent scorecard pressure is explained rather than hidden.",
    ],
    caveats: [
      "A high data_quality_score does not imply a high label_confidence_score.",
      "A label can be eligible above the 0.40 confidence gate while still having modest support.",
      "UNKNOWN/DEGRADED is a valid output and should be treated as a safety feature, not a product failure.",
      "Regime labels are daily descriptive states, not guaranteed multi-day segments.",
    ],
  },
  briefs: {
    interpretation: [
      "Briefs are the readable layer generated from published Meta evidence. They are designed for users who want to understand the current state without inspecting every JSON object manually, but they do not replace or override the Meta artifact.",
      "For technical review, Briefs should be treated as downstream summaries. If Meta is regenerated because methodology changes, Briefs should be regenerated from the revised Meta evidence. That makes Briefs useful for reporting and customer comprehension while preserving Meta as the analytical source of truth.",
    ],
    verification: [
      "Check whether a Brief updated_through date aligns with the underlying Meta window it summarizes.",
      "Confirm that Briefs explain regime path, confidence state, movement, and chain context without adding investment advice.",
      "For methodology rebuilds, verify that Briefs were regenerated after Meta and that changelog tells cached users to re-pull affected artifacts.",
    ],
    caveats: [
      "Briefs are human-readable summaries, not a separate classifier.",
      "Brief language should stay descriptive and should not introduce stronger claims than Meta supports.",
      "A readable summary can simplify wording, but it should not hide low confidence or degraded states.",
    ],
  },
  publication: {
    interpretation: [
      "Publication is where the internal pipeline becomes the customer-facing artifact contract. The website, API, sample pack, and track-record surfaces should all point back to the same published JSON semantics rather than maintaining separate stories for marketing and data delivery.",
      "For analysts, this matters because operational trust is not only about formulas. It is about whether latest pointers, history windows, manifests, methodology versioning, determinism hashes, changelog entries, and subscriber cache guidance all line up after a methodology change or data republish.",
    ],
    verification: [
      "Open the production latest Meta JSON directly and verify methodology_version, confidence_v2 fields, status.one_liner, and updated_through.",
      "Check that the website renders from the same public data path used by the API/sample inspection workflow.",
      "After a retroactive rebuild, confirm the changelog states historical rows changed and whether cached subscribers should re-pull Meta/Briefs.",
    ],
    caveats: [
      "A frontend deploy alone does not regenerate JSON artifacts.",
      "A pipeline run must publish a data commit before Vercel can show new data values.",
      "Future scheduled runs should use the normal incremental lookback after a one-off retroactive rebuild is complete.",
    ],
  },
};

const JSON_EXAMPLE_BEGINNER = `{
  "chain": "bitcoin",
  "date": "2026-05-17",
  "status": {
    "label": "STABLE",
    "one_liner": "Stable label with adjacent pressure..."
  },
  "confidence": {
    "confidence_score": 0.47,
    "meaning": "data is complete, but the label margin is modest"
  },
  "no_price_data": true
}`;

const JSON_EXAMPLE_ANALYST = `{
  "chain": "bitcoin",
  "date": "2026-05-17",
  "methodology_version": "1.1",
  "confidence": {
    "methodology_version": "confidence_v2_profile_evidence",
    "formula": "sqrt(data_quality_score * label_confidence_score)",
    "data_quality_score": 1.0,
    "label_confidence_score": 0.2215,
    "confidence_score": 0.4706,
    "semantics": "combined_profile_aware_data_quality_and_label_specific_evidence",
    "components": {
      "data_quality": {
        "required_metrics": [
          "tx_count_daily",
          "block_count_daily",
          "median_tx_fee_native",
          "avg_block_time_sec"
        ],
        "structurally_not_applicable": [
          "gas_utilization_pct",
          "failed_tx_rate",
          "median_gas_price",
          "capacity_util_pct"
        ],
        "optional_not_penalized": [
          "unique_active_addresses",
          "median_tx_value_native",
          "value_transferred_native"
        ]
      },
      "label_confidence": {
        "candidate_label": "STABLE",
        "uses_score_raw": true,
        "uses_confidence_degraded_display_score": false,
        "used": {
          "neutrality_score": 0.0,
          "axis_coherence": 0.2296,
          "no_strong_driver_score": 0.6138
        }
      }
    }
  },
  "scorecard": {
    "dimensions": {
      "demand": {
        "level": "High",
        "score": 68.13,
        "score_raw": 88.52,
        "effective_confidence": 0.4706
      }
    }
  },
  "status": {
    "label": "STABLE",
    "one_liner": "Stable label with adjacent pressure: demand is elevated on the scorecard, but regime-axis demand did not cross the HEATING threshold."
  }
}`;

function highlightJson(json: string): string {
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="ua-tour-json-key">$1</span>$2')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="ua-tour-json-string">$1</span>')
    .replace(/:\s*(-?\d[\d.e+\-]*)/gi, ': <span class="ua-tour-json-number">$1</span>')
    .replace(/:\s*(null|true|false)/g, ': <span class="ua-tour-json-bool">$1</span>');
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function LevelToggle({
  level,
  setLevel,
  compact = false,
}: {
  level: ExplanationLevel;
  setLevel: (value: ExplanationLevel) => void;
  compact?: boolean;
}) {
  return (
    <div className={cx("ua-tour-toggle", compact && "is-compact")} aria-label="Explanation level">
      <div className="ua-tour-toggle-label">Explanation level</div>
      <button
        type="button"
        className={cx("ua-tour-toggle-button", level === "beginner" && "is-active")}
        onClick={() => setLevel("beginner")}
      >
        Beginner explanation
      </button>
      <button
        type="button"
        className={cx("ua-tour-toggle-button", level === "analyst" && "is-active")}
        onClick={() => setLevel("analyst")}
      >
        Analyst explanation
      </button>
    </div>
  );
}

function MiniPipeline({ level }: { level: ExplanationLevel }) {
  return (
    <div className="ua-tour-mini-pipeline" aria-label="Urd Atlas pipeline">
      {PIPELINE_STEPS.map((step, index) => (
        <a key={step.id} href={`#${step.id}`} className="ua-tour-mini-step">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{step.label}</strong>
          <em>
            {level === "beginner"
              ? step.beginnerTitle.replace(/^Start with /, "").replace(/^Turn /, "")
              : step.analystTitle.split(":")[0]}
          </em>
        </a>
      ))}
    </div>
  );
}

function ArticleSection({
  step,
  level,
}: {
  step: PipelineStep;
  level: ExplanationLevel;
}) {
  const title = level === "beginner" ? step.beginnerTitle : step.analystTitle;
  const summary = level === "beginner" ? step.beginnerSummary : step.analystSummary;
  const bullets = level === "beginner" ? step.beginnerBullets : step.analystBullets;
  const visual = level === "beginner" ? step.beginnerVisual : step.analystVisual;
  const trust = level === "beginner" ? step.beginnerTrust : step.analystTrust;
  const analystExpansion = ANALYST_EXPANSIONS[step.id];

  return (
    <section id={step.id} className="ua-tour-step-section">
      <div className="ua-tour-step-number">{step.number}</div>
      <div className="ua-tour-step-body">
        <div className="ua-tour-step-kicker">{level === "beginner" ? "Plain-language step" : "Quant / analyst step"}</div>
        <h2>{title}</h2>
        <p className="ua-tour-step-summary">{summary}</p>

        <div className="ua-tour-step-grid">
          <div className="ua-tour-explanation-card">
            <h3>{level === "beginner" ? "What this means" : "Technical interpretation"}</h3>
            <ul>
              {bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="ua-tour-visual-card">{visual}</div>
        </div>

        {level === "analyst" && analystExpansion ? (
          <div className="ua-tour-analyst-grid">
            <article className="ua-tour-analyst-panel ua-tour-analyst-panel-wide">
              <h3>Expanded methodology detail</h3>
              {analystExpansion.interpretation.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>

            <article className="ua-tour-analyst-panel">
              <h3>Verification focus</h3>
              <ul>
                {analystExpansion.verification.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="ua-tour-analyst-panel">
              <h3>Boundary / caveat</h3>
              <ul>
                {analystExpansion.caveats.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        ) : null}

        <div className="ua-tour-trust-note">
          <strong>{level === "beginner" ? "Trust takeaway" : "Audit takeaway"}</strong>
          <span>{trust}</span>
        </div>
      </div>
    </section>
  );
}

function FlowNode({
  title,
  detail,
  accent = false,
}: {
  title: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className={cx("ua-tour-flow-node", accent && "is-accent")}>
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function Arrow() {
  return <div className="ua-tour-arrow" aria-hidden="true">↓</div>;
}

function SourceVisual({ mode }: { mode: ExplanationLevel }) {
  return (
    <div className="ua-tour-visual">
      <div className="ua-tour-visual-title">{mode === "beginner" ? "What is observed" : "Input boundary"}</div>
      <div className="ua-tour-source-grid">
        {(mode === "beginner"
          ? [
              ["Blocks", "when blocks arrive"],
              ["Transactions", "how much activity occurs"],
              ["Fees", "how costly use becomes"],
              ["Timing", "how stable the chain cadence looks"],
            ]
          : [
              ["Included", "chain activity evidence"],
              ["Excluded", "price, exchange, sentiment"],
              ["Granularity", "daily UTC artifact path"],
              ["Boundary", "no raw redistribution"],
            ]
        ).map(([a, b]) => (
          <div key={a} className="ua-tour-source-cell">
            <strong>{a}</strong>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IngestionVisual({ mode }: { mode: ExplanationLevel }) {
  return (
    <div className="ua-tour-visual">
      <div className="ua-tour-visual-title">{mode === "beginner" ? "Same question, different chains" : "Profile-aware evidence surface"}</div>
      <div className="ua-tour-profile-stack">
        <FlowNode title="BTC" detail={mode === "beginner" ? "fees + activity + block timing" : "EVM gas fields structurally excluded"} />
        <FlowNode title="ETH" detail={mode === "beginner" ? "activity + fees + execution context" : "execution and fee-market semantics available"} />
        <FlowNode title="ARB / BASE" detail={mode === "beginner" ? "L2 activity + expected lag" : "L2 cadence and capacity proxies"} />
      </div>
    </div>
  );
}

function FeatureVisual({ mode }: { mode: ExplanationLevel }) {
  return (
    <div className="ua-tour-visual">
      <div className="ua-tour-visual-title">{mode === "beginner" ? "Daily row" : "Aggregation unit"}</div>
      <div className="ua-tour-date-row">
        <span>chain</span>
        <strong>bitcoin</strong>
      </div>
      <div className="ua-tour-date-row">
        <span>date</span>
        <strong>2026-05-17</strong>
      </div>
      <div className="ua-tour-metric-bars">
        <div style={{ width: "86%" }}>tx activity</div>
        <div style={{ width: "42%" }}>fee pressure</div>
        <div style={{ width: "54%" }}>timing context</div>
      </div>
      <p>{mode === "beginner" ? "The raw activity becomes one readable daily record." : "The daily row becomes the base unit for Gold, Derived, Meta, and Briefs."}</p>
    </div>
  );
}

function ArtifactVisual({
  mode,
  artifact,
}: {
  mode: ExplanationLevel;
  artifact: string;
}) {
  return (
    <div className="ua-tour-visual">
      <div className="ua-tour-artifact-card">
        <div className="ua-tour-artifact-label">{artifact} JSON</div>
        <code>{mode === "beginner" ? "what happened" : "daily observation artifact"}</code>
        <div className="ua-tour-json-lines">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

function TrendVisual({ mode }: { mode: ExplanationLevel }) {
  return (
    <div className="ua-tour-visual">
      <div className="ua-tour-visual-title">{mode === "beginner" ? "Recent vs normal" : "Deterministic horizon transforms"}</div>
      <svg viewBox="0 0 460 180" className="ua-tour-chart" role="img" aria-label="Trend context diagram">
        <path d="M20 120 C70 118, 90 114, 130 108 C180 98, 210 92, 250 76 C310 52, 360 58, 440 44" fill="none" stroke="rgba(196,146,48,.95)" strokeWidth="4" />
        <path d="M20 126 C90 122, 140 119, 200 112 C280 102, 350 88, 440 82" fill="none" stroke="rgba(135,177,210,.95)" strokeWidth="3" strokeDasharray="8 8" />
        <text x="28" y="34" className="ua-tour-svg-text">{mode === "beginner" ? "short-term movement" : "7-day transform"}</text>
        <text x="288" y="132" className="ua-tour-svg-text">{mode === "beginner" ? "medium baseline" : "30-day transform"}</text>
      </svg>
    </div>
  );
}

function MetaVisual({ mode }: { mode: ExplanationLevel }) {
  return (
    <div className="ua-tour-visual">
      <div className="ua-tour-visual-title">{mode === "beginner" ? "How a label is held back or published" : "Confidence v2 decomposition"}</div>
      <div className="ua-tour-confidence-equation">
        <FlowNode title={mode === "beginner" ? "Right data?" : "data_quality_score"} detail={mode === "beginner" ? "do we have relevant chain data?" : "profile-aware coverage and freshness"} />
        <span>×</span>
        <FlowNode title={mode === "beginner" ? "Clear label?" : "label_confidence_score"} detail={mode === "beginner" ? "does evidence support this label?" : "label-specific raw evidence"} />
        <span>√</span>
        <FlowNode title="confidence_score" detail={mode === "beginner" ? "publish or hold back" : "gate at 0.40"} accent />
      </div>
    </div>
  );
}

function BriefVisual({ mode }: { mode: ExplanationLevel }) {
  return (
    <div className="ua-tour-visual">
      <div className="ua-tour-brief-card">
        <div className="ua-tour-visual-title">{mode === "beginner" ? "Readable brief" : "Generated from Meta evidence"}</div>
        <h4>Bitcoin remains STABLE, but demand pressure is visible.</h4>
        <p>
          {mode === "beginner"
            ? "The Brief explains the latest state without making the user inspect every field."
            : "The Brief summarizes the latest regime path, dominant label, confidence, movement type, and evidence context."}
        </p>
      </div>
    </div>
  );
}

function PublicationVisual({ mode }: { mode: ExplanationLevel }) {
  return (
    <div className="ua-tour-visual">
      <div className="ua-tour-publish-flow">
        <FlowNode title="Published JSON" detail={mode === "beginner" ? "the real product files" : "artifact contract"} />
        <Arrow />
        <FlowNode title="Website" detail={mode === "beginner" ? "reads the same files" : "public rendering layer"} />
        <Arrow />
        <FlowNode title="API / Samples" detail={mode === "beginner" ? "inspect before buying" : "subscriber integration"} accent />
      </div>
    </div>
  );
}

function HeroDiagram({ level }: { level: ExplanationLevel }) {
  return (
    <aside className="ua-tour-hero-panel">
      <div className="ua-tour-panel-top">
        <div>
          <div className="ua-tour-meta-label">A-to-Z process</div>
          <h2>{level === "beginner" ? "From chain activity to a readable answer" : "From source evidence to published artifacts"}</h2>
        </div>
        <span>{level === "beginner" ? "Plain" : "Analyst"}</span>
      </div>

      <div className="ua-tour-flow-list">
        <FlowNode title="Public chain data" detail={level === "beginner" ? "activity, fees, timing" : "source evidence"} />
        <Arrow />
        <FlowNode title="Daily features" detail={level === "beginner" ? "one row per chain/date" : "aggregation substrate"} />
        <Arrow />
        <FlowNode title="Gold / Derived" detail={level === "beginner" ? "measurements + trend context" : "measurement + deterministic transforms"} />
        <Arrow />
        <FlowNode title="Meta / Briefs" detail={level === "beginner" ? "label + readable explanation" : "regime, confidence, drivers, summaries"} accent />
      </div>
    </aside>
  );
}

function TrustMatrix({ level }: { level: ExplanationLevel }) {
  const rows = level === "beginner"
    ? [
        ["What is this?", "A daily reference layer for blockchain network behavior."],
        ["Is it a signal?", "No. It does not tell users what to buy, sell, or hold."],
        ["Why trust it?", "The same process publishes measurements, labels, confidence, and explanations."],
        ["What if evidence is weak?", "The system can say UNKNOWN/DEGRADED instead of pretending to know."],
      ]
    : [
        ["Artifact contract", "Gold, Derived, Meta, and Briefs are separate customer-facing layers. Gold measures, Derived contextualizes, Meta classifies with confidence, and Briefs summarize Meta without overriding it."],
        ["Confidence v2", "The public formula remains sqrt(data_quality_score × label_confidence_score), but the inputs are profile-aware and label-specific. This lets BTC and L2 chains be evaluated against their real evidence surface."],
        ["Regime vs scorecard", "Scorecard axes can show adjacent pressure before a regime threshold crosses. This is why a STABLE label can coexist with Demand High when the HEATING rule has not fired."],
        ["Traceability", "Rows expose methodology_version, confidence methodology, determinism hashes where applicable, manifests, samples, and changelog entries for output-affecting rebuilds."],
        ["Boundary", "The public methodology makes artifact meaning auditable without exposing enough raw-source, join, or repair detail to reconstruct upstream data or clone the private pipeline."],
      ];

  return (
    <section className="ua-tour-final-trust">
      <div className="ua-tour-section-head">
        <div className="ua-tour-meta-label">Trust model</div>
        <h2>{level === "beginner" ? "The simple checklist" : "The analyst checklist"}</h2>
      </div>
      <div className="ua-tour-trust-grid">
        {rows.map(([title, body]) => (
          <article key={title}>
            <strong>{title}</strong>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <div className="ua-tour-cta-row">
        <Link href="/methodology/reference" className="ua-tour-primary-link">Read methodology reference →</Link>
        <Link href="/api-docs/samples" className="ua-tour-secondary-link">Inspect sample JSON →</Link>
        <Link href="/methodology/changelog" className="ua-tour-secondary-link">See changelog →</Link>
      </div>
    </section>
  );
}

export default function UrdAtlasTourClient() {
  const [level, setLevel] = useState<ExplanationLevel>("beginner");
  const [active, setActive] = useState<string>(PIPELINE_STEPS[0].id);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setProgress((window.scrollY / max) * 100);

      let current = PIPELINE_STEPS[0].id;
      for (const step of PIPELINE_STEPS) {
        const node = document.getElementById(step.id);
        if (node && node.getBoundingClientRect().top < 170) {
          current = step.id;
        }
      }
      setActive(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const levelCopy = LEVEL_COPY[level];
  const jsonExample = level === "beginner" ? JSON_EXAMPLE_BEGINNER : JSON_EXAMPLE_ANALYST;

  function setExplanationLevel(nextLevel: ExplanationLevel) {
    if (nextLevel === level) return;

    const activeElement = document.getElementById(active);
    const previousTop = activeElement?.getBoundingClientRect().top ?? null;

    setLevel(nextLevel);

    if (previousTop === null) return;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const nextElement = document.getElementById(active);
        if (!nextElement) return;

        const nextTop = nextElement.getBoundingClientRect().top;
        window.scrollBy({ top: nextTop - previousTop, behavior: "auto" });
      });
    });
  }

  return (
    <main className="ua-tour">
      <style>{`
        .ua-tour {
          --bg: #071421;
          --panel: rgba(12, 25, 40, .82);
          --panel2: rgba(18, 34, 52, .82);
          --line: rgba(168, 195, 220, .16);
          --line2: rgba(196, 146, 48, .26);
          --ink: #edf5ff;
          --ink2: #9fb0c2;
          --ink3: #73879a;
          --gold: #c49230;
          --gold2: #e2bd70;
          --blue: #87b1d2;
          --teal: #64d1c2;
          min-height: 100vh;
          background:
            radial-gradient(circle at 78% 4%, rgba(196, 146, 48, .12), transparent 28%),
            radial-gradient(circle at 12% 22%, rgba(100, 209, 194, .08), transparent 25%),
            var(--bg);
          color: var(--ink);
          font-family: var(--sans, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        }

        .ua-tour-progress {
          position: fixed;
          left: 0;
          top: 0;
          z-index: 80;
          height: 3px;
          background: linear-gradient(90deg, var(--gold), var(--teal));
        }

        .ua-tour-sticky-switch {
          position: sticky;
          top: 0;
          z-index: 70;
          border-bottom: 1px solid var(--line);
          background:
            linear-gradient(90deg, rgba(196, 146, 48, .10), rgba(7, 16, 28, .78) 30%, rgba(7, 16, 28, .92)),
            rgba(7, 16, 28, .94);
          backdrop-filter: blur(14px);
          box-shadow: 0 16px 44px rgba(0, 0, 0, .28);
        }

        .ua-tour-sticky-switch-inner {
          min-height: 76px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 430px);
          gap: 18px;
          align-items: center;
        }

        .ua-tour-sticky-switch-copy {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .ua-tour-sticky-switch-copy strong {
          color: var(--ink);
          font-family: var(--serif, Georgia, serif);
          font-size: 20px;
          font-weight: 500;
          letter-spacing: -.02em;
        }

        .ua-tour-sticky-switch-copy span {
          color: var(--ink3);
          font-size: 13px;
          line-height: 1.45;
        }

        .ua-tour-shell {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
        }

        .ua-tour-hero {
          padding: 76px 0 44px;
          border-bottom: 1px solid var(--line);
        }

        .ua-tour-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.04fr) minmax(360px, .74fr);
          gap: 34px;
          align-items: start;
        }

        .ua-tour-meta-label {
          font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--gold);
        }

        .ua-tour-hero h1 {
          margin: 14px 0 18px;
          max-width: 820px;
          font-family: var(--serif, Georgia, serif);
          font-size: clamp(44px, 7vw, 86px);
          line-height: .92;
          letter-spacing: -.055em;
          font-weight: 500;
        }

        .ua-tour-hero h1 em {
          color: var(--gold2);
          font-style: italic;
        }

        .ua-tour-hero-lead {
          max-width: 760px;
          color: var(--ink2);
          font-size: 17px;
          line-height: 1.85;
        }

        .ua-tour-level-panel {
          margin-top: 28px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
          gap: 18px;
          align-items: stretch;
        }

        .ua-tour-level-copy,
        .ua-tour-toggle,
        .ua-tour-hero-panel,
        .ua-tour-explanation-card,
        .ua-tour-visual-card,
        .ua-tour-final-trust,
        .ua-tour-json-panel {
          border: 1px solid var(--line);
          background: var(--panel);
          border-radius: 18px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, .24);
        }

        .ua-tour-level-copy {
          padding: 20px;
        }

        .ua-tour-level-copy h2 {
          margin: 8px 0 8px;
          font-family: var(--serif, Georgia, serif);
          font-size: 28px;
          line-height: 1.05;
          font-weight: 500;
        }

        .ua-tour-level-copy p {
          margin: 0;
          color: var(--ink2);
          line-height: 1.7;
        }

        .ua-tour-toggle {
          padding: 14px;
        }

        .ua-tour-toggle-label {
          margin-bottom: 10px;
          font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .18em;
          color: var(--gold);
        }

        .ua-tour-toggle-button {
          display: block;
          width: 100%;
          border: 1px solid transparent;
          border-radius: 12px;
          padding: 15px 12px;
          background: transparent;
          color: var(--ink2);
          font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background .18s, border .18s, color .18s, transform .18s;
        }

        .ua-tour-toggle-button:hover {
          color: var(--ink);
          border-color: var(--line);
        }

        .ua-tour-toggle-button.is-active {
          background: rgba(196, 146, 48, .18);
          border-color: var(--line2);
          color: var(--gold2);
          transform: translateY(-1px);
        }

        .ua-tour-toggle.is-compact {
          display: grid;
          grid-template-columns: auto 1fr 1fr;
          gap: 8px;
          align-items: center;
          padding: 10px;
          box-shadow: none;
        }

        .ua-tour-toggle.is-compact .ua-tour-toggle-label {
          margin: 0 8px 0 0;
          white-space: nowrap;
        }

        .ua-tour-toggle.is-compact .ua-tour-toggle-button {
          padding: 11px 10px;
          min-height: 42px;
        }

        .ua-tour-hero-panel {
          padding: 20px;
        }

        .ua-tour-panel-top {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          border-bottom: 1px solid var(--line);
          padding-bottom: 16px;
          margin-bottom: 16px;
        }

        .ua-tour-panel-top h2 {
          margin: 7px 0 0;
          font-family: var(--serif, Georgia, serif);
          font-size: 24px;
          line-height: 1.1;
          font-weight: 500;
        }

        .ua-tour-panel-top span {
          align-self: start;
          border: 1px solid var(--line2);
          color: var(--gold2);
          border-radius: 999px;
          padding: 6px 10px;
          font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .ua-tour-flow-list,
        .ua-tour-publish-flow,
        .ua-tour-profile-stack {
          display: grid;
          gap: 10px;
        }

        .ua-tour-flow-node {
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, .03);
          border-radius: 14px;
          padding: 13px 14px;
        }

        .ua-tour-flow-node.is-accent {
          border-color: var(--line2);
          background: rgba(196, 146, 48, .10);
        }

        .ua-tour-flow-node strong {
          display: block;
          margin-bottom: 4px;
          color: var(--ink);
          font-size: 14px;
        }

        .ua-tour-flow-node span {
          display: block;
          color: var(--ink2);
          font-size: 12px;
          line-height: 1.45;
        }

        .ua-tour-arrow {
          color: var(--gold);
          text-align: center;
          font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
        }

        .ua-tour-mini-pipeline {
          display: grid;
          grid-template-columns: repeat(8, minmax(0, 1fr));
          gap: 10px;
          padding: 24px 0;
        }

        .ua-tour-mini-step {
          min-height: 124px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 12px;
          background: rgba(255, 255, 255, .025);
          color: inherit;
          text-decoration: none;
          transition: border .18s, background .18s, transform .18s;
        }

        .ua-tour-mini-step:hover {
          transform: translateY(-2px);
          border-color: var(--line2);
          background: rgba(196, 146, 48, .08);
        }

        .ua-tour-mini-step span,
        .ua-tour-step-number {
          font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          color: var(--gold);
          font-size: 11px;
          letter-spacing: .16em;
        }

        .ua-tour-mini-step strong {
          font-size: 13px;
          color: var(--ink);
        }

        .ua-tour-mini-step em {
          color: var(--ink3);
          font-size: 11px;
          line-height: 1.4;
          font-style: normal;
        }

        .ua-tour-layout {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 44px;
          padding: 48px 0 76px;
        }

        .ua-tour-side {
          position: sticky;
          top: 22px;
          align-self: start;
          display: grid;
          gap: 10px;
        }

        .ua-tour-side a {
          display: block;
          border-left: 2px solid var(--line);
          padding: 9px 0 9px 14px;
          color: var(--ink3);
          text-decoration: none;
          font-size: 13px;
          transition: color .18s, border .18s;
        }

        .ua-tour-side a.is-active {
          color: var(--gold2);
          border-left-color: var(--gold);
        }

        .ua-tour-content {
          display: grid;
          gap: 28px;
          min-width: 0;
        }

        .ua-tour-step-section {
          display: grid;
          grid-template-columns: 70px minmax(0, 1fr);
          gap: 22px;
          border-top: 1px solid var(--line);
          padding-top: 34px;
          scroll-margin-top: 24px;
        }

        .ua-tour-step-body {
          min-width: 0;
        }

        .ua-tour-step-kicker {
          font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          color: var(--gold);
          font-size: 10px;
          letter-spacing: .18em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .ua-tour-step-body h2,
        .ua-tour-section-head h2 {
          margin: 0;
          font-family: var(--serif, Georgia, serif);
          font-size: clamp(30px, 4.2vw, 52px);
          line-height: 1.0;
          letter-spacing: -.035em;
          font-weight: 500;
        }

        .ua-tour-step-summary {
          max-width: 900px;
          color: var(--ink2);
          font-size: 16px;
          line-height: 1.8;
        }

        .ua-tour-step-grid {
          display: grid;
          grid-template-columns: minmax(0, .9fr) minmax(320px, 1.1fr);
          gap: 16px;
          align-items: stretch;
          margin-top: 20px;
        }

        .ua-tour-analyst-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(260px, .85fr);
          gap: 14px;
          margin-top: 16px;
        }

        .ua-tour-analyst-panel {
          border: 1px solid var(--line);
          border-radius: 16px;
          background:
            linear-gradient(180deg, rgba(135, 177, 210, .07), transparent),
            rgba(12, 25, 40, .72);
          padding: 18px;
        }

        .ua-tour-analyst-panel-wide {
          grid-row: span 2;
        }

        .ua-tour-analyst-panel h3 {
          margin: 0 0 11px;
          color: var(--gold2);
          font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .ua-tour-analyst-panel p {
          margin: 0 0 13px;
          color: var(--ink2);
          font-size: 14px;
          line-height: 1.78;
        }

        .ua-tour-analyst-panel p:last-child {
          margin-bottom: 0;
        }

        .ua-tour-analyst-panel ul {
          margin: 0;
          padding-left: 18px;
        }

        .ua-tour-analyst-panel li {
          margin: 0 0 10px;
          color: var(--ink2);
          font-size: 13px;
          line-height: 1.65;
        }

        .ua-tour-analyst-panel li:last-child {
          margin-bottom: 0;
        }

        .ua-tour-explanation-card,
        .ua-tour-visual-card {
          padding: 20px;
        }

        .ua-tour-explanation-card h3 {
          margin: 0 0 12px;
          font-size: 16px;
        }

        .ua-tour-explanation-card ul {
          margin: 0;
          padding-left: 20px;
          color: var(--ink2);
          line-height: 1.75;
        }

        .ua-tour-visual-card {
          min-height: 270px;
          display: grid;
          align-items: stretch;
          background:
            linear-gradient(135deg, rgba(135, 177, 210, .08), transparent 42%),
            var(--panel2);
        }

        .ua-tour-visual {
          min-height: 230px;
          display: grid;
          align-content: center;
          gap: 14px;
        }

        .ua-tour-visual-title {
          color: var(--gold);
          font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .ua-tour-source-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .ua-tour-source-cell,
        .ua-tour-date-row,
        .ua-tour-artifact-card,
        .ua-tour-brief-card {
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 14px;
          background: rgba(7, 20, 33, .44);
        }

        .ua-tour-source-cell strong,
        .ua-tour-date-row strong,
        .ua-tour-brief-card h4 {
          display: block;
          color: var(--ink);
          margin-bottom: 5px;
        }

        .ua-tour-source-cell span,
        .ua-tour-date-row span,
        .ua-tour-brief-card p {
          color: var(--ink2);
          font-size: 13px;
          line-height: 1.55;
        }

        .ua-tour-date-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .ua-tour-metric-bars {
          display: grid;
          gap: 8px;
        }

        .ua-tour-metric-bars div {
          min-width: 42%;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(196, 146, 48, .34), rgba(100, 209, 194, .22));
          padding: 8px 12px;
          color: var(--ink);
          font-size: 12px;
        }

        .ua-tour-artifact-label {
          margin-bottom: 14px;
          font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          color: var(--gold);
          letter-spacing: .16em;
          text-transform: uppercase;
          font-size: 12px;
        }

        .ua-tour-artifact-card code {
          display: block;
          color: var(--ink);
          font-size: 18px;
          margin-bottom: 18px;
        }

        .ua-tour-json-lines {
          display: grid;
          gap: 8px;
        }

        .ua-tour-json-lines span {
          height: 10px;
          border-radius: 999px;
          background: rgba(159, 176, 194, .18);
        }

        .ua-tour-json-lines span:nth-child(2) {
          width: 78%;
        }

        .ua-tour-json-lines span:nth-child(3) {
          width: 64%;
        }

        .ua-tour-json-lines span:nth-child(4) {
          width: 86%;
        }

        .ua-tour-chart {
          width: 100%;
          min-height: 190px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: rgba(7, 20, 33, .42);
        }

        .ua-tour-svg-text {
          fill: rgba(237, 245, 255, .78);
          font: 12px var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .ua-tour-confidence-equation {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr);
          gap: 10px;
          align-items: center;
        }

        .ua-tour-confidence-equation > span {
          color: var(--gold);
          font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: 20px;
          text-align: center;
        }

        .ua-tour-trust-note {
          margin-top: 16px;
          border: 1px solid var(--line2);
          border-radius: 16px;
          background: rgba(196, 146, 48, .08);
          padding: 16px 18px;
          display: grid;
          gap: 6px;
        }

        .ua-tour-trust-note strong {
          color: var(--gold2);
          font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .16em;
        }

        .ua-tour-trust-note span {
          color: var(--ink2);
          line-height: 1.7;
        }

        .ua-tour-json-panel {
          padding: 22px;
          overflow: hidden;
        }

        .ua-tour-json-panel h2 {
          margin: 8px 0 8px;
          font-family: var(--serif, Georgia, serif);
          font-size: 34px;
          font-weight: 500;
        }

        .ua-tour-json-panel p {
          color: var(--ink2);
          line-height: 1.7;
        }

        .ua-tour-code {
          margin: 18px 0 0;
          max-height: 420px;
          overflow: auto;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: rgba(3, 10, 18, .8);
          padding: 18px;
          color: var(--ink2);
          font-size: 12px;
          line-height: 1.7;
        }

        .ua-tour-json-key { color: var(--blue); }
        .ua-tour-json-string { color: var(--gold2); }
        .ua-tour-json-number { color: var(--teal); }
        .ua-tour-json-bool { color: #d58a8a; }

        .ua-tour-final-trust {
          padding: 24px;
        }

        .ua-tour-section-head {
          margin-bottom: 20px;
        }

        .ua-tour-section-head h2 {
          margin-top: 8px;
        }

        .ua-tour-trust-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .ua-tour-trust-grid article {
          border: 1px solid var(--line);
          border-radius: 16px;
          background: rgba(255, 255, 255, .025);
          padding: 16px;
        }

        .ua-tour-trust-grid strong {
          color: var(--ink);
        }

        .ua-tour-trust-grid p {
          color: var(--ink2);
          line-height: 1.6;
          font-size: 13px;
        }

        .ua-tour-cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 22px;
        }

        .ua-tour-primary-link,
        .ua-tour-secondary-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          border-radius: 999px;
          padding: 0 16px;
          text-decoration: none;
          font-weight: 800;
          font-size: 13px;
        }

        .ua-tour-primary-link {
          color: #061421;
          background: var(--gold2);
        }

        .ua-tour-secondary-link {
          border: 1px solid var(--line);
          color: var(--ink);
          background: rgba(255, 255, 255, .04);
        }

        @media (max-width: 1060px) {
          .ua-tour-hero-grid,
          .ua-tour-layout,
          .ua-tour-step-grid,
          .ua-tour-analyst-grid,
          .ua-tour-sticky-switch-inner {
            grid-template-columns: 1fr;
          }

          .ua-tour-sticky-switch-inner {
            gap: 10px;
            min-height: auto;
            padding-top: 10px;
            padding-bottom: 10px;
          }

          .ua-tour-sticky-switch-copy {
            display: none;
          }

          .ua-tour-analyst-panel-wide {
            grid-row: auto;
          }

          .ua-tour-side {
            position: static;
            display: flex;
            overflow-x: auto;
            padding-bottom: 8px;
          }

          .ua-tour-side a {
            white-space: nowrap;
            border-left: 0;
            border-bottom: 2px solid var(--line);
            padding: 8px 12px;
          }

          .ua-tour-mini-pipeline,
          .ua-tour-trust-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ua-tour-step-section {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .ua-tour-shell {
            width: min(100% - 28px, 1180px);
          }

          .ua-tour-toggle.is-compact {
            grid-template-columns: 1fr 1fr;
          }

          .ua-tour-toggle.is-compact .ua-tour-toggle-label {
            grid-column: 1 / -1;
            margin: 0;
            text-align: center;
          }

          .ua-tour-toggle.is-compact .ua-tour-toggle-button {
            font-size: 10px;
            letter-spacing: .12em;
          }

          .ua-tour-hero {
            padding-top: 46px;
          }

          .ua-tour-level-panel,
          .ua-tour-mini-pipeline,
          .ua-tour-trust-grid,
          .ua-tour-source-grid,
          .ua-tour-confidence-equation {
            grid-template-columns: 1fr;
          }

          .ua-tour-confidence-equation > span {
            transform: rotate(90deg);
          }
        }
      `}</style>

      <div className="ua-tour-progress" style={{ width: `${progress}%` }} />

      <div className="ua-tour-sticky-switch" aria-label="Sticky explanation level selector">
        <div className="ua-tour-shell ua-tour-sticky-switch-inner">
          <div className="ua-tour-sticky-switch-copy">
            <strong>{level === "beginner" ? "Beginner explanation" : "Analyst explanation"}</strong>
            <span>Switch level anywhere on the page without losing your place.</span>
          </div>
          <LevelToggle level={level} setLevel={setExplanationLevel} compact />
        </div>
      </div>

      <section className="ua-tour-hero">
        <div className="ua-tour-shell ua-tour-hero-grid">
          <div>
            <div className="ua-tour-meta-label">New to Urd Atlas</div>
            <h1>
              From public chain activity to <em>daily regime JSON.</em>
            </h1>
            <p className="ua-tour-hero-lead">
              This page explains the full Urd Atlas process from A to Z. Use Beginner mode for a plain-language
              walkthrough, or Analyst mode for the evidence flow, artifact contract, confidence model, and trust controls.
            </p>

            <div className="ua-tour-level-panel">
              <div className="ua-tour-level-copy">
                <div className="ua-tour-meta-label">{levelCopy.eyebrow}</div>
                <h2>{levelCopy.title}</h2>
                <p>{levelCopy.subtitle}</p>
              </div>
              <LevelToggle level={level} setLevel={setExplanationLevel} />
            </div>

            <div className="ua-tour-cta-row">
              <Link href="/" className="ua-tour-secondary-link">Back to landing</Link>
              <a href="#public-data" className="ua-tour-primary-link">Start the process →</a>
              <Link href="/methodology/reference" className="ua-tour-secondary-link">Open methodology</Link>
            </div>
          </div>

          <HeroDiagram level={level} />
        </div>
      </section>

      <div className="ua-tour-shell">
        <MiniPipeline level={level} />

        <div className="ua-tour-layout">
          <aside className="ua-tour-side" aria-label="Tour sections">
            {PIPELINE_STEPS.map((step) => (
              <a
                key={step.id}
                href={`#${step.id}`}
                className={active === step.id ? "is-active" : ""}
              >
                {step.number} · {step.label}
              </a>
            ))}
          </aside>

          <div className="ua-tour-content">
            {PIPELINE_STEPS.map((step) => (
              <ArticleSection key={step.id} step={step} level={level} />
            ))}

            <section className="ua-tour-json-panel">
              <div className="ua-tour-meta-label">{level === "beginner" ? "What the JSON looks like" : "Evidence object example"}</div>
              <h2>{level === "beginner" ? "Same product, less mystery." : "Confidence v2 is visible in the artifact."}</h2>
              <p>
                {level === "beginner"
                  ? "The JSON is not a marketing excerpt. It is the product shape: chain, date, label, confidence, and evidence context."
                  : "The Meta artifact exposes methodology version, confidence formula, decomposed inputs, chain-profile exclusions, and status explanation so downstream users can audit the row."}
              </p>
              <pre
                className="ua-tour-code"
                dangerouslySetInnerHTML={{ __html: highlightJson(jsonExample) }}
              />
            </section>

            <TrustMatrix level={level} />
          </div>
        </div>
      </div>
    </main>
  );
}
