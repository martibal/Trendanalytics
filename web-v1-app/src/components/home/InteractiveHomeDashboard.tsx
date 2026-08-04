"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type HomeLabel = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";
export type Artifact = "Meta" | "Gold" | "Derived" | "Briefs";
type JsonPayload = unknown;
type CheckoutPlan = "basic" | "pro";

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
  examples?: {
    high: HomeConfidenceExample | null;
    low: HomeConfidenceExample | null;
  };
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

type InfoContent = {
  title: string;
  body: string;
  calculation: string;
  link?: string;
};

type Plan = {
  id: "free" | "basic" | "pro";
  name: string;
  price: string;
  cadence: string;
  summary: string;
  action: string;
  href?: string;
  checkoutPlan?: CheckoutPlan;
  accent: "emerald" | "cyan" | "amber";
};

type ArtifactCard = {
  artifact: Artifact;
  title: string;
  contains: string;
  value: string;
  accent: "emerald" | "cyan" | "amber" | "violet";
};

const artifactCards: ArtifactCard[] = [
  {
    artifact: "Meta",
    title: "Meta",
    contains: "Regime and confidence score for the day.",
    value: "Join on date + chain inside your own reports or models.",
    accent: "emerald",
  },
  {
    artifact: "Gold",
    title: "Gold",
    contains: "The measurements behind the regime: fees, activity and block timing.",
    value: "Verify the published state or build your own calculations.",
    accent: "cyan",
  },
  {
    artifact: "Derived",
    title: "Derived",
    contains: "Pre-computed 7- and 30-day averages.",
    value: "Use ready feature engineering instead of rebuilding it yourself.",
    accent: "amber",
  },
  {
    artifact: "Briefs",
    title: "Briefs",
    contains: "A finished plain-language sentence.",
    value: "Paste context straight into a report, note or dashboard.",
    accent: "violet",
  },
];

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "inspect first",
    summary: "Inspect the product and test the CSV join before paying.",
    action: "Download Free Sample CSV",
    href: "/analyst-kit",
    accent: "emerald",
  },
  {
    id: "basic",
    name: "Basic",
    price: "$49/mo",
    cadence: "one chain",
    summary: "Authenticated delivery for one selected chain.",
    action: "Subscribe to one chain",
    checkoutPlan: "basic",
    accent: "cyan",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$149/mo",
    cadence: "all chains",
    summary: "Authenticated delivery across all four supported chains.",
    action: "Subscribe to all chains",
    checkoutPlan: "pro",
    accent: "amber",
  },
];

const info: Record<InfoId, InfoContent> = {
  regime: {
    title: "Regime / status",
    body: "The regime describes the chain's general state that day, based on activity, fees and capacity.",
    calculation: "It is not a price assessment. It is a descriptive label produced from demand, friction and capacity evidence.",
    link: "/methodology",
  },
  confidence: {
    title: "Confidence",
    body: "How strongly the published row is supported by data quality and by evidence pointing toward one regime.",
    calculation: "This is not a probability that the regime is objectively correct. It is a reliability score for reading the row.",
    link: "/validation",
  },
  demand: {
    title: "Demand",
    body: "How high activity was compared with the chain's own recent norm.",
    calculation: "The score is built from chain-activity evidence such as transactions and active-address context.",
    link: "/methodology",
  },
  friction: {
    title: "Friction",
    body: "How difficult or costly the chain was to use that day.",
    calculation: "The score reflects fee pressure and failure-rate context compared with the chain's norm.",
    link: "/methodology",
  },
  capacity: {
    title: "Capacity",
    body: "How much usable room the chain appeared to have before becoming overloaded.",
    calculation: "Use it with demand and friction; alone it is only context, not an instruction.",
    link: "/methodology",
  },
  dataQuality: {
    title: "Data quality",
    body: "How complete and reliable the raw data behind the published row was.",
    calculation: "Freshness, missingness and coverage checks affect this value.",
    link: "/validation",
  },
  labelConfidence: {
    title: "Label confidence",
    body: "How clearly the day's numbers pointed toward one specific regime instead of sitting between two.",
    calculation: "A low value means the label should be treated as weaker context.",
    link: "/validation",
  },
  dataLag: {
    title: "Data lag",
    body: "How many days old the evidence was when the regime was published.",
    calculation: "Bitcoin and Ethereum are T+1. Arbitrum and Base are T+7.",
    link: "/status",
  },
};

function tone(label: HomeLabel) {
  if (label === "STABLE") return { color: "#10B981", soft: "rgba(16,185,129,.13)", glow: "rgba(16,185,129,.32)" };
  if (label === "HEATING") return { color: "#F59E0B", soft: "rgba(245,158,11,.13)", glow: "rgba(245,158,11,.32)" };
  if (label === "CONGESTED") return { color: "#EF4444", soft: "rgba(239,68,68,.13)", glow: "rgba(239,68,68,.30)" };
  if (label === "CHEAP") return { color: "#38BDF8", soft: "rgba(56,189,248,.13)", glow: "rgba(56,189,248,.30)" };
  return { color: "#A78BFA", soft: "rgba(167,139,250,.12)", glow: "rgba(167,139,250,.26)" };
}

function accentClass(accent: "emerald" | "cyan" | "amber" | "violet") {
  if (accent === "emerald") return "border-emerald-300/25 bg-emerald-300/10 text-emerald-200";
  if (accent === "cyan") return "border-cyan-300/25 bg-cyan-300/10 text-cyan-200";
  if (accent === "amber") return "border-amber-300/25 bg-amber-300/10 text-amber-200";
  return "border-violet-300/25 bg-violet-300/10 text-violet-200";
}

function percent(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value <= 1 ? Math.round(value * 100) : Math.round(value)));
}

function metric(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

function short(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Number(value.toFixed(3));
}

function stringifyJson(value: JsonPayload) {
  return JSON.stringify(value ?? null, null, 2);
}

function storagePath(artifact: Artifact, chainId: string) {
  if (artifact === "Briefs") return `data/published/v1/briefs/chains/${chainId}/latest.json`;
  return `data/published/v1/${artifact.toLowerCase()}/${chainId}/latest.json`;
}

function examplePayload(artifact: Artifact, example: HomeConfidenceExample | null, fallback: HomeChainSnapshot) {
  const source = example ?? {
    kind: "high" as const,
    chain: fallback.id,
    chainLabel: fallback.name,
    date: fallback.asOf,
    regime: fallback.regime,
    confidenceScore: fallback.confidenceValue,
    dataQualityScore: fallback.dataQuality,
    labelConfidenceScore: fallback.labelConfidence,
    demandScore: fallback.demand,
    frictionScore: fallback.friction,
    capacityScore: fallback.capacity,
    dataLag: fallback.lag,
    oneLiner: fallback.oneLiner,
  };

  if (artifact === "Meta") {
    return {
      chain: source.chain,
      date: source.date,
      regime: source.regime,
      confidence_score: short(source.confidenceScore),
      data_quality_score: short(source.dataQualityScore),
      label_confidence_score: short(source.labelConfidenceScore),
      data_lag: source.dataLag,
      one_liner: source.oneLiner,
    };
  }

  if (artifact === "Gold") {
    return {
      chain: source.chain,
      date: source.date,
      layer: "gold",
      readable_preview: "Measurements behind the published regime row.",
      demand_related_score: source.demandScore,
      friction_related_score: source.frictionScore,
      capacity_related_score: source.capacityScore,
    };
  }

  if (artifact === "Derived") {
    return {
      chain: source.chain,
      date: source.date,
      layer: "derived",
      rolling_windows: ["7d", "30d"],
      demand_score: source.demandScore,
      friction_score: source.frictionScore,
      capacity_score: source.capacityScore,
    };
  }

  return {
    chain: source.chain,
    date: source.date,
    layer: "briefs",
    title: `${source.chainLabel} ${source.regime}`,
    one_liner: source.oneLiner,
    confidence_score: short(source.confidenceScore),
  };
}

function CheckoutButton({ plan, children }: { plan: CheckoutPlan; children: string }) {
  return (
    <form action={`/api/v1/checkout?plan=${plan}`} method="post" className="m-0">
      <button type="submit" className="ua-home-focus inline-flex w-full items-center justify-center rounded-full border border-cyan-200/40 bg-cyan-300/15 px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-cyan-100/70 hover:bg-cyan-300/20">
        {children}
      </button>
    </form>
  );
}

function InfoPopover({ id, activeInfo, setActiveInfo }: { id: InfoId; activeInfo: InfoId | null; setActiveInfo: (id: InfoId | null) => void }) {
  const open = activeInfo === id;
  const item = info[id];

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Explain ${item.title}`}
        onClick={(event) => {
          event.stopPropagation();
          setActiveInfo(open ? null : id);
        }}
        className="ua-home-focus inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] font-mono text-[10px] text-zinc-300 transition hover:border-cyan-200/45 hover:bg-cyan-300/10 hover:text-white"
      >
        ?
      </button>
      {open ? (
        <span className="absolute left-0 top-7 z-50 w-80 rounded-2xl border border-cyan-200/25 bg-[#080D12] p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,.88)]">
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">{item.title}</span>
          <span className="mt-2 block text-sm leading-6 text-zinc-100">{item.body}</span>
          <span className="mt-3 block text-xs leading-5 text-zinc-400">{item.calculation}</span>
          {item.link ? (
            <Link href={item.link} className="mt-3 inline-flex font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-200 underline-offset-4 hover:underline">
              Read more
            </Link>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

function RegimeBadge({ label, activeInfo, setActiveInfo }: { label: HomeLabel; activeInfo: InfoId | null; setActiveInfo: (id: InfoId | null) => void }) {
  const t = tone(label);
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: t.color, borderColor: `${t.color}66`, background: t.soft, boxShadow: `0 0 22px ${t.glow}` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color, boxShadow: `0 0 16px ${t.color}` }} aria-hidden="true" />
      {label}
      <InfoPopover id="regime" activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
    </span>
  );
}

function MetricBar({ id, label, value, color, activeInfo, setActiveInfo }: { id: "demand" | "friction" | "capacity"; label: string; value: number | null; color: string; activeInfo: InfoId | null; setActiveInfo: (id: InfoId | null) => void }) {
  const pct = percent(value);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/20">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-300">{label}</p>
          <InfoPopover id={id} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
        </div>
        <p className="font-mono text-sm text-white">{metric(value)}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 18px ${color}` }} />
      </div>
    </div>
  );
}

function ChainButton({ chain, active, onClick }: { chain: HomeChainSnapshot; active: boolean; onClick: () => void }) {
  const t = tone(chain.regime);
  return (
    <button
      type="button"
      onClick={onClick}
      className="ua-home-focus rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-white/25"
      style={{ borderColor: active ? `${t.color}88` : "rgba(255,255,255,.10)", background: active ? `linear-gradient(135deg, ${t.soft}, rgba(255,255,255,.035))` : "rgba(255,255,255,.03)", boxShadow: active ? `0 0 34px ${t.glow}` : "none" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{chain.ticker}</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-white">{chain.name}</p>
        </div>
        <span className="h-2 w-2 rounded-full" style={{ background: t.color, boxShadow: `0 0 16px ${t.color}` }} aria-hidden="true" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-zinc-400">{chain.confidence}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: t.color }}>{chain.regime}</p>
      </div>
    </button>
  );
}

function QualityCard({ id, label, value, activeInfo, setActiveInfo, suffix = "%" }: { id: "dataQuality" | "labelConfidence" | "dataLag"; label: string; value: string | number; activeInfo: InfoId | null; setActiveInfo: (id: InfoId | null) => void; suffix?: string }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-[8rem] font-mono text-[9px] uppercase leading-4 tracking-[0.14em] text-zinc-300">{label}</p>
        <InfoPopover id={id} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
      </div>
      <p className="mt-4 whitespace-nowrap font-mono text-xl text-white">{value}{suffix}</p>
    </div>
  );
}

function PricingCard({ plan }: { plan: Plan }) {
  const accent = accentClass(plan.accent);
  return (
    <article className="flex min-h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/20">
      <p className={`inline-flex w-fit rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${accent}`}>{plan.name}</p>
      <div className="mt-5 flex items-end justify-between gap-4">
        <p className="font-mono text-3xl font-semibold text-white">{plan.price}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">{plan.cadence}</p>
      </div>
      <p className="mt-5 text-sm leading-7 text-zinc-300">{plan.summary}</p>
      <div className="mt-auto pt-7">
        {plan.checkoutPlan ? (
          <CheckoutButton plan={plan.checkoutPlan}>{plan.action}</CheckoutButton>
        ) : (
          <Link href={plan.href ?? "/analyst-kit"} className="ua-home-focus inline-flex w-full items-center justify-center rounded-full border border-emerald-200/35 bg-emerald-300/12 px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-emerald-100/70 hover:bg-emerald-300/18">
            {plan.action}
          </Link>
        )}
      </div>
    </article>
  );
}

function JsonModal({ artifact, path, payload, copied, onClose, onCopy }: { artifact: Artifact; path: string; payload: JsonPayload; copied: boolean; onClose: () => void; onCopy: () => void }) {
  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/80 px-4 py-8" role="dialog" aria-modal="true" aria-label={`Full ${artifact} JSON preview`}>
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-[2rem] border border-cyan-200/25 bg-[#070B10] shadow-[0_40px_140px_rgba(0,0,0,.92)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">Published JSON preview</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">{artifact} example</h3>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">{path}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onCopy} className="ua-home-focus rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition hover:border-emerald-200/60">{copied ? "Copied ✓" : "Copy JSON"}</button>
            <button type="button" onClick={onClose} className="ua-home-focus rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-200 transition hover:border-white/25 hover:text-white">Close</button>
          </div>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto p-5 font-mono text-xs leading-6 text-zinc-100"><code>{stringifyJson(payload)}</code></pre>
      </div>
    </div>
  );
}

export default function InteractiveHomeDashboard({ snapshots, lastRun, examples }: Props) {
  const [activeId, setActiveId] = useState(snapshots[0]?.id ?? "bitcoin");
  const [artifact, setArtifact] = useState<Artifact>("Meta");
  const [exampleKind, setExampleKind] = useState<ExampleKind>("high");
  const [copied, setCopied] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [activeInfo, setActiveInfo] = useState<InfoId | null>(null);

  const active = useMemo(() => snapshots.find((chain) => chain.id === activeId) ?? snapshots[0], [activeId, snapshots]);
  const activeTone = tone(active?.regime ?? "UNKNOWN/DEGRADED");
  const example = exampleKind === "high" ? examples?.high ?? null : examples?.low ?? null;
  const previewPayload = active ? examplePayload(artifact, example, active) : {};
  const fullArtifact = active?.artifacts?.[artifact] ?? previewPayload;
  const fullPath = active ? storagePath(artifact, active.id) : "";
  const selectedArtifact = artifactCards.find((item) => item.artifact === artifact) ?? artifactCards[0];

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  if (!active) return null;

  return (
    <main className="relative overflow-hidden bg-background text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl flex-col justify-center px-6 py-20 lg:px-8" aria-labelledby="hero-heading">
        <div className="max-w-4xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">Urd Atlas</p>
          <h1 id="hero-heading" className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
            Urd Atlas — a daily state report for Bitcoin, Ethereum, Arbitrum and Base.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Built for analysts and data teams that need to explain why a number changed — not predict what it becomes.
          </p>
          <p className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-200">
            No price data · No forecasts · No recommendations
          </p>
          <div className="mt-8">
            <a href="#today-status" className="ua-home-focus inline-flex items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/15 px-6 py-4 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white shadow-[0_0_34px_rgba(56,189,248,.22)] transition hover:-translate-y-0.5 hover:border-cyan-200/70 hover:bg-cyan-300/20">
              See today's status →
            </a>
          </div>
        </div>
      </section>

      <section id="today-status" className="scroll-mt-28 border-y border-white/10 bg-white/[0.018] px-6 py-16 lg:px-8" aria-labelledby="status-heading">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-200">Status now</p>
            <h2 id="status-heading" className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Today's state — four chains, updated {lastRun}.</h2>
            <p className="mt-5 text-sm leading-7 text-zinc-400">Click on a chain for more information. Every label below has a plain-language explanation.</p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {snapshots.map((chain) => (
              <ChainButton key={chain.id} chain={chain} active={chain.id === active.id} onClick={() => { setActiveId(chain.id); setActiveInfo(null); setJsonOpen(false); }} />
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.025))] p-5 shadow-[0_40px_120px_rgba(0,0,0,.42)] backdrop-blur-2xl">
            <section className="relative overflow-visible rounded-[1.6rem] border border-white/10 bg-black/30 p-5" style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.06), 0 0 70px ${activeTone.glow}` }}>
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">{active.ticker} · {active.asOf} · {active.lag}</p>
                  <h3 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">{active.name}</h3>
                </div>
                <RegimeBadge label={active.regime} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
              </div>

              <div className="mt-7 grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
                <div className="grid place-items-center rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="font-mono text-5xl font-semibold text-white">{percent(active.confidenceValue)}%</p>
                  <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">Confidence <InfoPopover id="confidence" activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <MetricBar id="demand" label="Demand" value={active.demand} color={activeTone.color} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                  <MetricBar id="friction" label="Friction" value={active.friction} color={activeTone.color} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                  <MetricBar id="capacity" label="Capacity" value={active.capacity} color={activeTone.color} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <QualityCard id="dataQuality" label="Data quality" value={percent(active.dataQuality)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                <QualityCard id="labelConfidence" label="Label confidence" value={percent(active.labelConfidence)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
                <QualityCard id="dataLag" label="Data lag" value={active.lag} activeInfo={activeInfo} setActiveInfo={setActiveInfo} suffix="" />
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8" aria-labelledby="files-heading">
        <div className="max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">Delivered files</p>
          <h2 id="files-heading" className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">One daily row, four deliverables.</h2>
          <p className="mt-5 text-sm leading-7 text-zinc-400">All four files describe the same day and chain — use the layer that matches your technical situation.</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-4">
          {artifactCards.map((item) => (
            <article key={item.artifact} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/20">
              <p className={`inline-flex rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${accentClass(item.accent)}`}>{item.title}</p>
              <p className="mt-5 text-sm leading-6 text-zinc-200">{item.contains}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{item.value}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">Choose layer</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {artifactCards.map((item) => {
                const selected = artifact === item.artifact;
                return (
                  <button key={item.artifact} type="button" onClick={() => { setArtifact(item.artifact); setJsonOpen(false); }} className="ua-home-focus rounded-2xl border p-4 text-left transition hover:-translate-y-0.5" style={{ borderColor: selected ? activeTone.color : "rgba(255,255,255,.10)", background: selected ? activeTone.soft : "rgba(0,0,0,.25)" }}>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-white">{item.title}</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">{item.value}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setExampleKind("high")} className={`ua-home-focus rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] ${exampleKind === "high" ? "border-emerald-200/50 bg-emerald-300/15 text-white" : "border-white/10 bg-white/[0.03] text-zinc-400"}`}>High confidence</button>
              <button type="button" onClick={() => setExampleKind("low")} className={`ua-home-focus rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] ${exampleKind === "low" ? "border-amber-200/50 bg-amber-300/15 text-white" : "border-white/10 bg-white/[0.03] text-zinc-400"}`}>Low confidence</button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
            <div className="mb-4 border-b border-white/10 pb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">Preview</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">{selectedArtifact.title} example</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{example ? `${example.chainLabel} · ${example.date} · ${exampleKind} confidence` : `Current ${active.name} published row`}</p>
            </div>
            <pre className="max-h-[18rem] overflow-auto rounded-2xl border border-white/10 bg-black/55 p-5 font-mono text-xs leading-6 text-zinc-200 whitespace-pre-wrap"><code>{stringifyJson(previewPayload)}</code></pre>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => setJsonOpen(true)} className="ua-home-focus inline-flex items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-300/12 px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-cyan-200/65">Open full JSON</button>
              <button type="button" onClick={() => copyText(stringifyJson(previewPayload))} className="ua-home-focus inline-flex items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-emerald-200/60">{copied ? "Copied ✓" : "Copy preview"}</button>
            </div>
          </div>
        </div>

        <Link href="/analyst-kit" className="ua-home-focus mt-8 inline-flex rounded-full border border-cyan-300/35 bg-cyan-300/12 px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-cyan-200/65">See more examples →</Link>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018] px-6 py-16 lg:px-8" aria-labelledby="start-heading">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-200">Start</p>
          <h2 id="start-heading" className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">Get started.</h2>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"><p className="font-mono text-xs text-cyan-200">01</p><h3 className="mt-4 text-2xl font-semibold text-white">Choose chain and download a free example.</h3><p className="mt-4 text-sm leading-7 text-zinc-400">No account required. You see exactly what the files look like before paying.</p></article>
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"><p className="font-mono text-xs text-cyan-200">02</p><h3 className="mt-4 text-2xl font-semibold text-white">Join on date + chain.</h3><p className="mt-4 text-sm leading-7 text-zinc-400">Connect the file to your own users, fees, model results or activity rows. No classification pipeline to build.</p></article>
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"><p className="font-mono text-xs text-cyan-200">03</p><h3 className="mt-4 text-2xl font-semibold text-white">Subscribe for daily delivery.</h3><p className="mt-4 text-sm leading-7 text-zinc-400">Once the join is useful, choose one chain for $49/mo or all four for $149/mo.</p></article>
          </div>
          <Link href="/getting-started" className="ua-home-focus mt-8 inline-flex rounded-full border border-emerald-300/35 bg-emerald-300/12 px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-emerald-200/65">See a detailed step-by-step guide →</Link>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-28 bg-[linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.055))]" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-200">Pricing</p>
              <h2 id="pricing-heading" className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">Choose delivery after the proof works.</h2>
            </div>
            <p className="max-w-3xl text-sm leading-7 text-zinc-400 lg:justify-self-end">Free is for inspection and prototype joins. Basic and Pro are for authenticated recurring delivery.</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">{plans.map((plan) => <PricingCard key={plan.id} plan={plan} />)}</div>
          <p className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-6 text-zinc-400">Chain access is priced as delivery and access, not as a claim that every chain has identical variation. See <Link href="/validation" className="text-cyan-200 underline-offset-4 hover:underline">Validation</Link> for per-chain differences before you choose.</p>
        </div>
      </section>

      <div className="border-t border-white/10 px-6 py-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        No price data · No forecasts · No recommendations
      </div>

      {jsonOpen ? <JsonModal artifact={artifact} path={fullPath} payload={fullArtifact} copied={copied} onCopy={() => copyText(stringifyJson(fullArtifact))} onClose={() => setJsonOpen(false)} /> : null}
    </main>
  );
}
