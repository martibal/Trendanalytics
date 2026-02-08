"use client";

import { useMemo, useState } from "react";
import { useUiStore } from "@/store/uiStore";

import { MetricPanel } from "@/components/charts/MetricPanel";
import type { ChainId } from "@/lib/types";
import { getMetricOptionsForChain, getMetricDescription, getMetricLabel } from "@/lib/registry/metricRegistry";

type ExplainMode = "basic" | "advanced";

function normalizeChain(input: string): ChainId | null {
  const v = input.toLowerCase();
  if (v === "bitcoin" || v === "ethereum" || v === "arbitrum" || v === "base") return v;
  return null;
}

export function TrendSeries(props: {
  chain: string;
  start: string;
  end?: string;
  title?: string;
  subtitle?: string;
}) {
  const chainId = normalizeChain(props.chain);
  const explainMode = useUiStore((s) => s.explainMode) as ExplainMode;

  const [metricKey, setMetricKey] = useState<string>("tx_count_daily");

  const metricOptions = useMemo(() => {
    return getMetricOptionsForChain(chainId ?? "bitcoin");
  }, [chainId]);

  const metricLabel = useMemo(() => getMetricLabel(metricKey), [metricKey]);

  const basicExplain = useMemo(() => getMetricDescription(metricKey, "basic"), [metricKey]);
  const advancedExplain = useMemo(() => getMetricDescription(metricKey, "advanced"), [metricKey]);

  if (!chainId) {
    return (
      <div className="rounded-2xl border border-ui-border bg-ui-surface p-4">
        <div className="text-sm text-ui-text">Unknown chain: {props.chain}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ui-border bg-ui-surface p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ui-text">{props.title ?? "Trend series"}</div>
          <div className="mt-1 text-xs text-ui-faint">{props.subtitle ?? "Daily + MA7 + MA30 (price-agnostic)"}</div>
        </div>

        <select
          className="rounded-xl border border-ui-border bg-ui-bg/30 px-3 py-2 text-xs text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value)}
        >
          {metricOptions.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        <MetricPanel
          chain={chainId}
          metric={metricKey}
          start={props.start}
          end={props.end}
          title={metricLabel}
          subtitle="Daily + MA7 + MA30"
        />
      </div>

      <div className="mt-4 rounded-xl border border-ui-border bg-ui-bg/20 p-3">
        <div className="text-[11px] text-ui-faint">{explainMode === "advanced" ? "Advanced" : "Basic"} context</div>
        <div className="mt-1 text-sm text-ui-muted">
          {explainMode === "advanced" ? (advancedExplain ?? "—") : (basicExplain ?? "—")}
        </div>
      </div>
    </div>
  );
}