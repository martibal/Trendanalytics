"use client";

import { useState } from "react";

type ApiResponse = {
  chain: string;
  canonical: {
    regime: {
      label: string;
    };
  };
  custom: {
    label: string;
    effective_threshold_config: any;
    identity: {
      canonical_hash: string | null;
      custom_hash: string;
    };
  };
};

export default function CustomDemoPage() {
  const [chain, setChain] = useState("ethereum");
  const [threshold, setThreshold] = useState(0.5);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/regime/custom?chain=${chain}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            gate: { confidence_threshold: Number(threshold) },
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 space-y-8">
      <h1 className="text-2xl font-semibold text-ui-text">
        Custom regime demo (descriptive only)
      </h1>

      <div className="rounded-2xl border border-ui-border bg-ui-bg/30 p-6 space-y-4">
        <div>
          <label className="block text-xs text-ui-faint mb-1">Chain</label>
          <select
            className="rounded border border-ui-border bg-ui-bg/60 px-3 py-2 text-sm"
            value={chain}
            onChange={(e) => setChain(e.target.value)}
          >
            <option value="bitcoin">Bitcoin</option>
            <option value="ethereum">Ethereum</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="base">Base</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-ui-faint mb-1">
            Confidence threshold (0–1)
          </label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="rounded border border-ui-border bg-ui-bg/60 px-3 py-2 text-sm w-40"
          />
        </div>

        <button
          onClick={run}
          className="rounded-xl border border-ui-border bg-ui-bg/50 px-4 py-2 text-sm hover:bg-ui-bg/70"
        >
          {loading ? "Running…" : "Run custom evaluation"}
        </button>

        {error && (
          <div className="text-xs text-red-400">
            Error: {error}
          </div>
        )}
      </div>

      {data && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-ui-border bg-ui-bg/20 p-6 space-y-3">
            <div className="text-xs text-ui-faint">Canonical label</div>
            <div className="text-lg font-semibold text-ui-text">
              {data.canonical.regime.label}
            </div>
          </div>

          <div className="rounded-2xl border border-ui-border bg-ui-bg/20 p-6 space-y-3">
            <div className="text-xs text-ui-faint">Custom label</div>
            <div className="text-lg font-semibold text-ui-text">
              {data.custom.label}
            </div>
          </div>

          <div className="rounded-2xl border border-ui-border bg-ui-bg/20 p-6 space-y-3 text-xs text-ui-muted">
            <div>
              <div className="font-semibold text-ui-text">Identity</div>
              <div className="mt-2">
                Canonical hash: {data.custom.identity.canonical_hash ?? "null"}
              </div>
              <div>Custom hash: {data.custom.identity.custom_hash}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-ui-border bg-ui-bg/20 p-6 space-y-3 text-xs text-ui-muted">
            <div className="font-semibold text-ui-text">
              Effective threshold config
            </div>
            <pre className="overflow-x-auto bg-black/30 p-3 rounded-xl">
              {JSON.stringify(data.custom.effective_threshold_config, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </main>
  );
}