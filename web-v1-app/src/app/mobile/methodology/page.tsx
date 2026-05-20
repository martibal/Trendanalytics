import Link from "next/link";

import {
  MobileCard,
  MobilePage,
  MobilePill,
  MobilePrimaryLink,
  MobileSection,
} from "@/components/mobile/MobileShell";

const PIPELINE_STEPS = [
  {
    n: "01",
    title: "Public chain activity",
    body: "The source evidence is blockchain network behavior: transaction counts, fees, block timing, execution quality, and capacity proxies where those semantics are valid for the chain.",
    caveat: "The product does not ingest price data, exchange data, forecasts, social media or advisory signals.",
  },
  {
    n: "02",
    title: "Daily feature aggregation",
    body: "Raw observations are reduced into daily UTC measurements per chain. This is where noisy source rows become chain-date evidence.",
    caveat: "Raw source rows are not redistributed. Customers receive aggregated, derived and interpretive JSON artifacts.",
  },
  {
    n: "03",
    title: "Gold and Derived",
    body: "Gold records daily observations. Derived applies deterministic trend context such as rolling windows and moving averages.",
    caveat: "Derived contextualizes movement. It does not predict future movement.",
  },
  {
    n: "04",
    title: "Meta classification",
    body: "Meta turns demand, friction and capacity evidence into a daily descriptive label with scorecard, drivers, freshness and determinism metadata.",
    caveat: "Labels are descriptive reference data, not investment advice or trading instructions.",
  },
  {
    n: "05",
    title: "Confidence v2",
    body: "Confidence combines profile-aware data quality with label-specific evidence strength using sqrt(data_quality_score × label_confidence_score).",
    caveat: "Weak evidence remains weak. UNKNOWN/DEGRADED is allowed instead of forcing a named label.",
  },
  {
    n: "06",
    title: "Briefs and publication",
    body: "Briefs summarize already-published Meta context in readable JSON. The website and API consume the same published artifact set.",
    caveat: "Briefs explain the data. They do not create or override the classification.",
  },
] as const;

const LABELS = [
  ["STABLE", "Normal enough relative to chain history; may still have adjacent pressure below a regime threshold."],
  ["HEATING", "Demand-led pressure with rule support. Not just a one-word synonym for price excitement."],
  ["CONGESTED", "Elevated friction/capacity pressure based on the chain's valid evidence surface."],
  ["CHEAP", "Low-friction state relative to that chain's own history."],
  ["UNKNOWN/DEGRADED", "Evidence quality is not strong enough to publish a normal label."],
] as const;

export default function MobileMethodologyPage() {
  return (
    <MobilePage
      active="methodology"
      eyebrow="Mobile methodology"
      title={<>How Urd Atlas turns chain activity into reference data.</>}
      subtitle={
        <>
          A compact, mobile-native explanation of the same process documented in
          the full methodology pages: Gold, Derived, Meta, Briefs and Confidence v2.
        </>
      }
      backHref="/mobile"
    >
      <MobileSection eyebrow="Core idea" title="One process, four published layers.">
        <MobileCard tone="gold">
          <p className="text-[13px] leading-6 text-[#f2dfbd]">
            Urd Atlas starts with public blockchain activity and publishes four JSON
            layers: Gold records what happened, Derived adds trend context, Meta
            classifies the current regime and confidence, and Briefs explain the
            latest state in readable form.
          </p>
        </MobileCard>
      </MobileSection>

      <MobileSection eyebrow="Pipeline" title="The mobile A-to-Z version.">
        <div className="space-y-3">
          {PIPELINE_STEPS.map((step) => (
            <MobileCard key={step.n}>
              <div className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#c49230]/32 bg-[#c49230]/12 text-[10px] font-black text-[#f5d386]">
                  {step.n}
                </span>
                <div>
                  <div className="text-[14px] font-black text-white">{step.title}</div>
                  <p className="mt-1 text-[12px] leading-6 text-[#d7e8fb]">{step.body}</p>
                  <p className="mt-2 text-[11px] leading-5 text-[#9eb4cf]">{step.caveat}</p>
                </div>
              </div>
            </MobileCard>
          ))}
        </div>
      </MobileSection>

      <MobileSection eyebrow="Confidence v2" title="Confidence is evidence quality, not decoration.">
        <MobileCard tone="blue">
          <div className="rounded-2xl border border-white/10 bg-black/[0.18] p-3">
            <code className="block text-center font-mono text-[12px] text-[#f5d386]">
              confidence_score = sqrt(data_quality_score × label_confidence_score)
            </code>
          </div>
          <div className="mt-4 space-y-3 text-[12px] leading-6 text-[#d7e8fb]">
            <p>
              <strong className="text-white">data_quality_score</strong> asks whether
              the relevant evidence surface for that chain is complete, fresh and usable.
            </p>
            <p>
              <strong className="text-white">label_confidence_score</strong> asks whether
              the evidence clearly supports the specific label being published.
            </p>
            <p>
              Structurally non-applicable fields are excluded. Bitcoin is not penalized
              for missing Ethereum-only gas fields, and L2 freshness is evaluated against
              the L2 publication policy.
            </p>
          </div>
        </MobileCard>
      </MobileSection>

      <MobileSection eyebrow="Labels" title="How to read the regime vocabulary.">
        <div className="space-y-2">
          {LABELS.map(([label, text]) => (
            <MobileCard key={label}>
              <div className="flex items-start justify-between gap-3">
                <strong className="text-[13px] text-white">{label}</strong>
                <MobilePill tone={label === "UNKNOWN/DEGRADED" ? "gray" : "blue"}>label</MobilePill>
              </div>
              <p className="mt-2 text-[12px] leading-6 text-[#d7e8fb]">{text}</p>
            </MobileCard>
          ))}
        </div>
      </MobileSection>

      <MobileSection eyebrow="Scorecard vs regime" title="Pressure can appear before a label changes.">
        <MobileCard tone="warning">
          <p className="text-[12px] leading-6 text-[#f2dfbd]">
            The scorecard and the regime label are related but not identical. A chain can be
            STABLE while Demand is High on the scorecard if the regime-axis rule did not
            cross the HEATING threshold. The status explanation now calls this adjacent
            pressure rather than hiding the nuance.
          </p>
        </MobileCard>
      </MobileSection>

      <MobileSection eyebrow="Read next" title="Mobile-only documentation links.">
        <div className="grid gap-2">
          <MobilePrimaryLink href="/mobile/api-docs">JSON / API reference</MobilePrimaryLink>
          <Link href="/mobile/wiki" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/14 bg-white/[0.075] px-4 text-[13px] font-black text-white">
            Term wiki
          </Link>
          <Link href="/mobile/track-record" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/14 bg-white/[0.075] px-4 text-[13px] font-black text-white">
            Track record
          </Link>
        </div>
      </MobileSection>
    </MobilePage>
  );
}
