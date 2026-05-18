import ShortFullContent from "@/components/site/ShortFullContent";
import { InlineCode, MethodologyHeader, MethodologyNav, Section, SimpleTable, MethodologyContent, MethodologyPageShell } from "../_components";

export default async function MethodologyChangelogPage() {
  return (
    <MethodologyPageShell>
      <MethodologyHeader
        title="Methodology Changelog"
        description="Public customer change log for methodology, interpretation, thresholds, contracts, and historical corrections."
      />

      <MethodologyContent>
        <MethodologyNav />
      <ShortFullContent
        pageKey="methodology-changelog"
        summary={<>This page records customer-facing changes to methodology, interpretation, contracts, and historical corrections.</>}
        bullets={[
          <>Every change should be classified by type, backward-compatibility impact, methodology bump, archival impact, and subscriber action.</>,
          <>Docs-only changes should be easy to distinguish from output-affecting corrections or methodology-breaking changes.</>,
          <>Templates for future non-docs changes set the required level of specificity before the first real correction arrives.</>,
        ]}
        whyItMatters={<>A clear changelog lowers the cost of trust because users can see exactly what changed and whether they need to react.</>}
        fullContent={
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
        <Section title="Ready-to-use templates for the first real non-docs change">
          <p>These rows are examples only. They show the level of specificity expected once the first real correction, methodology bump, or archival republish occurs.</p>
          <SimpleTable
            headers={["Example class", "Affected artifacts", "Methodology bump?", "Historical rows changed?", "Subscriber action required?", "What the entry should say"]}
            rows={[
              [
                "historical correction template",
                "gold/<chain>/<date>.json · derived/<chain>/<date>.json · meta/<chain>/<date>.json",
                "No",
                "Yes — targeted archived rows",
                "Maybe",
                "Explain what source issue or calculation defect was corrected, list the exact dates and chains touched, and state whether subscribers should re-pull those rows.",
              ],
              [
                "methodology-breaking change template",
                "meta ruleset / scorecard / threshold contract",
                "Yes — required",
                "Maybe",
                "Yes",
                "State the old and new methodology versions, what changed semantically, whether historical comparability is broken, and whether downstream consumers must re-baseline models or dashboards.",
              ],
              [
                "republished archived rows template",
                "published archive manifests · affected row bundles",
                "Depends",
                "Yes — republished archive subset",
                "Yes if consumer stores local copies",
                "Specify which archived files were republished, whether payload identity changed, how to detect affected rows, and whether existing local copies should be replaced.",
              ],
            ]}
          />
        </Section>
          </div>
        }
      />


        <Section title="Confidence v2 — profile-aware evidence scoring">
          <p>
            Confidence now uses the same composite formula, <InlineCode>sqrt(data_quality_score × label_confidence_score)</InlineCode>,
            but the inputs are more specific: data quality is measured against the actual chain-specific evidence surface, and label confidence
            is measured against the label-specific rule that produced the classification.
          </p>
          <ul className="list-disc pl-5">
            <li>Structurally non-applicable fields no longer reduce data quality.</li>
            <li>Optional fields remain visible but do not reduce confidence when they are not part of the current regime evidence surface.</li>
            <li>Label confidence uses raw scorecard/regime evidence, not confidence-degraded display scores.</li>
            <li>Meta rows now expose <InlineCode>confidence.candidate_label</InlineCode> when a label is withheld by the confidence gate.</li>
            <li>Audit tooling is available through <InlineCode>pipeline/tools/audit_confidence_v2.py</InlineCode>.</li>
          </ul>
        </Section>

      </MethodologyContent>
    </MethodologyPageShell>
  );
}

