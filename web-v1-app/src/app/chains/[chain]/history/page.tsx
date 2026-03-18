// src/app/chains/[chain]/history/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ChainId } from "@/config/chains";
import { readStorageObject, currentDataSource } from "@/lib/storage";
import ChainIcon from "@/components/ChainIcon";

type MetaHistoryRow = {
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

type MetaHistoryBundle =
  | MetaHistoryRow[]
  | {
      rows?: MetaHistoryRow[];
      items?: MetaHistoryRow[];
      data?: MetaHistoryRow[];
    };

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

const CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readStorageObject(storagePath);

  if (!result) {
    return null;
  }

  try {
    const raw = arrayBufferToUtf8(result.body);
    const json = JSON.parse(raw);

    if (!json || typeof json !== "object") {
      return null;
    }

    return json as T;
  } catch {
    return null;
  }
}

function extractRows(bundle: MetaHistoryBundle | null): MetaHistoryRow[] {
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
  const base = "rounded-full border px-2 py-1 text-xs";
  if (band === "Good") return `${base} bg-green-50`;
  if (band === "Caution") return `${base} bg-yellow-50`;
  if (band === "Degraded") return `${base} bg-red-50`;
  return `${base} bg-muted`;
}

function regimeBadgeClass(label?: string | null) {
  const base = "rounded-full border px-2 py-1 text-xs";
  if (!label) return `${base} bg-muted`;
  if (label === "CONGESTED") return `${base} bg-red-50`;
  if (label === "HEATING") return `${base} bg-yellow-50`;
  if (label === "STABLE") return `${base} bg-green-50`;
  if (label === "COOLING") return `${base} bg-blue-50`;
  return `${base} bg-muted`;
}

function expectedDelayDays(chain: ChainId): number {
  return chain === "arbitrum" || chain === "base" ? 7 : 0;
}

export default async function ChainHistoryPage({
  params,
}: {
  params: Promise<{ chain: string }>;
}) {
  const { chain } = await params;

  if (!CHAINS.includes(chain as ChainId)) {
    notFound();
  }

  const chainId = chain as ChainId;
  const canonicalPath = `data/published/v1/meta/${chainId}/last90d.json`;
  const bundle = await readPublishedJson<MetaHistoryBundle>(canonicalPath);
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

            <div className="mt-2 flex items-center gap-3">
              <ChainIcon chain={chainId} label={`${chainId} icon`} />
              <h1 className="text-3xl font-semibold tracking-tight">
                {chainId} history
              </h1>
            </div>

            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This page reads one canonical published history bundle for regime/status context.
              It does not search for alternate files and does not repair missing windows at runtime.
            </p>
          </div>

          <div className="rounded-xl border px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Traceability
            </div>
            <div className="mt-1 font-medium text-foreground">
              Source: {currentDataSource()}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {canonicalPath}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Expected delay: {expectedDelayDays(chainId)}d
            </div>
          </div>
        </div>

        {rows.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-4 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Latest regime
              </div>
              <div className="mt-2">
                <span className={regimeBadgeClass(latestRegime)}>{latestRegime ?? "—"}</span>
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
        ) : null}

        {rows.length > 0 ? (
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
        ) : null}
      </header>

      {rows.length === 0 ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="text-sm font-medium text-amber-200">
            Published history bundle unavailable
          </div>
          <p className="mt-2 text-sm text-amber-100/90">
            The canonical history bundle for this chain could not be read from published storage.
            This page intentionally does not fall back to alternate files.
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
                    <tr key={`${row.date ?? "row"}-${index}`} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3">
                        {fmtDate(row.updated_through ?? row.regime?.asof_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={regimeBadgeClass(row.status?.label ?? null)}>
                          {row.status?.label ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{fmtConf(row.confidence?.confidence_score)}</td>
                      <td className="px-4 py-3">
                        <span className={bandClass(band)}>{band}</span>
                      </td>
                      <td className="px-4 py-3">
                        {typeof row.confidence?.lag_days_vs_utc_today === "number"
                          ? row.confidence.lag_days_vs_utc_today
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{row.status?.one_liner ?? "—"}</td>
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
            <li>It should be read together with methodology, glossary, status, and current chain page.</li>
          </ul>
        </Section>

        <Section title="How to use this page">
          Use this page to inspect whether recent published states on a chain appear isolated or persistent.
          It is most useful when read together with the current chain page and the cross-chain{" "}
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
    </main>
  );
}