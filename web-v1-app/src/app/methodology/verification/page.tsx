import { InlineCode, MethodologyHeader, MethodologyNav, Section, Callout } from "../_components";

export default function MethodologyVerificationPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Verification & Evidence Pack"
        description="This page shows what customers can check directly from published artifacts and what can be independently checked against public chain evidence."
      />
      <MethodologyNav />
      <div className="grid gap-6">
        <Section title="Worked example A — deterministic moving average">
          <p>
            Take seven consecutive Gold rows for the same chain and metric. The published
            <InlineCode>{`__ma7`}</InlineCode> value in Derived must equal the simple arithmetic mean
            of those seven Gold values, subject only to ordinary floating-point rounding.
          </p>
        </Section>
        <Section title="Worked example B — determinism hash">
          <p>
            From the published Meta row for Ethereum on 2026-03-31, the canonical named-regime
            payload includes:
          </p>
          <ul className="list-disc pl-5">
            <li><InlineCode>regime.label = CONGESTED</InlineCode></li>
            <li><InlineCode>regime.ruleset_id = eth_l1_v1</InlineCode></li>
            <li><InlineCode>regime.asof_date = 2026-03-31</InlineCode></li>
            <li><InlineCode>regime.drivers[0].metric = tx_count_daily</InlineCode></li>
            <li><InlineCode>regime.drivers[0].axis = demand</InlineCode></li>
            <li><InlineCode>regime.drivers[0].z_robust = 1.9219370933048456</InlineCode></li>
            <li><InlineCode>regime.determinism_hash = f8301b3b40c5</InlineCode></li>
          </ul>
          <p>
            To verify the published hash, build the canonical payload with sorted keys, encode it as
            UTF-8 JSON without extra whitespace, compute SHA-256, and take the first 12 hexadecimal
            characters. The result must match the published <InlineCode>regime.determinism_hash</InlineCode>.
          </p>
        </Section>
        <Section title="Worked example C — confidence gate">
          <p>
            A published Meta row for Ethereum on 2025-04-21 carries:
          </p>
          <ul className="list-disc pl-5">
            <li><InlineCode>regime.label = UNKNOWN/DEGRADED</InlineCode></li>
            <li><InlineCode>confidence.confidence_score = 0.2957071740148524</InlineCode></li>
          </ul>
          <p>
            This is consistent with the current public confidence gate of <InlineCode>0.40</InlineCode>.
            A row below that threshold is published as <InlineCode>UNKNOWN/DEGRADED</InlineCode>
            instead of a normal-confidence named regime label.
          </p>
        </Section>
        <Callout title="Directly reproducible vs independently checkable">
          <p>
            Derived rolling averages and hash-based integrity checks are directly reproducible from
            published artifacts. Gold values are generally independently checkable against public
            chain evidence, but not reconstructable from Urd Atlas files alone.
          </p>
        </Callout>
      </div>
    </main>
  );
}
