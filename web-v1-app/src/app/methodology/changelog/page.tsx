import { MethodologyHeader, MethodologyNav, Section, SimpleTable } from "../_components";

export default function MethodologyChangelogPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Methodology Changelog"
        description="Public change log for methodology language and interpretation rules that affect customer understanding."
      />
      <MethodologyNav />
      <div className="grid gap-6">
        <Section title="Current log">
          <SimpleTable
            headers={["Version", "Change", "Impact"]}
            rows={[
              [<>v1</>, <>Initial public methodology hub.</>, <>Baseline public trust layer.</>],
              [<>v1.1</>, <>Clarified OR-based regime banding and confidence gate worked examples.</>, <>No change to archived outputs; documentation aligned to implementation.</>],
              [<>v1.2</>, <>Added explicit warnings for day-to-day label flips, driver-vs-scorecard z-score differences, fee_burden_proxy semantics, and BTC blocktime_instability interpretation.</>, <>Interpretation layer strengthened for technical users.</>],
            ]}
          />
        </Section>
      </div>
    </main>
  );
}
