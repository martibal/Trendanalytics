import { MethodologyHeader, MethodologyNav, Section, SimpleTable } from "../_components";

export default async function MethodologyChangelogPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Methodology Changelog"
        description="Public customer change log for methodology, interpretation, thresholds, contracts, and historical corrections."
      />
      <MethodologyNav />
      <div className="grid gap-6">
        <Section title="How to read this changelog">
          <p>Every public change should be classified by type, backward-compatibility impact, whether the methodology version changed, whether archived rows changed, and whether a subscriber needs to take action.</p>
        </Section>
        <Section title="Current public log">
          <SimpleTable
            headers={["Date", "Class", "Affected artifacts", "Methodology bump?", "Historical rows changed?", "Subscriber action required?", "Summary"]}
            rows={[
              ["2026-04-21", "docs-only", "methodology hub", "No", "No", "No", "Introduced structured methodology hub and cross-linked trust-layer pages."],
              ["2026-04-21", "interpretation-only", "reference / fields / boundaries", "No", "No", "No", "Clarified label volatility, regime-vs-scorecard normalization, fee_burden_proxy semantics, and BTC capacity as an instability proxy."],
              ["2026-04-21", "artifact contract clarification", "schema / provenance docs", "No", "No", "No", "Removed public reliance on a required separate revision integer and aligned public provenance with fields actually present in the archive."],
              ["2026-04-21", "operational documentation", "service / api docs / pricing surface", "No", "No", "No", "Added service expectations, public sample pack, and common workflows for pre-purchase diligence and customer onboarding."],
            ]}
          />
        </Section>
      </div>
    </main>
  );
}
