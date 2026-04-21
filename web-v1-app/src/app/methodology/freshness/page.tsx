import { InlineCode, MethodologyHeader, MethodologyNav, Section, SimpleTable } from "../_components";

export default function MethodologyFreshnessPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Publication Freshness Policy"
        description="This page defines expected lag, warning thresholds, and how freshness should be interpreted separately from confidence."
      />
      <MethodologyNav />
      <div className="grid gap-6">
        <Section title="Chain publication policy">
          <SimpleTable
            headers={["Chain", "Expected lag", "Soft warning", "Hard fail"]}
            rows={[
              [<>Bitcoin</>, <>1 day</>, <>&gt; 2 days</>, <>&gt; 4 days</>],
              [<>Ethereum</>, <>1 day</>, <>&gt; 2 days</>, <>&gt; 4 days</>],
              [<>Arbitrum</>, <>7 days</>, <>&gt; 10 days</>, <>&gt; 15 days</>],
              [<>Base</>, <>7 days</>, <>&gt; 10 days</>, <>&gt; 15 days</>],
            ]}
          />
        </Section>
        <Section title="Freshness vs confidence">
          <p>
            Freshness tells you how current the latest usable row is relative to publication policy.
            Confidence tells you how much evidence supports the published analytical state. A row can
            be on schedule but weakly supported, and a row can be slightly delayed yet still have
            interpretable analytical structure.
          </p>
          <p>
            <InlineCode>updated_through</InlineCode> tells you the effective latest Gold date used by
            the Meta calculation. <InlineCode>lag_days_vs_asof_date</InlineCode> is freshness at
            calculation time. <InlineCode>lag_days_vs_utc_today</InlineCode> is a runtime freshness
            view relative to today.
          </p>
        </Section>
      </div>
    </main>
  );
}
