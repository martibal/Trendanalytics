"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import ChainIcon from "@/components/ChainIcon";

type SourceFreshness = {
  source?: string | null;
  generated_at_utc?: string | null;
  last_run_at_utc?: string | null;
  last_run_date?: string | null;
  last_data_load_date?: string | null;
  latest_available_source_date?: string | null;
  latest_seen_source_partition_date?: string | null;
  published_asof?: string | null;
  source_latest_available?: string | null;
  source_effective_latest?: string | null;
  source_cutoff_date?: string | null;
  reason_code?: string | null;
  reason?: string | null;
  source_is_newer_than_published?: boolean;
  source_is_not_newer_than_published?: boolean;
};

type StatusChain = {
  chain: ChainId;
  name?: string | null;
  label?: string | null;
  as_of?: string | null;
  lag_days?: number | null;
  status?: "ok" | "warn" | "fail" | "unknown";
  source_freshness?: SourceFreshness | null;
  freshness_explanation?: string | null;
};

type StatusPayload = {
  ok?: boolean;
  chains?: StatusChain[];
};

type Variant = "overview" | "chain";

type Props = {
  chain?: ChainId;
  variant?: Variant;
  className?: string;
};

const CHAIN_IDS = new Set<ChainId>(["bitcoin", "ethereum", "arbitrum", "base"]);

function isChainId(value: string | null | undefined): value is ChainId {
  return !!value && CHAIN_IDS.has(value as ChainId);
}

function formatDate(value?: string | null): string {
  return value && value.trim().length > 0 ? value : "Ã¢â‚¬â€";
}

function chainLabel(chain: ChainId): string {
  const found = CHAIN_LIST.find((item) => item.id === chain);
  return found?.label || found?.name || chain;
}

function explainReason(row: StatusChain): string {
  const freshness = row.source_freshness;
  const reason = row.freshness_explanation ?? freshness?.reason;

  if (reason && reason.trim().length > 0) return reason;

  if (freshness?.source_is_newer_than_published) {
    return "The upstream AWS source has newer complete data than the currently published dataset, so the publication pipeline is behind source.";
  }

  if (freshness?.source_is_not_newer_than_published) {
    return "The upstream AWS source does not currently have a newer complete date than the published dataset.";
  }

  if (!freshness) {
    return "Source freshness diagnostics are not available yet. They will appear after the next pipeline run.";
  }

  return "Freshness is compared against the latest complete source date and the latest complete published date.";
}

function statusTone(status?: StatusChain["status"], freshness?: SourceFreshness | null): string {
  if (status === "fail" && freshness?.source_is_newer_than_published) return "text-[#9E4040]";
  if (status === "warn") return "text-[#C4843C]";
  if (status === "ok") return "text-[#10B981]";
  return "text-[#7A8A96]";
}

function sourceStatusCopy(row: StatusChain): string {
  const freshness = row.source_freshness;
  if (!freshness) return "Source check pending";
  if (freshness.source_is_newer_than_published) return "Pipeline behind source";
  if (freshness.source_is_not_newer_than_published) return "Source-limited freshness";
  return "Source check available";
}

function resolveChainFromPathname(pathname: string | null): ChainId | null {
  if (!pathname) return null;
  const match = pathname.match(/\/chains\/([^/?#]+)/);
  if (!match) return null;
  const candidate = decodeURIComponent(match[1]);
  return isChainId(candidate) ? candidate : null;
}

function DateCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-[4px] border border-[rgba(232,224,208,.09)] bg-[#080F1A]/40 px-3 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">{label}</dt>
      <dd className="mt-1 font-mono text-[12px] text-[#E8E0D0]">{formatDate(value)}</dd>
    </div>
  );
}

function ChainFreshnessCard({ row, variant }: { row: StatusChain; variant: Variant }) {
  const freshness = row.source_freshness;
  const tone = statusTone(row.status, freshness);
  const sourceDate =
    freshness?.latest_available_source_date ??
    freshness?.source_effective_latest ??
    freshness?.source_latest_available ??
    null;
  const loadDate = freshness?.last_data_load_date ?? freshness?.published_asof ?? row.as_of ?? null;

  return (
    <article className="rounded-[5px] border border-[rgba(232,224,208,.10)] bg-[#111E30] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ChainIcon chain={row.chain} className="h-7 w-7 text-xs" label={`${chainLabel(row.chain)} icon`} />
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#E8E0D0]">
              {row.label ?? chainLabel(row.chain)}
            </div>
            <div className={`mt-1 font-mono text-[10px] uppercase tracking-[0.10em] ${tone}`}>
              {sourceStatusCopy(row)}
            </div>
          </div>
        </div>
        {typeof row.lag_days === "number" ? (
          <div className="font-mono text-[11px] uppercase tracking-[0.10em] text-[#7A8A96]">
            Observed lag {row.lag_days}d
          </div>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <DateCell label="Last run" value={freshness?.last_run_date} />
        <DateCell label="Last data load" value={loadDate} />
        <DateCell label="Latest source" value={sourceDate} />
      </dl>

      <p className="mt-4 text-[13px] leading-7 text-[#7A8A96]">
        <span className="text-[#E8E0D0]">Why this matters:</span>{" "}
        {variant === "chain"
          ? "This separates when the system last checked the source, what date is currently published, and what complete date is actually available upstream."
          : "These dates separate pipeline execution, published data coverage, and upstream source availability."}
      </p>

      <p className="mt-2 text-[13px] leading-7 text-[#7A8A96]">
        <span className="text-[#E8E0D0]">Current explanation:</span> {explainReason(row)}
      </p>
    </article>
  );
}

export default function SourceFreshnessExplainer({
  chain,
  variant = "overview",
  className = "",
}: Props) {
  const pathname = usePathname();
  const inferredChain = chain ?? resolveChainFromPathname(pathname);
  const [rows, setRows] = useState<StatusChain[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/v1/status", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Status endpoint returned ${res.status}`);
        }

        const payload = (await res.json()) as StatusPayload;
        const nextRows = Array.isArray(payload.chains) ? payload.chains : [];

        if (!cancelled) {
          setRows(nextRows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load freshness diagnostics.");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRows = useMemo(() => {
    if (variant === "chain" && inferredChain) {
      return rows.filter((row) => row.chain === inferredChain);
    }
    return rows.filter((row) => CHAIN_IDS.has(row.chain));
  }, [inferredChain, rows, variant]);

  if (isLoading) {
    return (
      <section className={`rounded-[6px] border border-[rgba(232,224,208,.10)] bg-[#111E30] p-5 ${className}`}>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Freshness dates</div>
        <p className="mt-3 text-[14px] leading-7 text-[#7A8A96]">Loading source freshness diagnosticsÃ¢â‚¬Â¦</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`rounded-[6px] border border-[rgba(232,224,208,.10)] bg-[#111E30] p-5 ${className}`}>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Freshness dates</div>
        <p className="mt-3 text-[14px] leading-7 text-[#7A8A96]">
          Source freshness diagnostics could not be loaded yet: {error}
        </p>
      </section>
    );
  }

  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <section className={`rounded-[6px] border border-[rgba(232,224,208,.10)] bg-[#0D1F35]/55 p-5 ${className}`}>
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Freshness dates</div>
          <h2 className="mt-3 font-[var(--serif)] text-[clamp(28px,3vw,44px)] font-normal leading-[1.08] tracking-[-0.025em] text-[#E8E0D0]">
            Why the latest date can differ by chain.
          </h2>
          <p className="mt-4 text-[14px] leading-7 text-[#7A8A96]">
            Customers should see whether stale-looking data is caused by the publication pipeline or by the upstream source
            not yet exposing a newer complete day.
          </p>
        </div>

        <div className={variant === "chain" ? "grid gap-4" : "grid gap-4 xl:grid-cols-2"}>
          {visibleRows.map((row) => (
            <ChainFreshnessCard key={row.chain} row={row} variant={variant} />
          ))}
        </div>
      </div>
    </section>
  );
}