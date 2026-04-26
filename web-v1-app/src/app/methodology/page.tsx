import Link from "next/link";
import ShortFullContent from "@/components/site/ShortFullContent";
import PageHero from "@/components/site/PageHero";

import {
  Callout,
  MethodologyNav,
  Section,
  SimpleTable,
} from "./_components";

export default function MethodologyOverviewPage() {
  return (
    <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      <PageHero
        eyebrow="Methodology"
        title="Methodology"
        summary="Urd Atlas publishes a public trust layer for customers who need to understand what the product publishes, how outputs should be interpreted, what can be independently verified, and where public methodology intentionally stops."
      />

      <div
        className={[
          "mx-auto max-w-6xl px-6 py-10",
          "[&_nav]:border-[#b6cce3]",
          "[&_nav]:bg-[#e7f1fb]",
          "[&_nav_a]:text-[#0d2447]",
          "[&_nav_a]:font-black",
          "[&_nav_a:hover]:!text-blue-800",
          "[&_nav_a:hover]:!bg-[#dceaf8]",
          "[&_section]:border-[#b6cce3]",
          "[&_section]:bg-[#e7f1fb]",
          "[&_section_h2]:text-[#0d2447]",
          "[&_section_h2]:font-black",
          "[&_section_p]:text-[#27476f]",
          "[&_section_td]:text-[#27476f]",
          "[&_section_th]:text-[#203c63]",
          "[&_a]:text-[#0d2447]",
          "[&_a]:font-semibold",
          "[&_.rounded-2xl.border-cyan-500\\/20]:!bg-[#e7f1fb]",
          "[&_.rounded-2xl.border-cyan-500\\/20]:!border-blue-300",
          "[&_.rounded-2xl.border-cyan-500\\/20_*]:!text-[#0d2447]",
        ].join(" ")}
      >
        <MethodologyNav />

        <ShortFullContent
          pageKey="methodology-overview"
          summary={
            <>
              This section explains what Urd Atlas publishes, how to read the outputs,
              what can be checked independently, and where public methodology intentionally stops.
            </>
          }
          bullets={[
            <>
              Artifact model: <strong>Gold</strong> for daily observations,{" "}
              <strong>Derived</strong> for deterministic transforms, and{" "}
              <strong>Meta</strong> for regime, confidence, scorecard state, and drivers.
            </>,
            <>
              Read order:{" "}
              <Link href="/methodology/reference" className="underline">
                Reference
              </Link>{" "}
              first, then{" "}
              <Link href="/methodology/verification" className="underline">
                Verification
              </Link>
              , then{" "}
              <Link href="/methodology/fields" className="underline">
                Fields
              </Link>{" "}
              as a lookup layer.
            </>,
            <>
              Trust boundary: outputs should be auditable in meaning and behavior,
              but the private source-data and implementation chain are not publicly reconstructable.
            </>,
          ]}
          whyItMatters={
            <>
              A new user should understand the trust model quickly, while technical users
              can still expand into full methodology depth without losing precision.
            </>
          }
          fullContent={
            <div className="grid gap-6">
              <Section title="How to read this section">
                <p>
                  The methodology section is split into separate pages so that customers can move from a
                  fast overview into more technical detail without reading one single monolithic document.
                </p>

                <SimpleTable
                  headers={["Page", "Purpose"]}
                  rows={[
                    [
                      <Link key="ref" href="/methodology/reference" className="underline">
                        Reference
                      </Link>,
                      <>Canonical public methodology and interpretation rules.</>,
                    ],
                    [
                      <Link key="fields" href="/methodology/fields" className="underline">
                        Field Dictionary
                      </Link>,
                      <>Field-level definitions and warnings.</>,
                    ],
                    [
                      <Link key="ver" href="/methodology/verification" className="underline">
                        Verification
                      </Link>,
                      <>Worked examples and evidence path.</>,
                    ],
                    [
                      <Link key="fresh" href="/methodology/freshness" className="underline">
                        Freshness
                      </Link>,
                      <>Publication lag and freshness policy.</>,
                    ],
                    [
                      <Link key="bound" href="/methodology/boundaries" className="underline">
                        Boundaries
                      </Link>,
                      <>What the public methodology discloses and does not disclose.</>,
                    ],
                    [
                      <Link key="integ" href="/methodology/integrity" className="underline">
                        Integrity
                      </Link>,
                      <>Determinism, row identity, and archival traceability.</>,
                    ],
                    [
                      <Link key="ai" href="/methodology/ai-controls" className="underline">
                        AI controls
                      </Link>,
                      <>How trust is anchored in release controls rather than authorship claims.</>,
                    ],
                  ]}
                />
              </Section>

              <Section title="Artifact model">
                <p>
                  Urd Atlas publishes three artifact layers: Gold, Derived, and Meta. Gold is the daily
                  observation layer. Derived is the deterministic trend layer built from Gold. Meta is the
                  analytical layer that publishes regime, confidence, scorecard state, drivers, and
                  presentation-ready summaries.
                </p>
                <p>
                  The most important page for a technical customer is the public methodology reference. The
                  most important page for an auditor or quant reviewer is the verification page.
                </p>
              </Section>

              <section className="rounded-2xl border border-blue-300 bg-[#e7f1fb] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                <h2 className="text-sm font-black text-[#0d2447]">
                  Read these first
                </h2>

                <p className="mt-3 text-sm font-semibold leading-7 text-[#0d2447]">
                  Start with{" "}
                  <Link href="/methodology/reference" className="font-black text-blue-800 underline">
                    Public Methodology Reference
                  </Link>
                  . Then read{" "}
                  <Link href="/methodology/verification" className="font-black text-blue-800 underline">
                    Verification &amp; Evidence
                  </Link>
                  . Use{" "}
                  <Link href="/methodology/fields" className="font-black text-blue-800 underline">
                    Field Dictionary
                  </Link>{" "}
                  as a lookup layer when you need field-level precision.
                </p>
              </section>
            </div>
          }
        />
      </div>
    </main>
  );
}