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

function tone(label: HomeLabel) {
  if (label === "STABLE") return { color: "#10B981", soft: "rgba(16,185,129,.16)", glow: "rgba(16,185,129,.38)", name: "Emerald" };
  if (label === "HEATING") return { color: "#F59E0B", soft: "rgba(245,158,11,.16)", glow: "rgba(245,158,11,.34)", name: "Amber" };
  if (label === "CONGESTED") return { color: "#EF4444", soft: "rgba(239,68,68,.16)", glow: "rgba(239,68,68,.34)", name: "Rose" };
  if (label === "CHEAP") return { color: "#38BDF8", soft: "rgba(56,189,248,.16)", glow: "rgba(56,189,248,.34)", name: "Cyan" };
  return { color: "#A78BFA", soft: "rgba(167,139,250,.14)", glow: "rgba(167,139,250,.28)", name: "Violet" };
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

function Sparkline({ seed, color, large = false }: { seed: string; color: string; large?: boolean }) {
  const base = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const points = Array.from({ length: large ? 13 : 8 }, (_, index) => {
    const x = 6 + index * (large ? 12 : 14);
    const y = (large ? 48 : 30) - ((base + index * 19) % (large ? 34 : 22));
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={large ? "0 0 156 58" : "0 0 110 38"} className={large ? "h-16 w-full" : "h-9 w-full"} aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${seed}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={`url(#spark-${seed})`} strokeWidth={large ? 3 : 2} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={points} fill="none" stroke={color} strokeWidth={large ? 14 : 8} strokeLinecap="round" strokeLinejoin="round" opacity="0.08" />
    </svg>
  );
}

function Gauge({ value, color }: { value: number | null; color: string }) {
  const pct = percent(value);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className="relative grid h-32 w-32 place-items-center rounded-full border border-white/10 bg-black/30 shadow-[inset_0_0_32px_rgba(255,255,255,.035)]">
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
      <div className="text-center">
        <p className="font-mono text-3xl font-semibold text-white">{pct}%</p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">confidence</p>
      </div>
    </div>
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

function MetricBar({ label, value, descriptor, color }: { label: string; value: number | null; descriptor: string; color: string }) {
  const pct = percent(value);
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.055]">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
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
      trend_window: "last_7d",
      regime_path: [chain.regime, chain.regime, chain.regime],
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
    methodology_version: chain.methodologyVersion,
  };
}

export default function InteractiveHomeDashboard({ snapshots, lastRun }: Props) {
  const [activeId, setActiveId] = useState(snapshots[0]?.id ?? "bitcoin");
  const [artifact, setArtifact] = useState<Artifact>("Meta");
  const [pipelineStep, setPipelineStep] = useState(2);
  const [copied, setCopied] = useState(false);

  const active = useMemo(() => snapshots.find((chain) => chain.id === activeId) ?? snapshots[0], [activeId, snapshots]);
  const activeTone = tone(active?.regime ?? "UNKNOWN/DEGRADED");
  const payload = active ? artifactPayload(artifact, active) : {};

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
      <div className="pointer-events-none absolute left-[-12rem] top-20 h-[30rem] w-[30rem] rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-10rem] top-10 h-[34rem] w-[34rem] rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute left-[35%] top-[30rem] h-[26rem] w-[26rem] rounded-full bg-amber-300/5 blur-3xl" />

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
                <MetricBar label="Demand" value={active.demand} descriptor={active.demandLabel} color={activeTone.color} />
                <MetricBar label="Friction" value={active.friction} descriptor={active.frictionLabel} color={activeTone.color} />
                <MetricBar label="Capacity" value={active.capacity} descriptor={active.capacityLabel} color={activeTone.color} />
              </div>
            </div>

            <div className="relative mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Seven-day shape</p>
                  <p className="mt-1 text-sm text-zinc-400">Visual preview for the selected published row.</p>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: activeTone.color }}>{activeTone.name} state</p>
              </div>
              <div className="mt-3">
                <Sparkline seed={`${active.id}-${active.regime}-large`} color={activeTone.color} large />
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">Data</p>
                <p className="mt-1 font-mono text-lg text-white">{percent(active.dataQuality)}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">Label</p>
                <p className="mt-1 font-mono text-lg text-white">{percent(active.labelConfidence)}%</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">Method</p>
                <p className="mt-1 font-mono text-lg text-white">{active.methodologyVersion}</p>
              </div>
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
