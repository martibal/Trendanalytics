import { Callout, InlineCode, MethodologyHeader, MethodologyNav, Section, SimpleTable, WarningCallout } from "../_components";

function CodeBlock({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-2xl border bg-black/30 p-5 text-xs leading-6 text-slate-200"><code>{children}</code></pre>;
}

export default async function MethodologyVerificationPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Verification & Evidence Pack v2"
        description="Worked examples showing what a careful reader can recompute from published artifacts, what should instead be checked against public chain evidence, and how to interpret edge cases that look inconsistent until the methodology is understood."
      />
      <MethodologyNav />
      <div className="grid gap-6">
        <Section title="Verification classes used here">
          <SimpleTable
            headers={["Class", "Meaning", "Typical examples"]}
            rows={[
              ["A", <>Directly reproducible from published artifacts.</>, <><InlineCode>__ma7</InlineCode>, confidence-degraded display score, determinism hash</>],
              ["B", <>Independently checkable against public chain evidence.</>, <><InlineCode>tx_count_daily</InlineCode>, <InlineCode>block_count_daily</InlineCode>, fee direction, block-time behaviour</>],
              ["C", <>Publicly interpretable but not fully reconstructable from the trust layer alone.</>, <>Private calibration internals and full proprietary classifier implementation detail</>],
            ]}
          />
        </Section>

        <Section title="Worked example A — Gold → Derived MA7">
          <p>Take one Gold metric for a chain and collect the latest seven daily values up to date <InlineCode>t</InlineCode>. The published <InlineCode>{`<metric>__ma7`}</InlineCode> in Derived must equal the arithmetic mean of those seven Gold values, subject only to normal floating-point rounding.</p>
          <CodeBlock>{`# pseudocode
ma7_t = (x[t-6] + x[t-5] + x[t-4] + x[t-3] + x[t-2] + x[t-1] + x[t]) / 7`}</CodeBlock>
          <Callout title="What is directly reproducible here">Gold provides the raw daily values. Derived provides the moving average. No hidden pipeline state is required for this check.</Callout>
        </Section>

        <Section title="Worked example B — confidence decomposition">
          <p>The public confidence score is the geometric mean of data quality and label clarity.</p>
          <CodeBlock>{`confidence_score = sqrt(data_quality_score * label_clarity_score)`}</CodeBlock>
          <p>This is a public formula. The private details are inside how each subcomponent is calibrated, but the top-line relationship is fixed and visible.</p>
        </Section>

        <Section title="Worked example C — score degradation from raw score">
          <p>The scorecard display score is confidence-degraded from the raw axis score using the public formula below.</p>
          <CodeBlock>{`displayed_score = 50 + (score_raw - 50) * effective_confidence`}</CodeBlock>
          <p>If <InlineCode>score_raw</InlineCode> and <InlineCode>effective_confidence</InlineCode> are published, the displayed score is a Class A check.</p>
        </Section>

        <Section title="Worked example D — verifying regime.determinism_hash">
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
          <p>Construct canonical JSON with sorted keys using <InlineCode>chain</InlineCode>, <InlineCode>regime.ruleset_id</InlineCode>, <InlineCode>regime.label</InlineCode>, <InlineCode>regime.asof_date</InlineCode>, and the published <InlineCode>regime.drivers</InlineCode> payload. UTF-8 encode, compute SHA-256, and take the first 12 hexadecimal characters.</p>
          <CodeBlock>{`import hashlib, json
payload = {
  "asof_date": "2026-03-31",
  "chain": "ethereum",
  "drivers": [...],
  "label": "CONGESTED",
  "ruleset_id": "eth_l1_v1",
}
canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
sha = hashlib.sha256(canonical).hexdigest()[:12]
print(sha)  # expected: f8301b3b40c5`}</CodeBlock>
        </Section>

        <Section title="Worked example E — confidence gate / UNKNOWN-DEGRADED">
          <SimpleTable
            headers={["Field", "Value"]}
            rows={[
              [<InlineCode key="c">chain</InlineCode>, "ethereum"],
              [<InlineCode key="d">date</InlineCode>, "2025-04-21"],
              [<InlineCode key="l">status.label</InlineCode>, "UNKNOWN/DEGRADED"],
              [<InlineCode key="s">confidence.confidence_score</InlineCode>, "0.2957071740148524"],
              [<InlineCode key="t">public gate threshold</InlineCode>, "0.40"],
            ]}
          />
          <p>Because the published confidence score is below the public gate threshold of <InlineCode>0.40</InlineCode>, the row does not publish a normal-confidence named regime state.</p>
        </Section>

        <Section title="Worked example F — why two z-like numbers may not match">
          <p><InlineCode>regime.drivers[].z_robust</InlineCode> is computed from 180-day raw daily values using <InlineCode>0.6745 × (x − median) / MAD</InlineCode>. Scorecard dimensions use 7-day rolling averages against a 365-day baseline using <InlineCode>(x − median) / (1.4826 × MAD)</InlineCode>.</p>
          <p>A high driver z-score therefore does not guarantee a high scorecard axis score for the same metric on the same day, and vice versa.</p>
          <WarningCallout title="Interpretation rule">These two numbers answer different questions. Regime drivers rank unusual raw-day signals for explanatory purposes. Scorecard axes measure chain-relative elevated or subdued state after smoothing and confidence degradation.</WarningCallout>
        </Section>

        <Section title="Edge cases that belong in the diligence path">
          <ul className="list-disc pl-5">
            <li>Missing fields published as <InlineCode>null</InlineCode> rather than imputed.</li>
            <li>Low-confidence rows published as <InlineCode>UNKNOWN/DEGRADED</InlineCode>.</li>
            <li>Label flips day-to-day, especially for <InlineCode>CONGESTED</InlineCode> and <InlineCode>CHEAP</InlineCode>.</li>
            <li>Chain-specific hidden metrics and different freshness semantics for ARB / BASE.</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
