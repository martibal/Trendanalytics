// src/components/landing/WhoThisIsFor.tsx
//
// Above-the-fold "who / what for" strip + the two basic/advanced modals it
// opens.
//
// Modal pattern matches the existing JsonExamplePickerModal in page.tsx
// ([&:target]:flex via URL hash). No client-side JS, no external state.

import Link from "next/link";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Audience cards
// ---------------------------------------------------------------------------

const AUDIENCE_CARDS = [
  {
    key: "traders",
    eyebrow: "For traders",
    headline: "Test whether a strategy holds in every chain condition — or only some",
    body:
      "Tag every day in your own backtest with the published on-chain regime, then split your PnL by regime. See which conditions actually carry the edge.",
  },
  {
    key: "analysts",
    eyebrow: "For analysts",
    headline: "Replace vague network commentary with a dated, named state",
    body:
      "Reach for a label, a confidence score, and a ranked driver set instead of writing 'activity has been elevated'. Every claim points to a verifiable row.",
  },
  {
    key: "risk",
    eyebrow: "For risk & compliance",
    headline: "Defend a past decision with the exact label that was published that day",
    body:
      "Every published row carries a determinism hash. Cite it in a post-mortem, an LP report, or an audit and the classification is verifiable, not reconstructed.",
  },
] as const;

// 2x2 grid — visually balanced, not a flat strip
const QUICK_USES = [
  {
    label: "Regime-conditioned backtest split",
    note: "Join a daily label onto your own series and analyse by condition.",
  },
  {
    label: "Confidence-gated pipelines",
    note: "Drop rows below the 0.40 publication threshold from training and live runs.",
  },
  {
    label: "Hash-anchored audit trail",
    note: "Verify any past label against its determinism hash.",
  },
  {
    label: "Multi-chain on one schema",
    note: "BTC, ETH, ARB, BASE in identical JSON — code written once runs across all four.",
  },
] as const;

// ===========================================================================
// Main strip
// ===========================================================================

export default function WhoThisIsFor() {
  return (
    <>
      <section className="relative bg-[linear-gradient(180deg,#eaf5ff_0%,#f5f9ff_58%,#eef6ff_100%)] py-12 lg:py-14">
        <div className="w-full px-5 sm:px-7 lg:px-10 2xl:px-16">
          <div className="rounded-[26px] border border-[#c9d9ea] bg-[#eaf3fb] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)] lg:p-9">

            {/* ---------- Header ----------------------------------------- */}
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <div className="text-[13px] font-black uppercase tracking-[0.18em] text-[#0d2447]">
                  Who this is for · what it is used for
                </div>
                <h2 className="mt-3 max-w-[820px] text-[28px] font-black leading-[1.1] tracking-[-0.035em] text-[#0d2447] sm:text-[32px]">
                  Strict on-chain context, delivered as JSON your existing pipelines can read.
                </h2>
                <p className="mt-3 max-w-[760px] text-[15px] font-medium leading-7 text-[#27476f]">
                  No price. No forecast. No recommendations. A daily, named on-chain state per
                  chain with confidence and provenance — so the same record drives a backtest, a
                  research note, and a compliance citation.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#who-this-is-for-modal"
                  className="inline-flex items-center rounded-[8px] bg-blue-600 px-5 py-2.5 text-[13px] font-extrabold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
                >
                  Who this is for — dig deeper →
                </a>
                <a
                  href="#what-this-is-used-for-modal"
                  className="inline-flex h-10 items-center justify-center rounded-[8px] bg-blue-600 px-5 text-[13px] font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)] transition hover:bg-blue-700"
                >
                  What it is used for — dig deeper →
                </a>
              </div>
            </div>

            {/* ---------- Audience cards --------------------------------- */}
            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              {AUDIENCE_CARDS.map((card) => (
                <div
                  key={card.key}
                  className="flex flex-col rounded-2xl border border-[#9db8d4] bg-[#eef6ff] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_8px_18px_rgba(8,34,71,0.06)]"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#005be8]">
                    {card.eyebrow}
                  </div>
                  <div className="mt-2.5 text-[16px] font-black leading-snug tracking-[-0.01em] text-[#0d2447]">
                    {card.headline}
                  </div>
                  <p className="mt-2.5 text-[13px] font-medium leading-[1.65] text-[#27476f]">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>

            {/* ---------- Concrete uses — 2x2 grid ----------------------- */}
            <div className="mt-6 rounded-2xl border border-[#9db8d4] bg-[#dceaf8] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] lg:p-6">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0d2447]">
                Concrete uses
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {QUICK_USES.map((u) => (
                  <div
                    key={u.label}
                    className="flex items-start gap-3 rounded-xl border border-[#b6cce3] bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                  >
                    <span className="mt-[6px] h-2.5 w-2.5 shrink-0 rounded-full bg-[#2f7cff] shadow-[0_0_0_3px_rgba(47,124,255,0.18)]" />
                    <div>
                      <div className="text-[14px] font-black leading-snug text-[#0d2447]">
                        {u.label}
                      </div>
                      <p className="mt-1 text-[12.5px] font-medium leading-[1.6] text-[#27476f]">
                        {u.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ---------- Boundary line ---------------------------------- */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#c9d9ea] pt-4">
              <div className="text-[12.5px] font-medium leading-[1.6] text-[#557099]">
                Urd Atlas describes current network state. It does not tell you what to trade,
                what to hold, or what to allocate.
              </div>
              <a
                href="#json-example-picker"
                className="text-[12px] font-black text-[#005be8] hover:text-[#003fa8]"
              >
                Inspect sample JSON →
              </a>
            </div>
          </div>

        </div>
      </section>

      <WhoForModal />
      <WhatForModal />
    </>
  );
}

// ===========================================================================
// Modal: Who this is for
// ===========================================================================

function WhoForModal() {
  return (
    <ModalShell
      id="who-this-is-for-modal"
      kicker="Who this is for"
      title="Three working roles, each with a different reason to want a documented on-chain state on every row."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <ModalPanel tone="basic" label="Basic">
          <p>
            Crypto markets move for reasons that are not always visible in the price. Two days can
            show the same price move and yet be driven by completely different conditions on the
            underlying network — how busy it is, how expensive it is to use, how close it is to
            capacity. Urd Atlas measures those conditions every day and gives the day a name:{" "}
            <Strong>STABLE</Strong>, <Strong>HEATING</Strong>, <Strong>CONGESTED</Strong>,{" "}
            <Strong>CHEAP</Strong>, or <Strong>UNKNOWN/DEGRADED</Strong> when the data is not good
            enough to publish a confident label.
          </p>

          <SubHead>Traders use this to test their own strategies.</SubHead>
          <p>
            A strategy that is profitable on average can still lose money systematically in
            specific market conditions. With a regime label on every day, a backtest can be split
            by condition. The strategy is not judged by its average — it is judged by where the
            average actually comes from.
          </p>

          <SubHead>Analysts use this to write concrete notes.</SubHead>
          <p>
            Daily and weekly market notes need specific language about on-chain conditions.
            &ldquo;Activity has been elevated&rdquo; is not verifiable. A named state with a dated
            row, a confidence score, and a ranked driver set is. The analyst writes from data, not
            from impression.
          </p>

          <SubHead>Risk and compliance use this to defend past decisions.</SubHead>
          <p>
            Every published row carries a determinism hash — a fingerprint that proves a
            particular classification was published on a particular date and has not been
            rewritten. Citing the hash in a post-mortem, an LP letter, or an audit closes the loop
            between what was seen at the time and what is being defended now.
          </p>

          <p className="mt-5 text-[#557099]">
            This is not for retail looking for buy and sell signals, and not for teams that
            already run a trusted internal regime model.
          </p>
        </ModalPanel>

        <ModalPanel tone="advanced" label="Advanced">
          <p>
            The intended audience is professional readers who already operate their own
            analytical stack and need a deterministic, externally-published on-chain context
            variable to join against it. Urd Atlas is positioned upstream of analysis, not as
            analysis itself.
          </p>

          <SubHead>Quantitative and systematic desks.</SubHead>
          <p>
            The published meta layer functions as a categorical regime feature on a daily index.
            It can be used directly as a conditioning variable in a regime-switching model, as a
            filter for sample selection, or as a stratification key for performance attribution.
            The categorical state space is finite and stable across methodology versions, with
            explicit versioning of the ruleset (e.g.{" "}
            <Code>regime.ruleset_id = &quot;eth_l1_v1&quot;</Code>) so feature drift is traceable.
          </p>

          <SubHead>Research and analyst desks.</SubHead>
          <p>
            The driver decomposition (<Code>demand</Code>, <Code>friction</Code>,{" "}
            <Code>capacity</Code>) carries per-axis MAD-based robust z-scores, 90-day percentile
            ranks, and 7d-vs-30d momentum, exposing not only the label but the evidence behind
            it. This is what allows a written narrative to cite a specific axis and a specific
            historical position rather than gestural language.
          </p>

          <SubHead>Risk, valuation, and compliance functions.</SubHead>
          <p>
            Each row exposes a <Code>determinism_hash</Code>, a{" "}
            <Code>methodology_version</Code>, and the publication confidence band the row fell
            into at the time of publishing. Together these provide reproducibility guarantees
            adequate for regulator-readable documentation, LP reporting, and post-mortem
            reconstruction. Weak evidence degrades to <Code>UNKNOWN/DEGRADED</Code> rather than
            being smoothed into a named regime, which is the relevant property for defensible
            record-keeping.
          </p>

          <p className="mt-5 text-[#557099]">
            Outside the intended audience: discretionary retail traders seeking entry/exit
            signals, and shops that already operate a trusted in-house regime classifier. Urd
            Atlas does not attempt to replace either.
          </p>
        </ModalPanel>
      </div>
    </ModalShell>
  );
}

// ===========================================================================
// Modal: What this data is used for
// ===========================================================================

function WhatForModal() {
  return (
    <ModalShell
      id="what-this-is-used-for-modal"
      kicker="What this data is used for"
      title="Concrete things subscribers do with the JSON files in their daily work — and what each one looks like in practice."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <ModalPanel tone="basic" label="Basic">
          <p>
            Urd Atlas publishes three JSON files per chain per day. Customers do not look at them
            as charts — they read them with code, join them onto their own data, and let them
            drive something else.
          </p>

          <SubHead>1. Tag every day with a regime, then split your own data by it.</SubHead>
          <p>
            A trader takes her own table of daily PnL, attaches the published regime label to
            each date, and groups the results. She might find that a strategy that looks
            profitable on average actually delivers all of its returns in STABLE periods and
            quietly bleeds during CONGESTED ones. That is not a verdict on the strategy — it is a
            map of when the strategy belongs in the book and when it does not.
          </p>

          <SubHead>2. Filter out unreliable days automatically.</SubHead>
          <p>
            Not every day produces a clean signal. Some days the underlying data is delayed,
            sparse, or noisy. Each row carries a confidence score from 0 to 1 and a publication
            threshold (default 0.40). Below the threshold the label degrades to UNKNOWN/DEGRADED.
            A pipeline can simply drop those rows from training and live execution, and the model
            never learns from a bad day.
          </p>

          <SubHead>3. Read the network in concrete language.</SubHead>
          <p>
            Instead of writing &ldquo;Ethereum activity was elevated this week&rdquo;, an analyst
            reads the driver fields and writes:{" "}
            <span className="italic">
              &ldquo;Ethereum entered CONGESTED on Wednesday, driven primarily by a
              friction-axis spike at the 99th percentile of 90-day history, while demand-axis
              change was within noise.&rdquo;
            </span>{" "}
            The reader can open the row and verify every clause.
          </p>

          <SubHead>4. Prove a past call after the fact.</SubHead>
          <p>
            Each published row has a determinism hash — a short fingerprint tied to its inputs
            and method. Months later, a desk can cite that hash and prove the classification was
            real on that date and has not been edited. This matters for post-mortems, investor
            letters, and internal audit trails.
          </p>

          <SubHead>5. Cover four chains with one piece of code.</SubHead>
          <p>
            Bitcoin, Ethereum, Arbitrum, and Base are very different networks technically, but
            Urd Atlas exposes them in identical schema. A multi-chain analysis that would
            normally require four ingestion pipelines and four normalisation layers becomes one
            query, one parser, one join.
          </p>
        </ModalPanel>

        <ModalPanel tone="advanced" label="Advanced">
          <p>
            The Meta layer is the primary commercial deliverable. It is consumed as a
            deterministic categorical feature whose typical applications fall into the patterns
            below.
          </p>

          <SubHead>Regime-conditioned performance attribution.</SubHead>
          <p>
            Join <Code>status.label</Code> onto a daily PnL or strategy-return series and
            stratify by label. The categorical state space (<Code>STABLE</Code> /{" "}
            <Code>HEATING</Code> / <Code>CONGESTED</Code> / <Code>CHEAP</Code> /{" "}
            <Code>UNKNOWN/DEGRADED</Code>) is finite and stable across methodology versions, so
            longitudinal comparisons remain valid as long as <Code>regime.ruleset_id</Code> and{" "}
            <Code>methodology_version</Code> are tracked alongside the join.
          </p>

          <SubHead>Confidence-gated training and execution.</SubHead>
          <p>
            Filter on <Code>confidence.confidence_score &gt;= threshold</Code> (canonical 0.40,
            configurable upward) before passing rows into a model. This excludes
            publication-threshold failures, lag-induced degradations, and quality-degraded inputs
            from feature ingestion, materially reducing the surface area for label leakage from
            noisy windows.
          </p>

          <SubHead>Driver-level attribution in narrative output.</SubHead>
          <p>
            The <Code>regime.drivers</Code> array exposes per-axis robust z-score (
            <Code>z_robust</Code>), 90-day percentile rank (<Code>pct_90d</Code>), and
            short-vs-medium momentum ratio (<Code>momentum_7d_vs_30d</Code>). This decomposition
            supports written attribution that names a specific axis and a specific historical
            extremity rather than collapsing to a single composite score.
          </p>

          <SubHead>Reproducibility and audit.</SubHead>
          <p>
            Each row carries a 12-character <Code>regime.determinism_hash</Code> derived from
            inputs, ruleset, and methodology version. The hash function is documented, and
            historical published rows are retained verbatim — meaning a counterparty can
            recompute the hash from declared inputs and verify the classification was not
            silently mutated. This satisfies a meaningful fraction of typical audit and
            LP-reporting requirements without bespoke evidence collection.
          </p>

          <SubHead>Cross-chain analysis on one schema.</SubHead>
          <p>
            BTC, ETH, ARB, and BASE share a common Meta schema. Code written against the
            published contract for one chain runs unchanged on the other three, including driver
            axes and confidence semantics. The per-chain ruleset (<Code>eth_l1_v1</Code>,{" "}
            <Code>arb_v1</Code>, etc.) carries the chain-specific calibration, so comparisons
            across chains are normalised by ruleset rather than by ad-hoc rescaling.
          </p>

          <SubHead>Operational integration patterns.</SubHead>
          <p>
            Pull-based: GET the latest meta JSON per chain via the documented endpoint and cache
            locally. Push to internal dashboards, alerting, or notebooks. The published JSON is
            the finished output — there is no aggregation, normalisation, or baseline
            maintenance to carry on the customer side.
          </p>
        </ModalPanel>
      </div>
    </ModalShell>
  );
}

// ===========================================================================
// Modal shell + helpers
// ===========================================================================

function ModalShell({
  id,
  kicker,
  title,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="fixed inset-0 z-[100] hidden items-center justify-center bg-[#020817]/82 px-5 py-8 backdrop-blur-sm [&:target]:flex"
    >
      <a href="#" className="absolute inset-0" aria-label="Close dialog" />

      <section className="relative flex max-h-[88vh] w-full max-w-[1080px] flex-col overflow-hidden rounded-[26px] border border-[#77a8d8] bg-[#cfe4f7] text-[#071d3b] shadow-[0_28px_80px_rgba(3,19,41,0.42),inset_0_1px_0_rgba(255,255,255,0.85)]">
        <div className="flex shrink-0 items-start justify-between gap-5 border-b border-[#8fb5d9] bg-[#d9ebfb] px-7 py-5">
          <div>
            <div className="inline-flex rounded-full border border-[#005be8]/30 bg-[#005be8]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#005be8]">
              {kicker}
            </div>
            <h3 className="mt-3 max-w-[820px] text-[24px] font-black leading-[1.18] tracking-[-0.025em] text-[#071d3b]">
              {title}
            </h3>
          </div>
          <a
            href="#"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#77a8d8] bg-[#edf6ff] text-xl font-black text-[#0d2447] shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] transition hover:bg-white hover:text-[#031329]"
            aria-label="Close dialog"
          >
            ×
          </a>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 pb-7 pt-6">
          {children}
        </div>
      </section>
    </div>
  );
}

function ModalPanel({
  tone,
  label,
  children,
}: {
  tone: "basic" | "advanced";
  label: string;
  children: ReactNode;
}) {
  const panelClass =
    tone === "basic"
      ? "rounded-3xl border border-[#78a8d8] bg-[#bfd9ef] p-6 text-[#071d3b] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_10px_22px_rgba(8,34,71,0.08)]"
      : "rounded-3xl border border-[#6fa1d2] bg-[#b7d4ec] p-6 text-[#071d3b] shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_10px_22px_rgba(8,34,71,0.08)]";

  return (
    <section className={panelClass}>
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#005be8]">
        {label}
      </div>
      <div className="mt-3 space-y-3 text-[13.5px] font-medium leading-[1.7] text-[#0d2447]">
        {children}
      </div>
    </section>
  );
}

function SubHead({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-[13.5px] font-black text-[#071d3b]">{children}</p>;
}

function Strong({ children }: { children: ReactNode }) {
  return <span className="font-black text-[#071d3b]">{children}</span>;
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-[#9db8d4] bg-[#f4f9ff] px-1.5 py-0.5 font-mono text-[12px] font-bold text-[#0d2447]">
      {children}
    </code>
  );
}
