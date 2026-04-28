import Link from "next/link";
import type { Metadata } from "next";

import PageHero from "@/components/site/PageHero";
import {
  UrdButtonLink,
  UrdContainer,
  UrdInlineCode,
  UrdPage,
  UrdSection,
} from "@/components/site/UrdDesignSystem";

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
    <UrdPage>
      <PageHero
        eyebrow="Pre-purchase validation"
        title="Public sample pack"
        highlight="real JSON artifacts"
        summary="These are real published sample artifacts intended for pre-purchase diligence. They let a technical buyer inspect the actual JSON shape, confidence states, provenance fields, and representative differences between BTC/ETH-style cadence and ARB/BASE-style cadence before subscribing."
      />
      <UrdContainer>
        <div className="grid gap-6">
          <UrdSection title="What is included">
            <ul className="list-disc pl-5">
              <li>One representative Gold, Derived, and Meta bundle for Ethereum.</li>
              <li>One representative Gold, Derived, and Meta bundle for Arbitrum.</li>
              <li>One real <UrdInlineCode>UNKNOWN/DEGRADED</UrdInlineCode> Meta row.</li>
              <li>Examples showing <UrdInlineCode>methodology_version</UrdInlineCode>, <UrdInlineCode>updated_through</UrdInlineCode>, and <UrdInlineCode>regime.determinism_hash</UrdInlineCode>.</li>
            </ul>
          </UrdSection>
          <UrdSection title="Download files">
            <div>You can download individual files below or grab the entire <a href="/sample-pack/urd-atlas-public-sample-pack.zip" className="font-semibold text-[#0d2447] underline decoration-[#9db8d4] underline-offset-4 hover:text-blue-800">sample pack zip</a>.</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {SAMPLE_FILES.map((file) => (
                <a
                  key={file.href}
                  href={file.href}
                  className="rounded-xl border border-[#9db8d4] bg-[#eef6ff] px-4 py-3 text-sm font-bold text-[#0d2447] transition hover:bg-white hover:text-blue-800"
                >
                  {file.label}
                </a>
              ))}
            </div>
          </UrdSection>
          <UrdSection title="Read next">
            <ul className="list-disc pl-5">
              <li><UrdButtonLink href="/methodology/verification">Verification & Evidence Pack</UrdButtonLink></li>
              <li className="mt-2"><UrdButtonLink href="/methodology/provenance">Provenance & Revisions</UrdButtonLink></li>
              <li className="mt-2"><UrdButtonLink href="/api-docs/workflows">Common research workflows</UrdButtonLink></li>
            </ul>
          </UrdSection>
          <div>
            <Link href="/api-docs" className="font-semibold text-[#0d2447] underline decoration-[#9db8d4] underline-offset-4 hover:text-blue-800">
              ← API Docs
            </Link>
          </div>
        </div>
      </UrdContainer>
    </UrdPage>
  );
}
