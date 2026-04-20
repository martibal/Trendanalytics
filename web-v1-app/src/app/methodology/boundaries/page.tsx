import { InlineCode, MethodologyHeader, MethodologyNav, Section } from "../_components";

export default async function MethodologyBoundariesPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <MethodologyHeader
        title="Limitations & Boundaries"
        description="This page states what the product does not do and what the public methodology intentionally does not disclose."
      />

      <MethodologyNav />

      <div className="grid gap-6">
        <Section title="What Urd Atlas does not do">
          <ul className="list-disc pl-5">
            <li>It does not publish price targets or forecast paths.</li>
            <li>It does not publish trading advice, rebalancing advice, or portfolio instructions.</li>
            <li>It does not claim that one chain should be preferred over another for investment action.</li>
            <li>It does not expose raw AWS blockchain source rows.</li>
          </ul>
        </Section>

        <Section title="What the public methodology intentionally does not disclose">
          <ul className="list-disc pl-5">
            <li>Exact upstream AWS schema details, joins, and source repair paths</li>
            <li>Intermediate feature-layer files and parquet layouts</li>
            <li>Enough calibration detail to clone the full private pipeline end to end</li>
            <li>Enough aggregate detail to reconstruct raw source rows from published artifacts</li>
          </ul>
        </Section>

        <Section title="The public boundary in one sentence">
          <p>
            Urd Atlas is designed to be auditable in meaning, not reconstructable in implementation.
          </p>
          <p>
            Public methodology explains what published values mean, how to interpret them, and which parts are directly verifiable. It does not act as a source-code substitute.
          </p>
        </Section>
      </div>
    </main>
  );
}
