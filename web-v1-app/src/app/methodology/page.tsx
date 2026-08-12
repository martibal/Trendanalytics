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
        description="How Urd Atlas turns daily blockchain observations into deterministic network-state reference data: observations, transforms, labels, confidence, scorecards, drivers and traceable JSON artifacts."
      />

      <MethodologyContent>
        <Callout title="What this methodology is for">
          <p>
            Urd Atlas is a descriptive network-state layer. The methodology explains how daily chain observations
            become stable JSON rows that can be read, joined, inspected and reproduced across product surfaces.
            It does not convert chain conditions into instructions or future-state guarantees.
          </p>
        </Callout>

        <Callout title="Read these first">
          <p>
            First time here? Start with <MethodologyLink href="/methodology/reference">Public Methodology Reference</MethodologyLink>{" "}
            to understand what the reference data means, then read <MethodologyLink href="/validation">Validation</MethodologyLink>{" "}
            for the empirical consistency and robustness evidence. Use <MethodologyLink href="/methodology/verification">Verification &amp; Evidence</MethodologyLink>{" "}
            to inspect the published evidence path and <MethodologyLink href="/methodology/fields">Field Dictionary</MethodologyLink>{" "}
            when you need exact field definitions.
          </p>
        </Callout>

        <Callout title="Current methodology note: Confidence v3">
          <p>
            Current Meta rows use <InlineCode>confidence_v3_l2_capacity_required</InlineCode>. Confidence
            retains <InlineCode>sqrt(data_quality_score × label_confidence_score)</InlineCode> and the
            <InlineCode>0.40</InlineCode> publish gate. Data quality is chain-profile-aware; current L2
            confidence explicitly requires the published capacity-utilization evidence used by the L2 ruleset.
            Confidence is a reliability score for the published row, not a calibrated probability that a label is true.
          </p>
        </Callout>

        <MethodologyNav />

        <Callout title="Product boundary">
          <p>
            Methodology pages document descriptive on-chain reference data only: no price data, no forecasts,
            and no recommendation outputs. Confidence and coverage explain how well the published row is
            supported; they do not turn regime labels into advice, automation rules or future outcomes.
          </p>
        </Callout>

        <ShortFullContent
          pageKey="methodology-overview"
          summary={
            <>
              This section documents the Urd Atlas trust model: what gets published, what the labels mean,
              how confidence should be used, what a technical reviewer can verify, and where the public
              methodology intentionally stops.
            </>
          }
          bullets={[
            <>
              Reference layer model: <strong>Gold</strong> stores daily observations, <strong>Derived</strong> stores deterministic transforms, <strong>Meta</strong> stores regime, confidence, scorecard state and drivers, and <strong>Briefs</strong> stores readable JSON summaries.
            </>,
            <>
              Label model: a regime is a compact description of observed network state. It should be joined
              to another workflow, gated by confidence, and interpreted with scorecard context.
            </>,
            <>
              Trust boundary: outputs are designed to be auditable in meaning, versioning and behavior, but
              the private source-data and implementation chain are not publicly reconstructable.
            </>,
          ]}
          whyItMatters={
            <>
              A new user should be able to understand why a row exists, what can be trusted about it, and
              what must still be checked in Validation before using it in a report, model diagnostic or API integration.
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
                    [<MethodologyLink key="validation" href="/validation">Validation</MethodologyLink>, <>Empirical internal-consistency, robustness, and live diagnostic evidence.</>],
                    [<MethodologyLink key="ver" href="/methodology/verification">Verification</MethodologyLink>, <>Worked examples and evidence path.</>],
                    [<MethodologyLink key="fresh" href="/methodology/freshness">Freshness</MethodologyLink>, <>Publication lag and freshness policy.</>],
                    [<MethodologyLink key="bound" href="/methodology/boundaries">Boundaries</MethodologyLink>, <>What the public methodology discloses and does not disclose.</>],
                    [<MethodologyLink key="integ" href="/methodology/integrity">Integrity</MethodologyLink>, <>Determinism, row identity, and archival traceability.</>],
                    [<MethodologyLink key="change" href="/methodology/changelog">Changelog</MethodologyLink>, <>Methodology updates, historical republish notes, and subscriber action guidance.</>],
                  ]}
                />
              </Section>

              <Section title="The method in one pass">
                <p>
                  Urd Atlas starts with daily chain observations, applies deterministic transforms, assigns a
                  network-state label, computes confidence, and publishes versioned JSON artifacts. The label is
                  the readable compression. The scores, confidence fields, dates and methodology identifiers are
                  the machine-readable audit surface around that label.
                </p>
                <SimpleTable
                  headers={["Step", "Question answered", "Published surface"]}
                  rows={[
                    ["Observe", "What did the chain look like on this observation date?", <InlineCode key="gold">Gold</InlineCode>],
                    ["Transform", "What recent and historical context should be compared deterministically?", <InlineCode key="derived">Derived</InlineCode>],
                    ["Classify", "Which descriptive network-state regime best fits the evidence?", <InlineCode key="meta">Meta</InlineCode>],
                    ["Explain", "What should a human reader know before using the row?", <InlineCode key="briefs">Briefs</InlineCode>],
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
                  analytical state by the data and by the label-specific evidence? It is not a probability of
                  a future chain state, a recommendation signal, or a reason to automate a downstream action by itself.
                </p>
                <SimpleTable
                  headers={["Part", "Plain meaning", "How to use it"]}
                  rows={[
                    [<InlineCode key="dq">data_quality_score</InlineCode>, <>Do the relevant chain-specific fields exist, remain fresh, and cover enough recent/history rows?</>, <>Use it to avoid over-reading weak or sparse rows.</>],
                    [<InlineCode key="lc">label_confidence_score</InlineCode>, <>Does the evidence clearly support the specific label that was assigned?</>, <>Use it to separate clear labels from ambiguous labels.</>],
                    [<InlineCode key="cs">confidence_score</InlineCode>, <>Composite confidence: <InlineCode>sqrt(data_quality_score × label_confidence_score)</InlineCode>.</>, <>Use it as the default gate in analysis and reporting.</>],
                    [<InlineCode key="status">status.one_liner</InlineCode>, <>Readable explanation that distinguishes the published regime label from adjacent scorecard pressure.</>, <>Use it to explain the row without inventing extra interpretation.</>],
                  ]}
                />
              </Section>

              <Section title="What to verify before relying on the data">
                <p>
                  Methodology explains how a row should be interpreted. Validation shows whether the currently
                  published dataset has enough observations, variation, confidence coverage and transition
                  structure to support downstream use.
                </p>
                <SimpleTable
                  headers={["Reviewer question", "Where to check"]}
                  rows={[
                    ["Is there enough history for the chain and window I care about?", <MethodologyLink key="validation" href="/validation">Validation diagnostics</MethodologyLink>],
                    ["Do labels vary enough to support segmentation?", <MethodologyLink key="validation-2" href="/validation">Validation diagnostics</MethodologyLink>],
                    ["Do the fields mean exactly what my integration assumes?", <MethodologyLink key="fields" href="/methodology/fields">Field Dictionary</MethodologyLink>],
                    ["Can I inspect a simple joined artifact before integrating?", <MethodologyLink key="analyst-kit" href="/analyst-kit">Analyst Kit</MethodologyLink>],
                    ["Can I fetch the same structure programmatically?", <MethodologyLink key="api" href="/api-docs">API Docs</MethodologyLink>],
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
