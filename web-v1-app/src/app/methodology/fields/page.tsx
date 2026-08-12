import type { ReactNode } from "react";

import ShortFullContent from "@/components/site/ShortFullContent";
import {
  Callout,
  MethodologyContent,
  MethodologyHeader,
  MethodologyNav,
  MethodologyPageShell,
  Section,
  WarningCallout,
} from "../_components";

type FieldEntry = {
  field: string;
  meaning: ReactNode;
  notes: ReactNode;
  verificationClass?: string;
};

type FieldContext = {
  role: string;
  usefulFor: string;
  appliesTo: string;
};

const FIELD_CONTEXT: Record<string, FieldContext> = {
  tx_count_daily: { role: "Regime · Scorecard · Confidence", usefulFor: "Core activity volume and a primary Demand input.", appliesTo: "BTC · ETH · ARB · BASE" },
  block_count_daily: { role: "Confidence input", usefulFor: "Checks whether the daily block observation surface is sufficiently covered.", appliesTo: "BTC · ETH · ARB · BASE" },
  value_transferred_native: { role: "Observational context", usefulFor: "Adds transfer-volume context without changing the current regime label.", appliesTo: "Where source semantics are available" },
  median_tx_value_native: { role: "Observational context", usefulFor: "Shows the typical native-denominated transaction value; not a current regime driver.", appliesTo: "Where source semantics are available" },
  median_tx_fee_native: { role: "Regime · Scorecard · Confidence", usefulFor: "Primary Friction evidence and the direct fee distribution used by current profiles.", appliesTo: "BTC · ETH · ARB · BASE" },
  median_tx_fee_rate_sat_vbyte: { role: "Observational context", usefulFor: "Lets Bitcoin users inspect fee-rate conditions independently of native fee amount.", appliesTo: "BTC only" },
  median_tx_gas_used: { role: "Observational context", usefulFor: "Provides Ethereum execution-intensity context beneath aggregate network state.", appliesTo: "ETH only" },
  nonempty_calldata_share: { role: "Supplemental regime evidence", usefulFor: "Can corroborate an ETH HEATING classification when core Demand is already high.", appliesTo: "ETH only" },
  contract_creation_tx_share: { role: "Observational context", usefulFor: "Shows how much daily Ethereum activity consists of contract creation.", appliesTo: "ETH only" },
  eip1559_type2_tx_share: { role: "Observational context", usefulFor: "Tracks transaction-envelope adoption without inferring protocol or user intent.", appliesTo: "ETH only" },
  failed_tx_rate: { role: "Regime · Scorecard · Confidence", usefulFor: "Adds execution-failure burden to Ethereum Friction.", appliesTo: "ETH L1" },
  gas_utilization_pct: { role: "Regime · Scorecard · Confidence", usefulFor: "Primary Ethereum Capacity proxy.", appliesTo: "ETH L1" },
  median_block_base_fee_per_gas: { role: "Observational context", usefulFor: "Shows the protocol-set Ethereum base gas price before priority fees.", appliesTo: "ETH only" },
  block_gas_utilization_p90: { role: "Observational context", usefulFor: "Retains upper-tail Ethereum blockspace pressure that an average can hide.", appliesTo: "ETH only" },
  block_weight_utilization_pct: { role: "Regime · Scorecard", usefulFor: "Measures Bitcoin blockspace occupancy and contributes to Capacity pressure.", appliesTo: "BTC only" },
  unique_active_addresses: { role: "Regime evidence · Scorecard · Confidence", usefulFor: "Adds breadth of observed address activity; addresses are not equivalent to users.", appliesTo: "BTC classifier · ETH/L2 classifier + scorecard" },
  avg_block_time_sec: { role: "Confidence · transformed Capacity evidence", usefulFor: "Feeds block-time instability and confirms expected block-cadence coverage.", appliesTo: "BTC · ETH · ARB · BASE" },
  capacity_util_pct: { role: "Regime · Scorecard · Confidence", usefulFor: "Canonical public L2 Capacity field when available.", appliesTo: "ARB · BASE" },
  arbitrum_l1_gas_used_daily: { role: "Observational context", usefulFor: "Exposes Arbitrum L1 gas footprint as a delivered measurement without making it a regime driver.", appliesTo: "ARB only" },
  base_l1_gas_used_daily: { role: "Observational context", usefulFor: "Exposes Base L1 gas footprint as a delivered measurement without making it a regime driver.", appliesTo: "BASE only" },
  "derived.metrics.<metric>__ma7": { role: "Derived feature", usefulFor: "Ready-to-join 7-day smoothing of a published Gold metric.", appliesTo: "Published Derived metric set" },
  "derived.metrics.<metric>__ma30": { role: "Derived feature", usefulFor: "Ready-to-join 30-day smoothing for slower context and comparisons.", appliesTo: "Published Derived metric set" },
  "derived.source.gold_sha256": { role: "Provenance", usefulFor: "Links a Derived artifact back to the exact Gold input state used to produce it.", appliesTo: "BTC · ETH · ARB · BASE" },
  "derived.source.metric_columns": { role: "Provenance", usefulFor: "States exactly which Gold columns were included in the Derived build.", appliesTo: "BTC · ETH · ARB · BASE" },
  "confidence.confidence_score": { role: "Headline reliability", usefulFor: "Helps downstream users decide how much weight to place on the published row.", appliesTo: "Meta" },
  "confidence.methodology_version": { role: "Methodology provenance", usefulFor: "Identifies the exact confidence rules used for this row.", appliesTo: "Meta" },
  "confidence.data_quality_score": { role: "Confidence component", usefulFor: "Separates data sufficiency from label-evidence clarity.", appliesTo: "Meta" },
  "confidence.label_confidence_score": { role: "Confidence component", usefulFor: "Shows how clearly the evidence supports the candidate/published label.", appliesTo: "Meta" },
  "confidence.candidate_label.label": { role: "Audit field", usefulFor: "Shows the pre-gate candidate when a stronger public label may be withheld.", appliesTo: "Meta" },
  "confidence.components.data_quality.required_metrics": { role: "Audit field", usefulFor: "Makes the chain-specific confidence denominator inspectable.", appliesTo: "Meta" },
  "confidence.components.data_quality.structurally_not_applicable": { role: "Audit field", usefulFor: "Explains why non-applicable fields do not count as missing evidence.", appliesTo: "Meta" },
  "confidence.components.data_quality.optional_not_penalized": { role: "Audit field", usefulFor: "Shows which visible fields may be absent without reducing data quality.", appliesTo: "Meta" },
  "confidence.components.label_confidence.uses_score_raw": { role: "Audit field", usefulFor: "Confirms whether label confidence used raw rather than degraded display scores.", appliesTo: "Meta" },
  "confidence.components.label_confidence.used": { role: "Audit field", usefulFor: "Exposes the label-specific components that entered confidence.", appliesTo: "Meta" },
  "status.one_liner": { role: "Readable explanation", usefulFor: "Gives a concise human interpretation of the same published evidence.", appliesTo: "Meta" },
  "status.explanation_support.status_note": { role: "Explanation provenance", usefulFor: "Preserves machine-readable support for nuanced status copy.", appliesTo: "Meta" },
  "regime.label": { role: "Primary product field", usefulFor: "The daily network-state classification joined on date + chain.", appliesTo: "Meta" },
  "regime.determinism_hash": { role: "Integrity provenance", usefulFor: "Provides a canonical traceability anchor for a named regime row.", appliesTo: "Meta" },
  "scorecard.dimensions.<axis>.score": { role: "Display evidence", usefulFor: "Continuous Demand/Friction/Capacity context after confidence degradation.", appliesTo: "Meta" },
  "scorecard.dimensions.<axis>.score_raw": { role: "Methodology evidence", usefulFor: "Preserves the pre-degradation axis score used in analytical interpretation.", appliesTo: "Meta" },
  schema: { role: "Artifact contract", usefulFor: "Identifies which Briefs schema a consumer is parsing.", appliesTo: "Briefs" },
  brief_status: { role: "Publication state", usefulFor: "Tells consumers whether a Briefs artifact was published normally.", appliesTo: "Briefs" },
  "window.updated_through": { role: "Freshness", usefulFor: "Prevents stale or differently lagged windows from being compared blindly.", appliesTo: "Briefs" },
  "regime_path.dominant_label": { role: "Window context", usefulFor: "Summarizes the most common descriptive state inside the brief window.", appliesTo: "Briefs" },
  "movement.type": { role: "Readable context", usefulFor: "Summarizes whether the recent regime path is stable, shifting or degraded.", appliesTo: "Briefs" },
};

const GOLD_FIELDS: FieldEntry[] = [
  {
    field: "tx_count_daily",
    meaning: "Confirmed daily transaction count.",
    notes: "Direct daily chain activity count. Used as the primary activity signal across every chain profile.",
  },
  {
    field: "block_count_daily",
    meaning: "Number of blocks produced that day.",
    notes:
      "Used as a required data-quality input for every chain profile. Not a direct Demand/Friction/Capacity driver on its own — it confirms the day's block coverage before other block-derived fields (avg_block_time_sec, gas_utilization_pct) are trusted.",
  },
  {
    field: "value_transferred_native",
    meaning: "Sum of transaction value moved that day, in the chain's native denomination.",
    notes:
      "Optional across all chain profiles: visible when available, never a confidence penalty when absent, and not currently used in the public Demand/Friction/Capacity scorecard. For AWS Ethereum data, transactions.value is sourced in wei and normalized by 1e18 so this field is published in ETH.",
  },
  {
    field: "median_tx_value_native",
    meaning: "Typical same-day transaction value in native denomination.",
    notes: "Optional for all current chain profiles; visible when available, but not a confidence penalty when absent and not used by the current public Friction scorecard. For AWS Ethereum data, transactions.value is normalized from wei to ETH before the daily median is calculated.",
  },
  {
    field: "median_tx_fee_native",
    meaning: "Typical same-day transaction fee in native denomination.",
    notes: "Published as a median, not an arithmetic average. Drives the Friction axis for every current chain profile. For Ethereum gas-derived fees, gas price × gas used is a wei amount and is normalized by 1e18 before publication as ETH.",
  },
  {
    field: "median_tx_fee_rate_sat_vbyte",
    meaning: "Typical Bitcoin transaction fee rate in satoshis per virtual byte.",
    notes: (
      <>
        Bitcoin-only observational friction field calculated as the daily median of{" "}
        <FieldCode>(fee_BTC × 100,000,000) / virtual_size</FieldCode> for valid transactions.
        Coinbase transactions are excluded when the source flag is available, and non-positive
        virtual sizes are ignored. The field is null for non-Bitcoin chains and does not yet drive
        the public regime label, scorecard, or confidence calculation while historical behaviour is
        being validated.
      </>
    ),
  },
  {
    field: "median_tx_gas_used",
    meaning: "Typical execution gas consumed by an Ethereum transaction that day.",
    notes: (
      <>
        Ethereum-only observational execution-intensity field calculated as the daily median of
        <FieldCode>receipt_gas_used</FieldCode>, with transaction-level <FieldCode>gas_used</FieldCode>
        used only as a fallback when receipt gas is unavailable. Values are raw gas units, are null
        for non-Ethereum chains, and do not yet drive the public regime label, scorecard, or confidence
        calculation while historical behaviour is being validated.
      </>
    ),
  },
  {
    field: "nonempty_calldata_share",
    meaning: "Share of Ethereum transactions carrying non-empty calldata that day.",
    notes: (
      <>
        Ethereum-only observational activity-composition field. A transaction counts as carrying
        calldata when its <FieldCode>input</FieldCode> value is non-null and, after trimming, is
        neither an empty string nor <FieldCode>0x</FieldCode>. The metric is published on a 0–1
        scale, is null for non-Ethereum chains, and does not identify protocols, tokens, or user
        intent. Under <FieldCode>eth_l1_v2</FieldCode>, it is supplemental Demand evidence: it can
        support HEATING when core Demand is already HIGH/EXTREME_HIGH and calldata trend is HEATING.
        It is not a standalone Demand axis component in the public scorecard.
      </>
    ),
  },
  {
    field: "contract_creation_tx_share",
    meaning: "Share of Ethereum transactions that create a contract that day.",
    notes: (
      <>
        Ethereum-only observational activity-composition field calculated as the share of transactions
        with a non-empty <FieldCode>receipt_contract_address</FieldCode>. It describes contract-deployment
        activity without identifying protocols, tokens, financial intent, or trading behaviour. Values are
        published on a 0–1 scale, are null for non-Ethereum chains, and do not yet drive the public regime
        label, scorecard, or confidence calculation while historical behaviour is being validated.
      </>
    ),
  },
  {
    field: "eip1559_type2_tx_share",
    meaning: "Share of Ethereum transactions using EIP-1559 dynamic-fee transaction type 2 that day.",
    notes: (
      <>
        Ethereum-only observational transaction-composition field derived from <FieldCode>transaction_type</FieldCode>,
        with <FieldCode>type</FieldCode> as a schema-compatibility fallback. Numeric <FieldCode>2</FieldCode> and
        equivalent hex encodings such as <FieldCode>0x2</FieldCode> count as type 2. Values are published on a
        0–1 scale, are null for non-Ethereum chains, and describe transaction-envelope adoption only; they do not
        identify protocols, tokens, financial intent, or trading behaviour. The field does not yet drive the public
        regime label, scorecard, or confidence calculation while historical behaviour is being validated.
      </>
    ),
  },
  {
    field: "failed_tx_rate",
    meaning: "Share of transactions that did not succeed.",
    notes: (
      <>
        Drives the Friction axis for Ethereum L1 only (weight 0.7, alongside{" "}
        <FieldCode>median_tx_fee_native</FieldCode>). Structurally not applicable for Bitcoin
        (no execution failures in the UTXO model) and currently presentation-hidden for
        Arbitrum and Base while L2 failure semantics are still being validated.
      </>
    ),
  },
  {
    field: "gas_utilization_pct",
    meaning: "Share of a block's gas capacity actually used.",
    notes: (
      <>
        Drives the Capacity axis for Ethereum L1 (weight 1.0). Always null for Bitcoin (no gas
        mechanism). For Arbitrum and Base this is computed when source fields are available but
        currently presentation-hidden; the public L2 Capacity axis instead uses{" "}
        <FieldCode>capacity_util_pct</FieldCode>.
      </>
    ),
  },
  {
    field: "median_block_base_fee_per_gas",
    meaning: "Typical Ethereum protocol base fee per unit of gas across blocks produced that day.",
    notes: (
      <>
        Ethereum-only observational transaction-cost field calculated as the daily median of block
        <FieldCode>base_fee_per_gas</FieldCode>. It describes the protocol-set base price for gas
        before transaction-specific priority fees. Values are published in the raw chain unit from
        the source schema, are null for non-Ethereum chains, and do not yet drive the public regime
        label, scorecard, or confidence calculation while historical behaviour is being validated.
      </>
    ),
  },
  {
    field: "block_gas_utilization_p90",
    meaning: "90th-percentile Ethereum block gas utilization for the day.",
    notes: (
      <>
        Ethereum-only observational blockspace-stress field. It is calculated from each valid
        block&apos;s <FieldCode>gas_used / gas_limit</FieldCode> ratio and reports the daily 90th
        percentile on a 0–1 scale. This complements the daily aggregate gas-utilization field by
        retaining upper-tail load information. It does not yet drive the public regime label,
        scorecard, or confidence calculation while historical behaviour is being validated.
      </>
    ),
  },
  {
    field: "block_weight_utilization_pct",
    meaning: "Average share of Bitcoin's maximum block weight used across blocks produced that day.",
    notes: (
      <>
        Bitcoin-only capacity field calculated from block weight divided by the 4,000,000
        weight-unit consensus maximum. Published on a 0–1 scale and null for non-Bitcoin chains.
        It drives the BTC Capacity axis with weight 1.0 alongside block-time instability. High
        block-weight utilization can veto a CHEAP classification, while block weight alone does
        not create a CONGESTED classification.
      </>
    ),
  },
  {
    field: "unique_active_addresses",
    meaning: "Count of distinct addresses that sent or received a transaction that day.",
    notes: (
      <>
        Used as Demand evidence by the current regime classifier for BTC, Ethereum L1 and both L2s.
        In the public scorecard it is weighted directly (1.0) for Ethereum/L2 and also feeds
        <FieldCode>tx_per_user</FieldCode> (0.6); the BTC scorecard itself still uses
        <FieldCode>tx_count_daily</FieldCode> as its sole Demand component. This counts addresses,
        not people or unique users.
      </>
    ),
  },
  {
    field: "avg_block_time_sec",
    meaning: "Typical daily inter-block interval behaviour.",
    notes: (
      <>
        Inter-block cadence field. It is not read as a raw directional congestion metric; it feeds
        the derived <FieldCode>blocktime_instability</FieldCode> evidence surface and is also a
        required data-quality field in current Confidence v3 profiles.
      </>
    ),
  },



];

const META_FIELDS: FieldEntry[] = [
  {
    field: "confidence.confidence_score",
    meaning: "Top-line confidence of the published analytical state.",
    notes: (
      <>
        Confidence v3 uses <FieldCode>sqrt(data_quality_score × label_confidence_score)</FieldCode>. The
        gate threshold remains <FieldCode>0.40</FieldCode>.
      </>
    ),
  },
  {
    field: "confidence.methodology_version",
    meaning: "Specific confidence methodology used for the row.",
    notes: (
      <>
        Current value is <FieldCode>confidence_v3_l2_capacity_required</FieldCode> for current rows.
      </>
    ),
  },
  {
    field: "confidence.data_quality_score",
    meaning: "Profile-aware data completeness and freshness score.",
    notes:
      "Measures whether the chain-specific evidence surface is complete, fresh, dense, and historically deep enough. Structurally non-applicable fields are excluded from the denominator.",
  },
  {
    field: "confidence.label_confidence_score",
    meaning: "Label-specific evidence clarity score.",
    notes:
      "Measures whether the evidence supports the specific published label. HEATING, CONGESTED, CHEAP, and STABLE are evaluated against different evidence patterns.",
  },
  {
    field: "confidence.candidate_label.label",
    meaning: "The label supported by the evidence before the confidence gate is applied.",
    notes:
      "Used for auditability when the normal label is withheld as UNKNOWN/DEGRADED or when users need to inspect thin-margin classifications.",
  },
  {
    field: "confidence.components.data_quality.required_metrics",
    meaning: "Chain-specific metric list used for data-quality coverage.",
    notes:
      "These are the fields that count toward data-quality coverage for the chain profile. The list can differ across BTC, ETH L1, and L2 profiles.",
  },
  {
    field: "confidence.components.data_quality.structurally_not_applicable",
    meaning: "Fields that do not belong in the chain-specific confidence denominator.",
    notes:
      "Example: EVM-only execution fields are not data-quality penalties for Bitcoin. They are excluded because the product methodology does not treat them as expected BTC evidence.",
  },
  {
    field: "confidence.components.data_quality.optional_not_penalized",
    meaning: "Visible fields that are not treated as required confidence inputs for the current chain profile.",
    notes:
      "These fields may still be published or useful, but absence does not automatically reduce data quality under Confidence v3.",
  },
  {
    field: "confidence.components.label_confidence.uses_score_raw",
    meaning: "Whether label confidence was evaluated from raw scorecard evidence.",
    notes:
      "Current Confidence v3 rows use raw scorecard/regime evidence, not confidence-degraded display scores.",
  },
  {
    field: "confidence.components.label_confidence.used",
    meaning: "Component values used inside the label-specific confidence calculation.",
    notes:
      "The names vary by label family. STABLE emphasizes neutrality and lack of strong drivers; HEATING emphasizes demand/trend evidence; CONGESTED and CHEAP emphasize their relevant friction/capacity evidence.",
  },
  {
    field: "status.one_liner",
    meaning: "Readable public explanation of the current status.",
    notes:
      "Now distinguishes adjacent scorecard pressure from actual regime-threshold crossings. A STABLE label can include elevated scorecard pressure if the regime-axis threshold was not crossed.",
  },
  {
    field: "status.explanation_support.status_note",
    meaning: "Machine-readable copy source for nuanced status explanation.",
    notes:
      "Used when status needs to explain why a scorecard axis looks elevated or low while the regime label remains STABLE.",
  },
  {
    field: "regime.label",
    meaning: "Published descriptive state.",
    notes: "May change day to day when threshold conditions change. Rows below the confidence gate can be withheld as UNKNOWN/DEGRADED.",
  },
  {
    field: "regime.determinism_hash",
    meaning: "Canonical public integrity anchor for named regime rows.",
    notes: "Used for public row traceability when a non-gated label is published.",
  },
];

const CHAIN_EXTENSION_FIELDS: FieldEntry[] = [
  {
    field: "capacity_util_pct",
    meaning: "Public L2 capacity-utilization observation used by the L2 methodology when available.",
    notes: (
      <>
        Arbitrum/Base-only Capacity field for the current <FieldCode>l2_v1</FieldCode> profile. It is
        the canonical L2 Capacity input for regime classification, scorecard construction and
        Confidence v3 data-quality coverage. A null value means that observation is unavailable for
        the row; consumers should not reinterpret null as zero or spare capacity.
      </>
    ),
  },
  {
    field: "arbitrum_l1_gas_used_daily",
    meaning: "Daily L1 gas footprint associated with the Arbitrum data surface.",
    notes: "Arbitrum-only delivered observational field. It is useful for L1-footprint context but is not a current public Demand/Friction/Capacity driver or required confidence input.",
  },
  {
    field: "base_l1_gas_used_daily",
    meaning: "Daily L1 gas footprint associated with the Base data surface.",
    notes: "Base-only delivered observational field. It is useful for L1-footprint context but is not a current public Demand/Friction/Capacity driver or required confidence input.",
  },
];

const DERIVED_FIELDS: FieldEntry[] = [
  {
    field: "derived.metrics.<metric>__ma7",
    meaning: "Seven-day rolling mean of a published numeric Gold metric included by the Derived producer.",
    notes: "Computed from final published Gold rows with min_periods=1 over available finite values. Use it for short-window smoothing without rebuilding the transformation yourself.",
  },
  {
    field: "derived.metrics.<metric>__ma30",
    meaning: "Thirty-day rolling mean of the same published Gold metric.",
    notes: "Provides slower context for comparisons with the 7-day series. The exact included metric set is recorded in derived.source.metric_columns.",
  },
  {
    field: "derived.source.gold_sha256",
    meaning: "SHA-256 link to the Gold input state used by the Derived artifact.",
    notes: "Use it for provenance and reproducibility when a downstream analysis depends on a particular Derived row.",
  },
  {
    field: "derived.source.metric_columns",
    meaning: "Explicit list of Gold metrics included in that Derived build.",
    notes: "This is the authoritative row-level answer to which Gold measurements received MA7/MA30 features; do not assume every numeric-looking observational field is included.",
  },
];

const BRIEF_FIELDS: FieldEntry[] = [
  {
    field: "schema",
    meaning: "Brief artifact schema identifier.",
    notes: "Used to distinguish chain 7-day briefs, cross-chain briefs, site briefs, and manifest files.",
  },
  {
    field: "brief_status",
    meaning: "Publication state for a Briefs JSON artifact.",
    notes: "A published brief is generated from already published regime evidence.",
  },
  {
    field: "window.updated_through",
    meaning: "Latest date covered by the brief window.",
    notes: "Use this to understand freshness before comparing chains with different publication lag.",
  },
  {
    field: "regime_path.dominant_label",
    meaning: "Most common regime label inside the brief window.",
    notes: "This is descriptive window context, not a trading signal or forecast.",
  },
  {
    field: "movement.type",
    meaning: "Readable movement classification for the latest window.",
    notes: "Summarizes whether the latest regime path is stable, shifting, degraded, or low confidence.",
  },
];

const SCORECARD_FIELDS: FieldEntry[] = [
  {
    field: "scorecard.dimensions.<axis>.score",
    verificationClass: "A",
    meaning: "Published confidence-degraded display score for an axis.",
    notes: (
      <>
        Recomputable from the published inputs <FieldCode>score_raw</FieldCode> and{" "}
        <FieldCode>effective_confidence</FieldCode> using the display-score formula below.
      </>
    ),
  },
  {
    field: "scorecard.dimensions.<axis>.score_raw",
    verificationClass: "C",
    meaning: "Raw score before confidence degradation.",
    notes:
      "Used by Confidence v3 as part of label confidence. The historical normalization and calibration are publicly described in family terms, but not fully disclosed at implementation detail.",
  },
];

function FieldCode({ children }: { children: string }) {
  return (
    <code className="inline-block max-w-full break-all rounded-md border border-[var(--line)] bg-[rgba(8,15,26,.34)] px-2 py-1 align-baseline font-mono text-[12px] leading-relaxed text-[var(--ink)]">
      {children}
    </code>
  );
}

function FormulaBlock({ children }: { children: string }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-[var(--line)] bg-[rgba(8,15,26,.30)] p-4">
      <code className="block min-w-0 whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-[var(--ink)]">
        {children}
      </code>
    </div>
  );
}

function FieldGrid({ entries }: { entries: FieldEntry[] }) {
  return (
    <div className="mt-4 grid min-w-0 gap-3">
      {entries.map((entry) => {
        const context = FIELD_CONTEXT[entry.field];
        return (
          <article key={entry.field} className="min-w-0 rounded-xl border border-[var(--line)] bg-[rgba(22,40,64,.56)] p-4">
            <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <FieldCode>{entry.field}</FieldCode>
              <div className="flex flex-wrap gap-2">
                {context ? <span className="rounded-full border border-[var(--line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink2)]">{context.role}</span> : null}
                {entry.verificationClass ? (
                  <span className="shrink-0 rounded-full border border-[var(--gold-line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">
                    Class {entry.verificationClass}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{entry.meaning}</p>
            {context ? (
              <div className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] bg-[rgba(8,15,26,.22)] p-3 text-xs leading-6 text-[var(--ink2)] md:grid-cols-2">
                <p><span className="text-[var(--ink)]">Why useful:</span> {context.usefulFor}</p>
                <p><span className="text-[var(--ink)]">Applies to:</span> {context.appliesTo}</p>
              </div>
            ) : null}
            <div className="mt-2 text-sm leading-7 text-[var(--ink2)]">{entry.notes}</div>
          </article>
        );
      })}
    </div>
  );
}

function NotePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="min-w-0 rounded-xl border border-[var(--line)] bg-[rgba(22,40,64,.45)] p-4">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">{title}</h3>
      <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--ink2)]">{children}</div>
    </article>
  );
}

function AxisComponent({ field, weight, transform }: { field: string; weight: string; transform: string }) {
  return (
    <li>
      <FieldCode>{field}</FieldCode>{" "}
      <span className="text-[var(--ink2)]">weight {weight}; transform {transform}</span>
    </li>
  );
}

function AxisMappingTable() {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)]">
      {/* field-dictionary-axis-map:start */}
      <table className="w-full min-w-[880px] border-collapse text-left text-sm">
        <thead className="border-b border-[var(--line)] bg-[rgba(8,15,26,.34)] text-[var(--ink)]">
          <tr>
            <th className="px-4 py-3">Chain profile</th>
            <th className="px-4 py-3">Demand</th>
            <th className="px-4 py-3">Friction</th>
            <th className="px-4 py-3">Capacity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)] text-[var(--ink2)]">
          <tr className="align-top">
            <td className="px-4 py-4 text-[var(--ink)]">Bitcoin / BTC</td>
            <td className="px-4 py-4">
              <ul className="grid gap-2">
                <AxisComponent field="tx_count_daily" weight="1.0" transform="log1p" />
              </ul>
            </td>
            <td className="px-4 py-4">
              <ul className="grid gap-2">
                <AxisComponent field="median_tx_fee_native" weight="1.0" transform="log1p" />
              </ul>
            </td>
            <td className="px-4 py-4">
              <ul className="grid gap-2">
                <AxisComponent field="block_weight_utilization_pct" weight="1.0" transform="none" />
                <AxisComponent field="blocktime_instability" weight="0.7" transform="instability" />
              </ul>
            </td>
          </tr>
          <tr className="align-top">
            <td className="px-4 py-4 text-[var(--ink)]">Ethereum L1</td>
            <td className="px-4 py-4">
              <ul className="grid gap-2">
                <AxisComponent field="tx_count_daily" weight="1.0" transform="log1p" />
                <AxisComponent field="unique_active_addresses" weight="1.0" transform="log1p" />
                <AxisComponent field="tx_per_user" weight="0.6" transform="log1p" />
              </ul>
            </td>
            <td className="px-4 py-4">
              <ul className="grid gap-2">
                <AxisComponent field="median_tx_fee_native" weight="1.0" transform="log1p" />
                <AxisComponent field="failed_tx_rate" weight="0.7" transform="none" />
              </ul>
            </td>
            <td className="px-4 py-4">
              <ul className="grid gap-2">
                <AxisComponent field="gas_utilization_pct" weight="1.0" transform="none" />
                <AxisComponent field="blocktime_instability" weight="0.3" transform="instability" />
              </ul>
            </td>
          </tr>
          <tr className="align-top">
            <td className="px-4 py-4 text-[var(--ink)]">Arbitrum / L2</td>
            <td className="px-4 py-4">
              <ul className="grid gap-2">
                <AxisComponent field="tx_count_daily" weight="1.0" transform="log1p" />
                <AxisComponent field="unique_active_addresses" weight="1.0" transform="log1p" />
                <AxisComponent field="tx_per_user" weight="0.6" transform="log1p" />
              </ul>
            </td>
            <td className="px-4 py-4">
              <ul className="grid gap-2">
                <AxisComponent field="median_tx_fee_native" weight="1.0" transform="log1p" />
              </ul>
            </td>
            <td className="px-4 py-4">
              <ul className="grid gap-2">
                <AxisComponent field="capacity_util_pct" weight="1.0" transform="none" />
              </ul>
            </td>
          </tr>
          <tr className="align-top">
            <td className="px-4 py-4 text-[var(--ink)]">Base / L2</td>
            <td className="px-4 py-4">
              <ul className="grid gap-2">
                <AxisComponent field="tx_count_daily" weight="1.0" transform="log1p" />
                <AxisComponent field="unique_active_addresses" weight="1.0" transform="log1p" />
                <AxisComponent field="tx_per_user" weight="0.6" transform="log1p" />
              </ul>
            </td>
            <td className="px-4 py-4">
              <ul className="grid gap-2">
                <AxisComponent field="median_tx_fee_native" weight="1.0" transform="log1p" />
              </ul>
            </td>
            <td className="px-4 py-4">
              <ul className="grid gap-2">
                <AxisComponent field="capacity_util_pct" weight="1.0" transform="none" />
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
      {/* field-dictionary-axis-map:end */}
    </div>
  );
}

export default function MethodologyFieldsPage() {
  return (
    <MethodologyPageShell>
      <MethodologyHeader
        title="Field Dictionary"
        description="What Urd Atlas delivers, what each important field measures, why it is useful, and whether it drives classification, confidence, context, or provenance."
      />

      <MethodologyContent>
        <MethodologyNav />

        <ShortFullContent
          pageKey="methodology-fields"
          summary={
            <>
              Use this page to look up what a published field means, how to interpret it, and whether
              it is directly reproducible or only independently checkable.
            </>
          }
          bullets={[
            <>
              Field Dictionary is for meaning and interpretation. Use Schema Reference when you need
              structural contract detail for parsing.
            </>,
            <>
              Confidence v3 fields explain why data quality can be high while label confidence remains
              modest, and why non-applicable fields are not counted as missing evidence.
            </>,
            <>
              Basic meaning comes first. Advanced and traceability detail remain available in the full
              version.
            </>,
          ]}
          whyItMatters={
            <>
              Users should be able to resolve field meaning quickly without scanning the entire
              methodology section every time.
            </>
          }
          fullContent={
            <div className="grid gap-6">
              <Section title="How to use this page">
                <div className="space-y-3">
                  <p>
                    Use this page when you already know the field name and need the public meaning,
                    unit semantics, verification class, and interpretation boundaries. For deeper
                    system-level logic, use the Public Methodology Reference page.
                  </p>
                  <p>
                    Long field paths are shown in wrapping code blocks and cards rather than compact
                    tables, so the page remains readable on laptop and mobile widths.
                  </p>
                </div>
              </Section>

              <Section title="What exactly do I receive?">
                <div className="grid gap-3 md:grid-cols-2">
                  <NotePanel title="Gold · daily observations">
                    <p>One date + chain row of normalized measurements such as transaction activity, fees, utilization, block cadence and chain-specific observational fields.</p>
                    <p><strong className="text-[var(--ink)]">Use it for:</strong> inspecting the evidence beneath a classification or joining the underlying measurements directly.</p>
                  </NotePanel>
                  <NotePanel title="Derived · ready-made features">
                    <p>MA7/MA30 transformations of the explicitly listed Gold metric set, plus source provenance back to Gold.</p>
                    <p><strong className="text-[var(--ink)]">Use it for:</strong> analysis that needs smoothed features without rebuilding the same rolling calculations.</p>
                  </NotePanel>
                  <NotePanel title="Meta · classification + evidence">
                    <p>The daily regime, Demand/Friction/Capacity evidence, confidence, drivers, ruleset identifiers and determinism/provenance fields.</p>
                    <p><strong className="text-[var(--ink)]">Use it for:</strong> the date + chain state row you integrate into an analytical system.</p>
                  </NotePanel>
                  <NotePanel title="Briefs · readable context">
                    <p>Human-readable window summaries generated from already published regime evidence.</p>
                    <p><strong className="text-[var(--ink)]">Use it for:</strong> reporting and narrative context, not as a separate predictive model.</p>
                  </NotePanel>
                </div>
                <Callout title="Read the role badge first">
                  <p>Each field card now states whether the field is a regime/scorecard input, a confidence input, observational context, a derived feature, or provenance. A field being delivered does not automatically mean it drives the regime label.</p>
                </Callout>
              </Section>

              <NotePanel title="Where Gold fields come from">
                <p>
                  Every Gold field is derived from two raw tables per chain — <FieldCode>blocks</FieldCode>{" "}
                  and <FieldCode>transactions</FieldCode> — sourced from the AWS Public Blockchain Dataset.
                  Column names vary slightly across chains and over time; the pipeline resolves a
                  prioritized list of known candidate names per concept (case-insensitive) before falling
                  back to null rather than guessing.
                </p>
              </NotePanel>

              <Section title="Key Gold fields">
                <p>Gold is the normalized daily observation layer. Null means unavailable/not applicable for that row; it must not be reinterpreted as zero.</p>
                <FieldGrid entries={GOLD_FIELDS} />
              </Section>

              <Section title="Chain-specific delivered extension fields">
                <p>These fields can appear in published Gold artifacts but are produced outside the canonical <FieldCode>CANON_COLS</FieldCode> aggregation surface. They are documented separately so the distinction remains explicit and auditable.</p>
                <FieldGrid entries={CHAIN_EXTENSION_FIELDS} />
              </Section>

              <Section title="Key Derived fields">
                <p>Derived is deliberately simpler than Gold: it publishes reusable rolling features only for the metric set declared in each artifact&apos;s source metadata.</p>
                <FieldGrid entries={DERIVED_FIELDS} />
              </Section>

              <Section title="Which field drives which axis, per chain">
                <p>
                  The same nine Gold metric fields are not used identically across chains. Each chain profile
                  (BTC, ETH L1, L2) has its own Demand / Friction / Capacity component list, weights, and
                  transform. This table mirrors <FieldCode>PROFILE_COMPONENTS</FieldCode> in the scoring
                  engine directly, so documentation drift is caught by the field-dictionary sync gate.
                </p>
                <AxisMappingTable />
              </Section>

              <Section title="Key Meta fields">
                <FieldGrid entries={META_FIELDS} />
              </Section>

              <Section title="Key Briefs fields">
                <FieldGrid entries={BRIEF_FIELDS} />
              </Section>

              <Section title="Field note: Confidence v3">
                <NotePanel title="Composite confidence">
                  <p>
                    <FieldCode>confidence.confidence_score</FieldCode> is not a standalone judgement.
                    It is the geometric mean of data quality and label confidence.
                  </p>
                  <FormulaBlock>{"sqrt(data_quality_score × label_confidence_score)"}</FormulaBlock>
                  <p>
                    A row can therefore have perfect data quality and still have moderate confidence if
                    the label evidence is thin, adjacent, or mixed.
                  </p>
                </NotePanel>
                <NotePanel title="Profile-aware data quality">
                  <p>
                    <FieldCode>confidence.components.data_quality.required_metrics</FieldCode> lists the
                    metrics that actually count toward coverage for this chain profile.
                  </p>
                  <p>
                    <FieldCode>structurally_not_applicable</FieldCode> fields are excluded from the
                    denominator. <FieldCode>optional_not_penalized</FieldCode> fields remain visible but
                    do not reduce confidence when absent.
                  </p>
                </NotePanel>
                <WarningCallout title="Important interpretation warning">
                  <p>
                    A higher <FieldCode>data_quality_score</FieldCode> under Confidence v3 does not mean
                    the model became more optimistic. It means the data-quality denominator now matches
                    the evidence surface that is actually meaningful for that chain.
                  </p>
                </WarningCallout>
              </Section>

              <Section title="Field note: status explanations">
                <p>
                  <FieldCode>status.one_liner</FieldCode> is the public readable explanation of the
                  current state. For borderline stable rows it can now explicitly state that the scorecard
                  shows adjacent pressure while the regime-axis evidence did not cross the threshold for
                  <FieldCode>HEATING</FieldCode>, <FieldCode>CHEAP</FieldCode>, or <FieldCode>CONGESTED</FieldCode>.
                </p>
                <Callout title="Why this matters">
                  <p>
                    The scorecard is a continuous descriptive surface. The regime label is a categorical
                    thresholded state. They should be read together, but they are not identical. The status
                    text is allowed to explain that distinction.
                  </p>
                </Callout>
              </Section>

              <Section title="Field note: scorecard dimensions">
                <p>
                  <FieldCode>scorecard.dimensions.&lt;axis&gt;.score</FieldCode> is the published
                  confidence-degraded display score for an axis.
                </p>
                <FieldGrid entries={SCORECARD_FIELDS} />
                <FormulaBlock>{"50 + (raw - 50) × effective_confidence"}</FormulaBlock>
                <Callout title="Interpretation boundary">
                  <p>
                    Customers can fully verify the published display score from published row inputs.
                    That does not mean the entire raw-score construction is fully reconstructable from
                    public documentation alone.
                  </p>
                </Callout>
              </Section>

              <Section title="Field note: regime drivers z robust">
                <NotePanel title="Driver z-score">
                  <p>
                    <FieldCode>regime.drivers[].z_robust</FieldCode> is the driver-layer z-score
                    published for a regime driver row. It is computed from 180-day raw daily values, not
                    from the 7-day smoothed scorecard series.
                  </p>
                </NotePanel>
                <WarningCallout title="Important comparison warning">
                  <p>
                    Do not expect <FieldCode>regime.drivers[].z_robust</FieldCode> to numerically match a
                    scorecard dimension score or the internal z-family behind that score. The driver
                    z-score and the scorecard normalization use different input series, different windows,
                    and different purposes.
                  </p>
                </WarningCallout>
              </Section>

              <Section title="Field note: current Friction fee semantics">
                <NotePanel title="Direct fee distribution">
                  <p>
                    Current BTC, Ethereum and L2 public Friction profiles use <FieldCode>median_tx_fee_native</FieldCode>
                    directly (with a log1p transform in the scorecard). Ethereum also includes
                    <FieldCode>failed_tx_rate</FieldCode> as a second Friction component.
                  </p>
                  <p>
                    <FieldCode>fee_burden_proxy</FieldCode> may still appear as a compatibility alias in
                    some mapping metadata, but under the current production profiles it resolves to
                    <FieldCode>median_tx_fee_native</FieldCode>; it is not the old fee/value ratio.
                  </p>
                </NotePanel>
                <Callout title="Why this matters">
                  <p>
                    Consumers should interpret current Friction against the chain&apos;s own historical fee
                    distribution, not as fee divided by transaction value. This keeps the Field Dictionary
                    aligned with the current scorecard and regime engines.
                  </p>
                </Callout>
              </Section>

              <Section title="Field note: Bitcoin blocktime instability">
                <NotePanel title="BTC capacity component">
                  <p>
                    For BTC capacity interpretation, the Capacity axis combines direct blockspace
                    occupancy from <FieldCode>block_weight_utilization_pct</FieldCode> with{" "}
                    <FieldCode>blocktime_instability</FieldCode>. Raw block time is not scored
                    directionally, and BTC does not use gas utilization.
                  </p>
                  <FormulaBlock>{"|block_time - median30(block_time)| / median30(block_time)"}</FormulaBlock>
                  <p>The field is then smoothed before scoring.</p>
                </NotePanel>
                <WarningCallout title="Directional consequence">
                  <p>
                    BTC Capacity therefore combines blockspace occupancy with unusual block-time
                    behaviour around the recent norm. High Capacity can veto CHEAP, but block-weight
                    pressure alone does not create CONGESTED; simultaneous Friction pressure is also
                    required by the BTC regime rule.
                  </p>
                </WarningCallout>
              </Section>

              <Section title="Field note: regime label stability">
                <p>
                  <FieldCode>regime.label</FieldCode> is a daily descriptive state, not a built-in
                  multi-day stable segmentation layer.
                </p>
                <WarningCallout title="Downstream use warning">
                  <p>
                    Labels can change day to day in response to threshold crossings. This matters most for{" "}
                    <FieldCode>CONGESTED</FieldCode> and <FieldCode>CHEAP</FieldCode>, which do not have a
                    separate universal multi-day confirmation window. <FieldCode>HEATING</FieldCode> depends
                    in part on a trend condition and therefore has a different stability profile. Customers
                    who need multi-day regime stability should apply their own minimum-duration or smoothing
                    rule.
                  </p>
                </WarningCallout>
              </Section>
            </div>
          }
        />
      </MethodologyContent>
    </MethodologyPageShell>
  );
}
