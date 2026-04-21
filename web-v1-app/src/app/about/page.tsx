// src/app/about/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";

import "server-only";

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function ModalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .ta-modal { display: none; }
          .ta-modal:target { display: flex; }
        `,
      }}
    />
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>;
}

function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return (
    <a
      href={`#${id}`}
      className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-500/10"
    >
      {label}
    </a>
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
      <a href="#" className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" aria-label="Close dialog" />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/20 bg-[#071322] shadow-2xl shadow-cyan-950/40">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            {subtitle ? <div className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</div> : null}
          </div>
          <a href="#" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10" aria-label="Close dialog">×</a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-200">Basic</div>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.basic}</div>
            </section>
            <details className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5" open>
              <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Advanced</summary>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.advanced}</div>
            </details>
          </div>
          {pair.traceability ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-300">Traceability</div>
              <div className="mt-3 text-sm leading-7 text-slate-200">{pair.traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Explanations
// ---------------------------------------------------------------------------

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
        Urd Atlas answers one question: <span className="font-medium text-white">is
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
        Urd Atlas is a deterministic on-chain context layer. It applies a
        reproducible regime classification pipeline to AWS Public Blockchain Data for four
        chains (Bitcoin, Ethereum, Arbitrum, Base), producing daily meta artifacts
        containing: a regime label from a five-state vocabulary, a three-axis scorecard
        (Demand, Friction, Capacity), a ranked driver set, a confidence score, and a
        determinism hash enabling full reproducibility auditing.
      </p>
      <p className="mt-3">
        The methodological commitments are: MAD-based robust z-score standardisation
        rather than mean/std (to handle heavy-tailed on-chain distributions), dual-criterion
        band classification (percentile OR z-score, whichever fires first), a confidence
        gate that prevents named labels under weak evidence, and chain-specific metric
        profiles that prevent EVM semantics from being applied to non-EVM chains.
      </p>
      <p className="mt-3">
        The product&apos;s comparative advantage is methodological transparency. Every
        published field is traceable to its source artifact, every threshold is documented
        and versioned, and every historical label is anchored by a determinism hash that
        makes retroactive reclassification detectable. This is the property that makes
        the data useful for backtesting and track-record validation in a way that narrative
        commentary cannot be.
      </p>
    </>
  ),
};

const whatItDoesNotExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Urd Atlas deliberately does not do several things that might seem natural for
        a blockchain analytics product. This is not a limitation — it is a design decision.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-white">No price data.</span> Mixing on-chain
          network state with price charts without explicit labelling is how analysis becomes
          misleading. The two are separate — if you want to combine them, you bring your
          own price data.
        </li>
        <li>
          <span className="font-medium text-white">No forecasts.</span> The model describes
          the current state. It makes no claim about what will happen next. Ethereum being
          HEATING today says nothing about what Ethereum will be tomorrow.
        </li>
        <li>
          <span className="font-medium text-white">No trading signals.</span> CONGESTED is
          not a sell signal. CHEAP is not a buy signal. The labels describe the network,
          not what you should do with it.
        </li>
        <li>
          <span className="font-medium text-white">No opaque outputs.</span> Every number
          on every page can be traced back to its source artifact, its formula, and its
          methodology version. Nothing is hidden.
        </li>
      </ul>
    </>
  ),
  advanced: (
    <>
      <p>
        The interpretation boundary is enforced at the data contract level, not just the
        UI level. No published field contains price data, return forecasts, or advisory
        signals. All outputs are strictly conditional on the current on-chain evidence
        surface and the current methodology version.
      </p>
      <p className="mt-3">
        This has a direct implication for custom threshold use and backtesting. Adjusting
        thresholds does not constitute a backtested strategy. Finding that a particular
        threshold configuration correlates with past returns is an observation about a
        descriptive data series, not a validated trading system. The product does not
        publish the price data or return series required to make such a validation
        methodologically sound.
      </p>
      <p className="mt-3">
        The practical implication is that Urd Atlas outputs are appropriate as one
        input to a broader analytical process. An analyst using this data is expected to
        combine regime context with their own price views, positioning data, and market
        structure analysis. The product deliberately does not do that synthesis.
      </p>
    </>
  ),
};

const dataLayersExplain: ExplainPair = {
  basic: (
    <>
      <p>
        All published data is organised into three layers, each building on the previous.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-white">Gold</span> — the raw daily observations
          from the blockchain: transaction counts, fees, block times, gas usage, active
          addresses. Nothing computed or inferred — just what the network did that day.
        </li>
        <li>
          <span className="font-medium text-white">Meta</span> — the intelligence layer.
          Takes the Gold data and runs it through the analytical model to produce the
          regime label, confidence score, scorecard, and driver set. This is the primary
          product output.
        </li>
        <li>
          <span className="font-medium text-white">Derived</span> — the trend layer. Takes
          the Gold data and produces smoothed 7-day and 30-day moving averages used in the
          charts. Useful for distinguishing brief spikes from sustained trends.
        </li>
      </ul>
      <p className="mt-3">
        Subscribers can download all three layers as JSON files via the API.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        The three-layer architecture reflects a deliberate separation of concerns in the
        published data contract. Gold contains canonical daily aggregates (CANON_COLS) in
        native units, published without transformation. This ensures Gold can be
        independently verified against chain explorers and alternative data vendors.
      </p>
      <p className="mt-3">
        Meta is the statistical processing layer. It applies the regime engine — robust
        z-score, percentile rank, momentum, axis scoring via tanh compression, confidence
        gating, and deterministic label classification — to produce fully documented,
        versioned, and hash-anchored outputs. The meta layer is what subscribers primarily
        consume for quantitative research.
      </p>
      <p className="mt-3">
        Derived contains rolling means (MA7, MA30) over the Gold series. It exists
        separately from Gold because smoothed series are derivative quantities — combining
        them in the same file would make the derivation implicit rather than explicit.
        The separation keeps the data contract auditable: any consumer can independently
        verify that <InlineCode>metric__ma7</InlineCode> is the 7-day arithmetic mean of
        the corresponding Gold field.
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
        One of the core commitments of this product is that you can always understand
        where a number came from and how it was produced. This is unusual in crypto
        analytics, where many products publish numbers without explaining the methodology
        behind them.
      </p>
      <p className="mt-3">
        Every page has a traceability section. Every metric has a Basic and Advanced
        explanation. Every regime label is linked to the exact threshold rules that
        produced it. Every historical label is anchored by a determinism hash — a
        fingerprint that proves the label was produced by a specific, documented
        computation and was not changed after the fact.
      </p>
      <p className="mt-3">
        When the methodology changes, it gets a new version number and the old version
        remains documented. This means you can always compare what the model said under
        one set of rules versus another.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        Transparency is implemented at three levels. At the artifact level, every
        published JSON file contains a <InlineCode>methodology_version</InlineCode> field and publication context such as <InlineCode>updated_through</InlineCode>. At the classification level, the <InlineCode>regime.determinism_hash</InlineCode> is the public integrity anchor for named regime rows, making any material retroactive change to the named regime payload detectable. At the methodology level, threshold or semantic changes require a version bump and are documented in the methodology changelog.
      </p>
      <p className="mt-3">
        This architecture has a practical consequence for backtesting: you can reconstruct
        exactly which regime label was published on any historical date, under which
        methodology version, and verify that the label is consistent with the documented
        rules and the published input data. No narrative retroactive adjustment is possible
        without changing the hash.
      </p>
    </>
  ),
};

const dataAttributionExplain: ExplainPair = {
  basic: (
    <>
      <p>
        The underlying blockchain data comes from{" "}
        <span className="font-medium text-white">AWS Public Blockchain Data</span> — a
        publicly available dataset of on-chain transactions and blocks for multiple networks.
        Urd Atlas processes this data through its own analytical pipeline to produce
        the regime labels, scorecards, and other outputs you see on this site.
      </p>
      <p className="mt-3">
        The data itself is public. What Urd Atlas adds is the analytical layer: the
        model, the methodology, the confidence system, and the published outputs — all
        documented openly.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        AWS Public Blockchain Data provides parquet-format datasets of transactions and
        blocks for supported chains. Urd Atlas ingests these via a Python-based ETL
        pipeline that aggregates daily features (CANON_COLS), computes the statistical
        processing layer (regime engine, scorecard, confidence), and publishes the results
        as immutable JSON artifacts to an S3 bucket.
      </p>
      <p className="mt-3">
        The pipeline is deterministic and idempotent per (chain, date) — rerunning it for
        the same inputs produces the same outputs. Incremental mode skips already-processed
        dates; rebuild mode recomputes all dates. Pipeline outputs are versioned by methodology version, published dataset revision, and named-row determinism hashes where applicable, enabling full public provenance tracking from published artifacts without exposing private pipeline internals.
      </p>
    </>
  ),
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AboutPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <ModalStyles />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
                About this product
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Urd Atlas
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Deterministic, explainable regime context for Bitcoin, Ethereum, Arbitrum,
                and Base. Built to separate persistent network state changes from short-term
                noise — every day, automatically, with full methodology transparency.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <MoreLink id="what-it-does-modal" label="What this product does" />
                <MoreLink id="what-it-does-not-modal" label="What it does not do" />
                <MoreLink id="transparency-modal" label="How transparency works" />
              </div>
            </div>

            {dataset ? (
              <div className="min-w-[200px] rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-xs text-slate-300">
                <div className="font-medium uppercase tracking-[0.12em] text-slate-400">Dataset</div>
                {dataset.version ? (
                  <div className="mt-2">Revision <span className="font-semibold text-white">{dataset.version}</span></div>
                ) : null}
                {dataset.methodology_version ? (
                  <div className="mt-1">Methodology <InlineCode>{dataset.methodology_version}</InlineCode></div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* ── Core proposition cards ────────────────────────────────────────── */}
      <section className="mb-8 grid gap-4 lg:grid-cols-3">

        <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/5 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-300">
              What it does
            </div>
            <MoreLink id="what-it-does-modal" />
          </div>
          <h2 className="mt-3 text-xl font-semibold text-white">
            Separates regime from noise
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Compares each chain&apos;s current on-chain metrics against its own recent
            history and publishes a daily descriptive label — with the full breakdown of
            why that label was assigned.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {["STABLE · HEATING · CONGESTED · CHEAP", "Scorecard: Demand · Friction · Capacity", "Driver set with z-score and percentile", "Confidence score gating publication"].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 shrink-0 text-emerald-400">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-rose-500/15 bg-rose-500/5 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-rose-300">
              What it does not do
            </div>
            <MoreLink id="what-it-does-not-modal" />
          </div>
          <h2 className="mt-3 text-xl font-semibold text-white">
            Strictly descriptive
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            No price data, no forecasts, no trading signals. Every output describes the
            current network state — it says nothing about what will happen next or what
            you should do.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {["No price charts or price data", "No return forecasts or targets", "No buy / sell / hold language", "No opaque model outputs"].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 shrink-0 text-rose-400">✗</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-cyan-500/15 bg-cyan-500/5 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-300">
              How it is built
            </div>
            <MoreLink id="transparency-modal" />
          </div>
          <h2 className="mt-3 text-xl font-semibold text-white">
            Full transparency
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Every threshold is documented. Every label is traceable to its source data.
            Every historical output is anchored by a determinism hash.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {["Open methodology with version history", "Determinism hash per published label", "Basic + Advanced explanations on every page", "Full JSON artifact download for subscribers"].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 shrink-0 text-cyan-400">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

      </section>

      {/* ── Data layers ──────────────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Architecture
            </div>
            <h2 className="mt-1 text-3xl font-semibold">Three published data layers</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              Every number on this site comes from one of three layers. Each builds on the
              previous and can be downloaded independently by subscribers.
            </p>
          </div>
          <MoreLink id="data-layers-modal" label="Technical detail" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {[
            {
              name: "Gold",
              color: "border-yellow-500/20 bg-yellow-500/5 text-yellow-300",
              desc: "Raw daily observations from the blockchain — transaction counts, fees, block times, gas usage, active addresses. Nothing computed. Exactly what the network did.",
              path: "gold/<chain>/<date>.json",
            },
            {
              name: "Meta",
              color: "border-purple-500/20 bg-purple-500/5 text-purple-300",
              desc: "The intelligence layer. Regime label, confidence score, three-axis scorecard, and ranked driver set. This is the primary product output.",
              path: "meta/<chain>/latest.json",
            },
            {
              name: "Derived",
              color: "border-blue-500/20 bg-blue-500/5 text-blue-300",
              desc: "Smoothed 7-day and 30-day moving averages of Gold series. Used in charts to distinguish brief spikes from sustained trends.",
              path: "derived/<chain>/<date>.json",
            },
          ].map(({ name, color, desc, path }) => (
            <div key={name} className={`rounded-2xl border p-5 ${color.split(" ").slice(0, 2).join(" ")} border-opacity-20`}>
              <div className={`text-xs font-semibold uppercase tracking-[0.14em] ${color.split(" ")[2]}`}>
                {name}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{desc}</p>
              <div className="mt-4">
                <InlineCode>{path}</InlineCode>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Data attribution ─────────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Data source
            </div>
            <h2 className="mt-1 text-2xl font-semibold">Built on AWS Public Blockchain Data</h2>
          </div>
          <MoreLink id="attribution-modal" label="Technical detail" />
        </div>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-muted-foreground">
          The underlying blockchain data comes from AWS Public Blockchain Data — a publicly
          available dataset of on-chain transactions and blocks. Urd Atlas adds the
          analytical layer: the model, the methodology, the confidence system, and the
          published outputs.
        </p>
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-xs text-slate-400">
          Data attribution: AWS Public Blockchain Data ·{" "}
          <a
            href="https://registry.opendata.aws/aws-public-blockchain/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline"
          >
            registry.opendata.aws
          </a>
        </div>
      </section>

      {/* ── Navigation strip ─────────────────────────────────────────────── */}
      <section className="mt-10 rounded-3xl border p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Explore</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/chains", label: "Chains", desc: "Current regime for all four networks" },
            { href: "/methodology", label: "Methodology", desc: "Full model documentation" },
            { href: "/glossary", label: "Glossary", desc: "Every term defined at two levels" },
            { href: "/track-record", label: "Track Record", desc: "Historical label archive" },
            { href: "/thresholds", label: "Thresholds", desc: "Classification rules and simulator" },
            { href: "/api-docs", label: "API Docs", desc: "Machine-readable data access" },
          ].map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between rounded-2xl border bg-background/40 px-4 py-3 transition hover:border-cyan-500/30 hover:bg-muted/30"
            >
              <div>
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
              </div>
              <span className="text-xs text-muted-foreground transition group-hover:text-cyan-200">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Data contract ─────────────────────────────────────────────────── */}


      <section className="mt-10 rounded-3xl border p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">More questions?</div>
        <h2 className="mt-2 text-2xl font-semibold text-white">Read the full Q&amp;A</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          The dedicated Q&amp;A page answers skeptical user questions about noise, regime change,
          confidence, baselines, JSON artifacts, and trust signals at both Basic and Advanced levels.
        </p>
        <Link
          href="/faq"
          className="mt-4 inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/10"
        >
          Open Q&amp;A →
        </Link>
      </section>

      <details className="mt-8 rounded-2xl border p-5">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          Data contract and traceability
        </summary>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <div>Public provenance anchors: date / updated_through / methodology_version / published revision / regime.determinism_hash</div>
          <div>Current published revision: <InlineCode>{dataset?.version ?? "—"}</InlineCode></div>
          <div>Methodology version: <InlineCode>{dataset?.methodology_version ?? "—"}</InlineCode></div>
          <div>This page is descriptive product documentation and remains aligned with methodology, glossary, status, API docs, and legal pages.</div>
        </div>
      </details>

      {/* ── All modals ────────────────────────────────────────────────────── */}
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
