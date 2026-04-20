import Link from "next/link";
import {
  Callout,
  InlineCode,
  MethodologyHeader,
  MethodologyNav,
  Section,
  SimpleTable,
} from "../_components";

export default async function MethodologyReferencePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Public Methodology Reference"
        description="This is the canonical public explanation of what each Urd Atlas artifact layer means, how confidence and regime should be read, and where public methodology intentionally stops."
      />

      <MethodologyNav />

      <div className="grid gap-6">
        <Section title="Purpose of this reference">
          <p>
            This page is written to let a careful technical customer understand what the product publishes,
            what each published value represents, and how to interpret the published outputs without turning
            the public documentation into a blueprint for reconstructing upstream raw data or cloning the private pipeline.
          </p>
        </Section>

        <Section title="Global interpretation rules">
          <ul className="list-disc pl-5">
            <li>All dates are UTC calendar dates.</li>
            <li>All score and regime interpretation is chain-relative, not cross-chain absolute.</li>
            <li>No price conversion is applied inside these artifacts.</li>
            <li>Unsupported or unreliable fields are published as <InlineCode>null</InlineCode> rather than silently imputed.</li>
            <li>If field meaning changes materially, the methodology version must change.</li>
          </ul>
        </Section>

        <Section title="Artifact model">
          <SimpleTable
            headers={["Layer", "Definition", "Interpretation"]}
            rows={[
              [
                <strong key="gold">Gold</strong>,
                <>The daily observation layer for a chain and UTC date.</>,
                <>Direct daily chain aggregates or robust daily summaries. No regime interpretation.</>,
              ],
              [
                <strong key="derived">Derived</strong>,
                <>The deterministic trend layer built from Gold.</>,
                <>Short-window and medium-window smoothing for charting and trend context.</>,
              ],
              [
                <strong key="meta">Meta</strong>,
                <>The analytical layer.</>,
                <>Publishes regime, confidence, scorecard, drivers, freshness context, and presentation helpers.</>,
              ],
            ]}
          />
        </Section>

        <Section title="Gold methodology">
          <p>
            Gold fields are direct daily chain observations or robust daily summaries derived from the chain’s daily population.
            Gold does not publish smoothing, score compression, or categorical interpretation.
          </p>
          <SimpleTable
            headers={["Field family", "Public meaning", "Verification class"]}
            rows={[
              [<>Daily counts such as <InlineCode>tx_count_daily</InlineCode> and <InlineCode>block_count_daily</InlineCode></>, <>Direct daily chain activity volume.</>, <>B</>],
              [<>Native value and fee fields such as <InlineCode>value_transferred_native</InlineCode>, <InlineCode>median_tx_value_native</InlineCode>, and <InlineCode>median_tx_fee_native</InlineCode></>, <>Daily native-denominated throughput and typical same-day transaction magnitude / fee burden.</>, <>B</>],
              [<>Execution-quality or capacity fields such as <InlineCode>failed_tx_rate</InlineCode> and <InlineCode>gas_utilization_pct</InlineCode></>, <>Daily failure burden or capacity usage where those semantics are meaningful for the chain.</>, <>B</>],
              [<>Breadth and cadence fields such as <InlineCode>unique_active_addresses</InlineCode> and <InlineCode>avg_block_time_sec</InlineCode></>, <>Daily participation breadth and typical inter-block interval behavior.</>, <>B</>],
            ]}
          />
          <Callout title="Gold boundary">
            Gold values are publicly interpretable and independently checkable against public chain evidence, but they are not published with enough upstream schema detail to reconstruct raw AWS source records.
          </Callout>
        </Section>

        <Section title="Derived methodology">
          <p>
            Derived fields are deterministic transforms of Gold. The core published pattern is the rolling average family:
            <InlineCode>{` <metric>__ma7 `}</InlineCode> and <InlineCode>{` <metric>__ma30 `}</InlineCode>.
          </p>
          <p>
            <InlineCode>__ma7</InlineCode> is the 7-day simple moving average over the corresponding Gold metric.
            <InlineCode>__ma30</InlineCode> is the 30-day simple moving average over the same metric.
            At the beginning of a historical archive, these use the available observations rather than forcing nulls solely due to insufficient lookback.
          </p>
          <p>
            Derived also carries a small copy-through confidence subset where needed for chart rendering.
          </p>
        </Section>

        <Section title="Confidence methodology">
          <p>
            Confidence answers a single question: how much evidence supports the current analytical state?
            It combines data sufficiency and freshness with label decisiveness.
          </p>
          <p>
            The top-line confidence score is the geometric mean of data quality and label clarity:
            <InlineCode>{`sqrt(data_quality × label_clarity)`}</InlineCode>.
          </p>
          <p>
            The public data-quality component blends five bounded subcomponents using the currently implemented weights:
            current-row coverage 0.30, recent metric coverage 0.20, recent density 0.20, history depth 0.15, and freshness-as-of 0.15.
          </p>
          <p>
            The current public confidence gate is <InlineCode>0.40</InlineCode>. Below that threshold the product publishes <InlineCode>UNKNOWN/DEGRADED</InlineCode> instead of a normal-confidence label.
          </p>
        </Section>

        <Section title="Scorecard methodology" id="scorecard">
          <p>
            The scorecard compresses current chain conditions into three axes: demand, friction, and capacity. Scores are chain-relative and bounded to a 0–100 display scale with 50 as the neutral point.
          </p>
          <p>
            Score construction uses robust normalization against each chain’s own historical baseline. The currently implemented score family applies 7-day smoothing before historical comparison, excludes the most recent 14 days from the baseline, and maps robust z-scores into a bounded score via:
            <InlineCode>{`50 + 40 × tanh(z / 1.5)`}</InlineCode>.
          </p>
          <p>
            The current public scorecard component weights are:
          </p>
          <ul className="list-disc pl-5">
            <li>Demand: tx 1.0, active addresses 1.0, tx_per_user 0.8</li>
            <li>Friction: fee_burden 1.0, failed_tx 0.7</li>
            <li>Capacity: utilization 1.0, blocktime_instability 0.8</li>
          </ul>
          <p>
            The displayed score is confidence-degraded using the public rule:
            <InlineCode>{` 50 + (raw - 50) × effective_confidence `}</InlineCode>.
          </p>
          <Callout title="Important distinction: regime vs scorecard normalization">
            <p>
              <InlineCode>regime.drivers[].z_robust</InlineCode> is computed from 180-day raw daily values using the formula <InlineCode>0.6745 × (x − median) / MAD</InlineCode>. Scorecard dimension scores are computed from 7-day rolling averages against a 365-day baseline using the formula <InlineCode>(x − median) / (1.4826 × MAD)</InlineCode>. These are two separate calculations with separate purposes and separate input series. They will not produce identical values for the same metric on the same day.
            </p>
          </Callout>
        </Section>

        <Section title="Regime methodology" id="regime">
          <p>
            Regime is the product’s categorical interpretation layer. It maps chain-relative analytical conditions into one of five public states:
            <InlineCode>STABLE</InlineCode>, <InlineCode>HEATING</InlineCode>, <InlineCode>CONGESTED</InlineCode>, <InlineCode>CHEAP</InlineCode>, and <InlineCode>UNKNOWN/DEGRADED</InlineCode>.
          </p>
          <p>
            The current implemented regime engine uses:
          </p>
          <ul className="list-disc pl-5">
            <li>robust z-score based on 180-day raw daily history</li>
            <li>90-day percentile rank for banding support</li>
            <li><strong>OR logic</strong> for threshold-triggered band assignment</li>
            <li>momentum epsilon <InlineCode>0.15</InlineCode> for heating/cooling trend state</li>
            <li>label evaluation order: <InlineCode>CONGESTED → CHEAP → HEATING → STABLE</InlineCode></li>
          </ul>
          <p>
            Regime drivers are explanatory rows ranked by a private driver-priority function that is stable in public meaning but not fully disclosed in public methodology. The public fields inside each driver row remain interpretable and archived as published.
          </p>
        </Section>

        <Section title="Public row identity and traceability">
          <p>
            Archived Meta rows do not currently publish a separate revision integer. Public row identity is therefore anchored in the fields that are actually present in the archive.
          </p>
          <ul className="list-disc pl-5">
            <li>All rows: <InlineCode>chain</InlineCode>, <InlineCode>date</InlineCode>, <InlineCode>methodology_version</InlineCode></li>
            <li>Named regime rows: <InlineCode>regime.determinism_hash</InlineCode></li>
            <li>Gated rows: <InlineCode>updated_through</InlineCode>, <InlineCode>confidence.confidence_score</InlineCode>, <InlineCode>status.label</InlineCode></li>
          </ul>
          <p>
            This is the canonical public traceability model for archived Meta outputs.
          </p>
        </Section>

        <Section title="What this page intentionally does not disclose">
          <ul className="list-disc pl-5">
            <li>Exact upstream AWS schemas, join logic, or source repair rules</li>
            <li>Intermediate feature tables and internal parquet structures</li>
            <li>Full proprietary calibration constants required to clone the classifier end to end</li>
            <li>Enough implementation detail to reconstruct raw source rows from published aggregates</li>
          </ul>
          <p>
            The public methodology is designed to make the product auditable in meaning, not reconstructable in implementation.
          </p>
        </Section>

        <Section title="Read next">
          <p>
            For field-by-field definitions, continue to <Link href="/methodology/fields" className="underline">Field Dictionary</Link>.
            For concrete worked examples, continue to <Link href="/methodology/verification" className="underline">Verification & Evidence Pack</Link>.
          </p>
        </Section>
      </div>
    </main>
  );
}
