import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Public sample pack — Urd Atlas" };
export const revalidate = 0;

const FULL_SAMPLE_PACK_HREF = "/sample-pack/urd-atlas-public-sample-pack.zip";

const SAMPLE_FILES = [
  { href: "/sample-pack/ethereum/2026-03-31/gold.json", label: "Ethereum · 2026-03-31 · Gold" },
  { href: "/sample-pack/ethereum/2026-03-31/derived.json", label: "Ethereum · 2026-03-31 · Derived" },
  { href: "/sample-pack/ethereum/2026-03-31/meta.json", label: "Ethereum · 2026-03-31 · Meta" },
  { href: "/sample-pack/ethereum/2025-04-21/meta.json", label: "Ethereum · 2025-04-21 · Meta (degraded fixture)" },
  { href: "/sample-pack/arbitrum/2026-03-25/gold.json", label: "Arbitrum · 2026-03-25 · Gold" },
  { href: "/sample-pack/arbitrum/2026-03-25/derived.json", label: "Arbitrum · 2026-03-25 · Derived" },
  { href: "/sample-pack/arbitrum/2026-03-25/meta.json", label: "Arbitrum · 2026-03-25 · Meta" },
] as const;

export default function SamplePackPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]">
        <div className="page-shell">
          <div className="eyebrow mb-4">Pre-purchase validation</div>
          <h1 className="ua-h1">Public sample and parser fixtures</h1>
          <p className="lead mt-4 max-w-3xl">
            Use the live published JSON on the landing page for the current production contract; use the downloadable fixture pack to test parsers against named-state and UNKNOWN/DEGRADED examples.
          </p>
        </div>
      </header>

      <div className="page-shell py-12 max-w-5xl space-y-10">
        <section className="border-t border-[var(--line)] pt-7">
          <div className="eyebrow mb-3">Current production sample</div>
          <h2 className="ua-h2">The live four-layer sample is the canonical current example.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ink2)]">
            The landing page loads complete current Gold, Derived, Meta and Briefs objects from the published dataset and labels them as actual published layers, not synthetic previews. Use this surface when you need the current schema/methodology rather than a frozen historical fixture.
          </p>
          <Link href="/#ua6-data" className="btn-ghost mt-5 inline-flex">Open current Gold / Derived / Meta / Briefs →</Link>
        </section>

        <section className="border-t border-[var(--line)] pt-7">
          <div className="eyebrow mb-3">Downloadable fixture pack</div>
          <h2 className="ua-h2">Historical parser and evidence-state examples</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ink2)]">
            The ZIP remains a frozen diligence fixture so integrations can keep reproducible high-evidence and low-evidence examples. Because methodology evolves, a frozen fixture is not presented as the active methodology contract. Each artifact carries its own date/methodology fields; compare them with the current live sample above.
          </p>
          <a href={FULL_SAMPLE_PACK_HREF} download className="btn-ghost mt-5 inline-flex">Download historical fixture ZIP →</a>

          <details className="mt-6 border-t border-[var(--line)] pt-5">
            <summary className="cursor-pointer text-sm font-semibold">Inspect individual JSON fixtures</summary>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink2)]">
              The ZIP is the primary download. These direct files are retained as a secondary inspection surface and as stable parser fixtures.
            </p>
            <ul className="mt-4 grid gap-2 text-sm">
              {SAMPLE_FILES.map((sample) => (
                <li key={sample.href}>
                  <a href={sample.href} className="text-link">{sample.label} →</a>
                </li>
              ))}
            </ul>
          </details>
        </section>

        <section className="border-t border-[var(--line)] pt-7">
          <h2 className="ua-h3">What to verify</h2>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-sm leading-7 text-[var(--ink2)]">
            <li>Current field structure and schema version: live landing JSON.</li>
            <li>Named-state/high-evidence behavior: frozen fixture plus live Meta.</li>
            <li><code>UNKNOWN/DEGRADED</code> and below-gate behavior: frozen fixture.</li>
            <li>Current Evidence score formula: <Link href="/methodology/evidence-score" className="text-link">Evidence score methodology</Link>.</li>
            <li>Breaking-change contract: <Link href="/api-docs/versioning" className="text-link">Versioning</Link>.</li>
          </ul>
        </section>

        <section className="border-t border-[var(--line)] pt-7">
          <p className="text-sm leading-7 text-[var(--ink2)]">
            For a complete no-payment walkthrough, use the <Link href="/demo" className="text-link">public demo</Link> or <Link href="/analyst-kit" className="text-link">Analyst Kit</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
