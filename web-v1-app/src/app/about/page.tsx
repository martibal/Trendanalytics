// src/app/about/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";

import "server-only";

function ModalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .ta-modal { display: none; }
          .ta-modal:target, .ta-modal.ua-modal-open { display: flex; }
        `,
      }}
    />
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-[#b6cce3] bg-[#d8e9fb] px-1.5 py-0.5 font-mono text-[0.78rem] font-bold text-[#031329]">
      {children}
    </code>
  );
}

function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return (
    <a
      href={`#${id}`}
      className="inline-flex items-center rounded-full border border-blue-200/70 bg-[#d8e9fb] px-3 py-1 text-xs font-extrabold text-[#031329] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:border-white hover:bg-white"
    >
      {label}
    </a>
  );
}

function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <div
      className={
        tone === "dark"
          ? "text-xs font-black uppercase tracking-[0.12em] text-cyan-200/90"
          : "text-[13px] font-black uppercase tracking-[0.12em] text-[#0d2447]"
      }
    >
      {children}
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[14px] border border-[#c9d9ea] bg-[#edf5fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)] ${className}`}
    >
      {children}
    </section>
  );
}

type ExplainPair = { basic: ReactNode; advanced: ReactNode; traceability?: ReactNode };

function ExplainModal({
  id,
  title,
  subtitle,
  pair,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  pair: ExplainPair;
}) {
  return (
    <div id={id} className="ta-modal fixed inset-0 z-[80] items-center justify-center p-4">
      <a
        href="#"
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
        aria-label="Close dialog"
      />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-[2rem] border border-[#8fb5d9] bg-[#d8e9fb] text-[#0a1d3a] shadow-2xl shadow-slate-950/30">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#8fb5d9] px-6 py-5">
          <div>
            <h3 className="text-2xl font-semibold text-[#031329]">{title}</h3>
            {subtitle ? <div className="mt-2 text-sm leading-6 text-[#27476f]">{subtitle}</div> : null}
          </div>
          <a
            href="#"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#8fb5d9] bg-[#eaf3fb] text-xl text-[#27476f] hover:bg-white"
            aria-label="Close dialog"
          >
            ×
          </a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Basic
              </div>
              <div className="mt-3 text-sm leading-7 text-[#0d2447]">{pair.basic}</div>
            </section>
            <details className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5" open>
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Advanced
              </summary>
              <div className="mt-3 text-sm leading-7 text-[#0d2447]">{pair.advanced}</div>
            </details>
          </div>
          {pair.traceability ? (
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Traceability
              </div>
              <div className="mt-3 text-sm leading-7 text-[#27476f]">{pair.traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const whatItDoesExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Blockchains produce enormous amounts of data every day. Transaction counts, fees,
        block times, gas usage — all of it is public. But raw numbers are hard to
        interpret. Is a spike in transactions meaningful or will it reverse tomorrow? Is a
        fee increase a regime shift or just noise from a single application?
      </p>
      <p className="mt-3">
        Urd Atlas answers one question: <span className="font-semibold text-[#031329]">is
        what I am seeing right now a real shift in network conditions, or will it revert
        in a few days?</span>
      </p>
      <p className="mt-3">
        It does this by comparing each chain&apos;s current metrics against its own recent
        history, applying a documented classification model, and publishing a daily
        descriptive label — STABLE, HEATING, CONGESTED, or CHEAP — along with the full
        breakdown of why that label was assigned.
      </p>
      <p className="mt-3">
        Everything is descriptive. No price data. No forecasts. No trading signals. Just a
        clear, documented answer to whether the network is behaving normally, warming up,
        or under pressure.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        Urd Atlas is a deterministic on-chain context layer. It applies a reproducible
        regime classification pipeline to AWS Public Blockchain Data for four chains
        (Bitcoin, Ethereum, Arbitrum, Base), producing daily meta artifacts containing: a
        regime label from a five-state vocabulary, a three-axis scorecard (Demand,
        Friction, Capacity), a ranked driver set, a confidence score, and a determinism
        hash enabling full reproducibility auditing.
      </p>
      <p className="mt-3">
        The methodological commitments are: MAD-based robust z-score standardisation rather
        than mean/std, dual-criterion band classification, a confidence gate that prevents
        named labels under weak evidence, and chain-specific metric profiles that prevent
        EVM semantics from being applied to non-EVM chains.
      </p>
      <p className="mt-3">
        The product&apos;s comparative advantage is methodological transparency. Every
        published field is traceable to its source artifact, every threshold is documented
        and versioned, and every historical label is anchored by a determinism hash that
        makes retroactive reclassification detectable.
      </p>
    </>
  ),
};

const whatItDoesNotExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Urd Atlas deliberately does not do several things that might seem natural for a
        blockchain analytics product. This is not a limitation — it is a design decision.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li><span className="font-semibold text-[#031329]">No price data.</span> If you want to combine regime state with price, you bring your own price data.</li>
        <li><span className="font-semibold text-[#031329]">No forecasts.</span> The model describes the current state. It makes no claim about what will happen next.</li>
        <li><span className="font-semibold text-[#031329]">No trading signals.</span> CONGESTED is not a sell signal. CHEAP is not a buy signal.</li>
        <li><span className="font-semibold text-[#031329]">No opaque outputs.</span> Every number can be traced back to source artifact, formula, and methodology version.</li>
      </ul>
    </>
  ),
  advanced: (
    <>
      <p>
        The interpretation boundary is enforced at the data contract level, not just the UI
        level. No published field contains price data, return forecasts, or advisory
        signals. All outputs are strictly conditional on the current on-chain evidence
        surface and the current methodology version.
      </p>
      <p className="mt-3">
        Adjusting thresholds does not constitute a backtested strategy. Finding that a
        threshold configuration correlates with past returns is an observation about a
        descriptive data series, not a validated trading system.
      </p>
      <p className="mt-3">
        Urd Atlas outputs are appropriate as one input to a broader analytical process. The
        product deliberately does not combine regime context with price views, positioning,
        or market structure.
      </p>
    </>
  ),
};

const dataLayersExplain: ExplainPair = {
  basic: (
    <>
      <p>All published data is organised into three layers, each building on the previous.</p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li><span className="font-semibold text-[#031329]">Gold</span> — raw daily observations: transaction counts, fees, block times, gas usage, active addresses.</li>
        <li><span className="font-semibold text-[#031329]">Meta</span> — the intelligence layer: regime label, confidence score, scorecard, and driver set.</li>
        <li><span className="font-semibold text-[#031329]">Derived</span> — the trend layer: 7-day and 30-day moving averages used in charts.</li>
      </ul>
      <p className="mt-3">Subscribers can download all three layers as JSON files via the API.</p>
    </>
  ),
  advanced: (
    <>
      <p>
        Gold contains canonical daily aggregates in native units, published without
        transformation. Meta applies the regime engine — robust z-score, percentile rank,
        momentum, axis scoring, confidence gating, and deterministic label classification.
      </p>
      <p className="mt-3">
        Derived contains rolling means over the Gold series. The separation keeps the data
        contract auditable: any consumer can independently verify that <InlineCode>metric__ma7</InlineCode> is
        the 7-day arithmetic mean of the corresponding Gold field.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc pl-5">
      <li>Gold: published daily Gold artifact per chain and date</li>
      <li>Meta: published latest Meta artifact per chain</li>
      <li>Derived: published daily Derived artifact per chain and date</li>
    </ul>
  ),
};

const transparencyExplain: ExplainPair = {
  basic: (
    <>
      <p>
        One of the core commitments of this product is that you can always understand where
        a number came from and how it was produced. This is unusual in crypto analytics,
        where many products publish numbers without explaining the methodology behind them.
      </p>
      <p className="mt-3">
        Every page has a traceability section. Every metric has a Basic and Advanced
        explanation. Every regime label is linked to the exact threshold rules that produced
        it. Every historical label is anchored by a determinism hash.
      </p>
      <p className="mt-3">
        When the methodology changes, it gets a new version number and the old version
        remains documented.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        Transparency is implemented at three levels: artifact, classification, and
        methodology. Published JSON files contain methodology context, named regime rows
        carry a determinism hash, and threshold changes require versioned documentation.
      </p>
      <p className="mt-3">
        This matters for backtesting: you can reconstruct exactly which label was published
        on a historical date, under which methodology version, and verify consistency with
        documented rules and published input data.
      </p>
    </>
  ),
};

const dataAttributionExplain: ExplainPair = {
  basic: (
    <>
      <p>
        The underlying blockchain data comes from <span className="font-semibold text-[#031329]">AWS Public Blockchain Data</span> —
        a publicly available dataset of on-chain transactions and blocks for multiple
        networks. Urd Atlas processes this data through its own analytical pipeline.
      </p>
      <p className="mt-3">
        The data itself is public. What Urd Atlas adds is the analytical layer: the model,
        methodology, confidence system, and published outputs.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        AWS Public Blockchain Data provides parquet-format datasets of transactions and
        blocks for supported chains. Urd Atlas ingests these through an ETL pipeline that
        aggregates daily features, computes the statistical processing layer, and publishes
        JSON artifacts.
      </p>
      <p className="mt-3">
        The pipeline is deterministic and idempotent per chain/date. Outputs are versioned by
        methodology version, published dataset revision, and named-row determinism hashes
        where applicable.
      </p>
    </>
  ),
};

const propositionCards = [
  {
    eyebrow: "Mandate",
    title: "Separate regime from noise",
    text: "A narrow daily context layer for BTC, ETH, ARB, and BASE. It classifies persistent network-state changes without mixing in price, forecasts, or advice.",
    bullets: ["STABLE · HEATING · CONGESTED · CHEAP", "Demand · Friction · Capacity", "Confidence-gated labels", "Ranked drivers"],
    modal: "what-it-does-modal",
  },
  {
    eyebrow: "Boundary",
    title: "Strictly descriptive",
    text: "The product describes observed on-chain conditions. It does not tell users what to buy, sell, hold, expect, or forecast.",
    bullets: ["No price data", "No forecasts", "No recommendations", "No opaque signal output"],
    modal: "what-it-does-not-modal",
  },
  {
    eyebrow: "Trust layer",
    title: "Methodology first",
    text: "Every output is tied to a published method, a source artifact, and a versioned data contract. The aim is reproducibility, not narrative commentary.",
    bullets: ["Published thresholds", "Methodology versions", "Determinism hashes", "Basic + Advanced explanations"],
    modal: "transparency-modal",
  },
];

const dataLayers = [
  {
    name: "Gold",
    tag: "raw daily observations",
    path: "gold/<chain>/<date>.json",
    desc: "Canonical daily network metrics: transaction counts, fees, gas usage, block times, block counts, and active-address observations where available.",
  },
  {
    name: "Meta",
    tag: "regime interpretation",
    path: "meta/<chain>/latest.json",
    desc: "The main product output: regime label, confidence, scorecard, drivers, publication context, and methodology/version anchors.",
  },
  {
    name: "Derived",
    tag: "trend series",
    path: "derived/<chain>/<date>.json",
    desc: "Moving-average series built from Gold data, primarily MA7 and MA30 values used for smoothed trend context.",
  },
];

const exploreLinks = [
  { href: "/chains", label: "Chains", desc: "Current regime state across BTC, ETH, ARB, and BASE" },
  { href: "/status", label: "Status", desc: "Publication freshness and data availability" },
  { href: "/track-record", label: "Track record", desc: "Historical labels and archive context" },
  { href: "/thresholds", label: "Thresholds", desc: "Classification bands and rule surfaces" },
  { href: "/glossary", label: "Glossary", desc: "Metric and methodology definitions" },
  { href: "/api-docs", label: "API docs", desc: "JSON access, schema, and workflows" },
];

function DatasetBadge({ dataset }: { dataset: DatasetManifest | null }) {
  return (
    <div className="rounded-[14px] border border-white/12 bg-white/[0.06] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200/90">Dataset context</div>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4 border-b border-[#8fb5d9] pb-3">
          <span className="text-white/70">Published revision</span>
          <span className="font-mono font-bold text-white">{dataset?.version ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-[#8fb5d9] pb-3">
          <span className="text-white/70">Methodology</span>
          <span className="font-mono font-bold text-white">{dataset?.methodology_version ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-white/70">Product mode</span>
          <span className="font-mono font-bold text-cyan-100">descriptive</span>
        </div>
      </div>
    </div>
  );
}

export default async function AboutPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      <ModalStyles />

      <section className="relative isolate overflow-hidden bg-[#031329] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(44,109,255,0.12),transparent_28%),linear-gradient(180deg,#031329_0%,#041327_100%)]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-[140px] sm:px-6 md:pb-20 md:pt-[150px] lg:px-8 lg:pb-[4.4rem] lg:pt-[165px]">
          <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-[820px]">
              <Eyebrow tone="dark">About Urd Atlas</Eyebrow>
              <h1 className="mt-4 max-w-[820px] text-[54px] font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-[58px] lg:text-[68px]">
                Blockchain regime data,
                <span className="block text-[#2f7cff]">stripped down to evidence.</span>
              </h1>
              <p className="mt-7 max-w-[800px] text-[20px] font-semibold leading-8 text-white/88 sm:text-[20px]">
                Urd Atlas is a deterministic, explainable context layer for Bitcoin,
                Ethereum, Arbitrum, and Base. It exists to answer one narrow question: is
                current network activity normal noise, or a persistent change in regime?
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#what-it-does-modal" className="inline-flex h-11 items-center rounded-[8px] bg-blue-600 px-5 text-[13px] font-extrabold text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:bg-blue-700">What it does</a>
                <a href="#what-it-does-not-modal" className="inline-flex h-11 items-center rounded-[8px] border border-blue-300/50 bg-[#051b36]/40 px-5 text-[13px] font-extrabold text-white transition hover:bg-white/[0.06]">What it does not do</a>
                <a href="#transparency-modal" className="inline-flex h-11 items-center rounded-[8px] border border-blue-300/50 bg-[#051b36]/40 px-5 text-[13px] font-extrabold text-white transition hover:bg-white/[0.06]">Transparency model</a>
              </div>
            </div>

            <DatasetBadge dataset={dataset} />
          </header>
        </div>
      </section>

      <section className="relative bg-[linear-gradient(180deg,#eaf5ff_0%,#f5f9ff_58%,#eef6ff_100%)] pb-16 pt-10">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <section className="grid gap-4 lg:grid-cols-3">
            {propositionCards.map((card) => (
              <Panel key={card.title} className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <Eyebrow>{card.eyebrow}</Eyebrow>
                  <MoreLink id={card.modal} />
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-[-0.02em] text-[#0d2447]">{card.title}</h2>
                <p className="mt-3 text-sm font-medium leading-7 text-[#37547b]">{card.text}</p>
                <div className="mt-5 grid gap-2">
                  {card.bullets.map((item) => (
                    <div
                      key={item}
                      className="rounded-[12px] border border-[#c9d9ea] bg-white/45 px-3 py-2 text-sm font-semibold text-[#0d2447]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </section>

          <Panel className="mt-4 p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Eyebrow>Data contract</Eyebrow>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#0d2447]">
                  Three JSON layers, one reproducible pipeline.
                </h2>
                <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-[#37547b]">
                  The product is not a dashboard first and a data service second. The JSON
                  artifacts are the product surface. The website explains, previews, and
                  contextualizes what subscribers can consume directly.
                </p>
              </div>
              <MoreLink id="data-layers-modal" label="Layer detail" />
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              {dataLayers.map((layer) => (
                <div key={layer.name} className="rounded-[14px] border border-[#c9d9ea] bg-white/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-black text-[#0d2447]">{layer.name}</h3>
                    <span className="rounded-full border border-blue-200/70 bg-[#d8e9fb] px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-[#031329]">
                      {layer.tag}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-medium leading-7 text-[#37547b]">{layer.desc}</p>
                  <div className="mt-4"><InlineCode>{layer.path}</InlineCode></div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
            <Panel className="p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Eyebrow>Source data</Eyebrow>
                  <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#0d2447]">
                    Built on public blockchain data, not private market narrative.
                  </h2>
                </div>
                <MoreLink id="attribution-modal" label="Attribution" />
              </div>
              <p className="mt-4 text-sm font-medium leading-7 text-[#37547b]">
                The underlying chain data comes from AWS Public Blockchain Data. Urd Atlas
                adds the analytical layer: daily aggregation, robust historical context,
                regime classification, confidence gating, and published JSON artifacts.
              </p>
              <div className="mt-5 rounded-[14px] border border-[#c9d9ea] bg-white/45 p-4 text-sm font-medium leading-7 text-[#37547b]">
                The distinction matters: the raw data is public; the product value is the
                standardized, documented, reproducible interpretation layer built on top of it.
              </div>
            </Panel>

            <Panel className="p-6 sm:p-7">
              <Eyebrow>Non-advisory boundary</Eyebrow>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.02em] text-[#0d2447]">
                Regime labels are not recommendations.
              </h2>
              <p className="mt-4 text-sm font-medium leading-7 text-[#37547b]">
                A label such as HEATING or CONGESTED describes current network conditions
                under the published methodology. It does not imply direction, price impact,
                portfolio action, or future probability.
              </p>
              <div className="mt-5 grid gap-2 text-sm font-semibold text-[#0d2447]">
                <div className="rounded-[12px] border border-[#c9d9ea] bg-white/45 px-3 py-2">Descriptive output</div>
                <div className="rounded-[12px] border border-[#c9d9ea] bg-white/45 px-3 py-2">Historical context</div>
                <div className="rounded-[12px] border border-[#c9d9ea] bg-white/45 px-3 py-2">No price, forecasts, or advice</div>
              </div>
            </Panel>
          </div>

          <Panel className="mt-4 p-6 sm:p-7">
            <Eyebrow>Explore the product</Eyebrow>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {exploreLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-[14px] border border-[#c9d9ea] bg-white/45 p-4 transition hover:border-blue-300 hover:bg-white/70"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-black text-[#0d2447]">{item.label}</h3>
                    <span className="font-black text-[#557099] transition group-hover:text-[#0d2447]">→</span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6 text-[#557099]">{item.desc}</p>
                </Link>
              ))}
            </div>
          </Panel>

          <details className="mt-4 rounded-[14px] border border-[#c9d9ea] bg-[#edf5fb] p-5 text-[#0d2447] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
            <summary className="cursor-pointer text-sm font-black text-[#0d2447] hover:text-blue-700">
              Data contract and traceability anchors
            </summary>
            <div className="mt-4 grid gap-2 text-sm font-medium leading-7 text-[#37547b]">
              <div>Public provenance anchors: date / updated_through / methodology_version / published revision / regime.determinism_hash</div>
              <div>Current published revision: <InlineCode>{dataset?.version ?? "—"}</InlineCode></div>
              <div>Methodology version: <InlineCode>{dataset?.methodology_version ?? "—"}</InlineCode></div>
              <div>This page is descriptive product documentation and remains aligned with methodology, glossary, status, API docs, and legal pages.</div>
            </div>
          </details>
        </div>
      </section>

      <ExplainModal
        id="what-it-does-modal"
        title="What Urd Atlas does"
        subtitle="The core product question and how it is answered."
        pair={whatItDoesExplain}
      />
      <ExplainModal
        id="what-it-does-not-modal"
        title="What Urd Atlas does not do"
        subtitle="The interpretation boundary and why it exists."
        pair={whatItDoesNotExplain}
      />
      <ExplainModal
        id="transparency-modal"
        title="How transparency works"
        subtitle="Determinism hashes, methodology versioning, and full traceability."
        pair={transparencyExplain}
      />
      <ExplainModal
        id="data-layers-modal"
        title="The three data layers"
        subtitle="Gold, Meta, and Derived — what each contains and why they are separate."
        pair={dataLayersExplain}
      />
      <ExplainModal
        id="attribution-modal"
        title="Data attribution"
        subtitle="Where the underlying blockchain data comes from and how it is processed."
        pair={dataAttributionExplain}
      />
    </main>
  );
}
