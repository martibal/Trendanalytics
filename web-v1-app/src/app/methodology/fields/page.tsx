import {
  Callout,
  InlineCode,
  MethodologyHeader,
  MethodologyNav,
  Section,
  SimpleTable,
  WarningCallout,
} from "../_components";

export default function MethodologyFieldsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Field Dictionary"
        description="This page defines the public meaning of the main published fields and the interpretation warnings that matter most for technical users."
      />

      <MethodologyNav />

      <div className="grid gap-6">
        <Section title="How to use this page">
          <p>
            Use this page when you already know the field name and need the public meaning, unit
            semantics, verification class, and interpretation boundaries. For deeper system-level
            logic, use the Public Methodology Reference page.
          </p>
        </Section>

        <Section title="Key Gold fields">
          <SimpleTable
            headers={["Field", "Meaning", "Notes"]}
            rows={[
              [
                <InlineCode key="tx">tx_count_daily</InlineCode>,
                <>Confirmed daily transaction count.</>,
                <>Direct daily chain activity count.</>,
              ],
              [
                <InlineCode key="fee">median_tx_fee_native</InlineCode>,
                <>Typical same-day transaction fee in native denomination.</>,
                <>Published as a median, not an arithmetic average.</>,
              ],
              [
                <InlineCode key="val">median_tx_value_native</InlineCode>,
                <>Typical same-day transaction value in native denomination.</>,
                <>Used in the friction proxy ratio.</>,
              ],
              [
                <InlineCode key="bt">avg_block_time_sec</InlineCode>,
                <>Typical daily inter-block interval behaviour.</>,
                <>
                  Interpret as a robust typical block interval field, not as a strict arithmetic mean
                  claim.
                </>,
              ],
            ]}
          />
        </Section>

        <Section title="Key Meta fields">
          <SimpleTable
            headers={["Field", "Meaning", "Notes"]}
            rows={[
              [
                <InlineCode key="conf">confidence.confidence_score</InlineCode>,
                <>Top-line confidence of the published analytical state.</>,
                <>Gate threshold is 0.40.</>,
              ],
              [
                <InlineCode key="label">regime.label</InlineCode>,
                <>Published descriptive state.</>,
                <>May change day to day when threshold conditions change.</>,
              ],
              [
                <InlineCode key="hash">regime.determinism_hash</InlineCode>,
                <>Canonical public integrity anchor for named regime rows.</>,
                <>Used for public row traceability.</>,
              ],
            ]}
          />
        </Section>

        <Section title="Field note: scorecard.dimensions.&lt;axis&gt;.score">
          <p>
            <InlineCode>scorecard.dimensions.&lt;axis&gt;.score</InlineCode> is the published
            confidence-degraded display score for an axis.
          </p>
          <SimpleTable
            headers={["Field", "Verification class", "Why"]}
            rows={[
              [
                <InlineCode key="score">scorecard.dimensions.&lt;axis&gt;.score</InlineCode>,
                <>A</>,
                <>
                  The published score can be recomputed directly from the two published inputs{" "}
                  <InlineCode>score_raw</InlineCode> and <InlineCode>effective_confidence</InlineCode>{" "}
                  using <InlineCode>{`50 + (raw - 50) × effective_confidence`}</InlineCode>.
                </>,
              ],
              [
                <InlineCode key="raw">scorecard.dimensions.&lt;axis&gt;.score_raw</InlineCode>,
                <>C</>,
                <>
                  The internal historical normalization and calibration that produce the raw score are
                  publicly described in family terms, but not fully disclosed at full implementation
                  detail.
                </>,
              ],
            ]}
          />
          <Callout title="Interpretation boundary">
            <p>
              Customers can fully verify the published display score from published row inputs. That
              does not mean the entire raw-score construction is fully reconstructable from public
              documentation alone.
            </p>
          </Callout>
        </Section>

        <Section title="Field note: regime.drivers[].z_robust">
          <p>
            <InlineCode>regime.drivers[].z_robust</InlineCode> is the driver-layer z-score published
            for a regime driver row. It is computed from 180-day raw daily values, not from the
            7-day smoothed scorecard series.
          </p>
          <WarningCallout title="Important comparison warning">
            <p>
              Do not expect <InlineCode>regime.drivers[].z_robust</InlineCode> to numerically match
              a scorecard dimension score or the internal z-family behind that score. The driver
              z-score and the scorecard normalization use different input series, different windows,
              and different purposes. A high published driver z-score does not guarantee a high
              scorecard dimension score for the same metric on the same day, and the reverse is also
              true.
            </p>
          </WarningCallout>
        </Section>

        <Section title="Field note: scorecard.dimensions.friction.components.fee_burden_proxy.current">
          <p>
            This field is not a native fee amount. It is the current value of an internal friction
            proxy defined as:
          </p>
          <p>
            <InlineCode>median_tx_fee_native / median_tx_value_native</InlineCode>
          </p>
          <p>
            Its unit is therefore a dimensionless ratio, not a native-denominated fee. It measures
            fee burden relative to transaction value, not fee size in isolation.
          </p>
          <Callout title="Why this matters">
            <p>
              A friction score can be elevated even when absolute fees are not unusually high in
              native terms, because the friction component is based on fee burden relative to
              transferred value. Customers should therefore read this field as a burden proxy rather
              than as a direct fee amount.
            </p>
          </Callout>
        </Section>

        <Section title="Field note: scorecard.dimensions.capacity.components.blocktime_instability.current">
          <p>
            For BTC capacity interpretation, the capacity axis does not score raw block time
            directionally and does not combine with gas utilization. For BTC,{" "}
            <InlineCode>blocktime_instability</InlineCode> is the only capacity component.
          </p>
          <p>
            Public interpretation:
          </p>
          <p>
            <InlineCode>{`|block_time - median30(block_time)| / median30(block_time)`}</InlineCode>,
            then smoothed before scoring.
          </p>
          <WarningCallout title="Directional consequence">
            <p>
              This means the BTC capacity score is not a direct measure of “slow blocks only”. It is
              a measure of unusual block-time behaviour around the recent norm in either direction. A
              period of unusually fast but stable block times and a period of unusually slow but
              stable block times can both produce low instability. Customers should therefore read
              BTC capacity as a stress-or-instability proxy, not as a directional slow-block
              indicator.
            </p>
          </WarningCallout>
        </Section>

        <Section title="Field note: regime label stability">
          <p>
            <InlineCode>regime.label</InlineCode> is a daily descriptive state, not a built-in
            multi-day stable segmentation layer.
          </p>
          <WarningCallout title="Downstream use warning">
            <p>
              Labels can change day to day in response to threshold crossings. This matters most for{" "}
              <InlineCode>CONGESTED</InlineCode> and <InlineCode>CHEAP</InlineCode>, which do not
              have a separate universal multi-day confirmation window.{" "}
              <InlineCode>HEATING</InlineCode> depends in part on a trend condition and therefore has
              a different stability profile. Customers who need multi-day regime stability for
              downstream analytics should apply their own minimum-duration or smoothing rule.
            </p>
          </WarningCallout>
        </Section>
      </div>
    </main>
  );
}
