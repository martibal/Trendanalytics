import { MethodologyHeader, MethodologyNav, Section } from "../_components";

export default function MethodologyBoundariesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Limitations & Boundaries"
        description="This page states what the public trust layer discloses, what it does not disclose, and what customers should not infer from the artifacts."
      />
      <MethodologyNav />
      <div className="grid gap-6">
        <Section title="What the public methodology discloses">
          <ul className="list-disc pl-5 text-sm leading-7 text-slate-300">
            <li>Field meaning and artifact ownership</li>
            <li>Interpretation of confidence, scorecard, regime, and freshness</li>
            <li>Publicly relevant thresholds and gates</li>
            <li>Worked examples for deterministic and gated outputs</li>
          </ul>
        </Section>
        <Section title="What the public methodology does not disclose">
          <ul className="list-disc pl-5 text-sm leading-7 text-slate-300">
            <li>Exact upstream AWS schemas or join logic</li>
            <li>Intermediate feature tables and ingestion repair rules</li>
            <li>Enough implementation detail to reconstruct raw source rows</li>
            <li>Enough implementation detail to clone the full private pipeline</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
