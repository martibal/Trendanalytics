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
      "Optional across all chain profiles: visible when available, never a confidence penalty when absent, and not currently used in the public Demand/Friction/Capacity scorecard.",
  },
  {
    field: "median_tx_value_native",
    meaning: "Typical same-day transaction value in native denomination.",
    notes: "Optional for all current chain profiles; visible when available, but not a confidence penalty when absent. Used only where value-normalized fee burden is methodologically valid.",
  },
  {
    field: "median_tx_fee_native",
    meaning: "Typical same-day transaction fee in native denomination.",
    notes: "Published as a median, not an arithmetic average. Drives the Friction axis for every current chain profile.",
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
    field: "block_weight_utilization_pct",
    meaning: "Average share of Bitcoin's maximum block weight used across blocks produced that day.",
    notes: (
      <>
        Bitcoin-only observational capacity field calculated from block weight divided by the
        4,000,000 weight-unit consensus maximum. Published on a 0–1 scale and null for non-Bitcoin
        chains. It is included in Gold and weekly capacity summaries, but does not yet drive the
        public regime label, scorecard, or confidence calculation while historical behaviour is
        being validated.
      </>
    ),
  },
  {
    field: "unique_active_addresses",
    meaning: "Count of distinct addresses that sent or received a transaction that day.",
    notes: (
      <>
        Drives the Demand axis for Ethereum L1 and both L2 chains, both directly (weight 1.0)
        and via the derived <FieldCode>tx_per_user</FieldCode> ratio (weight 0.6). Not used for
        Bitcoin&apos;s Demand axis, where <FieldCode>tx_count_daily</FieldCode> alone is the
        methodology&apos;s chosen activity signal.
      </>
    ),
  },
  {
    field: "avg_block_time_sec",
    meaning: "Typical daily inter-block interval behaviour.",
    notes: (
      <>
        Inter-block cadence field. It is not read as a raw directional congestion metric; it feeds
        the derived <FieldCode>blocktime_instability</FieldCode> component where that component is
        used by the chain profile.
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
        Confidence v2 uses <FieldCode>sqrt(data_quality_score × label_confidence_score)</FieldCode>. The
        gate threshold remains <FieldCode>0.40</FieldCode>.
      </>
    ),
  },
  {
    field: "confidence.methodology_version",
    meaning: "Specific confidence methodology used for the row.",
    notes: (
      <>
        Current value is <FieldCode>confidence_v2_profile_evidence</FieldCode> for Confidence v2 rows.
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
    field: "confidence.candidate_label",
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
      "These fields may still be published or useful, but absence does not automatically reduce data quality under Confidence v2.",
  },
  {
    field: "confidence.components.label_confidence.uses_score_raw",
    meaning: "Whether label confidence was evaluated from raw scorecard evidence.",
    notes:
      "Current Confidence v2 rows use raw scorecard/regime evidence, not confidence-degraded display scores.",
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
      "Used by Confidence v2 as part of label confidence. The historical normalization and calibration are publicly described in family terms, but not fully disclosed at implementation detail.",
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
      {entries.map((entry) => (
        <article key={entry.field} className="min-w-0 rounded-xl border border-[var(--line)] bg-[rgba(22,40,64,.56)] p-4">
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <FieldCode>{entry.field}</FieldCode>
            {entry.verificationClass ? (
              <span className="shrink-0 rounded-full border border-[var(--gold-line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">
                Class {entry.verificationClass}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{entry.meaning}</p>
          <div className="mt-2 text-sm leading-7 text-[var(--ink2)]">{entry.notes}</div>
        </article>
      ))}
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

export default function FieldsMethodologyPage() {
  return (
    <MethodologyPageShell>
      <MethodologyHeader
        eyebrow="Methodology"
        title="Field Dictionary"
        intro="A compact reference for the published Gold, Meta, Briefs, and scorecard fields that matter for interpretation, reproducibility, and integration."
      />

      <MethodologyNav />

      <MethodologyContent>
        <Section title="Gold fields">
          <ShortFullContent
            short={
              <>
                <p>
                  Gold is the canonical daily observation layer. These fields describe the chain day before regime classification and confidence logic are applied.
                </p>
                <FieldGrid entries={GOLD_FIELDS} />
              </>
            }
            full={
              <div className="space-y-5">
                <Callout title="Interpretation rule">
                  Gold fields are descriptive observations. A field appearing in Gold does not automatically mean it is an active regime driver for every chain profile.
                </Callout>
                <FieldGrid entries={GOLD_FIELDS} />
              </div>
            }
          />
        </Section>

        <Section title="Meta and confidence fields">
          <FieldGrid entries={META_FIELDS} />
        </Section>

        <Section title="Briefs fields">
          <FieldGrid entries={BRIEF_FIELDS} />
        </Section>

        <Section title="Scorecard fields">
          <FieldGrid entries={SCORECARD_FIELDS} />
        </Section>

        <Section title="Current axis mapping">
          <p className="text-sm leading-7 text-[var(--ink2)]">
            This table documents the active scorecard inputs by chain profile. Observational fields that are published but not yet promoted into scorecard or regime logic are intentionally omitted here.
          </p>
          <AxisMappingTable />
        </Section>

        <Section title="Derived scorecard display formula">
          <FormulaBlock>{"score = 50 + (score_raw - 50) × effective_confidence"}</FormulaBlock>
          <p className="text-sm leading-7 text-[var(--ink2)]">
            The published score is confidence-degraded toward neutral 50. The raw score and effective confidence remain available for audit and interpretation.
          </p>
        </Section>

        <Section title="Important boundaries">
          <div className="grid gap-4 md:grid-cols-2">
            <NotePanel title="Descriptive, not predictive">
              <p>Fields describe observed network conditions. They are not forecasts, recommendations, or price signals.</p>
            </NotePanel>
            <NotePanel title="Chain semantics matter">
              <p>
                Structurally non-applicable fields are not treated as missing evidence. Bitcoin, Ethereum L1, and L2 profiles can therefore expose different valid evidence surfaces.
              </p>
            </NotePanel>
          </div>
          <WarningCallout title="Do not infer user identity">
            Address counts, transaction counts, and related fields describe on-chain observations. They do not establish the number of unique people or entities using a chain.
          </WarningCallout>
        </Section>
      </MethodologyContent>
    </MethodologyPageShell>
  );
}
