import Link from "next/link";
import type { Metadata } from "next";

import PageHero from "@/components/site/PageHero";

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

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-[#cfe0f1] px-1.5 py-0.5 font-mono text-xs font-semibold text-[#0d2447]">
      {children}
    </code>
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
      {children}
    </section>
  );
}

export default function SamplePackPage() {
  return (
    <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      <PageHero
        eyebrow="Pre-purchase validation"
        title="Public sample pack"
        summary="Real published sample artifacts for inspecting the actual JSON shape, confidence states, provenance fields, and cadence differences before subscribing."
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/api-docs"
            className="inline-flex items-center rounded-full border border-blue-200/70 bg-[#d8e9fb] px-3 py-1 text-xs font-extrabold text-[#031329] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:border-white hover:bg-white"
          >
            ← API Docs
          </Link>
          <a
            href="/sample-pack/urd-atlas-public-sample-pack.zip"
            className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-xs font-extrabold text-white/88 transition hover:bg-white/[0.09] hover:text-white"
          >
            Download sample pack zip
          </a>
        </div>
      </PageHero>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6">
          <Section title="What is included">
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm font-medium leading-7 text-[#27476f]">
              <li>One representative Gold, Derived, and Meta bundle for Ethereum.</li>
              <li>One representative Gold, Derived, and Meta bundle for Arbitrum.</li>
              <li>
                One real <InlineCode>UNKNOWN/DEGRADED</InlineCode> Meta row.
              </li>
              <li>
                Examples showing <InlineCode>methodology_version</InlineCode>,{" "}
                <InlineCode>updated_through</InlineCode>, and{" "}
                <InlineCode>regime.determinism_hash</InlineCode>.
              </li>
            </ul>
          </Section>

          <Section title="Download files">
            <div className="mt-4 text-sm font-medium leading-7 text-[#27476f]">
              You can download individual files below or grab the entire{" "}
              <a
                href="/sample-pack/urd-atlas-public-sample-pack.zip"
                className="font-black text-[#0d2447] underline"
              >
                sample pack zip
              </a>
              .
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {SAMPLE_FILES.map((file) => (
                <a
                  key={file.href}
                  href={file.href}
                  className="rounded-xl border border-[#9db8d4] bg-[#dceaf8] px-4 py-3 text-sm font-bold text-[#0d2447] transition hover:border-blue-300 hover:bg-[#cfe0f1]"
                >
                  {file.label}
                </a>
              ))}
            </div>
          </Section>

          <Section title="Read next">
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm font-medium leading-7 text-[#27476f]">
              <li>
                <Link
                  href="/methodology/verification"
                  className="font-black text-[#0d2447] underline"
                >
                  Verification & Evidence Pack
                </Link>
              </li>
              <li>
                <Link
                  href="/methodology/provenance"
                  className="font-black text-[#0d2447] underline"
                >
                  Provenance & Revisions
                </Link>
              </li>
              <li>
                <Link
                  href="/api-docs/workflows"
                  className="font-black text-[#0d2447] underline"
                >
                  Common research workflows
                </Link>
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </main>
  );
}
