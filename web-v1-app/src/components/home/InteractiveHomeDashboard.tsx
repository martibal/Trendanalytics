"use client";

import Link from "next/link";
import { useState } from "react";

export type HomeLabel = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";
export type Artifact = "Meta" | "Gold" | "Derived" | "Briefs";
type CheckoutPlan = "basic" | "pro";
type JsonPayload = unknown;
type ExampleKind = "high" | "low";

export type HomeChainSnapshot = {
  id: string;
  ticker: string;
  name: string;
  lag: string;
  regime: HomeLabel;
  confidence: string;
  confidenceValue: number | null;
  dataQuality: number | null;
  labelConfidence: number | null;
  asOf: string;
  oneLiner: string;
  demand: number | null;
  demandLabel: string;
  friction: number | null;
  frictionLabel: string;
  capacity: number | null;
  capacityLabel: string;
  methodologyVersion: string;
  artifacts: Record<Artifact, JsonPayload | null>;
};

export type HomeConfidenceExample = {
  kind: ExampleKind;
  chain: string;
  chainLabel: string;
  date: string;
  regime: HomeLabel;
  confidenceScore: number | null;
  dataQualityScore: number | null;
  labelConfidenceScore: number | null;
  demandScore: number | null;
  frictionScore: number | null;
  capacityScore: number | null;
  dataLag: string;
  oneLiner: string;
};

type Props = {
  snapshots: HomeChainSnapshot[];
  lastRun: string;
  examples: { high: HomeConfidenceExample | null; low: HomeConfidenceExample | null };
};

type InfoId =
  | "regime"
  | "confidence"
  | "demand"
  | "friction"
  | "capacity"
  | "dataQuality"
  | "labelConfidence"
  | "dataLag";

const info: Record<InfoId, { title: string; body: string }> = {
  regime: {
    title: "Regime / status",
    body: "The regime describes the general chain state for that day, based on activity, fees and capacity. It is not a price view.",
  },
  confidence: {
    title: "Confidence",
    body: "How reliable the classification is, based on data quality and how clearly the evidence points to one regime. It is not a probability forecast.",
  },
  demand: {
    title: "Demand",
    body: "How high activity was compared with the chain's own recent norm, using transaction and active-address evidence.",
  },
  friction: {
    title: "Friction",
    body: "How difficult or costly the chain was to use that day, using fee and failure evidence compared with normal conditions.",
  },
  capacity: {
    title: "Capacity",
    body: "How much usable room the chain appeared to have before becoming overloaded.",
  },
  dataQuality: {
    title: "Data quality",
    body: "How complete and reliable the raw data behind the published row was.",
  },
  labelConfidence: {
    title: "Label confidence",
    body: "How clearly the daily numbers pointed to one specific regime instead of sitting between two labels.",
  },
  dataLag: {
    title: "Data lag",
    body: "How old the underlying observation was when the regime was published. BTC and ETH are T+1; ARB and Base are T+7.",
  },
};

const artifacts: Array<{ name: Artifact; title: string; what: string; use: string }> = [
  { name: "Meta", title: "Meta", what: "Regime and confidence for the day.", use: "Join by date + chain in your reports or models." },
  { name: "Gold", title: "Gold", what: "Raw measurements behind the regime.", use: "Verify the label or build your own calculations." },
  { name: "Derived", title: "Derived", what: "Ready-made 7- and 30-day averages.", use: "Skip rebuilding feature engineering." },
  { name: "Briefs", title: "Briefs", what: "A plain-language written sentence.", use: "Paste it into a report or dashboard." },
];

const plans: Array<{ id: "free" | CheckoutPlan; name: string; price: string; summary: string; cta: string }> = [
  { id: "free", name: "Free", price: "$0", summary: "Inspect the public CSV and examples before paying.", cta: "Open free kit" },
  { id: "basic", name: "Basic", price: "$49/mo", summary: "Authenticated daily delivery for one selected chain.", cta: "Start Basic" },
  { id: "pro", name: "Pro", price: "$149/mo", summary: "Authenticated daily delivery for all four chains.", cta: "Start Pro" },
];

function tone(label: HomeLabel) {
  if (label === "STABLE") return "border-emerald-300/35 bg-emerald-300/10 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,.18)]";
  if (label === "HEATING") return "border-amber-300/35 bg-amber-300/10 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,.18)]";
  if (label === "CONGESTED") return "border-rose-300/35 bg-rose-300/10 text-rose-200 shadow-[0_0_24px_rgba(239,68,68,.18)]";
  if (label === "CHEAP") return "border-cyan-300/35 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(56,189,248,.18)]";
  return "border-violet-300/35 bg-violet-300/10 text-violet-200";
}

function pct(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function metric(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

function compactJson(value: JsonPayload) {
  return JSON.stringify(value ?? null, null, 2).slice(0, 1200);
}

function CheckoutButton({ plan, children }: { plan: CheckoutPlan; children: string }) {
  return (
    <form action={`/api/v1/checkout?plan=${plan}`} method="post" className="m-0">
      <button type="submit" className="ua-home-focus inline-flex w-full items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/15 px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-cyan-100/70 hover:bg-cyan-300/20">
        {children}
      </button>
    </form>
  );
}

function InfoButton({ id, activeInfo, setActiveInfo }: { id: InfoId; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  const open = activeInfo === id;
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`Explain ${info[id].title}`}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setActiveInfo(open ? null : id);
        }}
        className="ua-home-focus inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] font-mono text-[10px] text-zinc-300 hover:border-cyan-200/60 hover:text-white"
      >
        ?
      </button>
      {open ? (
        <span className="absolute left-0 top-7 z-50 w-72 rounded-2xl border border-cyan-200/25 bg-[#0A0F15] p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,.85)]">
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">{info[id].title}</span>
          <span className="mt-2 block text-sm leading-6 text-zinc-100">{info[id].body}</span>
        </span>
      ) : null}
    </span>
  );
}

function StatusBadge({ label, activeInfo, setActiveInfo }: { label: HomeLabel; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] ${tone(label)}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
      <InfoButton id="regime" activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
    </span>
  );
}

function MiniMetric({ id, label, value, activeInfo, setActiveInfo }: { id: InfoId; label: string; value: string; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur transition hover:-translate-y-0.5 hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">{label}</p>
        <InfoButton id={id} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
      </div>
      <p className="mt-4 font-mono text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function JsonPreview({ selectedArtifact, selectedExample, chain }: { selectedArtifact: Artifact; selectedExample: HomeConfidenceExample | null; chain: HomeChainSnapshot }) {
  const payload =
    selectedArtifact === "Meta" && selectedExample
      ? {
          chain: selectedExample.chain,
          date: selectedExample.date,
          regime: selectedExample.regime,
          confidence_score: selectedExample.confidenceScore,
          data_quality_score: selectedExample.dataQualityScore,
          label_confidence_score: selectedExample.labelConfidenceScore,
          demand_score: selectedExample.demandScore,
          friction_score: selectedExample.frictionScore,
          capacity_score: selectedExample.capacityScore,
          data_lag: selectedExample.dataLag,
          one_liner: selectedExample.oneLiner,
        }
      : chain.artifacts[selectedArtifact];

  return (
    <pre className="max-h-80 overflow-auto rounded-3xl border border-white/10 bg-black/45 p-5 font-mono text-xs leading-6 text-zinc-100">
      {compactJson(payload)}
    </pre>
  );
}

export default function InteractiveHomeDashboard({ snapshots, lastRun, examples }: Props) {
  const [selectedChainId, setSelectedChainId] = useState(snapshots[0]?.id ?? "bitcoin");
  const [activeInfo, setActiveInfo] = useState<InfoId | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact>("Meta");
  const [exampleKind, setExampleKind] = useState<ExampleKind>("high");

  const selectedChain = snapshots.find((snapshot) => snapshot.id === selectedChainId) ?? snapshots[0];
  const selectedExample = exampleKind === "high" ? examples.high : examples.low;

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto grid min-h-[calc(100vh-7rem)] w-[min(1180px,calc(100%-2rem))] place-items-center py-20" aria-labelledby="hero-title">
        <div className="max-w-4xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200/80">Daily reference data</p>
          <h1 id="hero-title" className="mt-6 text-balance text-4xl font-semibold tracking-[-0.04em] text-white md:text-6xl">
            Urd Atlas is a daily state report for Bitcoin, Ethereum, Arbitrum and Base.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Built for analysts and data teams that need to explain why a number changed, not predict what it becomes.
          </p>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">No price data · No forecasts · No recommendations</p>
          <a href="#today-status" className="ua-home-focus mt-9 inline-flex rounded-full border border-cyan-200/40 bg-cyan-300/15 px-7 py-4 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 hover:border-cyan-100/70">
            See today&apos;s status →
          </a>
        </div>
      </section>

      <section id="today-status" className="mx-auto w-[min(1180px,calc(100%-2rem))] scroll-mt-24 py-16" aria-labelledby="status-title">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-200/75">Step 2</p>
            <h2 id="status-title" className="mt-3 text-3xl font-semibold tracking-[-0.03em] md:text-5xl">Today&apos;s state — four chains, updated {lastRun}.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-zinc-400">Tap any term marked with ? to see a plain-language explanation.</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {snapshots.map((chain) => (
            <button
              key={chain.id}
              type="button"
              onClick={() => setSelectedChainId(chain.id)}
              className={`ua-home-focus rounded-3xl border bg-white/[0.03] p-5 text-left backdrop-blur transition hover:-translate-y-1 hover:border-white/25 ${chain.id === selectedChainId ? "border-cyan-200/45" : "border-white/10"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{chain.ticker}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{chain.name}</p>
                </div>
                <span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] ${tone(chain.regime)}`}>{chain.regime}</span>
              </div>
              <p className="mt-5 font-mono text-2xl font-semibold text-white">{chain.confidence}</p>
              <p className="mt-1 text-xs text-zinc-500">confidence</p>
            </button>
          ))}
        </div>

        {selectedChain ? (
          <div className="mt-6 grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur md:grid-cols-[1fr_1.4fr]">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">{selectedChain.ticker} · {selectedChain.asOf} · {selectedChain.lag}</p>
                  <h3 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">{selectedChain.name}</h3>
                </div>
                <StatusBadge label={selectedChain.regime} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
              </div>
              <p className="mt-6 text-sm leading-7 text-zinc-300">{selectedChain.oneLiner}</p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <MiniMetric id="confidence" label="Confidence" value={selectedChain.confidence} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                <MiniMetric id="dataLag" label="Data lag" value={selectedChain.lag} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <MiniMetric id="demand" label="Demand" value={metric(selectedChain.demand)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
              <MiniMetric id="friction" label="Friction" value={metric(selectedChain.friction)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
              <MiniMetric id="capacity" label="Capacity" value={metric(selectedChain.capacity)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
              <MiniMetric id="dataQuality" label="Data quality" value={pct(selectedChain.dataQuality)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
              <MiniMetric id="labelConfidence" label="Label confidence" value={pct(selectedChain.labelConfidence)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
              <MiniMetric id="dataLag" label="Data lag" value={selectedChain.lag} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
            </div>
          </div>
        ) : null}
      </section>

      <section className="mx-auto w-[min(1180px,calc(100%-2rem))] py-16" aria-labelledby="files-title">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-200/75">Step 3</p>
        <h2 id="files-title" className="mt-3 text-3xl font-semibold tracking-[-0.03em] md:text-5xl">One daily row, four delivered files.</h2>
        <p className="mt-4 max-w-2xl text-zinc-400">All four files describe the same day and chain. Use the layer that matches your technical situation.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {artifacts.map((artifact) => (
            <button
              key={artifact.name}
              type="button"
              onClick={() => setSelectedArtifact(artifact.name)}
              className={`ua-home-focus rounded-3xl border p-5 text-left transition hover:-translate-y-1 ${selectedArtifact === artifact.name ? "border-cyan-200/45 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"}`}
            >
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-200">{artifact.title}</p>
              <p className="mt-4 text-sm leading-6 text-zinc-200">{artifact.what}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{artifact.use}</p>
            </button>
          ))}
        </div>
        <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">Preview</p>
              <h3 className="mt-2 text-2xl font-semibold">{selectedArtifact} example</h3>
            </div>
            <div className="flex gap-2">
              {(["high", "low"] as ExampleKind[]).map((kind) => (
                <button key={kind} type="button" onClick={() => setExampleKind(kind)} className={`ua-home-focus rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] ${exampleKind === kind ? "border-cyan-200/50 bg-cyan-300/15 text-white" : "border-white/10 text-zinc-400"}`}>
                  {kind} confidence
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5">
            {selectedChain ? <JsonPreview selectedArtifact={selectedArtifact} selectedExample={selectedExample} chain={selectedChain} /> : null}
          </div>
          <Link href="/analyst-kit" className="ua-home-focus mt-5 inline-flex rounded-full border border-white/15 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white hover:border-cyan-200/50">
            See more examples →
          </Link>
        </div>
      </section>

      <section className="mx-auto w-[min(1180px,calc(100%-2rem))] py-16" aria-labelledby="start-title">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-200/75">Step 4</p>
        <h2 id="start-title" className="mt-3 text-3xl font-semibold tracking-[-0.03em] md:text-5xl">Get started.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["01", "Choose chains and download a free example.", "No account required. You see the exact file shape before paying."],
            ["02", "Join by date + chain.", "Attach the row to your own daily data without building a classifier."],
            ["03", "Subscribe for daily delivery.", "Choose one chain at $49/mo or all four at $149/mo."],
          ].map(([number, title, body]) => (
            <div key={number} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="font-mono text-xs text-cyan-200">{number}</p>
              <h3 className="mt-5 text-2xl font-semibold">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
        <Link href="/getting-started" className="ua-home-focus mt-6 inline-flex rounded-full border border-cyan-200/35 bg-cyan-300/10 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white hover:border-cyan-100/60">
          Detailed step-by-step guide →
        </Link>
      </section>

      <section id="pricing" className="mx-auto w-[min(1180px,calc(100%-2rem))] py-16" aria-labelledby="pricing-title">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-200/75">Step 5</p>
        <h2 id="pricing-title" className="mt-3 text-3xl font-semibold tracking-[-0.03em] md:text-5xl">Pricing.</h2>
        <p className="mt-4 max-w-2xl text-zinc-400">Chain access is priced as delivery and access, not as a claim that every chain has identical variation.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">{plan.name}</p>
              <p className="mt-4 text-4xl font-semibold">{plan.price}</p>
              <p className="mt-4 min-h-14 text-sm leading-7 text-zinc-400">{plan.summary}</p>
              {plan.id === "free" ? (
                <Link href="/analyst-kit" className="ua-home-focus mt-6 inline-flex w-full justify-center rounded-full border border-white/15 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-white hover:border-cyan-200/50">
                  {plan.cta}
                </Link>
              ) : (
                <div className="mt-6"><CheckoutButton plan={plan.id}>{plan.cta}</CheckoutButton></div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
