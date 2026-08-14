import ShortFullContent from "@/components/site/ShortFullContent";
import {
  InlineCode,
  MethodologyContent,
  MethodologyHeader,
  MethodologyNav,
  MethodologyPageShell,
  Section,
  SimpleTable,
} from "../_components";

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
          summary={
            <>
              This page records customer-facing changes to methodology, interpretation, JSON contracts,
              historical rows, and subscriber action requirements.
            </>
          }
          bullets={[
            <>
              Output-affecting methodology changes are separated from docs-only changes.
            </>,
            <>
              Retroactive changes state whether historical rows were regenerated and whether cached
              subscribers should re-pull files.
            </>,
            <>
              Confidence v2 is now the active confidence methodology for Meta rows.
            </>,
          ]}
          whyItMatters={
            <>
              A clear changelog lowers the cost of trust because users can see exactly what changed,
              whether history moved, and whether they need to refresh local copies.
            </>
          }
          fullContent={
            <div className="grid gap-6">
              <Section title="How to read this changelog">
                <p>
                  Every public change is classified by change type, affected artifacts, methodology
                  impact, historical-row impact, and subscriber action. Rows marked as historical
                  republish mean that previously published JSON files were regenerated under the
                  stated methodology or interpretation rule.
                </p>
              </Section>

              <Section title="Current public log">
                <SimpleTable
                  headers={[
                    "Date",
                    "Class",
                    "Affected artifacts",
                    "Methodology bump?",
                    "Historical rows changed?",
                    "Subscriber action required?",
                    "Summary",
                  ]}
                  rows={[
                    [
                      "2026-08-13",
                      "historical textual correction",
                      "meta/<chain>/<date>.json · aggregated Meta windows",
                      "No",
                      "Yes — status.one_liner and status.explanation_support.status_note text only",
                      "Yes, if affected Meta JSON was cached before this correction",
                      <>
                        Corrected a grammatical fallback defect in previously published{" "}
                        <InlineCode>status.one_liner</InlineCode> and{" "}
                        <InlineCode>status.explanation_support.status_note</InlineCode> text. The
                        correction affected descriptive text only; no regime classifications, axis
                        values, confidence scores, scorecard values, drivers, or underlying metrics
                        were changed.
                      </>,
                    ],
                    [
                      "2026-07-05",
                      "docs-only contract coverage fix",
                      "methodology/fields · methodology/changelog · audit gates",
                      "No",
                      "No",
                      "No",
                      <>
                        Field Dictionary now documents all nine active Gold metric fields, including{" "}
                        <InlineCode>block_count_daily</InlineCode>, <InlineCode>value_transferred_native</InlineCode>,{" "}
                        <InlineCode>failed_tx_rate</InlineCode>, <InlineCode>gas_utilization_pct</InlineCode>, and{" "}
                        <InlineCode>unique_active_addresses</InlineCode>. Added the per-chain axis mapping table and
                        a CI sync gate so documentation cannot silently drift from{" "}
                        <InlineCode>CANON_COLS</InlineCode>, <InlineCode>PROFILE_COMPONENTS</InlineCode>, or{" "}
                        <InlineCode>CHAIN_SIGNAL_PROFILES</InlineCode>. No calculation logic changed.
                      </>,
                    ],
                    [
                      "2026-05-18",
                      "methodology update + historical republish",
                      "meta/<chain>/<date>.json · meta/<chain>/latest.json · briefs/*",
                      "Yes — Meta methodology_version 1.1; confidence.methodology_version confidence_v2_profile_evidence",
                      "Yes — Meta and Briefs JSON were regenerated retroactively",
                      "Yes, if local Meta or Briefs JSON was cached before this change",
                      <>
                        Introduced Confidence v2. Confidence still uses{" "}
                        <InlineCode>sqrt(data_quality_score × label_confidence_score)</InlineCode>,
                        but data quality is now profile-aware and label confidence is label-specific.
                        Structurally non-applicable fields are excluded from data-quality denominators,
                        optional fields are documented separately, and status explanations now distinguish
                        scorecard pressure from actual regime-threshold crossings.
                      </>,
                    ],
                    [
                      "2026-05-18",
                      "interpretation clarification",
                      "status.one_liner · status.explanation_support",
                      "No additional bump beyond Confidence v2",
                      "Yes — regenerated as part of the Confidence v2 retroactive publish",
                      "Yes, if local Meta or Briefs JSON was cached before this change",
                      <>
                        Clarified borderline stable states. A row can remain{" "}
                        <InlineCode>STABLE</InlineCode> even when the scorecard shows adjacent pressure,
                        if the regime-axis evidence did not cross the relevant label threshold. The
                        status text now states that distinction instead of presenting a terse and
                        potentially confusing stable summary.
                      </>,
                    ],
                    [
                      "2026-04-21",
                      "docs-only",
                      "methodology hub",
                      "No",
                      "No",
                      "No",
                      "Introduced structured methodology hub and cross-linked trust-layer pages.",
                    ],
                    [
                      "2026-04-21",
                      "interpretation-only",
                      "reference / fields / boundaries",
                      "No",
                      "No",
                      "No",
                      "Clarified label volatility, regime-vs-scorecard normalization, fee_burden_proxy semantics, and BTC capacity as an instability proxy.",
                    ],
                    [
                      "2026-04-21",
                      "artifact contract clarification",
                      "schema / provenance docs",
                      "No",
                      "No",
                      "No",
                      "Removed public reliance on a required separate revision integer and aligned public provenance with fields actually present in the archive.",
                    ],
                    [
                      "2026-04-21",
                      "operational documentation",
                      "service / api docs / pricing surface",
                      "No",
                      "No",
                      "No",
                      "Added service expectations, public sample pack, and common workflows for pre-purchase diligence and customer onboarding.",
                    ],
                  ]}
                />
              </Section>

              <Section title="Confidence v2 — what changed">
                <p>
                  Confidence v2 did not change the top-level confidence formula or the public gate. It
                  changed the evidence used inside the two inputs so that confidence is better aligned
                  with the actual chain profile and the actual label rule.
                </p>
                <SimpleTable
                  headers={["Component", "Previously", "Confidence v2"]}
                  rows={[
                    [
                      <InlineCode key="dq">data_quality_score</InlineCode>,
                      "Measured completeness against a broader required-field set that could penalize fields not meaningful for every chain.",
                      "Measures completeness against the chain-specific evidence surface. Structurally non-applicable fields are excluded; optional fields stay visible but do not reduce data quality.",
                    ],
                    [
                      <InlineCode key="lc">label_confidence_score</InlineCode>,
                      "Used a more general clarity calculation that could under-explain label-specific edge cases.",
                      "Uses label-specific evidence. HEATING, CONGESTED, CHEAP, and STABLE each score the evidence relevant to that label rather than applying one generic margin model.",
                    ],
                    [
                      <InlineCode key="score_raw">score_raw</InlineCode>,
                      "Display scores and raw evidence could be easy to confuse in interpretation.",
                      "Label confidence uses raw scorecard/regime evidence rather than confidence-degraded display scores.",
                    ],
                    [
                      <InlineCode key="status">status.one_liner</InlineCode>,
                      "Could compress borderline STABLE rows into a short summary that looked contradictory when scorecard pressure was visible.",
                      "Explains when scorecard pressure is adjacent but regime-axis evidence did not cross the label threshold.",
                    ],
                  ]}
                />
              </Section>

              <Section title="Subscriber guidance">
                <ul className="list-disc pl-5">
                  <li>
                    Customers who cache Meta or Briefs JSON locally should re-pull affected files if
                    they need historical consistency under Confidence v2.
                  </li>
                  <li>
                    Gold and Derived observations were not redefined by Confidence v2. The change is
                    in Meta confidence, status interpretation, and Briefs derived from Meta context.
                  </li>
                  <li>
                    Downstream systems should treat{" "}
                    <InlineCode>confidence.methodology_version</InlineCode> and{" "}
                    <InlineCode>methodology_version</InlineCode> as version keys when comparing older
                    cached rows with newly pulled rows.
                  </li>
                </ul>
              </Section>

              <Section title="Ready-to-use templates for future non-docs changes">
                <p>
                  These rows are examples only. They show the level of specificity expected once a
                  future correction, methodology bump, or archival republish occurs.
                </p>
                <SimpleTable
                  headers={[
                    "Example class",
                    "Affected artifacts",
                    "Methodology bump?",
                    "Historical rows changed?",
                    "Subscriber action required?",
                    "What the entry should say",
                  ]}
                  rows={[
                    [
                      "historical correction template",
                      "gold/<chain>/<date>.json · derived/<chain>/<date>.json · meta/<chain>/<date>.json · briefs/*",
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
      </MethodologyContent>
    </MethodologyPageShell>
  );
}
