import ShortFullContent from "@/components/site/ShortFullContent";
import PageHero from "@/components/site/PageHero";
import { InlineCode, MethodologyNav, Section, SimpleTable } from "../_components";

export default async function MethodologyFreshnessPage() {
  return (
    <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      <PageHero
        eyebrow="Methodology"
        title="Publication Freshness Policy"
        summary="Expected publication lag by chain, soft-warning and hard-fail boundaries, and how freshness should be interpreted alongside confidence."
      />

      <div
        className={[
          "mx-auto max-w-5xl px-6 py-10",
          "[&_nav]:border-[#b6cce3]",
          "[&_nav]:bg-[#e7f1fb]",
          "[&_nav_a]:text-[#0d2447]",
          "[&_nav_a]:font-black",
          "[&_nav_a:hover]:!text-blue-800",
          "[&_nav_a:hover]:!bg-[#dceaf8]",
          "[&_section]:border-[#b6cce3]",
          "[&_section]:bg-[#e7f1fb]",
          "[&_section_h2]:text-[#0d2447]",
          "[&_section_h2]:font-black",
          "[&_section_p]:text-[#27476f]",
          "[&_section_li]:text-[#27476f]",
          "[&_section_td]:text-[#27476f]",
          "[&_section_th]:text-[#203c63]",
          "[&_a]:text-[#0d2447]",
          "[&_a]:font-semibold",
          "[&_code]:!rounded",
          "[&_code]:!border",
          "[&_code]:!border-[#9db8d4]",
          "[&_code]:!bg-[#f4f9ff]",
          "[&_code]:!px-1.5",
          "[&_code]:!py-0.5",
          "[&_code]:!font-mono",
          "[&_code]:!text-xs",
          "[&_code]:!font-bold",
          "[&_code]:!text-[#0d2447]",
        ].join(" ")}
      >
        <MethodologyNav />

        <ShortFullContent
          pageKey="methodology-freshness"
          summary={
            <>
              Freshness explains how recently each chain has been published and
              how to interpret lag without confusing it with confidence.
            </>
          }
          bullets={[
            <>
              BTC and ETH are expected to refresh on about a 1-day cadence. ARB
              and BASE are expected to refresh on about a 7-day cadence.
            </>,
            <>
              Freshness answers how recent a row is. Confidence answers how
              strong the current evidence is. These are separate dimensions.
            </>,
            <>
              Lag should be read against chain-specific expected cadence, not one
              universal rule.
            </>,
          ]}
          whyItMatters={
            <>
              Users need to know quickly whether a row is current enough for
              their workflow without reading the full policy.
            </>
          }
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
                  Freshness and confidence are related but different. Freshness
                  tells you how current the supporting row is relative to
                  expected publication cadence. Confidence tells you how much
                  evidence supports the analytical state of that row.
                </p>
                <ul className="list-disc pl-5">
                  <li>A row can be on schedule and still low-confidence.</li>
                  <li>
                    A row can be delayed and still mathematically valid as the
                    latest available state.
                  </li>
                  <li>
                    A degraded label means the confidence gate prevented a
                    normal-confidence named label, not that the raw files
                    necessarily disappeared.
                  </li>
                </ul>
              </Section>

              <Section title="Freshness fields">
                <ul className="list-disc pl-5">
                  <li>
                    <InlineCode>updated_through</InlineCode> = latest Gold
                    observation date actually available to the Meta calculation
                  </li>
                  <li>
                    <InlineCode>lag_days_vs_asof_date</InlineCode> =
                    publication-time freshness relative to the row date
                  </li>
                  <li>
                    <InlineCode>lag_days_vs_utc_today</InlineCode> = runtime
                    freshness relative to the current UTC date
                  </li>
                </ul>
              </Section>
            </div>
          }
        />
      </div>
    </main>
  );
}