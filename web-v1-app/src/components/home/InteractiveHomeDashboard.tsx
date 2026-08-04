"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";

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

type PrismLike = {
  languages: { json?: unknown };
  highlight: (code: string, grammar: unknown, language: string) => string;
};

declare global {
  interface Window {
    Prism?: PrismLike;
  }
}

const info: Record<InfoId, { title: string; body: string }> = {
  regime: {
    title: "Regime / status",
    body: "The regime is the daily state label for a chain. It is produced from network activity, friction and capacity evidence. It is not a price view.",
  },
  confidence: {
    title: "Confidence",
    body: "Headline reliability for the published row. It combines data quality with how clearly the row supports the published label.",
  },
  demand: {
    title: "Demand",
    body: "Demand describes how strong chain activity looked compared with that chain's own recent baseline.",
  },
  friction: {
    title: "Friction",
    body: "Friction describes how difficult or costly the chain was to use that day, using fee and failure evidence.",
  },
  capacity: {
    title: "Capacity",
    body: "Capacity describes whether the chain appeared to have usable room relative to current activity.",
  },
  dataQuality: {
    title: "Data quality",
    body: "Completeness and freshness context for the raw evidence behind the row.",
  },
  labelConfidence: {
    title: "Label confidence",
    body: "How clearly the evidence supports one published label instead of sitting between labels.",
  },
  dataLag: {
    title: "Data lag",
    body: "How old the underlying observation is at publication time. BTC and ETH are normally T+1; ARB and Base are normally T+7.",
  },
};

const artifactCards: Array<{ name: Artifact; icon: string; what: string; use: string }> = [
  { name: "Meta", icon: "◎", what: "Regime, confidence and score vector.", use: "Use it as the daily state row you join to your own data." },
  { name: "Gold", icon: "▦", what: "Daily measurements behind the state row.", use: "Use it to inspect the raw evidence behind the label." },
  { name: "Derived", icon: "⌁", what: "Moving averages and feature context.", use: "Use it when you want feature engineering without rebuilding it." },
  { name: "Briefs", icon: "✦", what: "Readable context from the same evidence.", use: "Use it in reports, internal notes and dashboards." },
];

const plans: Array<{ id: "free" | CheckoutPlan; name: string; price: string; summary: string; cta: string; recommended?: boolean }> = [
  { id: "free", name: "Free", price: "$0", summary: "Inspect the public CSV and examples before paying.", cta: "Open free kit" },
  { id: "basic", name: "Basic", price: "$49/mo", summary: "Authenticated daily delivery for one selected chain.", cta: "Start Basic", recommended: true },
  { id: "pro", name: "Pro", price: "$149/mo", summary: "Authenticated daily delivery for all four chains.", cta: "Start Pro" },
];

function clampPercent(value: number | null) {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function pct(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${clampPercent(value)}%`;
}

function metric(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
}

function compactJson(value: JsonPayload) {
  return JSON.stringify(value ?? null, null, 2).slice(0, 1200);
}

function statusTone(label: HomeLabel) {
  if (label === "STABLE") {
    return {
      badge: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200 shadow-[0_0_26px_rgba(16,185,129,.20)]",
      edge: "border-emerald-300/40 shadow-[0_0_40px_rgba(16,185,129,.10)]",
      fill: "#10B981",
      soft: "rgba(16,185,129,.18)",
    };
  }
  if (label === "HEATING") {
    return {
      badge: "border-amber-300/45 bg-amber-300/10 text-amber-200 shadow-[0_0_26px_rgba(245,158,11,.20)]",
      edge: "border-amber-300/40 shadow-[0_0_40px_rgba(245,158,11,.10)]",
      fill: "#F59E0B",
      soft: "rgba(245,158,11,.18)",
    };
  }
  if (label === "CONGESTED" || label === "UNKNOWN/DEGRADED") {
    return {
      badge: "border-rose-300/45 bg-rose-300/10 text-rose-200 shadow-[0_0_26px_rgba(239,68,68,.20)]",
      edge: "border-rose-300/40 shadow-[0_0_40px_rgba(239,68,68,.10)]",
      fill: "#EF4444",
      soft: "rgba(239,68,68,.18)",
    };
  }
  return {
    badge: "border-sky-300/45 bg-sky-300/10 text-sky-200 shadow-[0_0_26px_rgba(56,189,248,.20)]",
    edge: "border-sky-300/40 shadow-[0_0_40px_rgba(56,189,248,.10)]",
    fill: "#38BDF8",
    soft: "rgba(56,189,248,.18)",
  };
}

function ProgressBar({ value, color }: { value: number | null; color: string }) {
  const width = clampPercent(value);
  return (
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${width}%`, background: color, boxShadow: `0 0 18px ${color}` }} />
    </div>
  );
}

function Sparkline({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 34" className="h-8 w-32 max-w-full opacity-90">
      <path d="M2 24 L14 22 L25 16 L36 18 L48 9 L60 22 L73 17 L86 23 L99 11 L118 13" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 24 L14 22 L25 16 L36 18 L48 9 L60 22 L73 17 L86 23 L99 11 L118 13" fill="none" stroke={color} strokeOpacity="0.18" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoButton({ id, activeInfo, setActiveInfo }: { id: InfoId; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  const open = activeInfo === id;
  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={`Explain ${info[id].title}`}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setActiveInfo(open ? null : id);
        }}
        className="ua-home-focus inline-flex h-5 w-5 min-w-5 items-center justify-center rounded-full border border-white/18 bg-white/[0.06] font-mono text-[10px] text-zinc-200 transition hover:border-white/35 hover:bg-white/[0.10] hover:text-white"
      >
        ?
      </button>
      {open ? (
        <span className="absolute left-0 top-7 z-50 w-80 rounded-2xl border border-white/14 bg-[#080C11] p-4 text-left shadow-[0_24px_90px_rgba(0,0,0,.88)]">
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-sky-200">{info[id].title}</span>
          <span className="mt-2 block text-sm leading-6 text-zinc-100">{info[id].body}</span>
        </span>
      ) : null}
    </span>
  );
}

function StatusBadge({ label, activeInfo, setActiveInfo }: { label: HomeLabel; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone(label).badge}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
      <InfoButton id="regime" activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
    </span>
  );
}

function CheckoutButton({ plan, children }: { plan: CheckoutPlan; children: string }) {
  return (
    <form action={`/api/v1/checkout?plan=${plan}`} method="post" className="m-0">
      <button type="submit" className="ua-home-focus inline-flex w-full items-center justify-center rounded-full border border-white/75 bg-white px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-black transition hover:-translate-y-0.5 hover:bg-zinc-200">
        {children}
      </button>
    </form>
  );
}

function ConfidenceGauge({ chain, activeInfo, setActiveInfo }: { chain: HomeChainSnapshot; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  const tone = statusTone(chain.regime);
  const value = clampPercent(chain.confidenceValue);
  return (
    <div className="flex items-center gap-5 rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
      <div
        className="grid h-32 w-32 shrink-0 place-items-center rounded-full p-[10px] shadow-[0_0_44px_rgba(0,0,0,.45)]"
        style={{ background: `conic-gradient(${tone.fill} ${value}%, rgba(255,255,255,.08) 0)` }}
      >
        <div className="grid h-full w-full place-items-center rounded-full border border-white/10 bg-[#0A0E12] text-center">
          <div>
            <p className="font-mono text-[32px] font-bold leading-none tracking-[-0.05em] text-white">{chain.confidence}</p>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-400">Confidence</p>
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-500">Headline reliability</p>
          <InfoButton id="confidence" activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
        </div>
        <p className="mt-3 text-[16px] leading-7 text-zinc-300">The circular gauge is the primary reliability read for this published row.</p>
      </div>
    </div>
  );
}

function SecondaryMetric({ id, label, icon, value, color, activeInfo, setActiveInfo }: { id: InfoId; label: string; icon: string; value: string; color: string; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  return (
    <div className="group rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_8px_32px_rgba(0,0,0,.24)] backdrop-blur transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]" style={{ borderLeft: `2px solid ${color}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-lg text-zinc-100">{icon}</span>
          <p className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-400">{label}</p>
        </div>
        <InfoButton id={id} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
      </div>
      <p className="mt-5 font-mono text-[36px] font-bold leading-none tracking-[-0.04em] text-white">{value}</p>
      <ProgressBar value={Number.isFinite(Number(value)) ? Number(value) / 100 : null} color={color} />
    </div>
  );
}

function TertiaryMetric({ id, label, value, activeInfo, setActiveInfo }: { id: InfoId; label: string; value: string; activeInfo: InfoId | null; setActiveInfo: (value: InfoId | null) => void }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-black/25 p-4 backdrop-blur transition hover:-translate-y-0.5 hover:border-white/16">
      <div className="flex items-start justify-between gap-3">
        <p className="pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">{label}</p>
        <InfoButton id={id} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
      </div>
      <p className="mt-4 font-mono text-2xl font-bold text-zinc-100">{value}</p>
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
  const json = compactJson(payload);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    function applyHighlighting() {
      const prism = window.Prism;
      if (!prism?.languages?.json) {
        setHighlighted(null);
        return;
      }
      setHighlighted(prism.highlight(json, prism.languages.json, "json"));
    }

    applyHighlighting();
    window.addEventListener("urd-prism-ready", applyHighlighting);
    return () => window.removeEventListener("urd-prism-ready", applyHighlighting);
  }, [json]);

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js" strategy="afterInteractive" />
      <Script
        src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js"
        strategy="afterInteractive"
        onLoad={() => window.dispatchEvent(new Event("urd-prism-ready"))}
      />
      <pre className="ua-json-preview max-h-80 overflow-auto rounded-3xl border border-white/10 bg-black/45 p-5 font-mono text-xs leading-6 text-zinc-100">
        {highlighted ? <code className="language-json" dangerouslySetInnerHTML={{ __html: highlighted }} /> : <code>{json}</code>}
      </pre>
    </>
  );
}

export default function InteractiveHomeDashboard({ snapshots, lastRun, examples }: Props) {
  const [selectedChainId, setSelectedChainId] = useState(snapshots[0]?.id ?? "bitcoin");
  const [activeInfo, setActiveInfo] = useState<InfoId | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact>("Meta");
  const [exampleKind, setExampleKind] = useState<ExampleKind>("high");

  const selectedChain = snapshots.find((snapshot) => snapshot.id === selectedChainId) ?? snapshots[0] ?? null;
  const selectedExample = exampleKind === "high" ? examples.high : examples.low;
  const selectedTone = useMemo(() => statusTone(selectedChain?.regime ?? "UNKNOWN/DEGRADED"), [selectedChain?.regime]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#08090A] text-white">
      <style>{`
        .ua-json-preview .token.property { color: #7dd3fc; }
        .ua-json-preview .token.string { color: #86efac; }
        .ua-json-preview .token.number, .ua-json-preview .token.boolean, .ua-json-preview .token.null { color: #fbbf24; }
        .ua-json-preview .token.punctuation, .ua-json-preview .token.operator { color: rgba(212,212,216,.55); }
      `}</style>

      <section className="relative bg-[linear-gradient(to_bottom,#08090A_0%,#0B1015_88%,#0F1319_100%)]">
        <div className="relative mx-auto grid w-[min(1440px,calc(100%-48px))] gap-16 py-24 md:grid-cols-[0.92fr_1.08fr] md:items-center md:py-28" aria-labelledby="hero-title">
          <div className="absolute inset-y-16 right-0 hidden w-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,.10),transparent_66%)] blur-3xl md:block" aria-hidden="true" />
          <div className="relative z-10">
            <p className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-sky-200/75">Daily reference data</p>
            <h1 id="hero-title" className="mt-6 max-w-3xl text-balance text-[40px] font-semibold leading-[1.02] tracking-[-0.05em] text-white md:text-[64px]">
              Urd Atlas is a daily state report for Bitcoin, Ethereum, Arbitrum and Base.
            </h1>
            <p className="mt-6 max-w-2xl text-[16px] leading-8 text-zinc-300">
              Built for analysts and data teams that need to explain why a number changed, not predict what it becomes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-400">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">No price data</span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">No forecasts</span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">No recommendations</span>
            </div>
            <a href="#today-status" className="ua-home-focus mt-9 inline-flex rounded-full border border-white/75 bg-white px-7 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-black transition hover:-translate-y-0.5 hover:bg-zinc-200">
              See today&apos;s status →
            </a>
          </div>
          <div className="relative z-10 min-h-[360px] rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
            <div className="absolute inset-8 rounded-full border border-sky-200/10" aria-hidden="true" />
            <div className="absolute inset-16 rounded-full border border-emerald-200/10" aria-hidden="true" />
            <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/20 bg-sky-300/5 shadow-[0_0_80px_rgba(56,189,248,.16)]" aria-hidden="true" />
            <div className="grid h-full min-h-[304px] grid-cols-2 place-items-center gap-6">
              {snapshots.map((chain) => {
                const tone = statusTone(chain.regime);
                return (
                  <div key={chain.id} className="rounded-3xl border border-white/10 bg-black/25 px-5 py-4 shadow-[0_12px_46px_rgba(0,0,0,.35)] backdrop-blur">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{chain.ticker}</p>
                    <p className="mt-1 text-lg font-semibold">{chain.name}</p>
                    <p className="mt-2 font-mono text-sm" style={{ color: tone.fill }}>{chain.regime}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="today-status" className="scroll-mt-24 bg-[linear-gradient(to_bottom,#0F1319_0%,#0E1218_88%,#0A0D11_100%)] py-24" aria-labelledby="status-title">
        <div className="mx-auto w-[min(1440px,calc(100%-48px))] rounded-[2rem] border border-white/10 bg-[#0F1319] p-8 shadow-[0_18px_70px_rgba(0,0,0,.38)] md:p-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-sky-200/75">Today&apos;s state — four chains</p>
              <h2 id="status-title" className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] md:text-[40px]">Updated {lastRun}.</h2>
            </div>
            <p className="max-w-md text-[16px] leading-7 text-zinc-400">Tap any term marked with ? to see a plain-language explanation.</p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-4">
            {snapshots.map((chain) => {
              const tone = statusTone(chain.regime);
              const active = chain.id === selectedChainId;
              return (
                <button key={chain.id} type="button" onClick={() => setSelectedChainId(chain.id)} className={`ua-home-focus group rounded-[1.5rem] border bg-white/[0.035] p-5 text-left backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[0.055] ${active ? tone.edge : "border-white/10"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] font-mono text-sm text-white">{chain.ticker.slice(0, 1)}</span>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{chain.ticker}</p>
                        <p className="mt-1 text-xl font-semibold text-white">{chain.name}</p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${tone.badge}`}>{chain.regime}</span>
                  </div>
                  <div className="mt-6 flex items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-[32px] font-bold tracking-[-0.05em] text-white">{chain.confidence}</p>
                      <p className="mt-1 text-sm text-zinc-500">confidence</p>
                    </div>
                    <Sparkline color={tone.fill} />
                  </div>
                </button>
              );
            })}
          </div>

          {selectedChain ? (
            <div className="mt-6 grid gap-6 rounded-[1.75rem] border border-white/10 bg-black/20 p-6 md:grid-cols-[0.86fr_1.14fr]">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-zinc-500">{selectedChain.ticker} · {selectedChain.asOf} · {selectedChain.lag}</p>
                    <h3 className="mt-3 text-[24px] font-semibold tracking-[-0.03em] md:text-[32px]">{selectedChain.name}</h3>
                  </div>
                  <StatusBadge label={selectedChain.regime} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                </div>
                <p className="mt-6 max-w-2xl text-[16px] leading-8 text-zinc-300">{selectedChain.oneLiner}</p>
                <div className="mt-7 grid gap-4">
                  <ConfidenceGauge chain={selectedChain} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-500">Data lag</p>
                    <p className="mt-3 font-mono text-[32px] font-bold text-white">{selectedChain.lag}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5">
                <div className="grid gap-5 lg:grid-cols-3">
                  <SecondaryMetric id="demand" label="Demand" icon="↗" value={metric(selectedChain.demand)} color={selectedTone.fill} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                  <SecondaryMetric id="friction" label="Friction" icon="≈" value={metric(selectedChain.friction)} color={selectedTone.fill} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                  <SecondaryMetric id="capacity" label="Capacity" icon="▤" value={metric(selectedChain.capacity)} color={selectedTone.fill} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  <TertiaryMetric id="dataQuality" label="Data quality" value={pct(selectedChain.dataQuality)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                  <TertiaryMetric id="labelConfidence" label="Label confidence" value={pct(selectedChain.labelConfidence)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                  <TertiaryMetric id="dataLag" label="Data lag" value={selectedChain.lag} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="bg-[linear-gradient(to_bottom,#0A0D11_0%,#0B0F14_88%,#090B0F_100%)] py-24" aria-labelledby="files-title">
        <div className="mx-auto w-[min(1440px,calc(100%-48px))]">
          <div className="grid gap-8 md:grid-cols-[0.45fr_0.55fr] md:items-start">
            <div>
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-sky-200/75">Step 3</p>
              <h2 id="files-title" className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] md:text-[40px]">One daily row. Four delivered files.</h2>
              <p className="mt-5 text-[16px] leading-8 text-zinc-400">Each layer has the same date and chain key, so it can be inspected by humans or joined into a workflow.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {artifactCards.map((artifact) => (
                <button key={artifact.name} type="button" onClick={() => setSelectedArtifact(artifact.name)} className={`ua-home-focus rounded-[1.5rem] border bg-white/[0.035] p-5 text-left backdrop-blur transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055] ${selectedArtifact === artifact.name ? "border-white/25 shadow-[0_12px_40px_rgba(0,0,0,.30)]" : "border-white/10"}`}>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-sm text-zinc-100">{artifact.icon}</span>
                    <h3 className="text-[24px] font-semibold tracking-[-0.03em]">{artifact.name}</h3>
                  </div>
                  <p className="mt-4 text-[16px] leading-7 text-zinc-300">{artifact.what}</p>
                  <p className="mt-3 text-sm leading-6 text-zinc-500">{artifact.use}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:grid-cols-[0.35fr_0.65fr]">
            <div>
              <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-zinc-500">Example preview</p>
              <div className="mt-4 flex gap-2">
                {(["high", "low"] as const).map((kind) => (
                  <button key={kind} type="button" onClick={() => setExampleKind(kind)} className={`ua-home-focus rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition ${exampleKind === kind ? "border-white/50 bg-white text-black" : "border-white/10 bg-black/20 text-zinc-300 hover:border-white/25"}`}>
                    {kind} confidence
                  </button>
                ))}
              </div>
              <p className="mt-5 text-[16px] leading-7 text-zinc-400">Switch the confidence example, then inspect how the selected JSON layer changes.</p>
            </div>
            {selectedChain ? <JsonPreview selectedArtifact={selectedArtifact} selectedExample={selectedExample} chain={selectedChain} /> : null}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(to_bottom,#090B0F_0%,#0A0D11_100%)] py-14" aria-labelledby="start-title">
        <div className="mx-auto w-[min(1440px,calc(100%-48px))]">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-3">
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-sky-200/75">Step 4</p>
              <h2 id="start-title" className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] md:text-[40px]">Get started without building a pipeline.</h2>
            </div>
            {["Open the public CSV", "Join on date + chain", "Keep confidence visible"].map((item, index) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-0.5 hover:border-white/20">
                <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-zinc-500">0{index + 1}</p>
                <h3 className="mt-4 text-[24px] font-semibold tracking-[-0.03em]">{item}</h3>
              </div>
            ))}
          </div>
          <Link href="/getting-started" className="ua-home-focus mt-8 inline-flex rounded-full border border-white/70 bg-white px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-black transition hover:-translate-y-0.5 hover:bg-zinc-200">
            Open getting started →
          </Link>
        </div>
      </section>

      <section id="pricing" className="bg-[linear-gradient(to_bottom,#0A0D11_0%,#08090A_100%)] py-24" aria-labelledby="pricing-title">
        <div className="mx-auto w-[min(1440px,calc(100%-48px))]">
          <div className="mb-8">
            <p className="font-mono text-[12px] font-medium uppercase tracking-[0.08em] text-sky-200/75">Step 5</p>
            <h2 id="pricing-title" className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] md:text-[40px]">Pricing.</h2>
          </div>
          <div className="grid items-stretch gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className={`rounded-[1.75rem] border p-6 transition hover:-translate-y-0.5 ${plan.recommended ? "scale-[1.03] border-cyan-200/55 bg-cyan-300/10 shadow-[0_22px_90px_rgba(34,211,238,.16)]" : "border-white/10 bg-white/[0.025]"}`}>
                <div className="flex min-h-8 items-center justify-between gap-4">
                  <h3 className="text-[24px] font-semibold tracking-[-0.03em]">{plan.name}</h3>
                  {plan.recommended ? <span className="rounded-full border border-cyan-100/40 bg-cyan-300/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-100">Recommended start</span> : null}
                </div>
                <p className="mt-5 font-mono text-[40px] font-bold tracking-[-0.04em]">{plan.price}</p>
                <p className="mt-4 min-h-14 text-[16px] leading-7 text-zinc-400">{plan.summary}</p>
                <div className="mt-6">
                  {plan.id === "free" ? (
                    <Link href="/analyst-kit" className="ua-home-focus inline-flex w-full items-center justify-center rounded-full border border-white/16 bg-white/[0.06] px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:bg-white/[0.10]">
                      {plan.cta}
                    </Link>
                  ) : (
                    <CheckoutButton plan={plan.id}>{plan.cta}</CheckoutButton>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-7 max-w-3xl text-sm leading-6 text-zinc-500">Chain access is priced as delivery and access, not as a claim that every chain has identical variation.</p>
        </div>
      </section>
    </main>
  );
}
