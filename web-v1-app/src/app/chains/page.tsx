// src/app/chains/page.tsx
import Link from "next/link";
import RegimeBadge from "@/components/RegimeBadge";
import ChainIcon from "@/components/ChainIcon";
import { currentDataSource, readStorageObject } from "@/lib/storage";
import type { ChainId } from "@/config/chains";

type MetaLatest = {
  profile?: { label?: string; note?: string };
  status?: { label?: string; one_liner?: string; color?: string };
  confidence?: { confidence_score?: number; lag_days_vs_utc_today?: number };
  updated_through?: string;
  regime?: { asof_date?: string };
};

const CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"] as const satisfies readonly ChainId[];

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

function confidenceBand(v?: number) {
  if (typeof v !== "number") return "—";
  if (v >= 0.7) return "Good";
  if (v >= 0.4) return "Caution";
  return "Degraded";
}

function pillClass(band: string) {
  const base = "rounded-full border px-2 py-1 text-xs";
  if (band === "Good") return `${base} bg-green-50`;
  if (band === "Caution") return `${base} bg-yellow-50`;
  if (band === "Degraded") return `${base} bg-red-50`;
  return `${base} bg-muted`;
}

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

export default async function ChainsIndexPage() {
  const base = "data/published/v1";

  const rows = await Promise.all(
    CHAINS.map(async (chain) => {
      const meta = await readPublishedJson<MetaLatest>(`${base}/meta/${chain}/latest.json`);
      return { chain, meta };
    })
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Chains</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Descriptive on-chain regime context per chain. No price. No forecasts. No recommendations.
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-3 text-sm">
              <Link href="/" className="text-muted-foreground hover:underline">
                Home
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/status" className="text-muted-foreground hover:underline">
                Status
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/methodology" className="text-muted-foreground hover:underline">
                Methodology
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/glossary" className="text-muted-foreground hover:underline">
                Glossary
              </Link>
            </nav>
          </div>

          <div className="rounded-xl border p-4 text-sm">
            <div className="font-medium">Traceability</div>
            <div className="mt-2 leading-6 text-muted-foreground">
              Each card below reads published fields from{" "}
              <InlineCode>{`/public/${base}/meta/<chain>/latest.json`}</InlineCode> through the internal
              storage adapter. The UI does not recompute any statistics. Current data source:{" "}
              <InlineCode>{currentDataSource()}</InlineCode>
            </div>
          </div>
        </div>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-medium">Available chains</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {rows.map(({ chain, meta }) => {
            const label = meta?.profile?.label ?? chain;
            const regime = meta?.status?.label ?? "UNKNOWN";
            const oneLiner = meta?.status?.one_liner;
            const conf = meta?.confidence?.confidence_score;
            const band = confidenceBand(conf);
            const asOf = meta?.updated_through ?? meta?.regime?.asof_date ?? "—";
            const lag =
              typeof meta?.confidence?.lag_days_vs_utc_today === "number"
                ? meta.confidence.lag_days_vs_utc_today
                : null;

            return (
              <Link
                key={chain}
                href={`/chains/${chain}`}
                className="rounded-xl border p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ChainIcon chain={chain} label={`${label} icon`} />
                    <div>
                      <div className="text-lg font-semibold">{label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Chain: <InlineCode>{chain}</InlineCode>
                      </div>
                    </div>
                  </div>

                  <span className={pillClass(band)}>{band}</span>
                </div>

                <div className="mt-4">
                  <div className="text-sm text-muted-foreground">Regime</div>
                  <div className="mt-2">
                    <RegimeBadge label={regime} statusColor={meta?.status?.color} />
                  </div>
                </div>

                {oneLiner ? (
                  <div className="mt-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Summary:</span> {oneLiner}
                  </div>
                ) : null}

                <div className="mt-4 text-sm text-muted-foreground">
                  Confidence:{" "}
                  <span className="font-medium">
                    {typeof conf === "number" ? conf.toFixed(3) : "—"}
                  </span>
                  {lag !== null ? <span className="ml-2">(lag: {lag}d)</span> : null}
                </div>

                <div className="mt-2 text-xs text-muted-foreground">As of: {asOf}</div>

                <div className="mt-3 text-xs text-muted-foreground">
                  Source: <InlineCode>{`/public/${base}/meta/${chain}/latest.json`}</InlineCode>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}