// src/app/status/page.tsx
import Link from "next/link";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource, readStorageObject } from "@/lib/storage";
import RegimeBadge from "@/components/RegimeBadge";
import StalenessBar from "@/components/ui/StalenessBar";
import ChainIcon from "@/components/ChainIcon";

type StatusRow = {
  chain: ChainId;
  name: string;
  label: string;
  as_of: string | null;
  lag_days: number | null;
  status: "ok" | "warn" | "fail" | "unknown";
  published_regime: string | null;
  confidence_score: number | null;
  expected_delay_days: number;
};

type MetaLatest = {
  updated_through?: string;
  date?: string;
  status?: {
    label?: string;
    one_liner?: string;
    color?: string;
  };
  confidence?: {
    confidence_score?: number;
    lag_days_vs_utc_today?: number;
  };
  regime?: {
    label?: string;
    asof_date?: string;
  };
  profile?: {
    label?: string;
  };
};

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readStorageObject(storagePath);

  if (!result) return null;

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

function fmtDate(d?: string | null) {
  return d && d.trim().length > 0 ? d : "—";
}

function fmtNum(v?: number | null) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return String(v);
}

function confidenceBand(v?: number | null) {
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

function healthPillClass(kind: "ok" | "warn" | "fail" | "unknown") {
  const base = "rounded-full border px-2 py-1 text-xs";
  if (kind === "ok") return `${base} bg-green-50`;
  if (kind === "warn") return `${base} bg-yellow-50`;
  if (kind === "fail") return `${base} bg-red-50`;
  return `${base} bg-muted`;
}

function healthText(kind: "ok" | "warn" | "fail" | "unknown") {
  if (kind === "ok") return "OK";
  if (kind === "warn") return "WARN";
  if (kind === "fail") return "FAIL";
  return "—";
}

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

function datasetNotes(dataset: DatasetManifest | null): string[] {
  const notes = dataset?.notes;

  if (Array.isArray(notes)) {
    return notes.filter(
      (note): note is string =>
        typeof note === "string" && note.trim().length > 0
    );
  }

  if (typeof notes === "string" && notes.trim().length > 0) {
    return [notes];
  }

  return [];
}

function expectedDelayDays(chain: ChainId): number {
  return chain === "arbitrum" || chain === "base" ? 7 : 0;
}

function deriveHealth(params: {
  lagDays: number | null;
  asOf: string | null;
  expectedDelayDays: number;
}): "ok" | "warn" | "fail" | "unknown" {
  const { lagDays, asOf, expectedDelayDays } = params;

  if (!asOf || typeof lagDays !== "number") {
    return "unknown";
  }

  if (lagDays <= expectedDelayDays) {
    return "ok";
  }

  if (lagDays <= expectedDelayDays + 2) {
    return "warn";
  }

  return "fail";
}

async function buildStatusRows(): Promise<StatusRow[]> {
  const rows = await Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const metaPath = `data/published/v1/meta/${chain.id}/latest.json`;
      const meta = await readPublishedJson<MetaLatest>(metaPath);

      const asOf = meta?.updated_through ?? meta?.regime?.asof_date ?? meta?.date ?? null;
      const lagDays =
        typeof meta?.confidence?.lag_days_vs_utc_today === "number"
          ? meta.confidence.lag_days_vs_utc_today
          : null;

      const delay = expectedDelayDays(chain.id);
      const health = deriveHealth({
        lagDays,
        asOf,
        expectedDelayDays: delay,
      });

      return {
        chain: chain.id,
        name: chain.name,
        label: chain.label,
        as_of: asOf,
        lag_days: lagDays,
        status: health,
        published_regime: meta?.status?.label ?? meta?.regime?.label ?? null,
        confidence_score:
          typeof meta?.confidence?.confidence_score === "number"
            ? meta.confidence.confidence_score
            : null,
        expected_delay_days: delay,
      };
    })
  );

  return rows;
}

export default async function StatusPage() {
  const base = "data/published/v1";

  const dataset: DatasetManifest | null = await readDatasetManifest();
  const rows = await buildStatusRows();
  const notes = datasetNotes(dataset);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Status</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Freshness and health context for published artifacts. This page reads the
          published dataset manifest together with each chain’s canonical Meta latest
          file and shows the result descriptively. It is meant to answer “How current
          and how usable are the published artifacts right now?” rather than “What
          should I do?”
        </p>

        <div className="mt-4 rounded-xl border p-5 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="font-medium">Dataset</div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Link href="/methodology" className="hover:underline">
                Methodology
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/methodology/previously" className="hover:underline">
                Previously
              </Link>
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Version:</span>{" "}
              {dataset?.version ?? "—"}
            </div>

            <div>
              <span className="font-medium text-foreground">Published at:</span>{" "}
              {dataset?.published_at ?? "—"}
            </div>

            <div>
              <span className="font-medium text-foreground">Methodology version:</span>{" "}
              {dataset?.methodology_version ?? "—"}
            </div>

            <div>
              <span className="font-medium text-foreground">Data source:</span>{" "}
              {currentDataSource()}
            </div>

            <div>
              <span className="font-medium text-foreground">Chains:</span>{" "}
              {rows.length > 0
                ? rows.map((r) => r.chain).join(", ")
                : Array.isArray(dataset?.chains)
                ? dataset.chains.join(", ")
                : "—"}
            </div>

            {notes.length > 0 ? (
              <div className="pt-2 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">Notes:</div>
                <ul className="mt-2 list-disc pl-5">
                  {notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="pt-2 text-xs text-muted-foreground">
              Sources: <InlineCode>{`/public/${base}/dataset.json`}</InlineCode> and{" "}
              <InlineCode>{`/public/${base}/meta/<chain>/latest.json`}</InlineCode>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border bg-muted/10 p-4 text-sm leading-6 text-muted-foreground">
          <div className="font-medium text-foreground">How to read this page</div>
          <div className="mt-2">
            <strong>Health</strong> is a freshness classification derived from lag
            relative to each chain’s expected publish cadence. <strong>Confidence</strong>{" "}
            is different: it tells you how much published evidence supports the
            current state. A row can be on schedule but still degraded if confidence
            is low, and a row can be delayed without being mathematically invalid.
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {rows.map((row) => (
            <div key={`stale-${row.chain}`} className="rounded-xl">
              <StalenessBar
                chain={row.chain}
                lagDays={row.lag_days}
                asOfDate={row.as_of ?? "—"}
                confidenceScore={row.confidence_score}
                showWhenOk={true}
              />
            </div>
          ))}
        </div>
      </header>

      <section className="rounded-xl border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Chain</th>
                <th className="px-4 py-3">Regime</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Band</th>
                <th className="px-4 py-3">Lag (days)</th>
                <th className="px-4 py-3">As of</th>
                <th className="px-4 py-3">Expected delay</th>
                <th className="px-4 py-3">Health</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const band = confidenceBand(row.confidence_score);

                return (
                  <tr key={row.chain} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/chains/${row.chain}`}
                        className="inline-flex items-center gap-3 hover:underline"
                      >
                        <ChainIcon
                          chain={row.chain}
                          className="h-7 w-7 text-xs"
                          label={`${row.label} icon`}
                        />
                        <span>{row.label || row.name}</span>
                      </Link>
                    </td>

                    <td className="px-4 py-3">
                      <RegimeBadge label={row.published_regime ?? "—"} />
                    </td>

                    <td className="px-4 py-3">
                      {typeof row.confidence_score === "number"
                        ? row.confidence_score.toFixed(3)
                        : "—"}
                    </td>

                    <td className="px-4 py-3">
                      <span className={pillClass(band)}>{band}</span>
                    </td>

                    <td className="px-4 py-3">{fmtNum(row.lag_days)}</td>
                    <td className="px-4 py-3">{fmtDate(row.as_of)}</td>
                    <td className="px-4 py-3">{fmtNum(row.expected_delay_days)}</td>

                    <td className="px-4 py-3">
                      <span className={healthPillClass(row.status)}>
                        {healthText(row.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Source contract: dataset manifest + canonical published meta latest per
          chain. Confidence band is evidence-strength context for the current row;
          health is freshness context relative to expected cadence.
        </div>
      </section>

      <section className="mt-6 rounded-xl border p-5 text-sm leading-6 text-muted-foreground">
        <div className="font-medium text-foreground">Interpretation boundary</div>
        <div className="mt-2">
          Status is not a market outlook page. It does not forecast, rank chains by
          attractiveness, or imply a recommendation. Its role is to tell the user
          whether the published artifacts appear current, delayed, confidence-limited,
          or degraded.
        </div>
      </section>
    </main>
  );
}
