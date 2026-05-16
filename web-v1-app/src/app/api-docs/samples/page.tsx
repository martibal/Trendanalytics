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

const FULL_SAMPLE_PACK_HREF = "/sample-pack/urd-atlas-public-sample-pack.zip";

const SAMPLE_JSON_GROUPS = [
  {
    title: "Ethereum technical JSON",
    description:
      "Representative Gold, Derived, and Meta files for a BTC/ETH-style cadence chain.",
    files: [
      {
        label: "ETH Gold — 2026-03-31",
        href: "/sample-pack/ethereum/2026-03-31/gold.json",
        kind: "Gold",
      },
      {
        label: "ETH Derived — 2026-03-31",
        href: "/sample-pack/ethereum/2026-03-31/derived.json",
        kind: "Derived",
      },
      {
        label: "ETH Meta — 2026-03-31",
        href: "/sample-pack/ethereum/2026-03-31/meta.json",
        kind: "Meta",
      },
      {
        label: "ETH Meta — UNKNOWN/DEGRADED example",
        href: "/sample-pack/ethereum/2025-04-21/meta.json",
        kind: "Meta",
      },
    ],
  },
  {
    title: "Arbitrum technical JSON",
    description:
      "Representative Gold, Derived, and Meta files for an ARB/BASE-style cadence chain.",
    files: [
      {
        label: "ARB Gold — 2026-03-25",
        href: "/sample-pack/arbitrum/2026-03-25/gold.json",
        kind: "Gold",
      },
      {
        label: "ARB Derived — 2026-03-25",
        href: "/sample-pack/arbitrum/2026-03-25/derived.json",
        kind: "Derived",
      },
      {
        label: "ARB Meta — 2026-03-25",
        href: "/sample-pack/arbitrum/2026-03-25/meta.json",
        kind: "Meta",
      },
    ],
  },
  {
    title: "Briefs JSON",
    description:
      "Latest direct-use readable Briefs generated from the published regime evidence.",
    files: [
      {
        label: "Briefs manifest — latest",
        href: "/data/published/v1/briefs/manifest.json",
        kind: "Briefs",
      },
      {
        label: "Site Brief — latest",
        href: "/data/published/v1/briefs/site/latest.json",
        kind: "Briefs",
      },
      {
        label: "Cross-chain Brief — latest",
        href: "/data/published/v1/briefs/cross-chain/latest.json",
        kind: "Briefs",
      },
      {
        label: "BTC Chain Brief — latest",
        href: "/data/published/v1/briefs/chains/bitcoin/latest.json",
        kind: "Briefs",
      },
      {
        label: "ETH Chain Brief — latest",
        href: "/data/published/v1/briefs/chains/ethereum/latest.json",
        kind: "Briefs",
      },
      {
        label: "BASE Chain Brief — latest",
        href: "/data/published/v1/briefs/chains/base/latest.json",
        kind: "Briefs",
      },
      {
        label: "ARB Chain Brief — latest",
        href: "/data/published/v1/briefs/chains/arbitrum/latest.json",
        kind: "Briefs",
      },
    ],
  },
] as const;

const SAMPLE_JSON_FILE_COUNT = SAMPLE_JSON_GROUPS.reduce(
  (total, group) => total + group.files.length,
  0,
);

function DownloadCard({
  href,
  label,
  kind,
  featured = false,
}: {
  href: string;
  label: string;
  kind: string;
  featured?: boolean;
}) {
  return (
    <a
      href={href}
      className={[
        "group block rounded-xl border px-4 py-3 text-sm transition",
        featured
          ? "border-[var(--gold-line)] bg-[rgba(196,146,48,.10)] text-[var(--ink)] hover:bg-[rgba(196,146,48,.16)]"
          : "border-[var(--urd-border)] bg-[var(--urd-raised)] text-[var(--urd-text-strong)] hover:bg-white hover:text-blue-800",
      ].join(" ")}
    >
      <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--gold)]">
        {kind}
      </span>
      <span className="mt-1 block font-bold">{label}</span>
      <span className="mt-2 block text-xs font-semibold text-[var(--ink2)] group-hover:text-current">
        Open JSON →
      </span>
    </a>
  );
}

export default function SamplePackPage() {
  return (
    <UrdPage>
      <PageHero
        eyebrow="Pre-purchase validation"
        title="Public sample pack"
        highlight="real reference data artifacts"
        summary="These are real published on-chain reference data artifacts intended for pre-purchase diligence. They let a technical buyer inspect the actual JSON shape, confidence states, provenance fields, Briefs structure, and representative differences between BTC/ETH-style cadence and ARB/BASE-style cadence before subscribing."
      >
        <UrdButtonLink
          href="/api-docs"
          className="border-white/15 bg-white/8 text-white hover:bg-white/12 hover:text-white"
        >
          ← Back to API Docs
        </UrdButtonLink>
      </PageHero>

      <UrdContainer>
        <div className="grid gap-6">
          <UrdSection title="What is included">
            <ul className="list-disc pl-5">
              <li>One representative Gold, Derived, and Meta bundle for Ethereum.</li>
              <li>One representative Gold, Derived, and Meta bundle for Arbitrum.</li>
              <li>Latest published Briefs JSON for site-level, cross-chain, and per-chain context.</li>
              <li>
                One real <UrdInlineCode>UNKNOWN/DEGRADED</UrdInlineCode> Meta row.
              </li>
              <li>
                Examples showing <UrdInlineCode>methodology_version</UrdInlineCode>,{" "}
                <UrdInlineCode>updated_through</UrdInlineCode>,{" "}
                <UrdInlineCode>regime.determinism_hash</UrdInlineCode>, and Briefs schema fields.
              </li>
            </ul>
          </UrdSection>

          <UrdSection title="Download files">
            <div className="space-y-7">
              <div className="rounded-2xl border border-[var(--gold-line)] bg-[rgba(196,146,48,.10)] p-5">
                <div className="meta-label">Full sample pack</div>
                <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--ink)]">
                      Complete public diligence bundle
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--ink2)]">
                      Download the full public sample pack ZIP, or inspect the {SAMPLE_JSON_FILE_COUNT} individual JSON files below.
                      The individual list includes technical Gold, Derived, and Meta examples plus latest Briefs JSON.
                    </p>
                  </div>
                  <a
                    href={FULL_SAMPLE_PACK_HREF}
                    download
                    className="inline-flex shrink-0 rounded-full border border-[var(--gold-line)] bg-[rgba(196,146,48,.18)] px-5 py-3 text-sm font-bold text-[var(--ink)] transition hover:bg-[rgba(196,146,48,.28)]"
                  >
                    Download ZIP →
                  </a>
                </div>
              </div>

              {SAMPLE_JSON_GROUPS.map((group) => (
                <div key={group.title} className="border-t border-[var(--line)] pt-6">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--ink)]">{group.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[var(--ink2)]">{group.description}</p>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--gold)]">
                      {group.files.length} files
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {group.files.map((file) => (
                      <DownloadCard
                        key={file.href}
                        href={file.href}
                        label={file.label}
                        kind={file.kind}
                        featured={file.kind === "Briefs"}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </UrdSection>

          <UrdSection title="Read next">
            <ul className="list-disc pl-5">
              <li>
                <UrdButtonLink href="/methodology/verification">Verification & Evidence Pack</UrdButtonLink>
              </li>
              <li className="mt-2">
                <UrdButtonLink href="/methodology/provenance">Provenance & Revisions</UrdButtonLink>
              </li>
              <li className="mt-2">
                <UrdButtonLink href="/api-docs/workflows">Common research workflows</UrdButtonLink>
              </li>
            </ul>
          </UrdSection>

          <div>
            <Link
              href="/api-docs"
              className="font-semibold text-[var(--urd-text-strong)] underline decoration-[#9db8d4] underline-offset-4 hover:text-blue-800"
            >
              ← API Docs
            </Link>
          </div>
        </div>
      </UrdContainer>
    </UrdPage>
  );
}
