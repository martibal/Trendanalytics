// src/app/track-record/page.tsx
import Link from "next/link";
import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource, readStorageObject } from "@/lib/storage";
import ChainIcon from "@/components/ChainIcon";

type MetaHistoryRow = {
  chain?: string;
  date?: string;
  updated_through?: string;
  methodology_version?: string;
  revision_id?: number;
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

type TrackRow = {
  chain: ChainId;
  chainLabel: string;
  chainName: string;
  date: string | null;
  asOf: string | null;
  regimeLabel: string | null;
  confidence: number | null;
  lagDays: number | null;
  methodologyVersion: string | null;
  revisionId: number | null;
  oneLiner: string | null;
};

type RegimeBucket = "STABLE" | "HEATING" | "CONGESTED" | "UNKNOWN/DEGRADED" | "OTHER";

type ChainStackSummary = {
  chain: ChainId;
  chainLabel: string;
  chainName: string;
  total: number;
  stable: number;
  heating: number;
  congested: number;
  degraded: number;
  other: number;
};

type TrackRecordChainFilter = ChainId | "all";
type TrackRecordWindowFilter = 30 | 90;

type TrackRecordSearchParams = {
  chain?: string;
  window?: string;
};

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
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

function normalizeChain(value?: string): TrackRecordChainFilter {
  if (value === "bitcoin" || value === "ethereum" || value === "arbitrum" || value === "base") {
    return value;
  }
  return "all";
}

function normalizeWindow(value?: string): TrackRecordWindowFilter {
  const n = Number(value);
  if (n === 30) return 30;
  return 90;
}

function fmtDate(value?: string | null) {
  return value && value.trim().length > 0 ? value : "—";
}

function fmtConfidence(value?: number | null) {
  return typeof value === "number" ? value.toFixed(3) : "—";
}

function confidenceBand(value?: number | null) {
  if (typeof value !== "number") return "—";
  if (value >= 0.7) return "Good";
  if (value >= 0.4) return "Caution";
  return "Degraded";
}

function bandClass(band: string) {
  const base = "rounded-full border px-2 py-1 text-xs";
  if (band === "Good") return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`;
  if (band === "Caution") return `${base} border-amber-500/30 bg-amber-500/10 text-amber-300`;
  if (band === "Degraded") return `${base} border-red-500/30 bg-red-500/10 text-red-300`;
  return `${base} border-border bg-muted text-muted-foreground`;
}

function regimeBadgeClass(label?: string | null) {
  const base = "rounded-full border px-2 py-1 text-xs";
  if (!label) return `${base} border-border bg-muted text-muted-foreground`;
  if (label === "CONGESTED") return `${base} border-red-500/30 bg-red-500/10 text-red-300`;
  if (label === "HEATING") return `${base} border-amber-500/30 bg-amber-500/10 text-amber-300`;
  if (label === "STABLE") return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`;
  if (label === "COOLING") return `${base} border-blue-500/30 bg-blue-500/10 text-blue-300`;
  if (label === "UNKNOWN/DEGRADED") return `${base} border-slate-500/30 bg-slate-500/10 text-slate-300`;
  return `${base} border-border bg-muted text-muted-foreground`;
}

function toCsv(rows: TrackRow[]): string {
  const header = [
    "chain",
    "chain_label",
    "date",
    "as_of",
    "regime_label",
    "confidence_score",
    "lag_days",
    "methodology_version",
    "revision_id",
    "one_liner",
  ];

  const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.chain,
        row.chainLabel,
        row.date ?? "",
        row.asOf ?? "",
        row.regimeLabel ?? "",
        row.confidence !== null ? String(row.confidence) : "",
        row.lagDays !== null ? String(row.lagDays) : "",
        row.methodologyVersion ?? "",
        row.revisionId !== null ? String(row.revisionId) : "",
        row.oneLiner ?? "",
      ]
        .map((cell) => escapeCell(cell))
        .join(",")
    ),
  ];

  return lines.join("\n");
}

function csvDownloadHref(rows: TrackRow[]): string {
  const csv = toCsv(rows);
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

function buildTrackRecordHref(
  chain: TrackRecordChainFilter,
  window: TrackRecordWindowFilter
): string {
  return `/track-record?chain=${chain}&window=${window}`;
}

async function readChainHistory(chain: ChainId): Promise<TrackRow[]> {
  const storagePath = `data/published/v1/meta/${chain}/last90d.json`;
  const bundle = await readPublishedJson<MetaHistoryBundle>(storagePath);
  const rows = extractRows(bundle);

  const chainCfg = CHAIN_LIST.find((item) => item.id === chain);

  return rows
    .filter((row) => typeof row.date === "string")
    .map((row) => ({
      chain,
      chainLabel: chainCfg?.label ?? chain.toUpperCase(),
      chainName: chainCfg?.name ?? chain,
      date: row.date ?? null,
      asOf: row.updated_through ?? row.regime?.asof_date ?? null,
      regimeLabel: row.status?.label ?? null,
      confidence: typeof row.confidence?.confidence_score === "number" ? row.confidence.confidence_score : null,
      lagDays:
        typeof row.confidence?.lag_days_vs_utc_today === "number"
          ? row.confidence.lag_days_vs_utc_today
          : null,
      methodologyVersion: row.methodology_version ?? null,
      revisionId: typeof row.revision_id === "number" ? row.revision_id : null,
      oneLiner: row.status?.one_liner ?? null,
    }));
}

function toRegimeBucket(label: string | null): RegimeBucket {
  if (label === "STABLE") return "STABLE";
  if (label === "HEATING") return "HEATING";
  if (label === "CONGESTED") return "CONGESTED";
  if (label === "UNKNOWN/DEGRADED") return "UNKNOWN/DEGRADED";
  return "OTHER";
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

function formatPct(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function stackSegmentClass(bucket: RegimeBucket): string {
  if (bucket === "STABLE") return "bg-emerald-400";
  if (bucket === "HEATING") return "bg-amber-400";
  if (bucket === "CONGESTED") return "bg-red-400";
  if (bucket === "UNKNOWN/DEGRADED") return "bg-slate-400";
  return "bg-sky-400";
}

function buildChainStackSummaries(rows: TrackRow[]): ChainStackSummary[] {
  return CHAIN_LIST.map((chainCfg) => {
    const chainRows = rows.filter((row) => row.chain === chainCfg.id);
    const counts = chainRows.reduce(
      (acc, row) => {
        const bucket = toRegimeBucket(row.regimeLabel);
        if (bucket === "STABLE") acc.stable += 1;
        else if (bucket === "HEATING") acc.heating += 1;
        else if (bucket === "CONGESTED") acc.congested += 1;
        else if (bucket === "UNKNOWN/DEGRADED") acc.degraded += 1;
        else acc.other += 1;
        return acc;
      },
      {
        stable: 0,
        heating: 0,
        congested: 0,
        degraded: 0,
        other: 0,
      }
    );

    return {
      chain: chainCfg.id,
      chainLabel: chainCfg.label,
      chainName: chainCfg.name,
      total: chainRows.length,
      stable: counts.stable,
      heating: counts.heating,
      congested: counts.congested,
      degraded: counts.degraded,
      other: counts.other,
    };
  });
}

function buildOverallStackSummary(rows: TrackRow[]) {
  return rows.reduce(
    (acc, row) => {
      const bucket = toRegimeBucket(row.regimeLabel);
      acc.total += 1;
      if (bucket === "STABLE") acc.stable += 1;
      else if (bucket === "HEATING") acc.heating += 1;
      else if (bucket === "CONGESTED") acc.congested += 1;
      else if (bucket === "UNKNOWN/DEGRADED") acc.degraded += 1;
      else acc.other += 1;
      return acc;
    },
    {
      total: 0,
      stable: 0,
      heating: 0,
      congested: 0,
      degraded: 0,
      other: 0,
    }
  );
}

function StackLegendItem({
  label,
  count,
  total,
  bucket,
}: {
  label: string;
  count: number;
  total: number;
  bucket: RegimeBucket;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${stackSegmentClass(bucket)}`} />
      <span>{label}</span>
      <span className="text-foreground">
        {count} ({formatPct(count, total)})
      </span>
    </div>
  );
}

export default async function TrackRecordPage({
  searchParams,
}: {
  searchParams?: Promise<TrackRecordSearchParams>;
}) {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  const resolvedSearchParams: TrackRecordSearchParams = searchParams
    ? await searchParams
    : {};

  const selectedChain = normalizeChain(resolvedSearchParams.chain);
  const selectedWindow = normalizeWindow(resolvedSearchParams.window);

  const chainIds: ChainId[] =
    selectedChain === "all"
      ? ["bitcoin", "ethereum", "arbitrum", "base"]
      : [selectedChain];

  const allRows = (await Promise.all(chainIds.map((chain) => readChainHistory(chain))))
    .flat()
    .sort((a, b) => {
      const da = a.date ?? "";
      const db = b.date ?? "";
      if (da !== db) return db.localeCompare(da);
      return a.chain.localeCompare(b.chain);
    });

  const filteredRows = allRows.slice(0, selectedWindow * chainIds.length);
  const csvHref = csvDownloadHref(filteredRows);

  const stableCount = filteredRows.filter((row) => row.regimeLabel === "STABLE").length;
  const heatingCount = filteredRows.filter((row) => row.regimeLabel === "HEATING").length;
  const congestedCount = filteredRows.filter((row) => row.regimeLabel === "CONGESTED").length;
  const degradedCount = filteredRows.filter((row) => row.regimeLabel === "UNKNOWN/DEGRADED").length;

  const chainStackSummaries = buildChainStackSummaries(filteredRows).filter((item) =>
    selectedChain === "all" ? true : item.chain === selectedChain
  );
  const overallStackSummary = buildOverallStackSummary(filteredRows);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Track Record</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Public historical view of published regime labels over time. This page is descriptive only and does
          not imply forecasting, backtested performance, or recommendations.
        </p>

        <div className="mt-4 rounded-xl border p-4 text-sm">
          <div className="font-medium">Published context</div>
          <div className="mt-2 grid gap-1 text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Dataset version:</span> {dataset?.version ?? "—"}
            </div>
            <div>
              <span className="font-medium text-foreground">Published at:</span> {dataset?.published_at ?? "—"}
            </div>
            <div>
              <span className="font-medium text-foreground">Methodology version:</span>{" "}
              {dataset?.methodology_version ?? "—"}
            </div>
            <div>
              <span className="font-medium text-foreground">Data source:</span> {currentDataSource()}
            </div>
            <div className="pt-1 text-xs text-muted-foreground">
              Source: <InlineCode>/public/data/published/v1/dataset.json</InlineCode>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border p-4 text-sm">
          <div className="font-medium">Filters</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[
              { key: "all" as const, label: "All chains" },
              { key: "bitcoin" as const, label: "Bitcoin" },
              { key: "ethereum" as const, label: "Ethereum" },
              { key: "arbitrum" as const, label: "Arbitrum" },
              { key: "base" as const, label: "Base" },
            ].map((option) => {
              const active = selectedChain === option.key;
              return (
                <Link
                  key={option.key}
                  href={buildTrackRecordHref(option.key, selectedWindow)}
                  className={[
                    "rounded-full border px-3 py-1 text-sm",
                    active ? "bg-muted font-medium" : "bg-transparent",
                  ].join(" ")}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {([30, 90] as const).map((windowValue) => {
              const active = selectedWindow === windowValue;
              return (
                <Link
                  key={windowValue}
                  href={buildTrackRecordHref(selectedChain, windowValue)}
                  className={[
                    "rounded-full border px-3 py-1 text-sm",
                    active ? "bg-muted font-medium" : "bg-transparent",
                  ].join(" ")}
                >
                  {windowValue}d
                </Link>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <a
              href={csvHref}
              download={`trendanalytics-track-record-${selectedChain}-${selectedWindow}d.csv`}
              className="underline"
            >
              Export displayed window as CSV
            </a>
            <span>·</span>
            <span>Displayed rows: {filteredRows.length}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border p-4 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Stable rows</div>
            <div className="mt-2 text-2xl font-semibold">{stableCount}</div>
          </div>
          <div className="rounded-xl border p-4 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Heating rows</div>
            <div className="mt-2 text-2xl font-semibold">{heatingCount}</div>
          </div>
          <div className="rounded-xl border p-4 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Congested rows</div>
            <div className="mt-2 text-2xl font-semibold">{congestedCount}</div>
          </div>
          <div className="rounded-xl border p-4 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Degraded rows</div>
            <div className="mt-2 text-2xl font-semibold">{degradedCount}</div>
          </div>
        </div>
      </header>

      <section className="mb-8 rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Cross-chain regime mix</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stacked bars summarize the published regime composition inside the currently selected window.
            This is a descriptive cross-chain view of canonical labels, not a recomputation.
          </p>
        </div>

        <div className="grid gap-4 px-4 py-4">
          <div className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Overall displayed window</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Aggregate across {selectedChain === "all" ? "all visible chains" : "the selected chain"} for the last{" "}
                  {selectedWindow} published days.
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Total rows: <span className="font-medium text-foreground">{overallStackSummary.total}</span>
              </div>
            </div>

            <div className="mt-4 h-5 w-full overflow-hidden rounded-full border bg-muted">
              <div className="flex h-full w-full">
                <div
                  className={stackSegmentClass("STABLE")}
                  style={{ width: `${pct(overallStackSummary.stable, overallStackSummary.total)}%` }}
                  aria-hidden="true"
                />
                <div
                  className={stackSegmentClass("HEATING")}
                  style={{ width: `${pct(overallStackSummary.heating, overallStackSummary.total)}%` }}
                  aria-hidden="true"
                />
                <div
                  className={stackSegmentClass("CONGESTED")}
                  style={{ width: `${pct(overallStackSummary.congested, overallStackSummary.total)}%` }}
                  aria-hidden="true"
                />
                <div
                  className={stackSegmentClass("UNKNOWN/DEGRADED")}
                  style={{ width: `${pct(overallStackSummary.degraded, overallStackSummary.total)}%` }}
                  aria-hidden="true"
                />
                <div
                  className={stackSegmentClass("OTHER")}
                  style={{ width: `${pct(overallStackSummary.other, overallStackSummary.total)}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              <StackLegendItem
                label="Stable"
                count={overallStackSummary.stable}
                total={overallStackSummary.total}
                bucket="STABLE"
              />
              <StackLegendItem
                label="Heating"
                count={overallStackSummary.heating}
                total={overallStackSummary.total}
                bucket="HEATING"
              />
              <StackLegendItem
                label="Congested"
                count={overallStackSummary.congested}
                total={overallStackSummary.total}
                bucket="CONGESTED"
              />
              <StackLegendItem
                label="Unknown / Degraded"
                count={overallStackSummary.degraded}
                total={overallStackSummary.total}
                bucket="UNKNOWN/DEGRADED"
              />
              <StackLegendItem
                label="Other"
                count={overallStackSummary.other}
                total={overallStackSummary.total}
                bucket="OTHER"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {chainStackSummaries.map((summary) => (
              <div key={summary.chain} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ChainIcon
                      chain={summary.chain}
                      className="h-8 w-8 text-xs"
                      label={`${summary.chainLabel} icon`}
                    />
                    <div>
                      <div className="text-sm font-medium">{summary.chainName}</div>
                      <div className="text-xs text-muted-foreground">{summary.chainLabel}</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Rows in view: <span className="font-medium text-foreground">{summary.total}</span>
                  </div>
                </div>

                <div className="mt-4 h-5 w-full overflow-hidden rounded-full border bg-muted">
                  <div className="flex h-full w-full">
                    <div
                      className={stackSegmentClass("STABLE")}
                      style={{ width: `${pct(summary.stable, summary.total)}%` }}
                      aria-hidden="true"
                    />
                    <div
                      className={stackSegmentClass("HEATING")}
                      style={{ width: `${pct(summary.heating, summary.total)}%` }}
                      aria-hidden="true"
                    />
                    <div
                      className={stackSegmentClass("CONGESTED")}
                      style={{ width: `${pct(summary.congested, summary.total)}%` }}
                      aria-hidden="true"
                    />
                    <div
                      className={stackSegmentClass("UNKNOWN/DEGRADED")}
                      style={{ width: `${pct(summary.degraded, summary.total)}%` }}
                      aria-hidden="true"
                    />
                    <div
                      className={stackSegmentClass("OTHER")}
                      style={{ width: `${pct(summary.other, summary.total)}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  <StackLegendItem
                    label="Stable"
                    count={summary.stable}
                    total={summary.total}
                    bucket="STABLE"
                  />
                  <StackLegendItem
                    label="Heating"
                    count={summary.heating}
                    total={summary.total}
                    bucket="HEATING"
                  />
                  <StackLegendItem
                    label="Congested"
                    count={summary.congested}
                    total={summary.total}
                    bucket="CONGESTED"
                  />
                  <StackLegendItem
                    label="Unknown / Degraded"
                    count={summary.degraded}
                    total={summary.total}
                    bucket="UNKNOWN/DEGRADED"
                  />
                  <StackLegendItem
                    label="Other"
                    count={summary.other}
                    total={summary.total}
                    bucket="OTHER"
                  />
                </div>

                <div className="mt-4">
                  <Link
                    href={`/chains/${summary.chain}/history`}
                    className="text-sm text-muted-foreground underline hover:text-foreground"
                  >
                    Open full history page for {summary.chainName}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Source bundles:{" "}
          <InlineCode>
            {selectedChain === "all"
              ? "/public/data/published/v1/meta/&lt;chain&gt;/last90d.json"
              : `/public/data/published/v1/meta/${selectedChain}/last90d.json`}
          </InlineCode>
        </div>
      </section>

      <section className="rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Historical regime timeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This table shows published daily regime labels from the canonical history bundles. It does not
            recompute labels and does not infer missing values.
          </p>
        </div>

        {filteredRows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No published history rows were available for the selected chain/window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Chain</th>
                  <th className="px-4 py-3">Regime</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Band</th>
                  <th className="px-4 py-3">Lag</th>
                  <th className="px-4 py-3">As of</th>
                  <th className="px-4 py-3">Methodology</th>
                  <th className="px-4 py-3">Revision</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => {
                  const band = confidenceBand(row.confidence);

                  return (
                    <tr key={`${row.chain}-${row.date ?? "row"}-${index}`} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/chains/${row.chain}/history`}
                          className="inline-flex items-center gap-3 hover:underline"
                        >
                          <ChainIcon
                            chain={row.chain}
                            className="h-7 w-7 text-xs"
                            label={`${row.chainLabel} icon`}
                          />
                          <span>{row.chainLabel}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={regimeBadgeClass(row.regimeLabel)}>{row.regimeLabel ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">{fmtConfidence(row.confidence)}</td>
                      <td className="px-4 py-3">
                        <span className={bandClass(band)}>{band}</span>
                      </td>
                      <td className="px-4 py-3">{row.lagDays !== null ? row.lagDays : "—"}</td>
                      <td className="px-4 py-3">{fmtDate(row.asOf)}</td>
                      <td className="px-4 py-3">{row.methodologyVersion ?? dataset?.methodology_version ?? "—"}</td>
                      <td className="px-4 py-3">{row.revisionId ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Source bundles:{" "}
          <InlineCode>
            {selectedChain === "all"
              ? "/public/data/published/v1/meta/&lt;chain&gt;/last90d.json"
              : `/public/data/published/v1/meta/${selectedChain}/last90d.json`}
          </InlineCode>
        </div>
      </section>

      <div className="mt-8 grid gap-6">
        <Section title="Interpretation boundary">
          <ul className="list-disc pl-5">
            <li>No price data.</li>
            <li>No forecasts.</li>
            <li>No advisory language.</li>
            <li>Historical views remain descriptive and based on published artifacts.</li>
          </ul>
        </Section>

        <Section title="How this relates to the product">
          Track Record gives users a way to inspect whether current conditions look transient or persistent in the
          context of earlier published outputs. It complements chain pages, methodology, glossary, and status.
        </Section>

        <Section title="Traceability">
          Historical outputs should always be interpreted in the context of the currently published{" "}
          <InlineCode>methodology_version</InlineCode> and revision-aware published artifacts. This route is
          descriptive and should not imply backtested trading performance or predictive accuracy.
        </Section>

        <Section title="Related pages">
          <ul className="list-disc pl-5">
            <li>
              <Link href="/chains" className="underline">
                /chains
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
            <li>
              <Link href="/about" className="underline">
                /about
              </Link>
            </li>
          </ul>
        </Section>
      </div>
    </main>
  );
}