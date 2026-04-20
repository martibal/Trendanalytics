import { Callout, InlineCode, MethodologyHeader, MethodologyNav, Section, SimpleTable } from "../_components";

export default async function MethodologyVerificationPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Verification & Evidence Pack"
        description="Worked examples and verification rules showing what a careful reader can test directly from published artifacts and what should instead be checked against public chain evidence."
      />

      <MethodologyNav />

      <div className="grid gap-6">
        <Section title="What can be recomputed from published artifacts">
          <ul className="list-disc pl-5">
            <li>Derived moving averages such as <InlineCode>__ma7</InlineCode> and <InlineCode>__ma30</InlineCode></li>
            <li>Consistency of copied fields between Meta and Derived</li>
            <li>Named-row public identity via <InlineCode>chain</InlineCode>, <InlineCode>date</InlineCode>, <InlineCode>methodology_version</InlineCode>, and <InlineCode>regime.determinism_hash</InlineCode></li>
            <li>Gated-row identity via freshness and confidence fields</li>
          </ul>
        </Section>

        <Section title="What should be checked against public chain evidence">
          <ul className="list-disc pl-5">
            <li>Daily transaction count and block count</li>
            <li>Same-day fee and transfer-value direction</li>
            <li>Participation breadth and typical block-interval behavior</li>
            <li>Freshness relative to expected publication cadence</li>
          </ul>
          <p>
            These checks validate the meaning of the published aggregates without exposing upstream raw source rows.
          </p>
        </Section>

        <Section title="Worked example A — verifying a 7-day moving average">
          <p>
            Take one Gold metric for a chain and collect the latest seven daily values up to date <InlineCode>t</InlineCode>. The published <InlineCode>{`<metric>__ma7`}</InlineCode> in Derived must equal the arithmetic mean of those seven Gold values, subject only to standard floating-point rounding.
          </p>
          <p>
            This is a direct class-A check because both the input series and the output are published artifacts.
          </p>
        </Section>

        <Section title="Worked example B — verifying regime.determinism_hash">
          <p>
            Example taken from a published Meta row in the archive:
          </p>
          <SimpleTable
            headers={["Field", "Value"]}
            rows={[
              [<InlineCode key="c">chain</InlineCode>, "ethereum"],
              [<InlineCode key="d">date</InlineCode>, "2026-03-31"],
              [<InlineCode key="l">regime.label</InlineCode>, "CONGESTED"],
              [<InlineCode key="r">regime.ruleset_id</InlineCode>, "eth_l1_v1"],
              [<InlineCode key="a">regime.asof_date</InlineCode>, "2026-03-31"],
              [<InlineCode key="m0">regime.drivers[0].metric</InlineCode>, "tx_count_daily"],
              [<InlineCode key="ax0">regime.drivers[0].axis</InlineCode>, "demand"],
              [<InlineCode key="z0">regime.drivers[0].z_robust</InlineCode>, "1.9219370933048456"],
              [<InlineCode key="m1">regime.drivers[1].metric</InlineCode>, "median_tx_fee_native"],
              [<InlineCode key="ax1">regime.drivers[1].axis</InlineCode>, "friction"],
              [<InlineCode key="z1">regime.drivers[1].z_robust</InlineCode>, "1.149225337218306"],
              [<InlineCode key="m2">regime.drivers[2].metric</InlineCode>, "avg_block_time_sec"],
              [<InlineCode key="ax2">regime.drivers[2].axis</InlineCode>, "capacity"],
              [<InlineCode key="z2">regime.drivers[2].z_robust</InlineCode>, "-0.6745"],
              [<InlineCode key="h">regime.determinism_hash</InlineCode>, "f8301b3b40c5"],
            ]}
          />
          <p>
            To verify the hash, construct the canonical payload from the published Meta row using:
          </p>
          <ul className="list-disc pl-5">
            <li><InlineCode>chain</InlineCode></li>
            <li><InlineCode>regime.ruleset_id</InlineCode></li>
            <li><InlineCode>regime.label</InlineCode></li>
            <li><InlineCode>regime.asof_date</InlineCode></li>
            <li><InlineCode>regime.drivers</InlineCode> as published</li>
          </ul>
          <p>
            Serialize that payload as canonical JSON with keys sorted alphabetically and no extra whitespace, encode as UTF-8, compute SHA-256, and take the first 12 hexadecimal characters. The result must equal <InlineCode>f8301b3b40c5</InlineCode>.
          </p>
          <Callout title="What this proves">
            This check proves that the public regime payload is internally consistent and that any material change to the named regime payload must change its public integrity anchor.
          </Callout>
        </Section>

        <Section title="Worked example C — confidence gate / UNKNOWN-DEGRADED">
          <p>
            Example taken from a published Meta row in the archive:
          </p>
          <SimpleTable
            headers={["Field", "Value"]}
            rows={[
              [<InlineCode key="chain">chain</InlineCode>, "ethereum"],
              [<InlineCode key="date">date</InlineCode>, "2025-04-21"],
              [<InlineCode key="label">regime.label</InlineCode>, "UNKNOWN/DEGRADED"],
              [<InlineCode key="score">confidence.confidence_score</InlineCode>, "0.2957071740148524"],
              [<InlineCode key="threshold">confidence gate</InlineCode>, "0.40"],
            ]}
          />
          <p>
            Because the published confidence score is below the current public gate threshold of <InlineCode>0.40</InlineCode>, the row publishes <InlineCode>UNKNOWN/DEGRADED</InlineCode> rather than a normal-confidence named regime label.
          </p>
        </Section>

        <Section title="What is intentionally not reconstructable">
          <ul className="list-disc pl-5">
            <li>Upstream raw AWS source rows</li>
            <li>Intermediate feature tables and fallback ordering</li>
            <li>Full private calibration and driver-priority implementation details</li>
            <li>The end-to-end internal pipeline implementation</li>
          </ul>
          <p>
            The public evidence pack is designed to support trust in published meaning, not reproduction of private implementation.
          </p>
        </Section>
      </div>
    </main>
  );
}
