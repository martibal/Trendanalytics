import Link from "next/link";
import RegimeBadge from "@/components/RegimeBadge";

type MobileLandingRow = {
  chain: string;
  label: string;
  name: string;
  href: string;
  status: string;
  publishedRegime: string | null;
  confidenceValue: string;
  confidenceBand: string;
  asOf: string;
  lagValue: string;
};

type MobileLandingProps = {
  rows: MobileLandingRow[];
};

function statusClass(status?: string | null) {
  const base = "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide";
  if (status === "ok") return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-300`;
  if (status === "warn") return `${base} border-amber-500/25 bg-amber-500/10 text-amber-300`;
  if (status === "fail") return `${base} border-red-500/25 bg-red-500/10 text-red-300`;
  return `${base} border-white/10 bg-white/5 text-slate-300`;
}

function confidenceClass(band?: string) {
  const base = "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium";
  if (band === "Good") return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-300`;
  if (band === "Caution") return `${base} border-amber-500/25 bg-amber-500/10 text-amber-300`;
  if (band === "Degraded") return `${base} border-red-500/25 bg-red-500/10 text-red-300`;
  return `${base} border-white/10 bg-white/5 text-slate-300`;
}

const plans = [
  {
    name: "Free",
    price: "$0",
    body: "Readable web surface with labels, confidence, charts, glossary, status, and methodology.",
    accent: "border-white/10 bg-white/5",
  },
  {
    name: "Basic",
    price: "$29/mo",
    body: "Gold, Meta, and Derived JSON for one chain with up to 90 days of history.",
    accent: "border-cyan-500/20 bg-cyan-500/8",
  },
  {
    name: "Pro",
    price: "$79/mo",
    body: "All four chains, deeper history, and direct API access to the full subscriber surface.",
    accent: "border-purple-500/20 bg-purple-500/8",
  },
] as const;

const layers = [
  {
    name: "Gold",
    body: "Raw daily observations in native units.",
    accent: "border-yellow-500/20 bg-yellow-500/5 text-yellow-300",
  },
  {
    name: "Meta",
    body: "Regime label, confidence, scorecard, and driver attribution.",
    accent: "border-purple-500/20 bg-purple-500/5 text-purple-300",
  },
  {
    name: "Derived",
    body: "Smoothed MA7 and MA30 context built from Gold.",
    accent: "border-blue-500/20 bg-blue-500/5 text-blue-300",
  },
] as const;

export default function MobileLanding({ rows }: MobileLandingProps) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-5 lg:hidden">
      <section className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-5 shadow-sm">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-200">
          On-chain regime intelligence
        </div>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">
          TrendAnalytics
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-200">
          Separate short-lived on-chain noise from more meaningful structural change.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          The public site lets you inspect the current published state. The paid product is the JSON layer: Gold, Meta, and Derived artifacts you can use directly in your own workflow.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/api-docs/schema" className="inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200">
            JSON schema
          </Link>
          <Link href="/faq" className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200">
            Q&A
          </Link>
          <Link href="/sign-up" className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200">
            Plans
          </Link>
        </div>
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 p-4 text-sm leading-6 text-slate-300">
          <div className="font-medium text-white">Why use it?</div>
          Raw chain data shows that something moved. It does not tell you whether the move is fading, persisting, or becoming a new descriptive state worth treating differently in your own analysis.
        </div>
      </section>

      <section className="mt-6">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Current published surface</div>
        <p className="mt-2 text-sm leading-6 text-slate-300">Swipe through the four supported chains.</p>
        <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
          {rows.map((row) => (
            <Link key={row.chain} href={row.href} className="min-w-[85%] snap-start rounded-3xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-semibold text-white">{row.label}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{row.name}</div>
                </div>
                <span className={statusClass(row.status)}>{row.status}</span>
              </div>
              <div className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Published regime</div>
              <div className="mt-2">{row.publishedRegime ? <RegimeBadge label={row.publishedRegime} /> : <span className="text-sm text-muted-foreground">No published label</span>}</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-background/40 p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Confidence</div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-xl font-semibold text-white">{row.confidenceValue}</div>
                    <span className={confidenceClass(row.confidenceBand)}>{row.confidenceBand}</span>
                  </div>
                </div>
                <div className="rounded-2xl border bg-background/40 p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">As of</div>
                  <div className="mt-2 text-sm font-medium text-white">{row.asOf}</div>
                  <div className="mt-1 text-xs text-slate-400">Lag {row.lagValue}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Plans</div>
        <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
          {plans.map((plan) => (
            <div key={plan.name} className={`min-w-[85%] snap-start rounded-3xl border p-4 shadow-sm ${plan.accent}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="text-lg font-semibold text-white">{plan.name}</div>
                <div className="text-xl font-semibold text-white">{plan.price}</div>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">{plan.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border p-5 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">What subscribers receive</div>
        <div className="mt-4 space-y-3">
          {layers.map((layer) => (
            <div key={layer.name} className={`rounded-2xl border p-4 ${layer.accent}`}>
              <div className="text-sm font-semibold text-white">{layer.name}</div>
              <div className="mt-1 text-sm leading-6 text-slate-300">{layer.body}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/api-docs/schema" className="inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200">
            Full field reference
          </Link>
          <Link href="/api-docs" className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200">
            API docs
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border p-5 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Explore</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/track-record" className="rounded-2xl border bg-background/40 p-4 text-sm font-medium text-white">Track Record</Link>
          <Link href="/methodology" className="rounded-2xl border bg-background/40 p-4 text-sm font-medium text-white">Methodology</Link>
          <Link href="/glossary" className="rounded-2xl border bg-background/40 p-4 text-sm font-medium text-white">Glossary</Link>
          <Link href="/status" className="rounded-2xl border bg-background/40 p-4 text-sm font-medium text-white">Status</Link>
        </div>
      </section>
    </main>
  );
}
