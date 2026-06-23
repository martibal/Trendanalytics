import Link from "next/link";
import { notFound } from "next/navigation";
import { currentDataSource, readStorageObject } from "@/lib/storage";

type ChainId = "bitcoin" | "ethereum" | "arbitrum" | "base";

type HistoryRow = {
  date?: string;
  updated_through?: string;
  confidence?: { confidence_score?: number; lag_days_vs_utc_today?: number };
  status?: { label?: string; color?: string; one_liner?: string };
  regime?: { asof_date?: string };
};

type HistoryBundle =
  | HistoryRow[]
  | { rows?: HistoryRow[]; items?: HistoryRow[]; data?: HistoryRow[] };

const CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

function isSupportedChain(v: string): v is ChainId {
  return CHAINS.includes(v as ChainId);
}

function expectedDelayDays(chain: ChainId) {
  return chain === "arbitrum" || chain === "base" ? 7 : 1;
}

function decodeBody(body: ArrayBuffer | Uint8Array): string {
  if (body instanceof Uint8Array) return new TextDecoder("utf-8").decode(body);
  return new TextDecoder("utf-8").decode(new Uint8Array(body));
}

async function readPublishedJson<T>(path: string): Promise<T | null> {
  const result = await readStorageObject(path);
  if (!result?.body) return null;

  try {
    return JSON.parse(decodeBody(result.body)) as T;
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

function fmtDate(v?: string) {
  return v?.trim() ? v : "—";
}

function fmtConf(v?: number) {
  return typeof v === "number" ? v.toFixed(3) : "—";
}

function confidenceBand(v?: number) {
  if (typeof v !== "number") return "—";
  if (v >= 0.7) return "Good";
  if (v >= 0.4) return "Caution";
  return "Degraded";
}

function regimeClass(label?: string | null) {
  if (label === "STABLE") return "status-stable";
  if (label === "HEATING") return "status-heating";
  if (label === "CONGESTED") return "status-congested";
  if (label === "CHEAP") return "status-cheap";
  return "status-unknown";
}

function bandClass(band: string) {
  if (band === "Good") return "status-stable";
  if (band === "Caution") return "status-heating";
  if (band === "Degraded") return "status-congested";
  return "status-unknown";
}

function chainDisplayName(chain: ChainId): string {
  if (chain === "arbitrum") return "Arbitrum";
  if (chain === "base") return "Base";
  if (chain === "bitcoin") return "Bitcoin";
  return "Ethereum";
}

export const revalidate = 0;

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
  const chainLabel = chainDisplayName(chainId);
  const canonicalPath = `data/published/v1/meta/${chainId}/last90d.json`;
  const source = currentDataSource();
  const expectedDelay = expectedDelayDays(chainId);

  const bundle = await readPublishedJson<HistoryBundle>(canonicalPath);
  const rows = extractRows(bundle).reverse();

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

  const goodCount = rows.filter((r) => (r.confidence?.confidence_score ?? 0) >= 0.7).length;
  const cautionCount = rows.filter((r) => {
    const s = r.confidence?.confidence_score ?? 0;
    return s >= 0.4 && s < 0.7;
  }).length;
  const degradedCount = rows.filter((r) => (r.confidence?.confidence_score ?? 1) < 0.4).length;

  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]">
        <div className="page-shell">
          <div className="eyebrow mb-4">
            <Link href="/chains" className="text-link">
              Chains
            </Link>
            <span className="mx-2 text-[var(--ink3)]">/</span>
            <Link href={`/chains/${chainId}`} className="text-link">
              {chainLabel}
            </Link>
            <span className="mx-2 text-[var(--ink3)]">/</span>
            <span className="text-[var(--ink3)]">History</span>
          </div>

          <h1 className="ua-h1">
            {chainLabel} <em>history</em>
          </h1>

          <p className="lead mt-6 max-w-2xl">
            Last 90 published regime rows. Reads the canonical published history bundle — no
            recomputation, no alternate files.
          </p>
        </div>
      </header>

      {rows.length > 0 && (
        <section className="border-b border-[var(--line)]">
          <div className="page-shell">
            <div className="fact-row" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
              <div className="fact-item">
                <strong>Latest regime</strong>
                <span>
                  <span className={`regime-token ${regimeClass(latestRegime)}`}>
                    {latestRegime ?? "—"}
                  </span>
                </span>
              </div>

              <div className="fact-item">
                <strong>Confidence</strong>
                <span>{latestConfidence !== null ? latestConfidence.toFixed(3) : "—"}</span>
              </div>

              <div className="fact-item">
                <strong>Band</strong>
                <span>
                  <span
                    className={`regime-token ${bandClass(
                      confidenceBand(latestConfidence ?? undefined)
                    )}`}
                  >
                    {confidenceBand(latestConfidence ?? undefined)}
                  </span>
                </span>
              </div>

              <div className="fact-item">
                <strong>Lag</strong>
                <span>{latestLag !== null ? `${latestLag}d` : "—"}</span>
              </div>

              <div className="fact-item">
                <strong>Rows loaded</strong>
                <span>{rows.length}</span>
              </div>

              <div className="fact-item">
                <strong>Expected delay</strong>
                <span>{expectedDelay}d</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="page-shell py-16">
        {rows.length > 0 && (
          <div className="fact-row mb-12" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <div className="fact-item">
              <strong className="status-stable">Good confidence</strong>
              <span>{goodCount} rows</span>
            </div>

            <div className="fact-item">
              <strong className="status-heating">Caution</strong>
              <span>{cautionCount} rows</span>
            </div>

            <div className="fact-item">
              <strong className="status-congested">Degraded</strong>
              <span>{degradedCount} rows</span>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="border-y border-[var(--gold-line)] py-6">
            <div className="eyebrow mb-2 text-[var(--gold)]">
              Published history bundle unavailable
            </div>

            <p className="text-sm text-[var(--ink2)] max-w-xl">
              The canonical history bundle for this chain could not be read from published storage.
              This page intentionally does not fall back to alternate files.
            </p>
          </div>
        ) : (
          <>
            <div className="eyebrow mb-4">Last 90 published rows</div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-3 pr-6">Date</th>
                    <th className="text-left py-3 pr-6">As of</th>
                    <th className="text-left py-3 pr-6">Regime</th>
                    <th className="text-left py-3 pr-6">Confidence</th>
                    <th className="text-left py-3 pr-6">Band</th>
                    <th className="text-left py-3 pr-6">Lag</th>
                    <th className="text-left py-3">Summary</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => {
                    const band = confidenceBand(row.confidence?.confidence_score);

                    return (
                      <tr
                        key={`${row.date ?? "row"}-${index}`}
                        className="border-b border-[var(--line)] hover:bg-[var(--surface3)] transition-colors"
                      >
                        <td className="py-4 pr-6 font-mono text-[12px] text-[var(--ink)]">
                          {fmtDate(row.date)}
                        </td>
                        <td className="py-4 pr-6 font-mono text-[12px] text-[var(--ink2)]">
                          {fmtDate(row.updated_through ?? row.regime?.asof_date)}
                        </td>
                        <td className="py-4 pr-6">
                          <span className={`regime-token ${regimeClass(row.status?.label ?? null)}`}>
                            {row.status?.label ?? "—"}
                          </span>
                        </td>
                        <td className="py-4 pr-6 font-mono text-[12px] text-[var(--ink)]">
                          {fmtConf(row.confidence?.confidence_score)}
                        </td>
                        <td className="py-4 pr-6">
                          <span className={`regime-token ${bandClass(band)}`}>{band}</span>
                        </td>
                        <td className="py-4 pr-6 font-mono text-[12px] text-[var(--ink2)]">
                          {typeof row.confidence?.lag_days_vs_utc_today === "number"
                            ? `${row.confidence.lag_days_vs_utc_today}d`
                            : "—"}
                        </td>
                        <td className="py-4 text-[var(--ink2)] text-[13px] max-w-xs">
                          {row.status?.one_liner?.trim() || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-12 border-t border-[var(--line)] pt-8">
          <div className="eyebrow mb-4">Traceability</div>

          <div className="data-row" style={{ gridTemplateColumns: "160px 1fr" }}>
            <span className="font-mono text-[11px] text-[var(--ink3)] uppercase tracking-[.1em]">
              Source
            </span>
            <span className="font-mono text-[12px] text-[var(--ink2)]">
              Source: {source}
            </span>
          </div>

          <div className="data-row" style={{ gridTemplateColumns: "160px 1fr" }}>
            <span className="font-mono text-[11px] text-[var(--ink3)] uppercase tracking-[.1em]">
              Source file
            </span>
            <span className="font-mono text-[12px] text-[var(--ink2)]">{canonicalPath}</span>
          </div>

          <div className="data-row" style={{ gridTemplateColumns: "160px 1fr" }}>
            <span className="font-mono text-[11px] text-[var(--ink3)] uppercase tracking-[.1em]">
              Expected delay
            </span>
            <span className="font-mono text-[12px] text-[var(--ink2)]">
              Expected delay: {expectedDelay}d
            </span>
          </div>
        </div>

        <div className="mt-12 border-t border-[var(--line)] pt-8 grid gap-0 max-w-2xl">
          <div className="eyebrow mb-6">Interpretation boundary</div>

          <div className="data-row">
            <p>This page reads one canonical published history bundle.</p>
          </div>

          <div className="data-row">
            <p>It does not search for alternate files.</p>
          </div>

          <div className="data-row">
            <p>This history view is descriptive only. It does not recompute regime labels.</p>
          </div>

          <div className="data-row">
            <p>It does not imply forecast quality or backtested performance.</p>
          </div>

          <div className="data-row">
            <p>
              Read together with{" "}
              <Link href="/methodology" className="text-link">
                methodology
              </Link>
              ,{" "}
              <Link href="/glossary" className="text-link">
                glossary
              </Link>
              , and the current{" "}
              <Link href={`/chains/${chainId}`} className="text-link">
                chain page
              </Link>
              .
            </p>
          </div>

          <div className="data-row">
            <p>
              <Link href="/track-record" className="text-link">
                Cross-chain track record →
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-12 border-y border-[var(--line)] py-6 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="eyebrow mb-2">Want the JSON behind this history?</div>
            <p className="text-sm text-[var(--ink2)] max-w-lg">
              Every label here is backed by a determinism hash and a full confidence score. A
              subscription gives you API access to the complete Meta JSON.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up" className="btn-ghost">
              Sign up free
            </Link>
            <Link href="/#pricing" className="btn-primary">
              See plans
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}