import type { ReactNode } from "react";
import Link from "next/link";
import { readStorageObject } from "@/lib/storage";

export const revalidate = 0;

type Label = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";

type MetaLatest = {
  chain?: string;
  date?: string;
  updated_through?: string;
  status?: {
    label?: string;
    one_liner?: string;
  };
  regime?: {
    label?: string;
    asof_date?: string;
  };
  confidence?: {
    confidence_score?: number;
    data_quality_score?: number;
    label_confidence_score?: number;
    lag_days_vs_utc_today?: number;
  };
  scorecard?: {
    dimensions?: {
      demand?: { score?: number; label?: string };
      friction?: { score?: number; label?: string };
      capacity?: { score?: number; label?: string };
    };
  };
  methodology_version?: string;
};

type DatasetJson = {
  published_at?: string;
  computed_at_utc?: string;
};

type ChainSnapshot = {
  id: string;
  ticker: string;
  name: string;
  lag: string;
  regime: Label;
  confidence: string;
  confidenceValue: number | null;
  dataQuality: number | null;
  labelConfidence: number | null;
  asOf: string;
  oneLiner: string;
  demand: number | null;
  friction: number | null;
  capacity: number | null;
  methodologyVersion: string;
};

const CHAINS = [
  { id: "bitcoin", ticker: "BTC", name: "Bitcoin", lag: "T+1" },
  { id: "ethereum", ticker: "ETH", name: "Ethereum", lag: "T+1" },
  { id: "arbitrum", ticker: "ARB", name: "Arbitrum", lag: "T+7" },
  { id: "base", ticker: "BASE", name: "Base", lag: "T+7" },
] as const;

const pipeline = ["Raw evidence", "Daily pipeline", "Meta layer", "JSON delivery"] as const;

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readJson<T>(storagePath: string): Promise<T | null> {
  try {
    const result = await readStorageObject(storagePath);
    if (!result) return null;

    const raw = arrayBufferToUtf8(result.body);
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") return null;
    return parsed as T;
  } catch {
    return null;
  }
}

function normalizeLabel(raw: string | undefined): Label {
  const label = (raw ?? "").toUpperCase();
  if (label === "STABLE") return "STABLE";
  if (label === "HEATING") return "HEATING";
  if (label === "CONGESTED") return "CONGESTED";
  if (label === "CHEAP") return "CHEAP";
  return "UNKNOWN/DEGRADED";
}

function pct(value: number | undefined | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function score(value: number | undefined | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

function clampPercent(value: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function getSnapshot(chain: (typeof CHAINS)[number]): Promise<ChainSnapshot> {
  const meta = await readJson<MetaLatest>(`data/published/v1/meta/${chain.id}/latest.json`);
  const regime = normalizeLabel(meta?.status?.label ?? meta?.regime?.label);
  const dimensions = meta?.scorecard?.dimensions;
  const confidenceValue = typeof meta?.confidence?.confidence_score === "number" ? meta.confidence.confidence_score : null;

  return {
    id: chain.id,
    ticker: chain.ticker,
    name: chain.name,
    lag: chain.lag,
    regime,
    confidence: pct(confidenceValue),
    confidenceValue,
    dataQuality: typeof meta?.confidence?.data_quality_score === "number" ? meta.confidence.data_quality_score : null,
    labelConfidence: typeof meta?.confidence?.label_confidence_score === "number" ? meta.confidence.label_confidence_score : null,
    asOf: formatDate(meta?.date ?? meta?.updated_through ?? meta?.regime?.asof_date),
    oneLiner:
      meta?.status?.one_liner ??
      `${chain.name} latest published network-state row is ${regime}.`,
    demand: typeof dimensions?.demand?.score === "number" ? dimensions.demand.score : null,
    friction: typeof dimensions?.friction?.score === "number" ? dimensions.friction.score : null,
    capacity: typeof dimensions?.capacity?.score === "number" ? dimensions.capacity.score : null,
    methodologyVersion: meta?.methodology_version ?? "—",
  };
}

async function getLastRun(): Promise<string> {
  const dataset = await readJson<DatasetJson>("data/published/v1/dataset.json");
  return formatDate(dataset?.published_at ?? dataset?.computed_at_utc);
}

function accent(label: Label) {
  if (label === "STABLE") return { color: "#10B981", glow: "rgba(16,185,129,.32)" };
  if (label === "HEATING") return { color: "#F59E0B", glow: "rgba(245,158,11,.30)" };
  if (label === "CONGESTED") return { color: "#EF4444", glow: "rgba(239,68,68,.30)" };
  if (label === "CHEAP") return { color: "#38BDF8", glow: "rgba(56,189,248,.28)" };
  return { color: "#71717A", glow: "rgba(113,113,122,.22)" };
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400 backdrop-blur-xl">
      {children}
    </span>
  );
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white shadow-[0_0_28px_rgba(56,189,248,0.16)] transition hover:border-cyan-200/60 hover:bg-cyan-300/15"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-zinc-300 transition hover:border-white/25 hover:text-white"
    >
      {children}
    </Link>
  );
}

function RegimeBadge({ label }: { label: Label }) {
  const tone = accent(label);
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em]"
      style={{ borderColor: `${tone.color}55`, color: tone.color, boxShadow: `0 0 22px ${tone.glow}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone.color, boxShadow: `0 0 14px ${tone.color}` }} />
      {label}
    </span>
  );
}

function Sparkline({ seed, tone }: { seed: string; tone: string }) {
  const base = seed.charCodeAt(0) + seed.charCodeAt(seed.length - 1);
  const points = Array.from({ length: 8 }, (_, index) => {
    const x = 6 + index * 14;
    const y = 26 - ((base + index * 17) % 20);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 110 36" className="h-9 w-full overflow-visible" aria-hidden="true">
      <polyline points={points} fill="none" stroke={tone} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <polyline points={points} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.08" />
    </svg>
  );
}

function MetricLine({ label, value, seed, tone }: { label: string; value: number | null; seed: string; tone: string }) {
  return (
    <div className="grid grid-cols-[82px_56px_minmax(0,1fr)] items-center gap-3 border-t border-white/5 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <span className="font-mono text-xs text-zinc-200">{score(value)}</span>
      <Sparkline seed={seed} tone={tone} />
    </div>
  );
}

function ChainCard({ chain }: { chain: ChainSnapshot }) {
  const tone = accent(chain.regime);
  const confidenceWidth = clampPercent(chain.confidenceValue);

  return (
    <Link
      href={`/chains/${chain.id}`}
      className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015))] p-5 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-white/25"
    >
      <div className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(circle at 70% 0%, ${tone.glow}, transparent 18rem)` }} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">{chain.ticker}</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">{chain.name}</h3>
            <p className="mt-1 font-mono text-[11px] text-zinc-500">{chain.asOf} · {chain.lag} lag</p>
          </div>
          <RegimeBadge label={chain.regime} />
        </div>

        <div className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">Confidence score</p>
            <p className="font-mono text-xl text-white">{chain.confidence}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${confidenceWidth}%`, backgroundColor: tone.color, boxShadow: `0 0 22px ${tone.color}` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
            <span>Data {pct(chain.dataQuality)}</span>
            <span>Label {pct(chain.labelConfidence)}</span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 px-4">
          <MetricLine label="Demand" value={chain.demand} seed={`${chain.id}-demand`} tone={tone.color} />
          <MetricLine label="Friction" value={chain.friction} seed={`${chain.id}-friction`} tone={tone.color} />
          <MetricLine label="Capacity" value={chain.capacity} seed={`${chain.id}-capacity`} tone={tone.color} />
        </div>

        <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-500">{chain.oneLiner}</p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">Method {chain.methodologyVersion}</p>
      </div>
    </Link>
  );
}

function DataWindow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">{title}</p>
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400/70" />
          <span className="h-2 w-2 rounded-full bg-amber-400/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
        </div>
      </div>
      {children}
    </div>
  );
}

export default async function HomePage() {
  const [snapshots, lastRun] = await Promise.all([
    Promise.all(CHAINS.map((chain) => getSnapshot(chain))),
    getLastRun(),
  ]);
  const primary = snapshots[0];
  const jsonPreview = {
    chain: primary?.id ?? "bitcoin",
    date: primary?.asOf ?? "—",
    regime: primary?.regime ?? "UNKNOWN/DEGRADED",
    confidence_score: primary?.confidenceValue ?? null,
    delivery: "published daily",
    data_lag: "BTC/ETH T+1, Base/Arbitrum T+7",
  };

  return (
    <main className="relative overflow-hidden bg-background text-foreground">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-14 pt-16 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:pb-20 lg:pt-24">
        <div className="relative z-10">
          <div className="flex flex-wrap gap-2">
            <Pill>Published daily</Pill>
            <Pill>Point-in-time</Pill>
            <Pill>Descriptive data</Pill>
          </div>

          <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.07em] text-white sm:text-7xl lg:text-8xl">
            Daily network state matrix.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
            Join one small regime table to your own crypto metrics. See whether changes happened under normal chain conditions or a different published network state.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryLink href="/analyst-kit">Open free CSV</PrimaryLink>
            <SecondaryLink href="/validation">Inspect diagnostics</SecondaryLink>
            <SecondaryLink href="/api-docs">API path</SecondaryLink>
          </div>

          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["4", "chains"],
              ["CSV", "free kit"],
              ["T+1", "BTC / ETH"],
              [lastRun, "last run"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</dt>
                <dd className="mt-2 truncate text-2xl font-semibold tracking-tight text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative grid gap-4">
          <div className="absolute -inset-10 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative grid gap-4 sm:grid-cols-2">
            {snapshots.map((chain) => <ChainCard key={chain.id} chain={chain} />)}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018]">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-8 lg:grid-cols-4 lg:px-8">
          {[
            ["Evidence", "Validation diagnostics before purchase", "/validation"],
            ["Prototype", "Free CSV calendar and starter notebook", "/analyst-kit"],
            ["Integrate", "Public checks then authenticated delivery", "/api-docs"],
            ["Boundary", "Not forecasts. Not automated instructions.", "/methodology"],
          ].map(([title, body, href]) => (
            <Link key={title} href={href} className="rounded-3xl border border-white/10 bg-black/20 p-5 transition hover:border-cyan-200/35 hover:bg-cyan-300/[0.04]">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">{title}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">How it moves</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">From raw evidence to a daily JSON layer.</h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-500">
            Urd Atlas stays narrow: publish a versioned network-state feature that analysts can read, download, validate and integrate.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <DataWindow title="Pipeline">
            <div className="grid gap-3">
              {pipeline.map((item, index) => (
                <div key={item} className="group grid grid-cols-[32px_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-cyan-200/30">
                  <div className="grid h-8 w-8 place-items-center rounded-full border border-cyan-200/25 bg-cyan-200/10 font-mono text-xs text-cyan-100 shadow-[0_0_22px_rgba(56,189,248,.16)]">{index + 1}</div>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-white">{item}</p>
                    <p className="mt-1 text-xs text-zinc-500">{index === 0 ? "Observed chain metrics" : index === 1 ? "Daily deterministic transforms" : index === 2 ? "Regime, confidence, score vector" : "CSV, JSON and subscriber files"}</p>
                  </div>
                </div>
              ))}
            </div>
          </DataWindow>

          <DataWindow title="Meta latest.json">
            <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-6 text-zinc-300"><code>{JSON.stringify(jsonPreview, null, 2)}</code></pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <SecondaryLink href="/api/v1/status">Open status JSON</SecondaryLink>
              <SecondaryLink href="/api-docs">Read API docs</SecondaryLink>
            </div>
          </DataWindow>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">First test</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Open one CSV. Join one metric. Segment by regime.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Pick a chain", "Start with Bitcoin or Ethereum for the shortest lag."],
              ["02", "Join date + chain", "Attach the public calendar to your own daily table."],
              ["03", "Gate confidence", "Read only rows where the quality context supports it."],
            ].map(([step, title, body]) => (
              <div key={step} className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl">
                <p className="font-mono text-xs text-cyan-200">{step}</p>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <DataWindow title="Trust model">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-center">
            <p className="font-mono text-[clamp(16px,2.5vw,30px)] text-white">
              Confidence = √(Data Quality × Label Confidence)
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Data Quality", "Coverage, freshness and missingness context."],
              ["Label Confidence", "How strongly the row supports the published regime."],
              ["Point-in-time", "Observation date and available-at context stay separate."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200">{title}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{body}</p>
              </div>
            ))}
          </div>
        </DataWindow>

        <div className="rounded-[2rem] border border-cyan-200/20 bg-cyan-200/[0.045] p-7 shadow-[0_0_60px_rgba(56,189,248,.08)] backdrop-blur-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">Free versus paid</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">Free is for proof. Paid is for delivery.</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Inspect Explorer, Validation, Methodology and the public Analyst Kit first. Upgrade only when authenticated recurring files are useful for your workflow.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryLink href="/plans">View plans</PrimaryLink>
            <SecondaryLink href="/dashboard">Open dashboard</SecondaryLink>
          </div>
        </div>
      </section>
    </main>
  );
}
