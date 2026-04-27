import ShortFullContent from "@/components/site/ShortFullContent";
import PageHero from "@/components/site/PageHero";
import {
  MethodologyNav,
  Section,
  WarningCallout,
  InlineCode,
} from "../_components";

export default function MethodologyBoundariesPage() {
  return (
    <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      <PageHero
        eyebrow="Methodology"
        title="Limitations & Boundaries"
        summary="Disclosure boundaries and analytical interpretation boundaries: what the public trust layer does not reveal, and what the product should not be used to infer."
      />

      <div
        className={[
          "mx-auto max-w-6xl px-6 py-10",
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
          "[&_.border-amber-500\\/20]:!border-amber-400",
          "[&_.border-amber-500\\/20]:!bg-amber-50",
          "[&_.border-amber-500\\/20_*]:!text-[#0d2447]",
          "[&_.border-amber-500\\/20_h3]:!text-amber-700",
        ].join(" ")}
      >
        <MethodologyNav />

        <ShortFullContent
          pageKey="methodology-boundaries"
          summary={
            <>
              This page defines what Urd Atlas discloses publicly, what remains
              private, and why that boundary exists.
            </>
          }
          bullets={[
            <>
              Public docs explain artifact meaning, field semantics,
              verification paths, thresholds, and trust signals.
            </>,
            <>
              Private implementation details such as exact joins, repair rules,
              source schemas, and feature tables are intentionally withheld.
            </>,
            <>
              The goal is auditable outputs and documented behavior without
              enabling source-data reconstruction or pipeline cloning.
            </>,
          ]}
          whyItMatters={
            <>
              A clear boundary makes the black-box portion of the product feel
              disciplined rather than suspicious.
            </>
          }
          fullContent={
            <div className="grid gap-6">
              <Section title="What the public methodology discloses">
                <ul className="list-disc pl-5 text-sm leading-7">
                  <li>Field meaning and artifact ownership</li>
                  <li>Interpretation of confidence, scorecard, regime, and freshness</li>
                  <li>Publicly relevant thresholds and gates</li>
                  <li>Worked examples for deterministic and gated outputs</li>
                </ul>
              </Section>

              <Section title="What the public methodology does not disclose">
                <ul className="list-disc pl-5 text-sm leading-7">
                  <li>Exact upstream AWS schemas or join logic</li>
                  <li>Intermediate feature tables and ingestion repair rules</li>
                  <li>Enough implementation detail to reconstruct raw source rows</li>
                  <li>Enough implementation detail to clone the full private pipeline</li>
                </ul>
              </Section>

              <Section title="Analytical interpretation boundaries">
                <ul className="list-disc pl-5 text-sm leading-7">
                  <li>
                    Labels and scores are chain-relative. A{" "}
                    <InlineCode>CONGESTED</InlineCode> label on Arbitrum says
                    nothing by itself about Ethereum.
                  </li>
                  <li>
                    Labels can change day to day.{" "}
                    <InlineCode>CONGESTED</InlineCode> and{" "}
                    <InlineCode>CHEAP</InlineCode> can be triggered by
                    single-day threshold crossings, while{" "}
                    <InlineCode>HEATING</InlineCode> depends in part on a trend
                    condition.
                  </li>
                  <li>
                    Customers who require multi-day regime stability must apply
                    their own duration filter or smoothing rule downstream.
                  </li>
                  <li>
                    <InlineCode>regime.drivers[].z_robust</InlineCode> and
                    scorecard dimension scores are not expected to be
                    numerically identical, because they use different input
                    series, windows, and purposes.
                  </li>
                  <li>
                    BTC capacity is an instability proxy around the recent
                    block-time norm. It does not distinguish directional “fast”
                    versus “slow” block-time states in the way a raw block time
                    field would.
                  </li>
                  <li>
                    Friction can be elevated because fee burden relative to
                    transferred value is elevated, not only because
                    native-denominated fee size is elevated.
                  </li>
                </ul>
              </Section>

              <section className="rounded-2xl border border-amber-400 bg-amber-50 p-5">
                <h3 className="text-sm font-black text-amber-700">
                  What this means for downstream analytics
                </h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-[#0d2447]">
                  Urd Atlas is designed to publish descriptive, chain-relative
                  analytical states. It is not designed to eliminate all label
                  volatility, provide cross-chain absolute rankings, or serve as
                  a complete substitute for user-defined downstream smoothing and
                  segmentation rules.
                </p>
              </section>
            </div>
          }
        />
      </div>
    </main>
  );
}