import ShortFullContent from "@/components/site/ShortFullContent";
import PageHero from "@/components/site/PageHero";
import {
  UrdPage,
  UrdContainer,
} from "@/components/site/UrdDesignSystem";
import Link from "next/link";
import {
  Callout,
  InlineCode,
  MethodologyNav,
  Section,
  SimpleTable,
} from "../_components";

export default function MethodologyReferencePage() {
  return (
    <UrdPage>
      <PageHero
        eyebrow="Urd Atlas Methodology"
        title="Public Methodology Reference"
        summary="Canonical public explanation of what each Urd Atlas artifact layer means, how confidence and regime should be interpreted, and where the public methodology intentionally stops."
      />

      <UrdContainer className="max-w-6xl">
        <MethodologyNav />

        <ShortFullContent
          pageKey="methodology-reference"
          summary={
            <>
              This page defines what Urd Atlas publishes, how to read regime and
              confidence, and where public methodology stops.
            </>
          }
          bullets={[
            <>
              Gold is the daily observation layer, Derived is the deterministic
              transform layer, Meta is the analytical regime layer, and Briefs are the readable JSON summary layer.
            </>,
            <>
              Confidence publishes how strong the current evidence is. Rows below
              the public 0.40 gate are shown as UNKNOWN/DEGRADED instead of being
              presented as strong labels.
            </>,
            <>
              Regime labels are descriptive interpretations of chain-relative
              conditions, not forecasts or trading signals.
            </>,
            <>
              Public methodology is meant to explain meaning and behavior without
              exposing enough detail to reconstruct source data or clone the
              private pipeline.
            </>,
          ]}
          whyItMatters={
            <>
              A technical buyer should be able to understand the analytical
              contract of the product in seconds before deciding whether to read
              the full implementation-facing detail.
            </>
          }
          fullContent={
            <div className="grid gap-6">
              <Section title="Purpose of this reference">
                <p>
                  This page defines the public meaning of the published artifacts.
                  It is meant to let a careful technical customer understand the
                  outputs without turning the public trust layer into a blueprint
                  for reconstructing upstream raw data or cloning the internal
                  pipeline.
                </p>
              </Section>

              <Section title="Global interpretation rules">
                <ul className="list-disc pl-5">
                  <li>All dates are UTC calendar dates.</li>
                  <li>
                    All analytical interpretation is chain-relative, not
                    cross-chain absolute.
                  </li>
                  <li>No price conversion is applied inside these artifacts.</li>
                  <li>
                    Unsupported or unreliable fields are published as{" "}
                    <InlineCode>null</InlineCode>.
                  </li>
                  <li>
                    If field meaning changes materially, the methodology version
                    must change.
                  </li>
                </ul>
              </Section>

              <Section title="Artifact model">
                <SimpleTable
                  headers={["Layer", "Definition", "Interpretation"]}
                  rows={[
                    [
                      <strong key="gold">Gold</strong>,
                      <>Daily observation layer for a chain and UTC date.</>,
                      <>
                        Direct daily chain aggregates or robust daily summaries.
                        No regime interpretation.
                      </>,
                    ],
                    [
                      <strong key="derived">Derived</strong>,
                      <>Deterministic trend layer built from Gold.</>,
                      <>
                        Rolling transforms used for charting and trend context.
                      </>,
                    ],
                    [
                      <strong key="meta">Meta</strong>,
                      <>Analytical layer.</>,
                      <>
                        Publishes regime, confidence, scorecard, drivers,
                        freshness context, and presentation helpers.
                      </>,
                    ],
                    [
                      <strong key="briefs">Briefs</strong>,
                      <>Readable JSON summary layer.</>,
                      <>
                        Publishes short descriptive summaries of latest Meta
                        context for fast reading, reporting, and non-pipeline
                        workflows.
                      </>,
                    ],
                  ]}
                />
              </Section>

              <Section title="Gold methodology">
                <p>
                  Gold publishes direct daily chain observations or robust daily
                  summaries. Gold does not apply regime logic, confidence
                  degradation, or categorical interpretation.
                </p>
                <SimpleTable
                  headers={["Field family", "Public meaning", "Verification class"]}
                  rows={[
                    [
                      <>Daily counts</>,
                      <>Daily transaction volume and block production activity.</>,
                      <>B</>,
                    ],
                    [
                      <>Native value and fee fields</>,
                      <>
                        Native-denominated transfer throughput and typical
                        same-day transaction magnitude / fee burden.
                      </>,
                      <>B</>,
                    ],
                    [
                      <>Execution-quality or capacity fields</>,
                      <>
                        Daily failure burden or capacity usage where those
                        semantics are meaningful.
                      </>,
                      <>B</>,
                    ],
                    [
                      <>Breadth and cadence fields</>,
                      <>
                        Participation breadth and typical inter-block interval
                        behavior.
                      </>,
                      <>B</>,
                    ],
                  ]}
                />
              </Section>

              <Section title="Derived methodology">
                <p>
                  Derived fields are deterministic transforms of Gold. The core
                  public pattern is the rolling average family:{" "}
                  <InlineCode>{`<metric>__ma7`}</InlineCode> and{" "}
                  <InlineCode>{`<metric>__ma30`}</InlineCode>.
                </p>
                <p>
                  <InlineCode>__ma7</InlineCode> is the 7-day simple moving
                  average. <InlineCode>__ma30</InlineCode> is the 30-day simple
                  moving average. At the beginning of the archive these use the
                  available observations rather than forcing nulls solely due to
                  insufficient lookback.
                </p>
              </Section>

              <Section title="Confidence methodology">
                <p>
                  Confidence combines data sufficiency and freshness with label
                  clarity. The current public confidence score is the geometric
                  mean{" "}
                  <InlineCode>{`sqrt(data_quality × label_clarity)`}</InlineCode>.
                </p>
                <p>
                  The current public confidence gate is{" "}
                  <InlineCode>0.40</InlineCode>. Below that threshold, the product
                  publishes <InlineCode>UNKNOWN/DEGRADED</InlineCode> instead of a
                  normal-confidence regime label.
                </p>
              </Section>

              <Section title="Scorecard methodology" id="scorecard">
                <p>
                  The scorecard compresses current chain conditions into three
                  axes: demand, friction, and capacity. Scores are chain-relative
                  and bounded to a 0–100 display scale with 50 as the neutral
                  point.
                </p>
                <p>
                  Score construction uses robust normalization against each
                  chain’s own historical baseline. The currently implemented
                  score family applies 7-day smoothing before historical
                  comparison, excludes the most recent 14 days from the baseline,
                  and maps robust z-scores into a bounded display score via{" "}
                  <InlineCode>{`50 + 40 × tanh(z / 1.5)`}</InlineCode>.
                </p>
                <p>
                  The displayed score is confidence-degraded using{" "}
                  <InlineCode>{`50 + (raw - 50) × effective_confidence`}</InlineCode>.
                </p>

                <Callout title="Important distinction: regime z-scores vs scorecard normalization">
                  <p>
                    <InlineCode>regime.drivers[].z_robust</InlineCode> is
                    computed from 180-day raw daily values using the formula{" "}
                    <InlineCode>0.6745 × (x − median) / MAD</InlineCode>.
                    Scorecard dimension scores are computed from 7-day rolling
                    averages against a 365-day baseline using the formula{" "}
                    <InlineCode>(x − median) / (1.4826 × MAD)</InlineCode>.
                    These are two separate calculations with separate purposes
                    and separate input series. They will not produce identical
                    values for the same metric on the same day.
                  </p>
                </Callout>

                <Callout title="BTC capacity note">
                  <p>
                    For Bitcoin, <InlineCode>gas_utilization_pct</InlineCode> is
                    not published. The capacity axis therefore relies entirely on{" "}
                    <InlineCode>blocktime_instability</InlineCode>, computed as
                    the rolling mean of{" "}
                    <InlineCode>{`|avg_block_time_sec − rolling_median_30| / rolling_median_30`}</InlineCode>.
                  </p>
                  <p>
                    This instability index measures deviation from the chain&apos;s
                    own recent block-time norm in both directions. A period of
                    consistently fast block production and a period of
                    consistently slow block production will both produce low
                    instability and therefore a low capacity score. A high
                    capacity score on Bitcoin means block timing is unusually
                    erratic relative to recent history — not that blocks are slow.
                  </p>
                  <p>
                    Consumers using BTC capacity scores should interpret them as
                    a block-time volatility signal, not a
                    congestion-in-the-traditional-sense signal.
                  </p>
                </Callout>
              </Section>

              <Section title="Regime methodology" id="regime">
                <p>
                  Regime is the product’s categorical interpretation layer. It
                  maps chain-relative analytical conditions into one of five
                  public states: <InlineCode>STABLE</InlineCode>,{" "}
                  <InlineCode>HEATING</InlineCode>,{" "}
                  <InlineCode>CONGESTED</InlineCode>, <InlineCode>CHEAP</InlineCode>,
                  and <InlineCode>UNKNOWN/DEGRADED</InlineCode>.
                </p>
                <p>The current implemented regime engine uses:</p>
                <ul className="list-disc pl-5">
                  <li>robust z-score based on 180-day raw daily history</li>
                  <li>90-day percentile rank for banding support</li>
                  <li>
                    <strong>OR logic</strong> for threshold-triggered band
                    assignment
                  </li>
                  <li>
                    momentum epsilon <InlineCode>0.15</InlineCode> for
                    heating/cooling trend state
                  </li>
                  <li>
                    label evaluation order:{" "}
                    <InlineCode>CONGESTED → CHEAP → HEATING → STABLE</InlineCode>
                  </li>
                </ul>
                <p>
                  Urd Atlas does not apply a universal fixed multi-day
                  confirmation rule across all regime labels. Persistence is
                  label-specific. <InlineCode>HEATING</InlineCode> depends in part
                  on a trend condition derived from short-vs-medium horizon
                  behaviour, which introduces implicit persistence.{" "}
                  <InlineCode>CONGESTED</InlineCode> and{" "}
                  <InlineCode>CHEAP</InlineCode> are state-triggered
                  classifications and do not require separate trend confirmation
                  or a fixed multi-day confirmation window before publication.
                </p>

                <Callout title="Label stability for downstream consumers">
                  <ul className="list-disc pl-5">
                    <li>
                      <InlineCode>HEATING</InlineCode> requires directional trend
                      confirmation: the short-term moving average must be running
                      ahead of the medium-term average before the label fires.{" "}
                      <InlineCode>HEATING</InlineCode> will therefore not appear
                      on a single-day elevation alone.
                    </li>
                    <li>
                      <InlineCode>CONGESTED</InlineCode> and{" "}
                      <InlineCode>CHEAP</InlineCode> do not require trend
                      confirmation. Either label can fire on a single-day
                      threshold crossing if the relevant axis signals are
                      sufficiently elevated or depressed.
                    </li>
                    <li>
                      Labels can therefore change day to day in response to daily
                      evidence. Consumers who use regime labels as period
                      classifiers for backtesting or segmentation should be aware
                      of this and apply their own minimum-duration filter to the
                      label series if multi-day stability is required for their
                      use case.
                    </li>
                  </ul>
                </Callout>
              </Section>

              <Section title="Derived metric consequences that matter for interpretation">
                <p>
                  Some analytical components are intentionally derived rather
                  than directly copied from a Gold field. This is
                  methodologically valid, but it changes what the published score
                  means.
                </p>
                <ul className="list-disc pl-5">
                  <li>
                    <InlineCode>fee_burden_proxy</InlineCode> inside friction is
                    a ratio of median fee to median transferred value, not a
                    native fee field.
                  </li>
                  <li>
                    For BTC, <InlineCode>blocktime_instability</InlineCode> is
                    the only capacity component. It is an instability proxy around
                    the recent block-time norm, not a directional “slow blocks
                    only” measure.
                  </li>
                </ul>
                <p>
                  A period of consistently fast block times and a period of
                  consistently slow block times can both produce low BTC capacity
                  stress if both are stable relative to the recent norm.
                </p>
              </Section>

              <Section title="Public row identity and traceability">
                <p>
                  Archived Meta rows do not currently publish a separate revision
                  integer. Public row identity is therefore anchored in the fields
                  that are actually present in the archive.
                </p>
                <ul className="list-disc pl-5">
                  <li>
                    All rows: <InlineCode>chain</InlineCode>,{" "}
                    <InlineCode>date</InlineCode>,{" "}
                    <InlineCode>methodology_version</InlineCode>
                  </li>
                  <li>
                    Named regime rows:{" "}
                    <InlineCode>regime.determinism_hash</InlineCode>
                  </li>
                  <li>
                    Gated rows: <InlineCode>updated_through</InlineCode>,{" "}
                    <InlineCode>confidence.confidence_score</InlineCode>,{" "}
                    <InlineCode>status.label</InlineCode>
                  </li>
                </ul>
              </Section>

              <Section title="What this page intentionally does not disclose">
                <ul className="list-disc pl-5">
                  <li>
                    Exact upstream AWS schemas, join logic, or source repair
                    rules
                  </li>
                  <li>
                    Intermediate feature tables and internal parquet structures
                  </li>
                  <li>
                    Full proprietary calibration constants required to clone the
                    classifier end to end
                  </li>
                  <li>
                    Enough implementation detail to reconstruct raw source rows
                    from published aggregates
                  </li>
                </ul>
                <p>
                  The public methodology is designed to make the product auditable
                  in meaning, not reconstructable in implementation.
                </p>
              </Section>

              <Section title="Read next">
                <p>
                  For field-by-field definitions, continue to{" "}
                  <Link href="/methodology/fields" className="underline">
                    Field Dictionary
                  </Link>
                  . For concrete worked examples, continue to{" "}
                  <Link href="/methodology/verification" className="underline">
                    Verification &amp; Evidence Pack
                  </Link>
                  .
                </p>
              </Section>
            </div>
          }
        />
      </UrdContainer>
    </UrdPage>
  );
}