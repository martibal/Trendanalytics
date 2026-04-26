import Link from "next/link";
import ShortFullContent from "@/components/site/ShortFullContent";
import PageHero from "@/components/site/PageHero";

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-[#cfe0f1] px-1.5 py-0.5 font-mono text-xs font-semibold text-[#0d2447]">
      {children}
    </code>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-[#0d2a4d]/30 bg-[#031329] p-5 text-xs leading-6 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <code>{children}</code>
    </pre>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#b6cce3] bg-[#e7f1fb] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
      <h2 className="text-xl font-black tracking-[-0.025em] text-[#0d2447]">
        {title}
      </h2>
      <div className="mt-4 text-sm font-medium leading-7 text-[#27476f]">
        {children}
      </div>
    </section>
  );
}

export default function WorkflowsPage() {
  return (
    <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      <PageHero
        eyebrow="Developer onboarding"
        title="Common research workflows"
        summary="One concrete path from sample artifacts to useful analysis. Use this page together with the sample pack and schema reference to get to a first useful notebook quickly."
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/api-docs"
            className="inline-flex items-center rounded-full border border-blue-200/70 bg-[#d8e9fb] px-3 py-1 text-xs font-extrabold text-[#031329] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:border-white hover:bg-white"
          >
            ← API Docs
          </Link>
          <Link
            href="/api-docs/samples"
            className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-xs font-extrabold text-white/88 transition hover:bg-white/[0.09] hover:text-white"
          >
            Public sample pack
          </Link>
          <Link
            href="/api-docs/schema"
            className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-xs font-extrabold text-white/88 transition hover:bg-white/[0.09] hover:text-white"
          >
            Schema reference
          </Link>
        </div>
      </PageHero>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <ShortFullContent
          pageKey="api-workflows"
          summary={
            <>
              This page helps you check whether Urd Atlas fits your actual workflow before you spend time on deeper docs.
            </>
          }
          bullets={[
            <>
              Use <strong>Meta</strong> when you want current regime, confidence, and driver context.
            </>,
            <>
              Use <strong>Gold</strong> when you want the direct daily observation layer.
            </>,
            <>
              Use <strong>Derived</strong> when you want deterministic rolling context such as MA7 and MA30.
            </>,
            <>
              The three common fits are analyst notebooks, monitoring dashboards, and regime-conditioned research panels.
            </>,
          ]}
          whyItMatters={
            <>
              A buyer should be able to recognize their own workflow quickly, then expand into the exact code paths only if needed.
            </>
          }
          fullContent={
            <div className="grid gap-6">
              <Section title="Workflow 1 — regime-conditioned panel">
                <p>
                  Load Meta for all chains, extract <InlineCode>status.label</InlineCode>,{" "}
                  <InlineCode>confidence.confidence_score</InlineCode>, and top drivers, and build a chain-state panel.
                </p>

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
              </Section>

              <Section title="Workflow 2 — verify a determinism hash">
                <p>
                  Use the example on{" "}
                  <Link
                    href="/methodology/verification"
                    className="font-black text-[#0d2447] underline"
                  >
                    Verification & Evidence Pack
                  </Link>{" "}
                  to prove that the named regime payload is internally consistent.
                </p>
              </Section>

              <Section title="Workflow 3 — parse confidence-aware state changes">
                <p>
                  Treat <InlineCode>UNKNOWN/DEGRADED</InlineCode> as a first-class state,
                  not as a missing row, and keep freshness and confidence separate from label interpretation.
                </p>
              </Section>

              <Section title="Downloads">
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <a
                      href="/examples/urd-atlas-pro-workflow.ipynb"
                      className="font-black text-[#0d2447] underline"
                    >
                      Python quickstart notebook
                    </a>
                  </li>
                  <li>
                    <Link
                      href="/api-docs/samples"
                      className="font-black text-[#0d2447] underline"
                    >
                      Public sample pack
                    </Link>
                  </li>
                </ul>
              </Section>
            </div>
          }
        />
      </div>
    </main>
  );
}
