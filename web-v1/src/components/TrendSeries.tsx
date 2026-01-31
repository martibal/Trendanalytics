'use client';

import { useMemo, useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { MetricLineChart } from '@/components/MetricLineChart';
import { InfoBox } from '@/components/InfoBox';
import { getMetricOptionsForChain, getMetricDescription } from '@/lib/registry/metricRegistry';

type TrendSeriesProps = {
  chain: string;
  dates: string[];
};

export default function TrendSeries({ chain, dates }: TrendSeriesProps) {
  const explainMode = useUIStore((s) => s.explainMode);

  /**
   * Registry-styrte metrics for denne kjeden
   */
  const metricOptions = useMemo(() => {
    return getMetricOptionsForChain(chain);
  }, [chain]);

  /**
   * Valgt metric (default: første gyldige i registry)
   */
  const [metricKey, setMetricKey] = useState<string | null>(
    metricOptions.length > 0 ? metricOptions[0].key : null
  );

  /**
   * Hvis registry endres (eller chain byttes) og valgt metric
   * ikke lenger finnes → fall tilbake trygt
   */
  if (
    metricKey &&
    metricOptions.length > 0 &&
    !metricOptions.find((m) => m.key === metricKey)
  ) {
    setMetricKey(metricOptions[0].key);
  }

  if (!metricKey) {
    return null;
  }

  const selectedMetric = metricOptions.find((m) => m.key === metricKey);

  /**
   * Registry-forklaring (Basic / Advanced)
   * Fallback brukes hvis registry mangler tekst
   */
  const explanation =
    getMetricDescription(metricKey, explainMode) ??
    (explainMode === 'advanced'
      ? 'Derived on-chain metric shown as a smoothed daily time series. Values are descriptive and relative to the chain’s own history.'
      : 'Smoothed daily on-chain activity shown over time.');

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-muted-foreground">
          Trend series
        </h3>

        <select
          className="rounded-md bg-background px-3 py-1.5 text-sm ring-1 ring-border focus:outline-none"
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

      <MetricLineChart
        chain={chain}
        metricKey={metricKey}
        dates={dates}
      />

      <InfoBox title="What this chart is">
        {explanation}
      </InfoBox>
    </section>
  );
}
