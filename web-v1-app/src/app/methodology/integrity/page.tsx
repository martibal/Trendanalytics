import { InlineCode, MethodologyHeader, MethodologyNav, Section } from "../_components";

export default function MethodologyIntegrityPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Release Integrity & Determinism"
        description="This page explains how published rows are identified, what determinism means in the public trust layer, and how archived outputs should be interpreted."
      />
      <MethodologyNav />
      <div className="grid gap-6">
        <Section title="Public row identity">
          <p>
            Archived Meta rows do not currently publish a separate revision integer. Public row
            identity is therefore anchored in the fields that are actually present in the archive:
            <InlineCode> chain </InlineCode>, <InlineCode> date </InlineCode>, and
            <InlineCode> methodology_version </InlineCode> for all rows, plus
            <InlineCode> regime.determinism_hash </InlineCode> for named regime rows.
          </p>
        </Section>
        <Section title="What determinism means here">
          <p>
            Public determinism means that the canonical named-regime payload has a stable public hash
            identity. If the published regime payload changes, the hash should change. If the payload
            does not change, the public hash should remain stable.
          </p>
        </Section>
      </div>
    </main>
  );
}
