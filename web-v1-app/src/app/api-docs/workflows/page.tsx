import Link from "next/link";

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-2xl border bg-black/30 p-5 text-xs leading-6 text-slate-200"><code>{children}</code></pre>;
}

export default function WorkflowsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 rounded-3xl border p-8 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Developer onboarding</div>
        <h1 className="mt-3 text-4xl font-semibold text-white">Common research workflows</h1>
        <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-300">
          One concrete path from sample artifacts to useful analysis. Use this page together with the sample pack and schema reference to get to a first useful notebook quickly.
        </p>
      </header>
      <div className="grid gap-6">
        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white">Workflow 1 — regime-conditioned panel</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">Load Meta for all chains, extract <code className="rounded bg-muted px-1 py-0.5">status.label</code>, <code className="rounded bg-muted px-1 py-0.5">confidence.confidence_score</code>, and top drivers, and build a chain-state panel.</p>
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
        </section>
        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white">Workflow 2 — verify a determinism hash</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">Use the example on <Link href="/methodology/verification" className="underline">Verification & Evidence Pack</Link> to prove that the named regime payload is internally consistent.</p>
        </section>
        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white">Workflow 3 — parse confidence-aware state changes</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">Treat <code className="rounded bg-muted px-1 py-0.5">UNKNOWN/DEGRADED</code> as a first-class state, not as a missing row, and keep freshness and confidence separate from label interpretation.</p>
        </section>
        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white">Downloads</h2>
          <ul className="mt-4 list-disc pl-5 text-sm leading-7 text-muted-foreground">
            <li><a href="/examples/urd-atlas-pro-workflow.ipynb" className="underline">Python quickstart notebook</a></li>
            <li><Link href="/api-docs/samples" className="underline">Public sample pack</Link></li>
          </ul>
        </section>
      </div>
    </main>
  );
}
