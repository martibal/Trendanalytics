import { Callout, InlineCode, MethodologyHeader, MethodologyNav, Section, SimpleTable } from "../_components";

export default async function MethodologyIntegrityPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <MethodologyHeader
        title="Release Integrity & Determinism"
        description="How archived Meta rows are identified, what determinism hashes mean, and how historical outputs should be interpreted through time."
      />

      <MethodologyNav />

      <div className="grid gap-6">
        <Section title="Public row identity">
          <p>
            Public row identity is anchored in fields actually present in the archive, not in a separate revision integer.
          </p>
          <SimpleTable
            headers={["Row type", "Public identity"]}
            rows={[
              ["All Meta rows", <><InlineCode>chain</InlineCode>, <InlineCode>date</InlineCode>, <InlineCode>methodology_version</InlineCode></>],
              ["Named regime rows", <><InlineCode>chain</InlineCode>, <InlineCode>date</InlineCode>, <InlineCode>methodology_version</InlineCode>, <InlineCode>regime.determinism_hash</InlineCode></>],
              ["UNKNOWN/DEGRADED rows", <><InlineCode>chain</InlineCode>, <InlineCode>date</InlineCode>, <InlineCode>methodology_version</InlineCode>, <InlineCode>updated_through</InlineCode>, <InlineCode>confidence.confidence_score</InlineCode>, <InlineCode>status.label</InlineCode></>],
            ]}
          />
        </Section>

        <Section title="What determinism hash means">
          <p>
            <InlineCode>regime.determinism_hash</InlineCode> is the canonical integrity anchor for named regime rows. It represents a stable checksum over the public identity of the named regime payload.
          </p>
          <p>
            If the named regime payload changes materially, the public integrity anchor should change as well.
          </p>
          <Callout title="What it does not mean">
            The determinism hash is not a guarantee that the full private implementation is exposed. It is a public integrity mechanism for the published regime payload.
          </Callout>
        </Section>

        <Section title="Archived-as-published principle">
          <p>
            Historical outputs should be interpreted as valid under the methodology version under which they were published. If methodology changes in a way that changes field meaning or label semantics, that change should be versioned rather than silently applied retroactively in public documentation.
          </p>
        </Section>
      </div>
    </main>
  );
}
