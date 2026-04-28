import Link from "next/link";
import ShortFullContent from "@/components/site/ShortFullContent";
import PageHero from "@/components/site/PageHero";
import { UrdContainer, UrdPage } from "@/components/site/UrdDesignSystem";

export default function ServicePage() {
  return (
    <UrdPage>
      <PageHero
        eyebrow="Public service policy"
        title="Service Expectations, Support & Revisions"
        summary="What paying and pre-purchase users can realistically expect from Urd Atlas in terms of support, incident handling, data delays, revisions, and operational communication."
      />
      <UrdContainer className="max-w-5xl">
      <ShortFullContent
        pageKey="service"
        summary={<>This page answers what happens if something is delayed, corrected, or needs support follow-up.</>}
        bullets={[
          <>Primary support channel: <a className="underline" href="mailto:support@urdatlas.com">support@urdatlas.com</a>.</>,
          <>Reply target: within 2–4 business days.</>,
          <>Freshness issues, upstream AWS delays, methodology changes, and historical corrections are different event classes and should be communicated separately.</>,
          <>Urd Atlas checks for new upstream data automatically twice daily.</>,
        ]}
        whyItMatters={<>A buyer should know quickly what normal support looks like and how corrections are handled before trusting the product operationally.</>}
        fullContent={
          <div className="grid gap-6">
            <section className="rounded-3xl border border-[#c9d9ea] bg-[#eaf3fb] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
              <h2 className="text-xl font-semibold text-[#0d2447]">Support channel</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[#27476f]">
                <p>Primary support contact: <a className="underline" href="mailto:support@urdatlas.com">support@urdatlas.com</a>.</p>
                <p>Reply target: within 2–4 business days. Faster responses may happen, but this is the public expectation baseline.</p>
                <p>Production-impacting incidents or access problems should be reported with chain, date, endpoint used, and a copy of the returned error if available.</p>
              </div>
            </section>
            <section className="rounded-3xl border border-[#c9d9ea] bg-[#eaf3fb] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
              <h2 className="text-xl font-semibold text-[#0d2447]">What counts as an incident</h2>
              <ul className="mt-4 list-disc pl-5 text-sm leading-7 text-[#27476f]">
                <li>Published rows missing beyond expected chain cadence.</li>
                <li>File delivery returning incorrect entitlement decisions or malformed JSON.</li>
                <li>Named regime rows or scorecard outputs that are provably inconsistent with the published methodology.</li>
                <li>Customer-facing freshness, provenance, or revision information that materially misstates the state of the archive.</li>
              </ul>
            </section>
            <section className="rounded-3xl border border-[#c9d9ea] bg-[#eaf3fb] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
              <h2 className="text-xl font-semibold text-[#0d2447]">Incident and revision handling</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[#27476f]">
                <p>Status updates for persistent delays or operational issues should be posted on <Link href="/status" className="underline">/status</Link>.</p>
                <p>Corrections that affect archived artifacts should be accompanied by a correction note or changelog entry explaining whether the change was docs-only, interpretation-only, a methodology change, or a historical correction.</p>
                <p>Freshness issues, upstream data issues, methodology changes, and historical corrections are distinct classes of event and should be communicated as such.</p>
                <p>Urd Atlas depends on AWS upstream publication timing. If AWS publishes later than usual, that delay is outside the direct control of Urd Atlas. The pipeline still checks for newly available data automatically twice daily to catch late-arriving upstream files as soon as they appear.</p>
              </div>
            </section>
            <section className="rounded-3xl border border-[#c9d9ea] bg-[#eaf3fb] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
              <h2 className="text-xl font-semibold text-[#0d2447]">Buyer fit and cadence expectations</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[#27476f]">
                <p>BTC and ETH are intended for near-daily regime conditioning and monitoring workflows when AWS upstream publication remains on its normal cadence.</p>
                <p>ARB and BASE are published on a slower cadence by design and are better suited to state-aware monitoring, historical segmentation, and notebook research than to intraday execution workflows.</p>
                <p>Urd Atlas is not an intraday execution feed. It is a descriptive regime and context product.</p>
              </div>
            </section>
          </div>
        }
      />
      </UrdContainer>
    </UrdPage>
  );
}
