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
    notes: "Direct daily chain activity count.",
  },
  {
    field: "median_tx_fee_native",
    meaning: "Typical same-day transaction fee in native denomination.",
    notes: "Published as a median, not an arithmetic average.",
  },
  {
    field: "median_tx_value_native",
    meaning: "Typical same-day transaction value in native denomination.",
    notes: "Optional for some chain profiles in Confidence v2; visible when available, but not always a confidence penalty when absent.",
  },
  {
    field: "avg_block_time_sec",
    meaning: "Typical daily inter-block interval behaviour.",
    notes: "Interpret as a robust typical block interval field, not as a strict arithmetic mean claim.",
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

export default function MethodologyFieldsPage() {
  return (
    <MethodologyPageShell>
      <MethodologyHeader
        title="Field Dictionary"
        description="This page defines the public meaning of the main published fields and the interpretation warnings that matter most for technical users."
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
              Confidence v2 fields explain why data quality can be high while label confidence remains
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

              <Section title="Key Gold fields">
                <FieldGrid entries={GOLD_FIELDS} />
              </Section>

              <Section title="Key Meta fields">
                <FieldGrid entries={META_FIELDS} />
              </Section>

              <Section title="Key Briefs fields">
                <FieldGrid entries={BRIEF_FIELDS} />
              </Section>

              <Section title="Field note: Confidence v2">
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
                    A higher <FieldCode>data_quality_score</FieldCode> after Confidence v2 does not mean
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

              <Section title="Field note: fee burden proxy">
                <NotePanel title="Current value">
                  <p>
                    <FieldCode>scorecard.dimensions.friction.components.fee_burden_proxy.current</FieldCode>{" "}
                    is not a native fee amount. It is the current value of an internal friction proxy.
                  </p>
                  <FormulaBlock>{"median_tx_fee_native / median_tx_value_native"}</FormulaBlock>
                  <p>
                    Its unit is a dimensionless ratio, not a native-denominated fee. It measures fee
                    burden relative to transaction value, not fee size in isolation.
                  </p>
                </NotePanel>
                <Callout title="Why this matters">
                  <p>
                    A friction score can be elevated even when absolute fees are not unusually high in
                    native terms, because the friction component is based on fee burden relative to
                    transferred value. Customers should read this field as a burden proxy rather than as
                    a direct fee amount.
                  </p>
                </Callout>
              </Section>

              <Section title="Field note: Bitcoin blocktime instability">
                <NotePanel title="BTC capacity component">
                  <p>
                    For BTC capacity interpretation, the capacity axis does not score raw block time
                    directionally and does not combine with gas utilization. For BTC,{" "}
                    <FieldCode>blocktime_instability</FieldCode> is the only capacity component.
                  </p>
                  <FormulaBlock>{"|block_time - median30(block_time)| / median30(block_time)"}</FormulaBlock>
                  <p>The field is then smoothed before scoring.</p>
                </NotePanel>
                <WarningCallout title="Directional consequence">
                  <p>
                    This means the BTC capacity score is not a direct measure of slow blocks only. It is a
                    measure of unusual block-time behaviour around the recent norm in either direction.
                    Customers should read BTC capacity as a stress-or-instability proxy, not as a
                    directional slow-block indicator.
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
