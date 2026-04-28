import ShortFullContent from "@/components/site/ShortFullContent";
import { InlineCode, MethodologyHeader, MethodologyNav, Section, SimpleTable, MethodologyContent, MethodologyPageShell } from "../_components";

export default async function MethodologyFreshnessPage() {
  return (
    <MethodologyPageShell>
      <MethodologyHeader
        title="Publication Freshness Policy"
        description="Expected publication lag by chain, soft-warning and hard-fail boundaries, and how freshness should be interpreted alongside confidence."
      />

      <MethodologyContent>
        <MethodologyNav />

      <ShortFullContent
        pageKey="methodology-freshness"
        summary={<>Freshness explains how recently each chain has been published and how to interpret lag without confusing it with confidence.</>}
        bullets={[
          <>BTC and ETH are expected to refresh on about a 1-day cadence. ARB and BASE are expected to refresh on about a 7-day cadence.</>,
          <>Freshness answers how recent a row is. Confidence answers how strong the current evidence is. These are separate dimensions.</>,
          <>Lag should be read against chain-specific expected cadence, not one universal rule.</>,
        ]}
        whyItMatters={<>Users need to know quickly whether a row is current enough for their workflow without reading the full policy.</>}
        fullContent={
          <div className="grid gap-6">
        <Section title="Current public freshness policy">
          <SimpleTable
            headers={["Chain", "Expected lag", "Soft warning", "Hard fail"]}
            rows={[
              ["Bitcoin", "1 day", "> 2 days", "> 4 days"],
              ["Ethereum", "1 day", "> 2 days", "> 4 days"],
              ["Arbitrum", "7 days", "> 10 days", "> 15 days"],
              ["Base", "7 days", "> 10 days", "> 15 days"],
            ]}
          />
        </Section>

        <Section title="How to read freshness correctly">
          <p>
            Freshness and confidence are related but different. Freshness tells you how current the supporting row is relative to expected publication cadence. Confidence tells you how much evidence supports the analytical state of that row.
          </p>
          <ul className="list-disc pl-5">
            <li>A row can be on schedule and still low-confidence.</li>
            <li>A row can be delayed and still mathematically valid as the latest available state.</li>
            <li>A degraded label means the confidence gate prevented a normal-confidence named label, not that the raw files necessarily disappeared.</li>
          </ul>
        </Section>

        <Section title="Freshness fields">
          <ul className="list-disc pl-5">
            <li><InlineCode>updated_through</InlineCode> = latest Gold observation date actually available to the Meta calculation</li>
            <li><InlineCode>lag_days_vs_asof_date</InlineCode> = publication-time freshness relative to the row date</li>
            <li><InlineCode>lag_days_vs_utc_today</InlineCode> = runtime freshness relative to the current UTC date</li>
          </ul>
        </Section>
          </div>
        }
      />
      </MethodologyContent>
    </MethodologyPageShell>
  );
}
