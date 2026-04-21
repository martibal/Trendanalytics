import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Public sample pack — Urd Atlas" };

const SAMPLE_FILES = [
  { label: "ETH Gold — 2026-03-31", href: "/sample-pack/ethereum/2026-03-31/gold.json" },
  { label: "ETH Derived — 2026-03-31", href: "/sample-pack/ethereum/2026-03-31/derived.json" },
  { label: "ETH Meta — 2026-03-31", href: "/sample-pack/ethereum/2026-03-31/meta.json" },
  { label: "ETH Meta — UNKNOWN/DEGRADED example", href: "/sample-pack/ethereum/2025-04-21/meta.json" },
  { label: "ARB Gold — 2026-03-25", href: "/sample-pack/arbitrum/2026-03-25/gold.json" },
  { label: "ARB Derived — 2026-03-25", href: "/sample-pack/arbitrum/2026-03-25/derived.json" },
  { label: "ARB Meta — 2026-03-25", href: "/sample-pack/arbitrum/2026-03-25/meta.json" },
];

export default function SamplePackPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 rounded-3xl border p-8 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Pre-purchase validation</div>
        <h1 className="mt-3 text-4xl font-semibold text-white">Public sample pack</h1>
        <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-300">
          These are real published sample artifacts intended for pre-purchase diligence. They let a technical buyer inspect the actual JSON shape, confidence states, provenance fields, and representative differences between BTC/ETH-style cadence and ARB/BASE-style cadence before subscribing.
        </p>
      </header>
      <div className="grid gap-6">
        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white">What is included</h2>
          <ul className="mt-4 list-disc pl-5 text-sm leading-7 text-muted-foreground">
            <li>One representative Gold, Derived, and Meta bundle for Ethereum.</li>
            <li>One representative Gold, Derived, and Meta bundle for Arbitrum.</li>
            <li>One real <code className="rounded bg-muted px-1 py-0.5">UNKNOWN/DEGRADED</code> Meta row.</li>
            <li>Examples showing <code className="rounded bg-muted px-1 py-0.5">methodology_version</code>, <code className="rounded bg-muted px-1 py-0.5">updated_through</code>, and <code className="rounded bg-muted px-1 py-0.5">regime.determinism_hash</code>.</li>
          </ul>
        </section>
        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white">Download files</h2>
          <div className="mt-4 text-sm leading-7 text-muted-foreground">You can download individual files below or grab the entire <a href="/sample-pack/urd-atlas-public-sample-pack.zip" className="underline">sample pack zip</a>.</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {SAMPLE_FILES.map((file) => (
              <a key={file.href} href={file.href} className="rounded-xl border bg-white/[0.02] px-4 py-3 text-sm text-slate-200 transition hover:bg-white/[0.05] hover:text-white">
                {file.label}
              </a>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white">Read next</h2>
          <ul className="mt-4 list-disc pl-5 text-sm leading-7 text-muted-foreground">
            <li><Link href="/methodology/verification" className="underline">Verification & Evidence Pack</Link></li>
            <li><Link href="/methodology/provenance" className="underline">Provenance & Revisions</Link></li>
            <li><Link href="/api-docs/workflows" className="underline">Common research workflows</Link></li>
          </ul>
        </section>
      </div>
    </main>
  );
}
