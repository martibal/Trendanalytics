import ShortFullContent from "@/components/site/ShortFullContent";
import { Callout, InlineCode, MethodologyContent, MethodologyHeader, MethodologyNav, MethodologyPageShell, Section, SimpleTable, WarningCallout } from "../_components";

function CodeBlock({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-2xl border border-[#9db8d4] bg-[#0d2447] p-5 text-xs leading-6 text-[#eef6ff]"><code>{children}</code></pre>;
}

export default async function MethodologyVerificationPage() {
  return (
    <MethodologyPageShell>
      <MethodologyHeader
        title="Verification & Evidence Pack v2"
        description="Worked examples showing what a careful reader can recompute from published artifacts, what should instead be checked against public chain evidence, and how to interpret edge cases that look inconsistent until the methodology is understood."
      />
      <MethodologyContent>
        <MethodologyNav />
      <ShortFullContent
        pageKey="methodology-verification"
        summary={<>This page tells you how much of the published output you can verify yourself in practice.</>}
        bullets={[
          <>Class A items are directly reproducible from public artifacts.</>,
          <>Class B items are independently checkable against public chain evidence, but not reconstructable from Urd Atlas files alone.</>,
          <>Class C items remain intentionally black box because they would expose private implementation or source-data reconstruction paths.</>,
          <>One end-to-end diligence path should be enough to test Gold → Derived → Meta behavior before buying.</>,
        ]}
        whyItMatters={<>Verification is the fastest route from skepticism to trust for a technical evaluator.</>}
        fullContent={
          <div className="grid gap-6">
        <Section title="Verification classes used here">
          <SimpleTable
            headers={["Class", "Meaning", "Typical examples"]}
            rows={[
              ["A", <>Directly reproducible from published artifacts.</>, <><InlineCode>regime.determinism_hash</InlineCode>, driver-to-Gold consistency, confidence gate threshold, published label identity</>],
              ["B", <>Independently checkable against public chain evidence.</>, <><InlineCode>tx_count_daily</InlineCode>, <InlineCode>block_count_daily</InlineCode>, fee direction, block-time behaviour</>],
              ["C", <>Publicly interpretable but not fully reconstructable from the trust layer alone.</>, <>Private calibration internals and full proprietary classifier implementation detail</>],
            ]}
          />
        </Section>

        <Section title="One complete diligence path — sample pack to expected output">
          <p>Use one coherent artifact set from the public sample pack, not six disconnected mini-checks. The path below is the intended end-to-end diligence flow for a technical buyer.</p>
          <SimpleTable
            headers={["Step", "File or action", "Expected outcome", "Verification class"]}
            rows={[
              ["1", <InlineCode key="g">sample-pack/ethereum/2026-03-31/gold.json</InlineCode>, <>Gold row loads with <InlineCode>chain = ethereum</InlineCode> and <InlineCode>date = 2026-03-31</InlineCode>.</>, "A / B"],
              ["2", <InlineCode key="d">sample-pack/ethereum/2026-03-31/derived.json</InlineCode>, <>Derived row loads for the same <InlineCode>chain</InlineCode> and <InlineCode>date</InlineCode>, exposing smoothed fields such as <InlineCode>__ma7</InlineCode> and <InlineCode>__ma30</InlineCode>.</>, "A"],
              ["3", <InlineCode key="m">sample-pack/ethereum/2026-03-31/meta.json</InlineCode>, <>Meta row resolves to named state <InlineCode>CONGESTED</InlineCode> with public gate threshold <InlineCode>0.40</InlineCode>.</>, "A"],
              ["4", <>Recompute the named-row integrity anchor</>, <>Canonical hash recomputes to <InlineCode>81b295000696</InlineCode>.</>, "A"],
              ["5", <>Independently inspect Gold-level facts</>, <>Gold-level counts and fee behaviour should be independently checkable against public Ethereum evidence for the same date.</>, "B"],
              ["6", <>Interpret remaining classifier internals carefully</>, <>The full regime classifier remains deliberately non-public even though the published outcome is auditable.</>, "C"],
            ]}
          />
        </Section>

        <Section title="Download these files → run this code → expect these results">
          <Callout title="Files to download first">
            Put these three files in one local folder: <InlineCode>gold.json</InlineCode>, <InlineCode>derived.json</InlineCode>, and <InlineCode>meta.json</InlineCode> from the Ethereum 2026-03-31 sample-pack row set.
          </Callout>
          <CodeBlock>{`import hashlib
import json
from pathlib import Path

base = Path("sample-pack/ethereum/2026-03-31")

gold = json.loads((base / "gold.json").read_text(encoding="utf-8"))
derived = json.loads((base / "derived.json").read_text(encoding="utf-8"))
meta = json.loads((base / "meta.json").read_text(encoding="utf-8"))

# 1) Basic artifact identity
assert gold["chain"] == "ethereum"
assert gold["date"] == "2026-03-31"
assert derived["chain"] == "ethereum"
assert derived["date"] == "2026-03-31"
assert meta["chain"] == "ethereum"
assert meta["date"] == "2026-03-31"

# 2) Gold -> Meta current-value consistency for named drivers
for driver in meta["regime"]["drivers"]:
    metric = driver["metric"]
    if metric in gold and "current" in driver:
        assert driver["current"] == gold[metric], (metric, driver["current"], gold[metric])

# 3) Derived row is present for the same observation date
required_derived_fields = [
    "tx_count_daily__ma7",
    "tx_count_daily__ma30",
    "median_tx_fee_native__ma7",
    "median_tx_fee_native__ma30",
]
for field in required_derived_fields:
    assert field in derived, field

# 4) Public confidence gate and named output
assert meta["status"]["label"] == "CONGESTED"
assert meta["regime"]["label"] == "CONGESTED"
assert meta["publish_confidence"]["threshold"] == 0.40
assert meta["regime"]["ruleset_id"] == "eth_l1_v1"

# 5) Recompute determinism_hash from the public named-row payload
payload = {
    "asof_date": meta["regime"]["asof_date"],
    "chain": meta["chain"],
    "drivers": meta["regime"]["drivers"],
    "label": meta["regime"]["label"],
    "ruleset_id": meta["regime"]["ruleset_id"],
}
canonical = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
sha = hashlib.sha256(canonical).hexdigest()[:12]
assert sha == meta["regime"]["determinism_hash"]
assert sha == "81b295000696"

print({
    "chain": meta["chain"],
    "date": meta["date"],
    "label": meta["status"]["label"],
    "gate_threshold": meta["publish_confidence"]["threshold"],
    "determinism_hash": sha,
})`}</CodeBlock>
          <SimpleTable
            headers={["Expected printed result", "Value"]}
            rows={[
              [<InlineCode key="c">chain</InlineCode>, "ethereum"],
              [<InlineCode key="d">date</InlineCode>, "2026-03-31"],
              [<InlineCode key="l">label</InlineCode>, "CONGESTED"],
              [<InlineCode key="g">gate_threshold</InlineCode>, "0.40"],
              [<InlineCode key="h">determinism_hash</InlineCode>, "81b295000696"],
            ]}
          />
        </Section>

        <Section title="Expected intermediate values and checks inside that same path">
          <SimpleTable
            headers={["Layer", "Field or check", "Expected result", "Why it matters"]}
            rows={[
              ["Gold", <InlineCode key="g1">chain</InlineCode>, "ethereum", "Confirms the artifact belongs to the intended chain."],
              ["Gold", <InlineCode key="g2">date</InlineCode>, "2026-03-31", "Confirms all three files are aligned on the same observation date."],
              ["Derived", <><InlineCode key="d1">tx_count_daily__ma7</InlineCode> and <InlineCode key="d2">tx_count_daily__ma30</InlineCode> exist</>, "Present in the same-date Derived row", "Shows that smoothed trend context exists for the same observation row."],
              ["Meta", <InlineCode key="m1">publish_confidence.threshold</InlineCode>, "0.40", "Public gate threshold for whether a named label may be published."],
              ["Meta", <InlineCode key="m2">regime.ruleset_id</InlineCode>, "eth_l1_v1", "Pins the named output to a specific public ruleset identifier."],
              ["Meta", <InlineCode key="m3">status.label</InlineCode>, "CONGESTED", "Named public output for the worked example."],
              ["Meta", <InlineCode key="m4">regime.determinism_hash</InlineCode>, "81b295000696", "Integrity anchor proving the named-row payload identity."],
            ]}
          />
        </Section>

        <Section title="What is directly reproducible vs independently checkable vs still black box?">
          <SimpleTable
            headers={["Category", "Items in this worked path"]}
            rows={[
              ["Directly reproducible from the downloaded files", <>File identity, same-date alignment, presence of Derived fields, public confidence gate threshold, named label, ruleset id, and <InlineCode>regime.determinism_hash</InlineCode>.</>],
              ["Independently checkable but not fully produced by this script", <>Whether the Gold-level daily counts, fee behaviour, and block conditions for 2026-03-31 match public Ethereum evidence.</>],
              ["Deliberately left black box", <>The full classifier internals that transform the entire evidence surface into the named regime, including non-public calibration detail and proprietary decision plumbing.</>],
            ]}
          />
          <WarningCallout title="Important diligence boundary">This page is designed to show that the published output is auditable without pretending the entire production classifier is open-sourced. Reproducibility of the public trust layer and full disclosure of every proprietary internal are not the same thing.</WarningCallout>
        </Section>

        <Section title="Additional spot checks still worth keeping">
          <ul className="list-disc pl-5">
            <li>Use the <InlineCode>UNKNOWN/DEGRADED</InlineCode> sample row at <InlineCode>sample-pack/ethereum/2025-04-21/meta.json</InlineCode> to confirm that sub-threshold rows do not publish a normal-confidence named state.</li>
            <li>Inspect at least one ARB or BASE sample row to confirm that slower cadence and lag semantics are chain-specific, not pipeline failure.</li>
            <li>Compare one Gold metric against a public explorer or independently gathered chain data for the same date.</li>
          </ul>
        </Section>
          </div>
        }
      />
      </MethodologyContent>
    </MethodologyPageShell>
  );
}
