"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type HomeLabel = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";

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
};

type Artifact = "Meta" | "Gold" | "Derived" | "Briefs";

type Props = {
  snapshots: HomeChainSnapshot[];
  lastRun: string;
};

type InfoContent = {
  title: string;
  body: string;
  calculation: string;
  link?: string;
};

const artifacts: Artifact[] = ["Meta", "Gold", "Derived", "Briefs"];

const pipeline = [
  {
    key: "raw",
    index: "01",
    title: "Raw evidence",
    body: "Observed chain metrics enter the daily run.",
  },
  {
    key: "features",
    index: "02",
    title: "Feature layer",
    body: "Measurements are normalized into demand, friction and capacity.",
  },
  {
    key: "meta",
    index: "03",
    title: "Meta decision",
    body: "Regime, confidence and score vector are published together.",
  },
  {
    key: "delivery",
    index: "04",
    title: "Delivery",
    body: "CSV, JSON and subscriber artifacts stay joinable by date and chain.",
  },
] as const;

const info: Record<string, InfoContent> = {
  demand: {
    title: "Demand score",
    body: "Demand describes how strong activity pressure looks for the selected chain on this published date.",
    calculation: "It is built from demand-side chain measurements after normalization into the daily scorecard. Higher values indicate more demand pressure relative to the chain's recent baseline.",
    link: "/methodology",
  },
  friction: {
    title: "Friction score",
    body: "Friction describes how much resistance users appear to face when using the chain.",
    calculation: "It is built from friction-related measurements such as fee and congestion pressure after daily normalization. Higher values mean the chain looks more difficult or expensive to use than usual.",
    link: "/methodology",
  },
  capacity: {
    title: "Capacity score",
    body: "Capacity describes whether the chain appears to have usable room relative to current activity.",
    calculation: "It is built from capacity-related measurements in the scorecard. Use it with demand and friction: capacity alone should not be read as a recommendation or future signal.",
    link: "/methodology",
  },
  confidence: {
    title: "Confidence score",
    body: "Confidence is the headline reliability score for this published row.",
    calculation: "It combines Data Quality and Label Confidence using the published confidence formula: sqrt(data_quality_score × label_confidence_score).",
    link: "/validation",
  },
  dataQuality: {
    title: "Data quality",
    body: "Data quality tells you whether the row had enough usable evidence to be read responsibly.",
    calculation: "It reflects quality context such as freshness, missingness and coverage checks for the selected chain and observation date.",
    link: "/validation",
  },
  labelConfidence: {
    title: "Label confidence",
    body: "Label confidence tells you how strongly the evidence supports the published regime label.",
    calculation: "It is produced by the classification layer after the score vector is evaluated. A low value means the label should be treated as weaker context, even when the row exists.",
    link: "/validation",
  },
  dataLag: {
    title: "Data lag",
    body: "Data lag tells you how far behind real-world calendar time the published observation is expected to be.",
    calculation: "Bitcoin and Ethereum are currently published with T+1 lag. Base and Arbitrum are currently published with T+7 lag. This is a delivery/freshness property, not a signal.",
    link: "/status",
  },
  scoreShape: {
    title: "Score vector shape",
    body: "This line is a compact visual fingerprint of the selected row, not a forecast and not a decorative placeholder.",
    calculation: "It is drawn from the actual published row values: demand, friction, capacity, data quality, label confidence and confidence.",
    link: "/methodology",
  },
};

function tone(label: HomeLabel) {
  if (label === "STABLE") return { color: "#10B981", soft: "rgba(16,185,129,.16)", glow: "rgba(16,185,129,.38)" };
  if (label === "HEATING") return { color: "#F59E0B", soft: "rgba(245,158,11,.16)", glow: "rgba(245,158,11,.34)" };
  if (label === "CONGESTED") return { color: "#EF4444", soft: "rgba(239,68,68,.16)", glow: "rgba(239,68,68,.34)" };
  if (label === "CHEAP") return { color: "#38BDF8", soft: "rgba(56,189,248,.16)", glow: "rgba(56,189,248,.34)" };
  return { color: "#A78BFA", soft: "rgba(167,139,250,.14)", glow: "rgba(167,139,250,.28)" };
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

function normalizeForSpark(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value <= 1 ? value * 100 : value;
}

function InfoPopover({ id, compact = false }: { id: keyof typeof info; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const item = info[id];

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Explain ${item.title}`}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] font-mono text-zinc-300 transition hover:border-cyan-200/45 hover:bg-cyan-300/10 hover:text-white ${compact ? "h-5 w-5 text-[10px]" : "px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"}`}
      >
        {compact ? "?" : "info"}
      </button>
      {open ? (
        <span className="absolute left-0 top-7 z-40 w-72 rounded-2xl border border-cyan-200/25 bg-[#0D1117]/95 p-4 text-left shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-2xl">
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">{item.title}</span>
          <span className="mt-2 block text-sm leading-6 text-zinc-200">{item.body}</span>
          <span className="mt-3 block text-xs leading-5 text-zinc-500">{item.calculation}</span>
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

function ValueSparkline({ values, color }: { values: Array<number | null>; color: string }) {
  const valid = values.map(normalizeForSpark).filter((value): value is number => typeof value === "number");

  if (valid.length < 2) {
    return (
      <div className="grid h-16 place-items-center rounded-2xl border border-white/10 bg-black/20 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
        Not enough values
      </div>
    );
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const spread = Math.max(1, max - min);
  const points = valid.map((value, index) => {
    const x = 8 + index * (140 / Math.max(1, valid.length - 1));
    const y = 50 - ((value - min) / spread) * 34;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 156 58" className="h-16 w-full" aria-hidden="true">
      <defs>
        <linearGradient id="score-vector-shape" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke="url(#score-vector-shape)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" opacity="0.08" />
    </svg>
  );
}

function Gauge({ value, color }: { value: number | null; color: string }) {
  const pct = percent(value);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <button
      type="button"
      className="relative grid h-32 w-32 place-items-center rounded-full border border-white/10 bg-black/30 text-left shadow-[inset_0_0_32px_rgba(255,255,255,.035)] transition hover:-translate-y-1 hover:border-cyan-200/35"
      aria-label="Explain confidence score"
      onClick={(event) => {
        const target = event.currentTarget.querySelector("button");
        if (target instanceof HTMLButtonElement) target.click();
      }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />
      </svg>
      <div className="relative text-center">
        <p className="font-mono text-3xl font-semibold text-white">{pct}%</p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">confidence</p>
        <span className="mt-2 flex justify-center"><InfoPopover id="confidence" compact /></span>
      </div>
    </button>
  );
}

function RegimeBadge({ label }: { label: HomeLabel }) {
  const t = tone(label);
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: t.color, borderColor: `${t.color}66`, background: t.soft, boxShadow: `0 0 28px ${t.glow}` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color, boxShadow: `0 0 16px ${t.color}` }} />
      {label}
    </span>
  );
}

function MetricBar({ id, label, value, descriptor, color }: { id: "demand" | "friction" | "capacity"; label: string; value: number | null; descriptor: string; color: string }) {
  const pct = percent(value);
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white hover:decoration-cyan-200/60">
            {label}
          </button>
          <InfoPopover id={id} compact />
        </div>
        <p className="font-mono text-sm text-white">{metric(value)}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 18px ${color}` }} />
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-400">{descriptor}</p>
    </div>
  );
}

function ChainSelector({ chain, active, onClick }: { chain: HomeChainSnapshot; active: boolean; onClick: () => void }) {
  const t = tone(chain.regime);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-1"
      style={{ borderColor: active ? `${t.color}88` : "rgba(255,255,255,.10)", background: active ? `linear-gradient(135deg, ${t.soft}, rgba(255,255,255,.035))` : "rgba(255,255,255,.025)", boxShadow: active ? `0 0 42px ${t.glow}` : "none" }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{chain.ticker}</p>
        <span className="h-2 w-2 rounded-full" style={{ background: t.color, boxShadow: `0 0 16px ${t.color}` }} />
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-white">{chain.name}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-zinc-500">{chain.confidence}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: t.color }}>{chain.regime}</p>
      </div>
    </button>
  );
}

function artifactPayload(artifact: Artifact, chain: HomeChainSnapshot) {
  if (artifact === "Gold") {
    return {
      chain: chain.id,
      date: chain.asOf,
      demand_score: chain.demand,
      friction_score: chain.friction,
      capacity_score: chain.capacity,
    };
  }

  if (artifact === "Derived") {
    return {
      chain: chain.id,
      date: chain.asOf,
      score_vector_shape: {
        demand: chain.demand,
        friction: chain.friction,
        capacity: chain.capacity,
        data_quality: shortConfidence(chain.dataQuality),
        label_confidence: shortConfidence(chain.labelConfidence),
        confidence: shortConfidence(chain.confidenceValue),
      },
      lag: chain.lag,
    };
  }

  if (artifact === "Briefs") {
    return {
      chain: chain.id,
      title: `${chain.name} ${chain.regime}`,
      confidence: shortConfidence(chain.confidenceValue),
      note: "Readable context from the same published evidence.",
    };
  }

  return {
    chain: chain.id,
    date: chain.asOf,
    regime: chain.regime,
    confidence_score: shortConfidence(chain.confidenceValue),
    data_quality_score: shortConfidence(chain.dataQuality),
    label_confidence_score: shortConfidence(chain.labelConfidence),
    data_lag: chain.lag,
  };
}

function QualityCard({ id, label, value, suffix = "%" }: { id: "dataQuality" | "labelConfidence" | "dataLag"; label: string; value: string | number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3 transition hover:-translate-y-0.5 hover:border-cyan-200/30 hover:bg-white/[0.04]">
      <div className="flex items-center gap-2">
        <button type="button" className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white hover:decoration-cyan-200/60">
          {label}
        </button>
        <InfoPopover id={id} compact />
      </div>
      <p className="mt-1 font-mono text-lg text-white">{value}{suffix}</p>
    </div>
  );
}

export default function InteractiveHomeDashboard({ snapshots, lastRun }: Props) {
  const [activeId, setActiveId] = useState(snapshots[0]?.id ?? "bitcoin");
  const [artifact, setArtifact] = useState<Artifact>("Meta");
  const [pipelineStep, setPipelineStep] = useState(2);
  const [copied, setCopied] = useState(false);

  const active = useMemo(() => snapshots.find((chain) => chain.id === activeId) ?? snapshots[0], [activeId, snapshots]);
  const activeTone = tone(active?.regime ?? "UNKNOWN/DEGRADED");
  const payload = active ? artifactPayload(artifact, active) : {};
  const scoreVector = active ? [active.demand, active.friction, active.capacity, active.dataQuality, active.labelConfidence, active.confidenceValue] : [];

  async function copyPayload() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  if (!active) return null;

  return (
    <main className="relative overflow-hidden bg-background text-foreground">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-14 pt-16 lg:grid-cols-[0.72fr_1.28fr] lg:px-8 lg:pb-20 lg:pt-24">
        <div className="relative z-10 self-center">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-200">Published daily</span>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100">Interactive preview</span>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-100">Point-in-time</span>
          </div>

          <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.07em] text-white sm:text-7xl lg:text-8xl">
            Explore chain state before you explain your metrics.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
            Select a chain, inspect the published state, copy the JSON layer and test the date + chain join against your own daily data.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/analyst-kit" className="inline-flex items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/15 px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white shadow-[0_0_34px_rgba(56,189,248,.24)] transition hover:-translate-y-0.5 hover:border-cyan-200/70 hover:bg-cyan-300/20">
              Open free CSV
            </Link>
            <Link href="/validation" className="inline-flex items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-emerald-200/50">
              Inspect diagnostics
            </Link>
            <Link href="/api-docs" className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-zinc-300 transition hover:-translate-y-0.5 hover:border-white/25 hover:text-white">
              API path
            </Link>
          </div>

          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["4", "chains", "emerald"],
              ["CSV", "free kit", "cyan"],
              ["T+1", "BTC / ETH", "amber"],
              [lastRun, "last run", "zinc"],
            ].map(([value, label, color]) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]">
                <dt className={`font-mono text-[10px] uppercase tracking-[0.18em] ${color === "emerald" ? "text-emerald-200" : color === "cyan" ? "text-cyan-200" : color === "amber" ? "text-amber-200" : "text-zinc-500"}`}>{label}</dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative z-10 grid gap-4 rounded-[2.25rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,.075),rgba(255,255,255,.025))] p-4 shadow-[0_40px_120px_rgba(0,0,0,.45)] backdrop-blur-2xl lg:grid-cols-[0.86fr_1.14fr]">
          <div className="grid gap-3 self-start">
            {snapshots.map((chain) => (
              <ChainSelector key={chain.id} chain={chain} active={chain.id === active.id} onClick={() => setActiveId(chain.id)} />
            ))}
          </div>

          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/30 p-5" style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.06), 0 0 70px ${activeTone.glow}` }}>
            <div className="absolute inset-x-0 top-0 h-32 opacity-70" style={{ background: `radial-gradient(circle at 50% 0%, ${activeTone.soft}, transparent 70%)` }} />
            <div className="relative flex items-start justify-between gap-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">{active.ticker} · {active.asOf} · {active.lag}</p>
                <h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">{active.name}</h2>
              </div>
              <RegimeBadge label={active.regime} />
            </div>

            <div className="relative mt-7 grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)]">
              <Gauge value={active.confidenceValue} color={activeTone.color} />
              <div className="grid gap-3">
                <MetricBar id="demand" label="Demand" value={active.demand} descriptor={active.demandLabel} color={activeTone.color} />
                <MetricBar id="friction" label="Friction" value={active.friction} descriptor={active.frictionLabel} color={activeTone.color} />
                <MetricBar id="capacity" label="Capacity" value={active.capacity} descriptor={active.capacityLabel} color={activeTone.color} />
              </div>
            </div>

            <div className="relative mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <button type="button" className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white hover:decoration-cyan-200/60">Score vector shape</button>
                    <InfoPopover id="scoreShape" compact />
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">Actual row values compressed into one visual fingerprint.</p>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: activeTone.color }}>{active.regime}</p>
              </div>
              <div className="mt-3">
                <ValueSparkline values={scoreVector} color={activeTone.color} />
              </div>
            </div>

            <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
              <QualityCard id="dataQuality" label="Data quality" value={percent(active.dataQuality)} />
              <QualityCard id="labelConfidence" label="Label confidence" value={percent(active.labelConfidence)} />
              <QualityCard id="dataLag" label="Data lag" value={active.lag} suffix="" />
            </div>
          </section>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018]">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-8 lg:grid-cols-4 lg:px-8">
          {[
            ["Evidence", "Validation diagnostics before purchase", "/validation", "emerald"],
            ["Prototype", "Free CSV calendar and starter notebook", "/analyst-kit", "cyan"],
            ["Integrate", "Public checks then authenticated delivery", "/api-docs", "amber"],
            ["Boundary", "Descriptive context, not automated instructions", "/methodology", "violet"],
          ].map(([title, body, href, color]) => (
            <Link key={title} href={href} className="group rounded-3xl border border-white/10 bg-black/20 p-5 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.045]">
              <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${color === "emerald" ? "text-emerald-200" : color === "cyan" ? "text-cyan-200" : color === "amber" ? "text-amber-200" : "text-violet-200"}`}>{title}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.76fr_1.24fr] lg:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">How it moves</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Click through the daily evidence path.</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-500">
            The interface should feel like a product surface, not a static explainer. Pick a step, inspect the layer, copy the example.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">Pipeline explorer</p>
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400/70" />
                <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
              </div>
            </div>
            <div className="grid gap-3">
              {pipeline.map((item, index) => {
                const selected = pipelineStep === index;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPipelineStep(index)}
                    className="group grid grid-cols-[36px_minmax(0,1fr)] items-center gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5"
                    style={{ borderColor: selected ? "rgba(56,189,248,.42)" : "rgba(255,255,255,.10)", background: selected ? "rgba(56,189,248,.10)" : "rgba(0,0,0,.25)", boxShadow: selected ? "0 0 34px rgba(56,189,248,.12)" : "none" }}
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-full border border-cyan-200/25 bg-cyan-200/10 font-mono text-xs text-cyan-100">{item.index}</div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.14em] text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">{item.body}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">Artifact preview</p>
              <div className="flex flex-wrap gap-2">
                {artifacts.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setArtifact(item)}
                    className="rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition"
                    style={{ borderColor: artifact === item ? `${activeTone.color}88` : "rgba(255,255,255,.10)", color: artifact === item ? activeTone.color : "#A1A1AA", background: artifact === item ? activeTone.soft : "rgba(255,255,255,.025)" }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <pre className="min-h-[17rem] overflow-x-auto rounded-2xl border border-white/10 bg-black/55 p-5 font-mono text-xs leading-6 text-zinc-200 whitespace-pre-wrap"><code>{JSON.stringify(payload, null, 2)}</code></pre>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={copyPayload} className="inline-flex items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-emerald-200/60">
                {copied ? "Copied ✓" : "Copy preview"}
              </button>
              <Link href="/api/v1/status" className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-zinc-300 transition hover:-translate-y-0.5 hover:border-white/25 hover:text-white">
                Open status JSON
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-200">First test</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Open one CSV. Join one metric. Segment by regime.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Pick a chain", "Start with Bitcoin or Ethereum for the shortest lag.", "emerald"],
              ["02", "Join date + chain", "Attach the public calendar to your own daily table.", "cyan"],
              ["03", "Gate confidence", "Read only rows where the quality context supports it.", "amber"],
            ].map(([step, title, body, color]) => (
              <div key={step} className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/25">
                <p className={`font-mono text-xs ${color === "emerald" ? "text-emerald-200" : color === "cyan" ? "text-cyan-200" : "text-amber-200"}`}>{step}</p>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">Trust model</p>
            <div className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400/70" />
              <span className="h-2 w-2 rounded-full bg-amber-400/70" />
              <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-center">
            <p className="font-mono text-[clamp(16px,2.5vw,30px)] text-white">Confidence = √(Data Quality × Label Confidence)</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Data Quality", "Coverage, freshness and missingness context."],
              ["Label Confidence", "How strongly the row supports the published regime."],
              ["Point-in-time", "Observation date and available-at context stay separate."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 transition hover:-translate-y-1 hover:border-white/20">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200">{title}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-emerald-200/20 bg-[linear-gradient(135deg,rgba(16,185,129,.10),rgba(56,189,248,.055))] p-7 shadow-[0_0_70px_rgba(16,185,129,.09)] backdrop-blur-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-200">Free versus paid</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">Free is for proof. Paid is for delivery.</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">Inspect Explorer, Validation, Methodology and the public Analyst Kit first. Upgrade only when authenticated recurring files are useful for your workflow.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/plans" className="inline-flex items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/15 px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5 hover:border-cyan-200/70">
              View plans
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-zinc-300 transition hover:-translate-y-0.5 hover:border-white/25 hover:text-white">
              Open dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
