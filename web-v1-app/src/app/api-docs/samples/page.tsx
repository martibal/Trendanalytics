import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Public sample pack — Urd Atlas" };
export const revalidate = 0;

const FULL_SAMPLE_PACK_HREF = "/sample-pack/urd-atlas-public-sample-pack.zip";

export default function SamplePackPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]"><div className="page-shell"><div className="eyebrow mb-4">Pre-purchase validation</div><h1 className="ua-h1">Public sample and parser fixtures</h1><p className="lead mt-4 max-w-3xl">Use the live published JSON on the landing page for the current production contract; use the downloadable fixture pack to test parsers against named-state and UNKNOWN/DEGRADED examples.</p></div></header>
      <div className="page-shell py-12 max-w-5xl space-y-10">
        <section className="border-t border-[var(--line)] pt-7"><div className="eyebrow mb-3">Current production sample</div><h2 className="ua-h2">The live four-layer sample is the canonical current example.</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ink2)]">The landing page loads complete current Gold, Derived, Meta and Briefs objects from the published dataset and labels them as actual published layers, not synthetic previews. Use this surface when you need the current schema/methodology rather than a frozen historical fixture.</p><Link href="/#ua6-data" className="btn-ghost mt-5 inline-flex">Open current Gold / Derived / Meta / Briefs →</Link></section>
        <section className="border-t border-[var(--line)] pt-7"><div className="eyebrow mb-3">Downloadable fixture pack</div><h2 className="ua-h2">Historical parser and evidence-state examples</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ink2)]">The ZIP remains a frozen diligence fixture so integrations can keep reproducible high-evidence and low-evidence examples. Because methodology evolves, a frozen fixture is not presented as the active methodology contract. Each artifact carries its own date/methodology fields; compare them with the current live sample above.</p><a href={FULL_SAMPLE_PACK_HREF} download className="btn-ghost mt-5 inline-flex">Download historical fixture ZIP →</a></section>
        <section className="border-t border-[var(--line)] pt-7"><h2 className="ua-h3">What to verify</h2><ul className="mt-4 list-disc pl-5 space-y-2 text-sm leading-7 text-[var(--ink2)]"><li>Current field structure and schema version: live landing JSON.</li><li>Named-state/high-evidence behavior: frozen fixture plus live Meta.</li><li><code>UNKNOWN/DEGRADED</code> and below-gate behavior: frozen fixture.</li><li>Current Evidence score formula: <Link href="/methodology/evidence-score" className="text-link">Evidence score methodology</Link>.</li><li>Breaking-change contract: <Link href="/api-docs/versioning" className="text-link">Versioning</Link>.</li></ul></section>
        <section className="border-t border-[var(--line)] pt-7"><p className="text-sm leading-7 text-[var(--ink2)]">For a complete no-payment walkthrough, use the <Link href="/demo" className="text-link">public demo</Link> or <Link href="/analyst-kit" className="text-link">Analyst Kit</Link>.</p></section>
      </div>
    </main>
  );
}
