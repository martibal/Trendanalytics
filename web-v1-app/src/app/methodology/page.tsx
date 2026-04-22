import Link from "next/link";
import ShortFullContent from "@/components/site/ShortFullContent";
import {
  Callout,
  MethodologyHeader,
  MethodologyNav,
  Section,
  SimpleTable,
} from "./_components";

export default function MethodologyOverviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Methodology"
        description="Urd Atlas publishes a public trust layer for customers who need to understand what the product publishes, how the analytical outputs should be interpreted, what can be independently checked, and where the public methodology intentionally stops."
      />

      <MethodologyNav />

      <ShortFullContent
        pageKey="methodology-overview"
        summary={<>This section explains what Urd Atlas publishes, how to read the outputs, what can be checked independently, and where public methodology intentionally stops.</>}
        bullets={[
          <>Artifact model: <strong>Gold</strong> for daily observations, <strong>Derived</strong> for deterministic transforms, and <strong>Meta</strong> for regime, confidence, scorecard state, and drivers.</>,
          <>Read order: <Link href="/methodology/reference" className="underline">Reference</Link> first, then <Link href="/methodology/verification" className="underline">Verification</Link>, then <Link href="/methodology/fields" className="underline">Fields</Link> as a lookup layer.</>,
          <>Trust boundary: outputs should be auditable in meaning and behavior, but the private source-data and implementation chain are not publicly reconstructable.</>,
        ]}
        whyItMatters={<>A new user should be able to understand the public trust model quickly, while technical users can still expand into the full methodology without losing any detail.</>}
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
                  [<Link key="ref" href="/methodology/reference" className="underline">Reference</Link>, <>Canonical public methodology and interpretation rules.</>],
                  [<Link key="fields" href="/methodology/fields" className="underline">Field Dictionary</Link>, <>Field-level definitions and warnings.</>],
                  [<Link key="ver" href="/methodology/verification" className="underline">Verification</Link>, <>Worked examples and evidence path.</>],
                  [<Link key="fresh" href="/methodology/freshness" className="underline">Freshness</Link>, <>Publication lag and freshness policy.</>],
                  [<Link key="bound" href="/methodology/boundaries" className="underline">Boundaries</Link>, <>What the public methodology discloses and does not disclose.</>],
                  [<Link key="integ" href="/methodology/integrity" className="underline">Integrity</Link>, <>Determinism, row identity, and archival traceability.</>],
                  [<Link key="ai" href="/methodology/ai-controls" className="underline">AI controls</Link>, <>How trust is anchored in release controls rather than authorship claims.</>],
                ]}
              />
            </Section>

            <Section title="Artifact model">
              <p>
                Urd Atlas publishes three artifact layers: Gold, Derived, and Meta. Gold is the daily
                observation layer. Derived is the deterministic trend layer built from Gold. Meta is the
                analytical layer that publishes regime, confidence, scorecard state, drivers, and
                presentation-ready summaries.
              </p>
              <p>
                The most important page for a technical customer is the public methodology reference. The
                most important page for an auditor or quant reviewer is the verification page.
              </p>
            </Section>

            <Callout title="Read these first">
              <p>
                Start with <Link href="/methodology/reference" className="underline">Public Methodology Reference</Link>.
                Then read <Link href="/methodology/verification" className="underline"> Verification &amp; Evidence</Link>.
                Use <Link href="/methodology/fields" className="underline"> Field Dictionary</Link> as a lookup layer
                when you need field-level precision.
              </p>
            </Callout>
          </div>
        }
      />
    </main>
  );
}
