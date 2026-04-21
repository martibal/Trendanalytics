import Link from "next/link";
import { notFound } from "next/navigation";
import { readStorageObject } from "@/lib/storage";

type ChainId = "bitcoin" | "ethereum" | "arbitrum" | "base";

type HistoryRow = {
  date?: string;
  updated_through?: string;
  confidence?: {
    confidence_score?: number;
    lag_days_vs_utc_today?: number;
  };
  status?: {
    label?: string;
    color?: string;
    one_liner?: string;
  };
  regime?: {
    asof_date?: string;
  };
};

type HistoryBundle =
  | HistoryRow[]
  | {
      rows?: HistoryRow[];
      items?: HistoryRow[];
      data?: HistoryRow[];
    };

const CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

function isSupportedChain(value: string): value is ChainId {
  return CHAINS.includes(value as ChainId);
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}

function expectedDelayDays(chain: ChainId): number {
  return chain === "arbitrum" || chain === "base" ? 7 : 1;
}

function decodeBody(body: ArrayBuffer | Uint8Array): string {
  if (body instanceof Uint8Array) {
    return new TextDecoder("utf-8").decode(body);
  }
  return new TextDecoder("utf-8").decode(new Uint8Array(body));
}

async function readPublishedJson<T>(path: string): Promise<T | null> {
  const result = await readStorageObject(path);

  if (!result?.body) {
    return null;
  }

  try {
    const raw = decodeBody(result.body);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function extractRows(bundle: HistoryBundle | null): HistoryRow[] {
  if (!bundle) return [];
  if (Array.isArray(bundle)) return bundle;
  if (Array.isArray(bundle.rows)) return bundle.rows;
  if (Array.isArray(bundle.items)) return bundle.items;
  if (Array.isArray(bundle.data)) return bundle.data;
  return [];
}

function fmtDate(value?: string) {
  return value && value.trim().length > 0 ? value : "—";
}

function fmtConf(value?: number) {
  return typeof value === "number" ? value.toFixed(3) : "—";
}

function confidenceBand(value?: number) {
  if (typeof value !== "number") return "—";
  if (value >= 0.7) return "Good";
  if (value >= 0.4) return "Caution";
  return "Degraded";
}

function bandClass(band: string) {
  const base =
    "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium";
  if (band === "Good") {
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-300`;
  }
  if (band === "Caution") {
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-300`;
  }
  if (band === "Degraded") {
    return `${base} border-red-500/25 bg-red-500/10 text-red-300`;
  }
  return `${base} border-border bg-muted text-muted-foreground`;
}

function regimeBadgeClass(label?: string | null) {
  const base =
    "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium";
  if (!label) return `${base} border-border bg-muted text-muted-foreground`;
  if (label === "CONGESTED") {
    return `${base} border-red-500/25 bg-red-500/10 text-red-300`;
  }
  if (label === "HEATING") {
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-300`;
  }
  if (label === "CHEAP") {
    return `${base} border-blue-500/25 bg-blue-500/10 text-blue-300`;
  }
  if (label === "STABLE") {
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-300`;
  }
  if (label === "UNKNOWN/DEGRADED") {
    return `${base} border-slate-400/25 bg-slate-400/10 text-slate-300`;
  }
  return `${base} border-border bg-muted text-muted-foreground`;
}

export default async function ChainHistoryPage({
  params,
}: {
  params: Promise<{ chain: string }>;
}) {
  const { chain } = await params;

  if (!isSupportedChain(chain)) {
    notFound();
  }

  const chainId = chain as ChainId;
  const canonicalPath = `data/published/v1/meta/${chainId}/last90d.json`;
  const bundle = await readPublishedJson<HistoryBundle>(canonicalPath);
  const rows = extractRows(bundle);

  const latestRow = rows[0] ?? null;
  const latestConfidence =
    typeof latestRow?.confidence?.confidence_score === "number"
      ? latestRow.confidence.confidence_score
      : null;
  const latestLag =
    typeof latestRow?.confidence?.lag_days_vs_utc_today === "number"
      ? latestRow.confidence.lag_days_vs_utc_today
      : null;
  const latestRegime = latestRow?.status?.label ?? null;

  const goodCount = rows.filter(
    (row) =>
      typeof row.confidence?.confidence_score === "number" &&
      row.confidence.confidence_score >= 0.7
  ).length;

  const cautionCount = rows.filter(
    (row) =>
      typeof row.confidence?.confidence_score === "number" &&
      row.confidence.confidence_score >= 0.4 &&
      row.confidence.confidence_score < 0.7
  ).length;

  const degradedCount = rows.filter(
    (row) =>
      typeof row.confidence?.confidence_score === "number" &&
      row.confidence.confidence_score < 0.4
  ).length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">
              <Link href="/chains" className="hover:underline">
                Chains
              </Link>
              <span className="mx-2">/</span>
              <Link href={`/chains/${chainId}`} className="hover:underline">
                {chainId}
              </Link>
              <span className="mx-2">/</span>
              <span>history</span>
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {chainId} history
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This page reads one canonical published history bundle for regime/status
              context. It does not search for alternate files and does not repair missing
              windows at runtime.
            </p>
          </div>

          <div className="rounded-xl border px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Traceability
            </div>
            <div className="mt-1 font-medium text-foreground">
              Published artifact contract
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{canonicalPath}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Expected delay: {expectedDelayDays(chainId)}d
            </div>
          </div>
        </div>

        {rows.length > 0 ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border p-4 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Latest regime
                </div>
                <div className="mt-2">
                  <span className={regimeBadgeClass(latestRegime)}>
                    {latestRegime ?? "—"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border p-4 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Latest confidence
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {latestConfidence !== null ? latestConfidence.toFixed(3) : "—"}
                </div>
                <div className="mt-2">
                  <span className={bandClass(confidenceBand(latestConfidence ?? undefined))}>
                    {confidenceBand(latestConfidence ?? undefined)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border p-4 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Latest lag
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {latestLag !== null ? latestLag : "—"}
                </div>
              </div>

              <div className="rounded-xl border p-4 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Rows loaded
                </div>
                <div className="mt-2 text-2xl font-semibold">{rows.length}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-4 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Good confidence rows
                </div>
                <div className="mt-2 text-2xl font-semibold">{goodCount}</div>
              </div>

              <div className="rounded-xl border p-4 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Caution rows
                </div>
                <div className="mt-2 text-2xl font-semibold">{cautionCount}</div>
              </div>

              <div className="rounded-xl border p-4 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Degraded rows
                </div>
                <div className="mt-2 text-2xl font-semibold">{degradedCount}</div>
              </div>
            </div>
          </>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="text-sm font-medium text-amber-200">
            Published history bundle unavailable
          </div>
          <p className="mt-2 text-sm text-amber-100/90">
            The canonical history bundle for this chain could not be read from published
            storage. This page intentionally does not fall back to alternate files.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-semibold">Last 90 published rows</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Rows are rendered directly from the canonical published history bundle.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">As of</th>
                  <th className="px-4 py-3">Regime</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Band</th>
                  <th className="px-4 py-3">Lag</th>
                  <th className="px-4 py-3">Summary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const band = confidenceBand(row.confidence?.confidence_score);

                  return (
                    <tr
                      key={`${row.date ?? "row"}-${index}`}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-4 py-3">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3">
                        {fmtDate(row.updated_through ?? row.regime?.asof_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={regimeBadgeClass(row.status?.label ?? null)}>
                          {row.status?.label ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {fmtConf(row.confidence?.confidence_score)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={bandClass(band)}>{band}</span>
                      </td>
                      <td className="px-4 py-3">
                        {typeof row.confidence?.lag_days_vs_utc_today === "number"
                          ? row.confidence.lag_days_vs_utc_today
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.status?.one_liner && row.status.one_liner.trim().length > 0
                          ? row.status.one_liner
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-6">
        <Section title="Interpretation boundary">
          <ul className="list-disc pl-5">
            <li>This history view is descriptive only.</li>
            <li>It does not recompute regime labels.</li>
            <li>It does not imply forecast quality or backtested performance.</li>
            <li>
              It should be read together with methodology, glossary, status, and current
              chain page.
            </li>
          </ul>
        </Section>

        <Section title="How to use this page">
          Use this page to inspect whether recent published states on a chain appear
          isolated or persistent. It is most useful when read together with the current
          chain page and the cross-chain{" "}
          <Link href="/track-record" className="underline">
            track record
          </Link>{" "}
          surface.
        </Section>

        <Section title="Related pages">
          <ul className="list-disc pl-5">
            <li>
              <Link href={`/chains/${chainId}`} className="underline">
                /chains/{chainId}
              </Link>
            </li>
            <li>
              <Link href="/track-record" className="underline">
                /track-record
              </Link>
            </li>
            <li>
              <Link href="/status" className="underline">
                /status
              </Link>
            </li>
            <li>
              <Link href="/methodology" className="underline">
                /methodology
              </Link>
            </li>
            <li>
              <Link href="/glossary" className="underline">
                /glossary
              </Link>
            </li>
          </ul>
        </Section>
      </div>

      {/* ── Upsell ── */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 px-5 py-4">
        <div>
          <div className="text-sm font-semibold text-white">
            Want the JSON behind this track record?
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Every label here is backed by a determinism hash and a full confidence score.
            A Basic or Pro subscription gives you API access to the complete Meta JSON —
            the data you see here, structured and ready to use in your own tools.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link href="/sign-up"
            className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors">
            Sign up free →
          </Link>
          <Link href="/#plans"
            className="inline-flex items-center rounded-full bg-cyan-500 px-4 py-2 text-xs font-black text-[#040a12] hover:bg-cyan-400 transition-colors">
            See plans
          </Link>
        </div>
      </div>
    </main>
  );
}