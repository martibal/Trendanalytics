import ShortFullContent from "@/components/site/ShortFullContent";
import PageHero from "@/components/site/PageHero";
import { MethodologyNav, Section } from "../_components";

export default async function MethodologyAiControlsPage() {
  return (
    <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      <PageHero
        eyebrow="Methodology"
        title="AI Use & Quality Controls"
        summary="How AI-assisted development relates to trust in the published product."
      />

      <div
        className={[
          "mx-auto max-w-5xl px-6 py-10",
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
          "[&_section_li]:text-[#27476f]",
        ].join(" ")}
      >
        <MethodologyNav />

        <ShortFullContent
          pageKey="methodology-ai-controls"
          summary={
            <>
              This page explains why trust in Urd Atlas comes from release
              controls and published evidence paths, not from authorship claims.
            </>
          }
          bullets={[
            <>
              AI-assisted development does not change the public trust basis on
              its own.
            </>,
            <>
              Published outputs remain constrained by versioned methodology,
              archived artifacts, deterministic publication rules, and worked
              verification paths.
            </>,
            <>
              Analytical logic that affects outputs should still pass
              deterministic test cases and release checks before publication.
            </>,
          ]}
          whyItMatters={
            <>
              The user should know quickly that quality assurance is anchored in
              system controls rather than marketing claims about who wrote the code.
            </>
          }
          fullContent={
            <div className="grid gap-6">
              <Section title="Public position">
                <p>
                  Parts of the software development workflow may be AI-assisted.
                  Trust in the published product is therefore anchored not in
                  authorship claims, but in versioned methodology, archived
                  outputs, deterministic publication rules, release controls, and
                  public verification paths.
                </p>
              </Section>

              <Section title="Why this does not reduce the trust basis on its own">
                <ul className="list-disc pl-5">
                  <li>
                    Published outputs are constrained by versioned methodology
                    and explicit public field meaning.
                  </li>
                  <li>
                    Archived rows remain available for inspection after
                    publication.
                  </li>
                  <li>
                    Named regime rows expose a public determinism hash.
                  </li>
                  <li>
                    The public trust layer includes worked examples and a field
                    contract, not just prose.
                  </li>
                </ul>
              </Section>

              <section className="rounded-2xl border border-blue-300 bg-[#e7f1fb] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                <h3 className="text-sm font-black text-blue-700">
                  Release-control rule
                </h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-[#0d2447]">
                  Where analytical logic affects published outputs, that logic is
                  expected to be validated against deterministic test cases,
                  known input-output expectations, and release checks before
                  publication.
                </p>
              </section>
            </div>
          }
        />
      </div>
    </main>
  );
}