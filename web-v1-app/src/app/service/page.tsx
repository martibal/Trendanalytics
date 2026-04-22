import Link from "next/link";
import ShortFullContent from "@/components/site/ShortFullContent";

export default function ServicePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 rounded-3xl border p-8 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Public service policy</div>
        <h1 className="mt-3 text-4xl font-semibold text-white">Service Expectations, Support & Revisions</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          What paying and pre-purchase users can realistically expect from Urd Atlas in terms of support,
          incident handling, data delays, revisions, and operational communication.
        </p>
      </header>
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
            <section className="rounded-2xl border p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-white">Support channel</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                <p>Primary support contact: <a className="underline" href="mailto:support@urdatlas.com">support@urdatlas.com</a>.</p>
                <p>Reply target: within 2–4 business days. Faster responses may happen, but this is the public expectation baseline.</p>
                <p>Production-impacting incidents or access problems should be reported with chain, date, endpoint used, and a copy of the returned error if available.</p>
              </div>
            </section>
            <section className="rounded-2xl border p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-white">What counts as an incident</h2>
              <ul className="mt-4 list-disc pl-5 text-sm leading-7 text-muted-foreground">
                <li>Published rows missing beyond expected chain cadence.</li>
                <li>File delivery returning incorrect entitlement decisions or malformed JSON.</li>
                <li>Named regime rows or scorecard outputs that are provably inconsistent with the published methodology.</li>
                <li>Customer-facing freshness, provenance, or revision information that materially misstates the state of the archive.</li>
              </ul>
            </section>
            <section className="rounded-2xl border p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-white">Incident and revision handling</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                <p>Status updates for persistent delays or operational issues should be posted on <Link href="/status" className="underline">/status</Link>.</p>
                <p>Corrections that affect archived artifacts should be accompanied by a correction note or changelog entry explaining whether the change was docs-only, interpretation-only, a methodology change, or a historical correction.</p>
                <p>Freshness issues, upstream data issues, methodology changes, and historical corrections are distinct classes of event and should be communicated as such.</p>
                <p>Urd Atlas depends on AWS upstream publication timing. If AWS publishes later than usual, that delay is outside the direct control of Urd Atlas. The pipeline still checks for newly available data automatically twice daily to catch late-arriving upstream files as soon as they appear.</p>
              </div>
            </section>
            <section className="rounded-2xl border p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-white">Buyer fit and cadence expectations</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                <p>BTC and ETH are intended for near-daily regime conditioning and monitoring workflows when AWS upstream publication remains on its normal cadence.</p>
                <p>ARB and BASE are published on a slower cadence by design and are better suited to state-aware monitoring, historical segmentation, and notebook research than to intraday execution workflows.</p>
                <p>Urd Atlas is not an intraday execution feed. It is a descriptive regime and context product.</p>
              </div>
            </section>
          </div>
        }
      />
    </main>
  );
}
