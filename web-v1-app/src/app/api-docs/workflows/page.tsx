import Link from "next/link";
import ShortFullContent from "@/components/site/ShortFullContent";
import PageHero from "@/components/site/PageHero";
import {
  UrdContainer,
  UrdInlineCode,
  UrdPage,
  UrdSection,
  UrdButtonLink,
} from "@/components/site/UrdDesignSystem";

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-2xl border border-[var(--urd-border)] bg-[#0d2447] p-5 text-xs leading-6 text-[#eef6ff]"><code>{children}</code></pre>;
}

export default function WorkflowsPage() {
  return (
    <UrdPage>
      <PageHero
        eyebrow="Developer onboarding"
        title="Common research workflows"
        highlight="from sample artifacts to analysis"
        summary="One concrete path from sample artifacts to useful analysis. Use this page together with the sample pack and schema reference to get to a first useful notebook quickly."
      >
        <UrdButtonLink href="/api-docs" className="border-white/15 bg-white/8 text-white hover:bg-white/12 hover:text-white">
          ← Back to API Docs
        </UrdButtonLink>
      </PageHero>
      <UrdContainer>
        <ShortFullContent
          pageKey="api-workflows"
          summary={<>This page helps you check whether Urd Atlas fits your actual workflow before you spend time on deeper docs.</>}
          bullets={[
            <>Use <strong>Meta</strong> when you want current regime, confidence, and driver context.</>,
            <>Use <strong>Gold</strong> when you want the direct daily observation layer.</>,
            <>Use <strong>Derived</strong> when you want deterministic rolling context such as MA7 and MA30.</>,
            <>The three common fits are analyst notebooks, monitoring dashboards, and regime-conditioned research panels.</>,
          ]}
          whyItMatters={<>A buyer should be able to recognize their own workflow quickly, then expand into the exact code paths only if needed.</>}
          fullContent={
            <div className="grid gap-6">
              <UrdSection title="Workflow 1 — regime-conditioned panel">
                <p>Load Meta for all chains, extract <UrdInlineCode>status.label</UrdInlineCode>, <UrdInlineCode>confidence.confidence_score</UrdInlineCode>, and top drivers, and build a chain-state panel.</p>
                <div className="mt-4">
                  <Code>{`import json, pathlib
from pprint import pprint

base = pathlib.Path("sample-pack")
rows = []
for rel in [
    "ethereum/2026-03-31/meta.json",
    "arbitrum/2026-03-25/meta.json",
    "ethereum/2025-04-21/meta.json",
]:
    row = json.loads((base / rel).read_text())
    rows.append({
        "chain": row["chain"],
        "date": row["date"],
        "label": row["status"]["label"],
        "confidence": row["confidence"]["confidence_score"],
        "top_driver": row["regime"]["drivers"][0]["metric"] if row["regime"].get("drivers") else None,
    })

pprint(rows)`}</Code>
                </div>
              </UrdSection>
              <UrdSection title="Workflow 2 — verify a determinism hash">
                <p>Use the example on <Link href="/methodology/verification" className="font-semibold text-[var(--urd-text-strong)] underline decoration-[#9db8d4] underline-offset-4 hover:text-blue-800">Verification & Evidence Pack</Link> to prove that the named regime payload is internally consistent.</p>
              </UrdSection>
              <UrdSection title="Workflow 3 — parse confidence-aware state changes">
                <p>Treat <UrdInlineCode>UNKNOWN/DEGRADED</UrdInlineCode> as a first-class state, not as a missing row, and keep freshness and confidence separate from label interpretation.</p>
              </UrdSection>
              <UrdSection title="Downloads">
                <ul className="list-disc pl-5">
                  <li><a href="/examples/urd-atlas-pro-workflow.ipynb" className="font-semibold text-[var(--urd-text-strong)] underline decoration-[#9db8d4] underline-offset-4 hover:text-blue-800">Python quickstart notebook</a></li>
                  <li><Link href="/api-docs/samples" className="font-semibold text-[var(--urd-text-strong)] underline decoration-[#9db8d4] underline-offset-4 hover:text-blue-800">Public sample pack</Link></li>
                </ul>
              </UrdSection>
            </div>
          }
        />
      </UrdContainer>
    </UrdPage>
  );
}
