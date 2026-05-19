import ShortFullContent from "@/components/site/ShortFullContent";
import {
  Callout,
  InlineCode,
  MethodologyContent,
  MethodologyHeader,
  MethodologyLink,
  MethodologyNav,
  MethodologyPageShell,
  Section,
  SimpleTable,
} from "./_components";

export default function MethodologyOverviewPage() {
  return (
    <MethodologyPageShell>
      <MethodologyHeader
        title="Methodology"
        description="How Urd Atlas turns daily blockchain observations into on-chain reference data: Gold observations, Derived transforms, Meta regime labels, Briefs summaries, confidence, scorecards, and traceable JSON artifacts."
      />

      <MethodologyContent>
        <Callout title="Read these first">
          <p>
            First time here? Start with <MethodologyLink href="/methodology/reference">Public Methodology Reference</MethodologyLink>{" "}
            to understand what the reference data means, then read <MethodologyLink href="/methodology/verification">Verification &amp; Evidence</MethodologyLink>{" "}
            to see how published labels can be checked. Use <MethodologyLink href="/methodology/fields">Field Dictionary</MethodologyLink>{" "}
            as the lookup layer when you need exact field definitions.
          </p>
        </Callout>

        <Callout title="Current methodology note: Confidence v2">
          <p>
            Meta rows now use <InlineCode>confidence_v2_profile_evidence</InlineCode>. Confidence still
            uses <InlineCode>sqrt(data_quality_score × label_confidence_score)</InlineCode>, but data
            quality is profile-aware and label confidence is label-specific. The 2026-05-18 retroactive
            rebuild regenerated Meta and Briefs JSON so historical rows reflect the current confidence
            and status-explanation contract.
          </p>
        </Callout>

        <MethodologyNav />

        <ShortFullContent
          pageKey="methodology-overview"
          summary={
            <>
              This section documents the Urd Atlas reference data methodology: what gets published,
              how to read the outputs, what can be checked independently, and where public methodology
              intentionally stops.
            </>
          }
          bullets={[
            <>
              Reference layer model: <strong>Gold</strong> for daily observations, <strong>Derived</strong> for deterministic transforms, <strong>Meta</strong> for regime, confidence, scorecard state, and drivers, and <strong>Briefs</strong> for readable JSON summaries.
            </>,
            <>
              Confidence v2 separates data completeness from label clarity, excludes structurally
              non-applicable chain fields from data-quality denominators, and explains adjacent
              scorecard pressure when a stable label remains below a regime-threshold crossing.
            </>,
            <>
              Trust boundary: outputs should be auditable in meaning and behavior, but the private
              source-data and implementation chain are not publicly reconstructable.
            </>,
          ]}
          whyItMatters={
            <>
              A new user should be able to understand the public trust model quickly, while technical
              users can still expand into the full methodology without losing any detail.
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
                    [<MethodologyLink key="ref" href="/methodology/reference">Reference</MethodologyLink>, <>Canonical public methodology and interpretation rules.</>],
                    [<MethodologyLink key="fields" href="/methodology/fields">Field Dictionary</MethodologyLink>, <>Field-level definitions and warnings, including Confidence v2 fields.</>],
                    [<MethodologyLink key="ver" href="/methodology/verification">Verification</MethodologyLink>, <>Worked examples and evidence path.</>],
                    [<MethodologyLink key="fresh" href="/methodology/freshness">Freshness</MethodologyLink>, <>Publication lag and freshness policy.</>],
                    [<MethodologyLink key="bound" href="/methodology/boundaries">Boundaries</MethodologyLink>, <>What the public methodology discloses and does not disclose.</>],
                    [<MethodologyLink key="integ" href="/methodology/integrity">Integrity</MethodologyLink>, <>Determinism, row identity, and archival traceability.</>],
                    [<MethodologyLink key="change" href="/methodology/changelog">Changelog</MethodologyLink>, <>Methodology updates, historical republish notes, and subscriber action guidance.</>],
                  ]}
                />
              </Section>

              <Section title="Reference layer model">
                <p>
                  Urd Atlas publishes four JSON layers: <InlineCode>Gold</InlineCode>, <InlineCode>Derived</InlineCode>, <InlineCode>Meta</InlineCode>, and <InlineCode>Briefs</InlineCode>. Gold is the daily
                  observation layer. Derived is the deterministic trend layer built from Gold. Meta is the
                  analytical layer that publishes regime, confidence, scorecard state, drivers, and
                  presentation-ready summaries. Briefs are the readable JSON layer built from the latest Meta context.
                </p>
                <p>
                  The most important page for a technical customer is the public methodology reference. The
                  most important page for an auditor or quant reviewer is the verification page. The changelog
                  should be checked when a customer compares cached historical JSON with newly pulled rows.
                </p>
              </Section>

              <Section title="Confidence and status model">
                <p>
                  Confidence answers one narrow question: how well-supported is the current published
                  analytical state by the data and by the label-specific evidence? It is not a prediction,
                  a probability of future price movement, or a recommendation signal.
                </p>
                <SimpleTable
                  headers={["Part", "Plain meaning"]}
                  rows={[
                    [<InlineCode key="dq">data_quality_score</InlineCode>, <>Do the relevant chain-specific fields exist, remain fresh, and cover enough recent/history rows?</>],
                    [<InlineCode key="lc">label_confidence_score</InlineCode>, <>Does the evidence clearly support the specific label that was assigned?</>],
                    [<InlineCode key="cs">confidence_score</InlineCode>, <>Composite confidence: <InlineCode>sqrt(data_quality_score × label_confidence_score)</InlineCode>.</>],
                    [<InlineCode key="status">status.one_liner</InlineCode>, <>Readable explanation that distinguishes the published regime label from adjacent scorecard pressure.</>],
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
