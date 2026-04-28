import ShortFullContent from "@/components/site/ShortFullContent";
import { Callout, MethodologyHeader, MethodologyNav, Section, MethodologyContent, MethodologyPageShell } from "../_components";

export default async function MethodologyAiControlsPage() {
  return (
    <MethodologyPageShell>
      <MethodologyHeader
        title="AI Use & Quality Controls"
        description="How AI-assisted development relates to trust in the published product."
      />

      <MethodologyContent>
        <MethodologyNav />

      <ShortFullContent
        pageKey="methodology-ai-controls"
        summary={<>This page explains why trust in Urd Atlas comes from release controls and published evidence paths, not from authorship claims.</>}
        bullets={[
          <>AI-assisted development does not change the public trust basis on its own.</>,
          <>Published outputs remain constrained by versioned methodology, archived artifacts, deterministic publication rules, and worked verification paths.</>,
          <>Analytical logic that affects outputs should still pass deterministic test cases and release checks before publication.</>,
        ]}
        whyItMatters={<>The user should know quickly that quality assurance is anchored in system controls rather than marketing claims about who wrote the code.</>}
        fullContent={
          <div className="grid gap-6">
        <Section title="Public position">
          <p>
            Parts of the software development workflow may be AI-assisted. Trust in the published product is therefore anchored not in authorship claims, but in versioned methodology, archived outputs, deterministic publication rules, release controls, and public verification paths.
          </p>
        </Section>

        <Section title="Why this does not reduce the trust basis on its own">
          <ul className="list-disc pl-5">
            <li>Published outputs are constrained by versioned methodology and explicit public field meaning.</li>
            <li>Archived rows remain available for inspection after publication.</li>
            <li>Named regime rows expose a public determinism hash.</li>
            <li>The public trust layer includes worked examples and a field contract, not just prose.</li>
          </ul>
        </Section>

        <Callout title="Release-control rule">
          Where analytical logic affects published outputs, that logic is expected to be validated against deterministic test cases, known input-output expectations, and release checks before publication.
        </Callout>
          </div>
        }
      />
      </MethodologyContent>
    </MethodologyPageShell>
  );
}
