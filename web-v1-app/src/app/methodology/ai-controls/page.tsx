import { MethodologyHeader, MethodologyNav, Section } from "../_components";

export default function MethodologyAiControlsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="AI Use & Quality Controls"
        description="This page explains how trust in the published product is anchored in controls and verification rather than authorship claims."
      />
      <MethodologyNav />
      <div className="grid gap-6">
        <Section title="Public position">
          <p>
            Parts of the software development workflow may be AI-assisted. Trust in the published
            product is therefore anchored not in authorship claims, but in versioned methodology,
            deterministic publication logic, archived outputs, release controls, and verification
            against known input-output expectations.
          </p>
          <p>
            Where analytical logic affects published outputs, that logic is expected to be validated
            against deterministic test cases and release checks before publication.
          </p>
        </Section>
      </div>
    </main>
  );
}
