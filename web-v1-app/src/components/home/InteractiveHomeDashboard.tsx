"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type HomeLabel = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";
export type Artifact = "Meta" | "Gold" | "Derived" | "Briefs";
type JsonPayload = unknown;
type CheckoutPlan = "basic" | "pro";

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

type Props = {
  snapshots: HomeChainSnapshot[];
  lastRun: string;
};

type InfoId = "regime" | "demand" | "friction" | "capacity" | "confidence" | "dataQuality" | "labelConfidence" | "dataLag" | "firstRead";

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
    contains: "Regime label, confidence score, scorecard and revision ID.",
    value: "The answer you join into reports and models: what state the chain was in, and how strongly the evidence supports it.",
    accent: "emerald",
  },
  {
    artifact: "Gold",
    title: "Gold",
    contains: "Normalized on-chain measurements: transactions, fees, block timing, active addresses and failure context.",
    value: "The evidence behind the answer, useful when you want to verify the published state or build your own calculations.",
    accent: "cyan",
  },
  {
    artifact: "Derived",
    title: "Derived",
    contains: "Pre-computed 7- and 30-day rolling windows with formula and source hash.",
    value: "Feature engineering you do not have to rebuild: versioned rolling windows ready for analysis, dashboards or model inputs.",
    accent: "amber",
  },
  {
    artifact: "Briefs",
    title: "Briefs",
    contains: "Readable summary: headline, short explanation and recent movement pattern.",
    value: "The sentence-level context you paste into a report, internal note or dashboard when a full JSON object is too heavy.",
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
    title: "Regime label",
    body: "The regime is the readable network-state label for the selected chain and date.",
    calculation: "It is produced from demand, friction and capacity evidence. Read it together with confidence: the label says what was published, while confidence says how strongly the evidence supports it.",
    link: "/methodology",
  },
  demand: {
    title: "Demand score",
    body: "Demand describes how strong activity pressure looks for this chain on the published date.",
    calculation: "Demand-side chain measurements are normalized into the daily scorecard. Higher values mean stronger activity pressure relative to recent context.",
    link: "/methodology",
  },
  friction: {
    title: "Friction score",
    body: "Friction describes how much resistance users appear to face when using the chain.",
    calculation: "Friction-related measurements such as fee and congestion pressure are normalized into the daily scorecard.",
    link: "/methodology",
  },
  capacity: {
    title: "Capacity score",
    body: "Capacity describes whether the chain appears to have usable room relative to current activity.",
    calculation: "Capacity-related measurements are normalized into the scorecard. It is context, not a recommendation.",
    link: "/methodology",
  },
  confidence: {
    title: "Confidence score",
    body: "Confidence is the headline reliability score for this published row.",
    calculation: "It combines data quality and label confidence using sqrt(data_quality_score × label_confidence_score).",
    link: "/validation",
  },
  dataQuality: {
    title: "Data quality",
    body: "Data quality tells you whether the row had enough usable evidence to be read responsibly.",
    calculation: "It reflects freshness, missingness and coverage checks for the selected chain and observation date.",
    link: "/validation",
  },
  labelConfidence: {
    title: "Label confidence",
    body: "Label confidence tells you how strongly the evidence supports the published regime label.",
    calculation: "A low value means the label should be treated as weaker context, even when the row exists.",
    link: "/validation",
  },
  dataLag: {
    title: "Data lag",
    body: "Data lag tells you how far behind calendar time the observation is expected to be.",
    calculation: "Bitcoin and Ethereum are T+1. Base and Arbitrum are T+7. This is a delivery/freshness property, not a signal.",
    link: "/status",
  },
  firstRead: {
    title: "Recommended first read",
    body: "This panel tells a new user how to read the selected published state first.",
    calculation: "Read the regime, check confidence, then join the row to your own daily table by date and chain.",
    link: "/analyst-kit",
  },
};

function tone(label: HomeLabel) {
  if (label === "STABLE") return { color: "#10B981", soft: "rgba(16,185,129,.16)", glow: "rgba(16,185,129,.38)" };
  if (label === "HEATING") return { color: "#F59E0B", soft: "rgba(245,158,11,.16)", glow: "rgba(245,158,11,.34)" };
  if (label === "CONGESTED") return { color: "#EF4444", soft: "rgba(239,68,68,.16)", glow: "rgba(239,68,68,.34)" };
  if (label === "CHEAP") return { color: "#38BDF8", soft: "rgba(56,189,248,.16)", glow: "rgba(56,189,248,.34)" };
  return { color: "#A78BFA", soft: "rgba(167,139,250,.14)", glow: "rgba(167,139,250,.28)" };
}

function accentClass(accent: "emerald" | "cyan" | "amber" | "violet") {
  if (accent === "emerald") return "text-emerald-200 border-emerald-300/25 bg-emerald-300/10";
  if (accent === "cyan") return "text-cyan-200 border-cyan-300/25 bg-cyan-300/10";
  if (accent === "amber") return "text-amber-200 border-amber-300/25 bg-amber-300/10";
  return "text-violet-200 border-violet-300/25 bg-violet-300/10";
}

function storagePath(artifact: Artifact, chainId: string) {
  if (artifact === "Briefs") return `data/published/v1/briefs/chains/${chainId}/latest.json`;
  return `data/published/v1/${artifact.toLowerCase()}/${chainId}/latest.json`;
}

function percent(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value <= 1 ? Math.round(value * 100) : Math.round(value)));
}

function metric(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

function shortConfidence(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Number(value.toFixed(3));
}

function stringifyJson(value: JsonPayload) {
  return JSON.stringify(value ?? null, null, 2);
}

function compactPayload(artifact: Artifact, chain: HomeChainSnapshot) {
  if (artifact === "Gold") {
    return {
      chain: chain.id,
      date: chain.asOf,
      layer: "gold",
      measurements: {
        demand_score: chain.demand,
        friction_score: chain.friction,
        capacity_score: chain.capacity,
      },
      join_keys: ["date", "chain"],
    };
  }

  if (artifact === "Derived") {
    return {
      chain: chain.id,
      date: chain.asOf,
      layer: "derived",
      rolling_windows: ["7d", "30d"],
      normalized_scores: {
        demand_score: chain.demand,
        friction_score: chain.friction,
        capacity_score: chain.capacity,
      },
      methodology_version: chain.methodologyVersion,
    };
  }

  if (artifact === "Briefs") {
    return {
      chain: chain.id,
      date: chain.asOf,
      layer: "briefs",
      title: `${chain.name} ${chain.regime}`,
      one_liner: chain.oneLiner,
      confidence_score: shortConfidence(chain.confidenceValue),
    };
  }

  return {
    chain: chain.id,
    date: chain.asOf,
    layer: "meta",
    regime: chain.regime,
    confidence: {
      confidence_score: shortConfidence(chain.confidenceValue),
      data_quality_score: shortConfidence(chain.dataQuality),
      label_confidence_score: shortConfidence(chain.labelConfidence),
    },
    data_lag: chain.lag,
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

function InfoPopover({ id, activeInfo, setActiveInfo, compact = false }: { id: InfoId; activeInfo: InfoId | null; setActiveInfo: (id: InfoId | null) => void; compact?: boolean }) {
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
        className={`ua-home-focus inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] font-mono text-zinc-300 transition hover:border-cyan-200/45 hover:bg-cyan-300/10 hover:text-white ${compact ? "h-5 w-5 text-[10px]" : "px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"}`}
      >
        {compact ? "?" : "info"}
      </button>
      {open ? (
        <span className="absolute left-0 top-7 z-40 w-72 rounded-2xl border border-cyan-200/25 bg-[#0A0F15] p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,.85)]">
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

function Gauge({ value, color, activeInfo, setActiveInfo }: { value: number | null; color: string; activeInfo: InfoId | null; setActiveInfo: (id: InfoId | null) => void }) {
  const pct = percent(value);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full border border-white/10 bg-black/30 text-left shadow-[inset_0_0_32px_rgba(255,255,255,.035)] transition hover:-translate-y-1 hover:border-cyan-200/35">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${dash} ${circumference - dash}`} style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
      </svg>
      <div className="relative text-center">
        <p className="font-mono text-3xl font-semibold text-white">{pct}%</p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">confidence</p>
        <span className="mt-2 flex justify-center"><InfoPopover id="confidence" activeInfo={activeInfo} setActiveInfo={setActiveInfo} compact /></span>
      </div>
    </div>
  );
}

function RegimeBadge({ label, activeInfo, setActiveInfo }: { label: HomeLabel; activeInfo: InfoId | null; setActiveInfo: (id: InfoId | null) => void }) {
  const t = tone(label);
  return (
    <span className="ua-status-badge inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: t.color, borderColor: `${t.color}66`, background: t.soft, boxShadow: `0 0 22px ${t.glow}` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color, boxShadow: `0 0 16px ${t.color}` }} aria-hidden="true" />
      {label}
      <InfoPopover id="regime" activeInfo={activeInfo} setActiveInfo={setActiveInfo} compact />
    </span>
  );
}

function MetricBar({ id, label, value, descriptor, color, activeInfo, setActiveInfo }: { id: "demand" | "friction" | "capacity"; label: string; value: number | null; descriptor: string; color: string; activeInfo: InfoId | null; setActiveInfo: (id: InfoId | null) => void }) {
  const pct = percent(value);

  return (
    <div className="ua-home-card rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setActiveInfo(activeInfo === id ? null : id)} className="ua-home-focus font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white hover:decoration-cyan-200/60">{label}</button>
          <InfoPopover id={id} activeInfo={activeInfo} setActiveInfo={setActiveInfo} compact />
        </div>
        <p className="font-mono text-sm text-white">{metric(value)}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 18px ${color}` }} /></div>
      <p className="mt-3 text-xs leading-5 text-zinc-400">{descriptor}</p>
    </div>
  );
}

function HeroChainSelector({ chain, active, onClick }: { chain: HomeChainSnapshot; active: boolean; onClick: () => void }) {
  const t = tone(chain.regime);

  return (
    <button
      type="button"
      onClick={onClick}
      className="ua-home-focus ua-hero-chain-card rounded-2xl border p-4 text-left transition hover:-translate-y-0.5"
      style={{
        borderColor: active ? `${t.color}88` : "rgba(255,255,255,.10)",
        background: active ? `linear-gradient(135deg, ${t.soft}, rgba(255,255,255,.035))` : "rgba(255,255,255,.025)",
        boxShadow: active ? `0 0 30px ${t.glow}` : "inset 0 1px 0 rgba(255,255,255,.04)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{chain.ticker}</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-white">{chain.name}</p>
        </div>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color, boxShadow: `0 0 16px ${t.color}` }} aria-hidden="true" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-zinc-500">{chain.confidence}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: t.color }}>{chain.regime}</p>
      </div>
    </button>
  );
}

function QualityCard({ id, label, value, activeInfo, setActiveInfo, suffix = "%" }: { id: "dataQuality" | "labelConfidence" | "dataLag"; label: string; value: string | number; activeInfo: InfoId | null; setActiveInfo: (id: InfoId | null) => void; suffix?: string }) {
  return (
    <div className="ua-home-card min-h-[5.5rem] rounded-2xl p-3">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => setActiveInfo(activeInfo === id ? null : id)} className="ua-home-focus max-w-[7rem] text-left font-mono text-[9px] uppercase leading-4 tracking-[0.14em] text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white hover:decoration-cyan-200/60">{label}</button>
        <InfoPopover id={id} activeInfo={activeInfo} setActiveInfo={setActiveInfo} compact />
      </div>
      <p className="mt-2 whitespace-nowrap font-mono text-base text-white">{value}{suffix}</p>
    </div>
  );
}

function FirstReadCard({ chain, activeInfo, setActiveInfo }: { chain: HomeChainSnapshot; activeInfo: InfoId | null; setActiveInfo: (id: InfoId | null) => void }) {
  const confidence = percent(chain.confidenceValue);
  const labelConfidence = percent(chain.labelConfidence);
  const shouldGate = confidence < 70 || labelConfidence < 70;
  const guidance = shouldGate ? "Use this row as context, but keep confidence visible before drawing conclusions." : "This row is a cleaner candidate for a first join test against your own metric.";

  return (
    <div className="ua-home-card relative mt-4 rounded-3xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><button type="button" onClick={() => setActiveInfo(activeInfo === "firstRead" ? null : "firstRead")} className="ua-home-focus font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white hover:decoration-cyan-200/60">Recommended first read</button><InfoPopover id="firstRead" activeInfo={activeInfo} setActiveInfo={setActiveInfo} compact /></div>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{guidance}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300">{chain.lag}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/analyst-kit" className="ua-home-focus rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-100/60 hover:bg-cyan-300/15">Join CSV</Link>
        <Link href="/validation" className="ua-home-focus rounded-full border border-emerald-200/25 bg-emerald-300/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-100 transition hover:border-emerald-100/60 hover:bg-emerald-300/15">Check confidence</Link>
        <Link href={`/chains/${chain.id}`} className="ua-home-focus rounded-full border border-white/10 bg-black/25 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-300 transition hover:border-white/25 hover:text-white">Open chain</Link>
      </div>
    </div>
  );
}

function PricingCard({ plan }: { plan: Plan }) {
  const accent = accentClass(plan.accent);
  return (
    <article className="ua-home-card flex min-h-full flex-col rounded-[2rem] p-6">
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
  const unavailable = payload === null || typeof payload === "undefined";

  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/80 px-4 py-8" role="dialog" aria-modal="true" aria-label={`Full ${artifact} JSON preview`}>
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col rounded-[2rem] border border-cyan-200/25 bg-[#070B10] shadow-[0_40px_140px_rgba(0,0,0,.92)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">Full published JSON</p><h3 className="mt-1 text-xl font-semibold tracking-tight text-white">{artifact} latest.json</h3><p className="mt-1 font-mono text-[10px] text-zinc-500">{path}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={onCopy} disabled={unavailable} className="ua-home-focus rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition hover:border-emerald-200/60 disabled:cursor-not-allowed disabled:opacity-40">{copied ? "Copied ✓" : "Copy JSON"}</button><button type="button" onClick={onClose} className="ua-home-focus rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-200 transition hover:border-white/25 hover:text-white">Close</button></div>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto p-5 font-mono text-xs leading-6 text-zinc-100"><code>{unavailable ? stringifyJson({ error: "Published artifact unavailable in this preview", path }) : stringifyJson(payload)}</code></pre>
      </div>
    </div>
  );
}

export default function InteractiveHomeDashboard({ snapshots }: Props) {
  const [activeId, setActiveId] = useState(snapshots[0]?.id ?? "bitcoin");
  const [artifact, setArtifact] = useState<Artifact>("Meta");
  const [copied, setCopied] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [activeInfo, setActiveInfo] = useState<InfoId | null>(null);

  const active = useMemo(() => snapshots.find((chain) => chain.id === activeId) ?? snapshots[0], [activeId, snapshots]);
  const activeTone = tone(active?.regime ?? "UNKNOWN/DEGRADED");
  const compact = active ? compactPayload(artifact, active) : {};
  const fullArtifact = active?.artifacts?.[artifact] ?? null;
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
      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-10 pt-16 lg:grid-cols-[0.72fr_1.28fr] lg:px-8 lg:pb-16 lg:pt-24">
        <div className="relative z-10 self-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">Daily reference data · Public CSV kit · Descriptive only</p>
          <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.07em] text-white sm:text-7xl lg:text-8xl">Know whether your metric moved because of you — or because the chain did.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">A daily state label for Bitcoin, Ethereum, Arbitrum and Base that you join to your own data — users, fees, model error and activity. Built for analysts, data teams and researchers who need to explain results inside a descriptive data boundary.</p>
          <p className="mt-4 w-fit rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-200">No price data · No forecasts · No recommendations</p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <Link href="/analyst-kit" className="ua-home-focus inline-flex items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/15 px-6 py-4 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white shadow-[0_0_34px_rgba(56,189,248,.24)] transition hover:-translate-y-0.5 hover:border-cyan-200/70 hover:bg-cyan-300/20">Download Free Sample CSV</Link>
          </div>
          <p className="mt-6 text-sm leading-6 text-zinc-300">Click on a chain for more information.</p>
          <div className="ua-hero-chain-list mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {snapshots.map((chain) => (
              <HeroChainSelector
                key={chain.id}
                chain={chain}
                active={chain.id === active.id}
                onClick={() => {
                  setActiveId(chain.id);
                  setActiveInfo(null);
                  setJsonOpen(false);
                }}
              />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.13em] text-zinc-400">
            <Link href="/validation" className="ua-home-focus underline-offset-4 hover:text-white hover:underline">Inspect diagnostics →</Link>
            <Link href="/api-docs" className="ua-home-focus underline-offset-4 hover:text-white hover:underline">API Docs →</Link>
            <a href="#pricing" className="ua-home-focus underline-offset-4 hover:text-white hover:underline">View pricing ↓</a>
          </div>
        </div>

        <div className="relative z-10">
          <p className="mb-4 text-sm leading-7 text-zinc-400">These three scores explain the regime label — Demand, Friction, Capacity. Hover or tap any metric for a plain-language definition.</p>
          <div className="grid gap-4 rounded-[2.25rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,.075),rgba(255,255,255,.025))] p-4 shadow-[0_40px_120px_rgba(0,0,0,.45)] backdrop-blur-2xl">
            <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 p-5" style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.06), 0 0 70px ${activeTone.glow}` }}>
              <div className="absolute inset-x-0 top-0 h-32 opacity-70" style={{ background: `radial-gradient(circle at 50% 0%, ${activeTone.soft}, transparent 70%)` }} />
              <div className="relative flex items-start justify-between gap-5"><div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">{active.ticker} · {active.asOf} · {active.lag}</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">{active.name}</h2></div><RegimeBadge label={active.regime} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></div>
              <div className="relative mt-7 grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)]"><Gauge value={active.confidenceValue} color={activeTone.color} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /><div className="grid gap-3"><MetricBar id="demand" label="Demand" value={active.demand} descriptor={active.demandLabel} color={activeTone.color} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /><MetricBar id="friction" label="Friction" value={active.friction} descriptor={active.frictionLabel} color={activeTone.color} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /><MetricBar id="capacity" label="Capacity" value={active.capacity} descriptor={active.capacityLabel} color={activeTone.color} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /></div></div>
              <FirstReadCard chain={active} activeInfo={activeInfo} setActiveInfo={setActiveInfo} />
              <div className="relative mt-4 grid gap-3 sm:grid-cols-3"><QualityCard id="dataQuality" label="Data quality" value={percent(active.dataQuality)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /><QualityCard id="labelConfidence" label="Label confidence" value={percent(active.labelConfidence)} activeInfo={activeInfo} setActiveInfo={setActiveInfo} /><QualityCard id="dataLag" label="Data lag" value={active.lag} activeInfo={activeInfo} setActiveInfo={setActiveInfo} suffix="" /></div>
            </section>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018]">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-8 lg:grid-cols-4 lg:px-8">
          {[["Chains", "4"], ["Free kit", "CSV"], ["Basic from", "$49"], ["Pro from", "$149"]].map(([label, value]) => (
            <div key={label} className="ua-home-card rounded-3xl p-5"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p></div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="max-w-4xl"><p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-200">Four delivered files</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">One subscription, four layers — from raw numbers to a sentence you can paste into a report.</h2><p className="mt-5 text-sm leading-7 text-zinc-400">Use the layer that matches how much engineering time you have.</p></div>
        <div className="mt-10 grid gap-5 lg:grid-cols-4">
          {artifactCards.map((item) => (
            <article key={item.artifact} className="ua-home-card rounded-[2rem] p-5">
              <p className={`inline-flex rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${accentClass(item.accent)}`}>{item.title}</p>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-white">What it contains</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{item.contains}</p>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-white">What it gives you</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{item.value}</p>
            </article>
          ))}
        </div>
        <Link href="/analyst-kit" className="ua-home-focus mt-8 inline-flex rounded-full border border-cyan-300/35 bg-cyan-300/12 px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-cyan-200/65">See a real example →</Link>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-2 lg:px-8">
          <article className="ua-home-card rounded-[2rem] p-7"><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">You already have data</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">Join Urd Atlas on date + chain.</h2><p className="mt-5 text-sm leading-7 text-zinc-400">Use Gold and Derived to build features, or Meta to segment model diagnostics, user counts or fee context by regime. No classification pipeline to build or maintain.</p><Link href="/analyst-kit" className="ua-home-focus mt-6 inline-flex rounded-full border border-cyan-300/35 bg-cyan-300/12 px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-white">Open Analyst Kit →</Link></article>
          <article className="ua-home-card rounded-[2rem] p-7"><p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-200">No pipeline yet</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">Read the current state without code.</h2><p className="mt-5 text-sm leading-7 text-zinc-400">Use Explorer to see the published state for each chain, or copy Briefs into a report, internal note or dashboard. No join required to get started.</p><Link href="/explorer" className="ua-home-focus mt-6 inline-flex rounded-full border border-emerald-300/35 bg-emerald-300/12 px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-white">Open Explorer →</Link></article>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
        <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">How it works</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Raw data → Gold → Derived and Meta → Briefs.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-zinc-500">Select one JSON layer. The compact preview and full JSON modal both follow the selected layer.</p></div>
        <div className="grid gap-5 lg:grid-cols-[0.94fr_1.06fr]">
          <div className="ua-home-card rounded-[2rem] p-5"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">JSON layer selector</p><div className="mt-5 grid gap-3">{artifactCards.map((item, index) => { const selected = artifact === item.artifact; return (<button key={item.artifact} type="button" onClick={() => { setArtifact(item.artifact); setJsonOpen(false); }} className="ua-home-focus ua-json-layer-card grid grid-cols-[38px_minmax(0,1fr)] gap-4 rounded-2xl border p-4 text-left" style={{ borderColor: selected ? activeTone.color : "rgba(255,255,255,.10)", background: selected ? activeTone.soft : "rgba(0,0,0,.25)" }}><div className="grid h-9 w-9 place-items-center rounded-full border border-cyan-200/25 bg-cyan-200/10 font-mono text-xs text-cyan-100">0{index + 1}</div><div><p className="font-mono text-xs uppercase tracking-[0.14em] text-white">{item.title} JSON</p><p className="mt-1 text-xs leading-5 text-zinc-400">{item.value}</p></div></button>); })}</div></div>
          <div className="ua-home-card rounded-[2rem] p-5"><div className="mb-4 border-b border-white/10 pb-4"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">Artifact preview</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">{selectedArtifact.title} latest.json</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{selectedArtifact.contains}</p></div><pre className="max-h-[14rem] overflow-hidden rounded-2xl border border-white/10 bg-black/55 p-5 font-mono text-xs leading-6 text-zinc-200 whitespace-pre-wrap"><code>{stringifyJson(compact)}</code></pre><p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">Compact preview.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => setJsonOpen(true)} className="ua-home-focus inline-flex items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-300/12 px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-cyan-200/65">Open full JSON</button><button type="button" onClick={() => copyText(stringifyJson(compact))} className="ua-home-focus inline-flex items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-emerald-200/60">{copied ? "Copied ✓" : "Copy preview"}</button></div></div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8"><p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-200">Evidence before trust</p><h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">Check the data product before you pay for delivery.</h2><div className="mt-10 grid gap-5 lg:grid-cols-3">{[["Validation", "Regime balance, transitions, confidence coverage and per-chain variation.", "/validation"], ["Free CSV", "Download the public kit and test the date + chain join in your own data.", "/analyst-kit"], ["Method", "Read how daily labels, confidence and reproducibility metadata are produced.", "/methodology"]].map(([title, body, href]) => (<Link key={title} href={href} className="ua-home-focus ua-home-card rounded-[2rem] p-6"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">{title}</p><p className="mt-4 text-sm leading-7 text-zinc-400">{body}</p></Link>))}</div></div>
      </section>

      <section id="pricing" className="scroll-mt-28 bg-[linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.055))]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-200">Pricing</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">Choose the delivery level after the proof works.</h2></div><p className="max-w-3xl text-sm leading-7 text-zinc-400 lg:justify-self-end">Free is for inspection and prototype joins. Basic and Pro are for authenticated recurring delivery.</p></div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">{plans.map((plan) => <PricingCard key={plan.id} plan={plan} />)}</div>
          <p className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-6 text-zinc-400">Chain access is priced as delivery and access, not as a claim that every chain has identical variation. See <Link href="/validation" className="text-cyan-200 underline-offset-4 hover:underline">Validation</Link> for per-chain differences before you choose.</p>
        </div>
      </section>

      {jsonOpen ? <JsonModal artifact={artifact} path={fullPath} payload={fullArtifact} copied={copied} onCopy={() => copyText(stringifyJson(fullArtifact))} onClose={() => setJsonOpen(false)} /> : null}
    </main>
  );
}
