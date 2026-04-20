import { MethodologyHeader, MethodologyNav, Section, SimpleTable } from "../_components";

export default async function MethodologyChangelogPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <MethodologyHeader
        title="Methodology Changelog"
        description="Version-aware record of public methodology changes affecting field meaning, interpretation, or trust-layer documentation."
      />

      <MethodologyNav />

      <div className="grid gap-6">
        <Section title="Current public changelog">
          <SimpleTable
            headers={["Version", "Area", "Change", "Impact"]}
            rows={[
              ["v1", "Trust package", "Initial public trust-layer rollout for methodology hub, field dictionary, verification pack, freshness policy, boundaries, integrity, and AI controls.", "Established a versioned public methodology section as the canonical trust layer."],
              ["v1", "Public row identity", "Removed public reliance on a separate revision integer and anchored public row identity in fields actually present in archived Meta artifacts.", "Improved consistency between public documentation and published archive contents."],
              ["v1", "Verification", "Added worked examples for determinism hash and confidence gate behavior using values read from published Meta artifacts.", "Strengthened customer-verifiable evidence."],
              ["v1", "Regime vs scorecard distinction", "Added explicit public distinction between regime driver z-scores and scorecard normalization paths.", "Reduced ambiguity for quantitative readers comparing published z-like values across layers."],
            ]}
          />
        </Section>
      </div>
    </main>
  );
}
