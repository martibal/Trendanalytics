import ShortFullContent from "@/components/site/ShortFullContent";
import { MethodologyHeader, MethodologyNav, Section, WarningCallout, InlineCode } from "../_components";

export default function MethodologyBoundariesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <MethodologyHeader
        title="Limitations & Boundaries"
        description="This page separates disclosure boundaries from analytical interpretation boundaries, so customers can see both what the public trust layer does not reveal and what the product should not be used to infer."
      />
      <MethodologyNav />
      <ShortFullContent
        pageKey="methodology-boundaries"
        summary={<>This page defines what Urd Atlas discloses publicly, what remains private, and why that boundary exists.</>}
        bullets={[
          <>Public docs explain artifact meaning, field semantics, verification paths, thresholds, and trust signals.</>,
          <>Private implementation details such as exact joins, repair rules, source schemas, and feature tables are intentionally withheld.</>,
          <>The goal is auditable outputs and documented behavior without enabling source-data reconstruction or pipeline cloning.</>,
        ]}
        whyItMatters={<>A clear boundary makes the black-box portion of the product feel disciplined rather than suspicious.</>}
        fullContent={
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

        <Section title="Analytical interpretation boundaries">
          <ul className="list-disc pl-5 text-sm leading-7 text-slate-300">
            <li>
              Labels and scores are chain-relative. A <InlineCode>CONGESTED</InlineCode> label on
              Arbitrum says nothing by itself about Ethereum.
            </li>
            <li>
              Labels can change day to day. <InlineCode>CONGESTED</InlineCode> and{" "}
              <InlineCode>CHEAP</InlineCode> can be triggered by single-day threshold crossings,
              while <InlineCode>HEATING</InlineCode> depends in part on a trend condition.
            </li>
            <li>
              Customers who require multi-day regime stability must apply their own duration filter
              or smoothing rule downstream.
            </li>
            <li>
              <InlineCode>regime.drivers[].z_robust</InlineCode> and scorecard dimension scores are
              not expected to be numerically identical, because they use different input series,
              windows, and purposes.
            </li>
            <li>
              BTC capacity is an instability proxy around the recent block-time norm. It does not
              distinguish directional “fast” versus “slow” block-time states in the way a raw block
              time field would.
            </li>
            <li>
              Friction can be elevated because fee burden relative to transferred value is elevated,
              not only because native-denominated fee size is elevated.
            </li>
          </ul>
        </Section>

        <WarningCallout title="What this means for downstream analytics">
          <p>
            Urd Atlas is designed to publish descriptive, chain-relative analytical states. It is
            not designed to eliminate all label volatility, provide cross-chain absolute rankings, or
            serve as a complete substitute for user-defined downstream smoothing and segmentation
            rules.
          </p>
        </WarningCallout>
          </div>
        }
      />
    </main>
  );
}
