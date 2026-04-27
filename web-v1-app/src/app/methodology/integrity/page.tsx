import ShortFullContent from "@/components/site/ShortFullContent";
import PageHero from "@/components/site/PageHero";
import { Callout, InlineCode, MethodologyNav, Section, SimpleTable } from "../_components";

export default async function MethodologyIntegrityPage() {
  return (
    <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      <PageHero
        eyebrow="Methodology"
        title="Release Integrity & Determinism"
        summary="How archived Meta rows are identified, what determinism hashes mean, and how historical outputs should be interpreted through time."
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
          "[&_section_td]:text-[#27476f]",
          "[&_section_th]:text-[#203c63]",
          "[&_a]:text-[#0d2447]",
          "[&_a]:font-semibold",
          "[&_code]:!rounded",
          "[&_code]:!border",
          "[&_code]:!border-[#9db8d4]",
          "[&_code]:!bg-[#f4f9ff]",
          "[&_code]:!px-1.5",
          "[&_code]:!py-0.5",
          "[&_code]:!font-mono",
          "[&_code]:!text-xs",
          "[&_code]:!font-bold",
          "[&_code]:!text-[#0d2447]",
          "[&_.border-cyan-500\\/20]:!border-blue-300",
          "[&_.border-cyan-500\\/20]:!bg-[#e7f1fb]",
          "[&_.border-cyan-500\\/20_*]:!text-[#0d2447]",
        ].join(" ")}
      >
        <MethodologyNav />

        <ShortFullContent
          pageKey="methodology-integrity"
          summary={
            <>
              Integrity explains how published rows keep a stable public identity
              over time and how archived outputs remain traceable.
            </>
          }
          bullets={[
            <>
              Named regime rows expose a public determinism hash over the public
              regime payload.
            </>,
            <>
              If the named regime payload changes, the determinism hash should
              change. If the payload does not change, the hash should stay stable.
            </>,
            <>
              Historical outputs are intended to remain interpretable under the
              methodology version under which they were published.
            </>,
          ]}
          whyItMatters={
            <>
              Trust is stronger when users can inspect publication identity and
              detect meaningful archival change.
            </>
          }
          fullContent={
            <div className="grid gap-6">
              <Section title="Public row identity">
                <p>
                  Public row identity is anchored in fields actually present in
                  the archive, not in a separate revision integer.
                </p>
                <SimpleTable
                  headers={["Row type", "Public identity"]}
                  rows={[
                    [
                      "All Meta rows",
                      <>
                        <InlineCode>chain</InlineCode>,{" "}
                        <InlineCode>date</InlineCode>,{" "}
                        <InlineCode>methodology_version</InlineCode>
                      </>,
                    ],
                    [
                      "Named regime rows",
                      <>
                        <InlineCode>chain</InlineCode>,{" "}
                        <InlineCode>date</InlineCode>,{" "}
                        <InlineCode>methodology_version</InlineCode>,{" "}
                        <InlineCode>regime.determinism_hash</InlineCode>
                      </>,
                    ],
                    [
                      "UNKNOWN/DEGRADED rows",
                      <>
                        <InlineCode>chain</InlineCode>,{" "}
                        <InlineCode>date</InlineCode>,{" "}
                        <InlineCode>methodology_version</InlineCode>,{" "}
                        <InlineCode>updated_through</InlineCode>,{" "}
                        <InlineCode>confidence.confidence_score</InlineCode>,{" "}
                        <InlineCode>status.label</InlineCode>
                      </>,
                    ],
                  ]}
                />
              </Section>

              <Section title="What determinism hash means">
                <p>
                  <InlineCode>regime.determinism_hash</InlineCode> is the
                  canonical integrity anchor for named regime rows. It represents
                  a stable checksum over the public identity of the named regime
                  payload.
                </p>
                <p>
                  If the named regime payload changes materially, the public
                  integrity anchor should change as well.
                </p>

                <section className="mt-5 rounded-2xl border border-blue-300 bg-[#e7f1fb] p-5">
                  <h3 className="text-sm font-black text-blue-700">
                    What it does not mean
                  </h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-[#0d2447]">
                    The determinism hash is not a guarantee that the full private
                    implementation is exposed. It is a public integrity mechanism
                    for the published regime payload.
                  </p>
                </section>
              </Section>

              <Section title="Archived-as-published principle">
                <p>
                  Historical outputs should be interpreted as valid under the
                  methodology version under which they were published. If
                  methodology changes in a way that changes field meaning or label
                  semantics, that change should be versioned rather than silently
                  applied retroactively in public documentation.
                </p>
              </Section>
            </div>
          }
        />
      </div>
    </main>
  );
}