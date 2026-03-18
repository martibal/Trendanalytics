// src/components/custom/CustomRegimePanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import type { ChainId } from "@/lib/types";
import type { ThresholdConfigOverridesV1 } from "@/lib/customThresholds/schema";
import type { CustomRegimeApiResponse } from "@/lib/customThresholds/client";
import { fetchCustomRegime, postCustomRegime } from "@/lib/customThresholds/client";

function fmt(x: unknown): string {
  if (typeof x === "number" && Number.isFinite(x)) return x.toFixed(3);
  return "—";
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return n;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function clampMin0(n: number): number {
  if (!Number.isFinite(n)) return n;
  return n < 0 ? 0 : n;
}

function toFixedTrim(n: number, digits = 3): string {
  // Avoid "0.400000" style; keep stable formatting
  const s = n.toFixed(digits);
  // Trim trailing zeros but keep at least one decimal digit
  const trimmed = s.replace(/(\.\d*?[1-9])0+$/g, "$1").replace(/\.0+$/g, ".0");
  return trimmed;
}

function safeParseJson<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function storageKeyEnabled(chain: ChainId) {
  return `customRegimePanel.enabled.${chain}`;
}

function storageKeyConfidence(chain: ChainId) {
  return `customRegimePanel.confidenceThreshold.${chain}`;
}

function storageKeyTrendEps(chain: ChainId) {
  return `customRegimePanel.trendEps.${chain}`;
}

export function CustomRegimePanel(props: { chain: ChainId; date?: string | null }) {
  const chain = props.chain;
  const date = props.date ?? null;

  const [enabled, setEnabled] = useState<boolean>(false);

  const [confidenceThreshold, setConfidenceThreshold] = useState<string>("0.40");
  const [trendEps, setTrendEps] = useState<string>("0.15");

  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);
  const [resp, setResp] = useState<CustomRegimeApiResponse | null>(null);

  // Hydrate UI state from localStorage (per chain)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const e = window.localStorage.getItem(storageKeyEnabled(chain));
    const ct = window.localStorage.getItem(storageKeyConfidence(chain));
    const eps = window.localStorage.getItem(storageKeyTrendEps(chain));

    if (e !== null) {
      const parsed = safeParseJson<boolean>(e);
      if (typeof parsed === "boolean") setEnabled(parsed);
    } else {
      setEnabled(false);
    }

    if (typeof ct === "string" && ct.trim().length) setConfidenceThreshold(ct);
    else setConfidenceThreshold("0.40");

    if (typeof eps === "string" && eps.trim().length) setTrendEps(eps);
    else setTrendEps("0.15");
  }, [chain]);

  // Persist toggles/inputs (per chain)
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKeyEnabled(chain), JSON.stringify(enabled));
  }, [chain, enabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKeyConfidence(chain), confidenceThreshold);
  }, [chain, confidenceThreshold]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKeyTrendEps(chain), trendEps);
  }, [chain, trendEps]);

  // Build overrides (deterministic)
  const overrides: ThresholdConfigOverridesV1 | null = useMemo(() => {
    if (!enabled) return null;

    const ct0 = Number(confidenceThreshold);
    const eps0 = Number(trendEps);

    const ct = Number.isFinite(ct0) ? clamp01(ct0) : NaN;
    const eps = Number.isFinite(eps0) ? clampMin0(eps0) : NaN;

    const o: ThresholdConfigOverridesV1 = {};
    if (Number.isFinite(ct)) o.gate = { confidence_threshold: ct };
    if (Number.isFinite(eps)) o.trend = { eps };

    return o;
  }, [enabled, confidenceThreshold, trendEps]);

  function normalizeInputs() {
    // Normalize UI inputs to clamped, stable strings (but do not force-enable)
    const ct0 = Number(confidenceThreshold);
    if (Number.isFinite(ct0)) {
      setConfidenceThreshold(toFixedTrim(clamp01(ct0), 3));
    }

    const eps0 = Number(trendEps);
    if (Number.isFinite(eps0)) {
      setTrendEps(toFixedTrim(clampMin0(eps0), 3));
    }
  }

  // Load defaults once (and whenever chain/date changes)
  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetchCustomRegime({ chain, date });
        if (!alive) return;

        setResp(r);

        // If API returns effective defaults, use them as initial values in the UI
        // (do NOT auto-enable)
        const ok = r && (r as any).ok === true;
        if (ok && (r as any).threshold_config?.effective) {
          const eff = (r as any).threshold_config.effective;
          const ct = eff?.gate?.confidence_threshold;
          const eps = eff?.trend?.eps;

          if (typeof ct === "number" && Number.isFinite(ct)) setConfidenceThreshold(toFixedTrim(clamp01(ct), 3));
          if (typeof eps === "number" && Number.isFinite(eps)) setTrendEps(toFixedTrim(clampMin0(eps), 3));
        }

        // If ok=false and server provides a message, surface it softly (but don't hard-fail UI)
        if (!ok) {
          const msg = (r as any)?.error || (r as any)?.message;
          if (typeof msg === "string" && msg.trim().length) setErr(msg);
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message ?? e));
        setResp(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [chain, date]);

  async function apply() {
    normalizeInputs();

    setLoading(true);
    setErr(null);
    try {
      const r = enabled
        ? await postCustomRegime({ chain, date, config: overrides ?? {} })
        : await fetchCustomRegime({ chain, date });

      setResp(r);

      const ok = r && (r as any).ok === true;
      if (!ok) {
        const msg = (r as any)?.error || (r as any)?.message || "Request returned ok=false.";
        setErr(String(msg));
      }
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setResp(null);
    } finally {
      setLoading(false);
    }
  }

  const ok = resp && (resp as any).ok === true;

  const canonicalLabel = ok ? (resp as any).canonical?.label ?? "—" : "—";
  const customLabel = ok ? (resp as any).custom?.label ?? "—" : "—";
  const confScore = ok ? (resp as any).confidence?.confidence_score ?? null : null;
  const thresholdUsed = ok ? (resp as any).confidence?.threshold_used ?? null : null;

  return (
    <div className="rounded-2xl border border-ui-border bg-ui-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ui-text">Custom thresholds (optional)</div>
          <div className="mt-1 text-xs text-ui-faint">
            Deterministic re-classification from published META signals + your threshold config (no changes to canonical artifacts).
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className="rounded-xl border border-ui-border bg-ui-surface2 px-3 py-2 text-xs text-ui-text hover:bg-ui-surface focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
          title="Toggle custom evaluation on/off (canonical artifacts remain unchanged)."
        >
          {enabled ? "Custom: ON" : "Custom: OFF"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-ui-border bg-ui-bg/30 px-3 py-2">
          <div className="text-[11px] text-ui-faint">Canonical label</div>
          <div className="mt-1 text-sm text-ui-text">{canonicalLabel}</div>
        </div>

        <div className="rounded-xl border border-ui-border bg-ui-bg/30 px-3 py-2">
          <div className="text-[11px] text-ui-faint">Custom label</div>
          <div className="mt-1 text-sm text-ui-text">{customLabel}</div>
        </div>

        <div className="rounded-xl border border-ui-border bg-ui-bg/30 px-3 py-2">
          <div className="text-[11px] text-ui-faint">Confidence / threshold used</div>
          <div className="mt-1 text-sm text-ui-text">
            {fmt(confScore)} / {fmt(thresholdUsed)}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/20 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Overrides</div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <div className="text-xs text-ui-muted">confidence_threshold</div>
            <input
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(e.target.value)}
              onBlur={normalizeInputs}
              disabled={!enabled || loading}
              className="w-full rounded-xl border border-ui-border bg-ui-bg/30 px-3 py-2 text-xs text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/30 disabled:opacity-50"
              placeholder="0.40"
              inputMode="decimal"
            />
            <div className="text-[11px] text-ui-faint">
              Clamped to <span className="font-mono">[0..1]</span>. If confidence_score &lt; threshold ⇒ custom label becomes UNKNOWN/DEGRADED.
            </div>
          </label>

          <label className="space-y-1">
            <div className="text-xs text-ui-muted">trend.eps</div>
            <input
              value={trendEps}
              onChange={(e) => setTrendEps(e.target.value)}
              onBlur={normalizeInputs}
              disabled={!enabled || loading}
              className="w-full rounded-xl border border-ui-border bg-ui-bg/30 px-3 py-2 text-xs text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/30 disabled:opacity-50"
              placeholder="0.15"
              inputMode="decimal"
            />
            <div className="text-[11px] text-ui-faint">
              Clamped to <span className="font-mono">≥ 0</span>. Momentum threshold for HEATING/COOLING vs FLAT in axis trend.
            </div>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={apply}
            className="rounded-xl border border-ui-border bg-ui-surface2 px-3 py-2 text-xs text-ui-text hover:bg-ui-surface focus:outline-none focus:ring-2 focus:ring-ui-accent/30 disabled:opacity-50"
            disabled={loading}
            title={enabled ? "Apply custom config to the custom evaluation route." : "Refresh default effective thresholds from the API."}
          >
            {loading ? "Applying…" : enabled ? "Apply custom config" : "Refresh defaults"}
          </button>

          {err ? <div className="text-xs text-red-300">{err}</div> : null}
          {!err && loading ? <div className="text-xs text-ui-faint">Loading…</div> : null}
        </div>

        {ok ? (
          <details className="mt-4 rounded-xl border border-ui-border bg-ui-bg/20 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-ui-text">Show response (debug)</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] text-ui-muted">
              {JSON.stringify(resp, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>

      <div className="mt-3 text-[11px] text-ui-faint">
        Descriptive-only. No prices. No advice. Custom evaluation does not change published artifacts.
      </div>
    </div>
  );
}