// src/components/thresholds/ThresholdPanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import type { ChainId } from "@/lib/types";
import type { ThresholdConfigOverridesV1, ThresholdConfigV1 } from "@/lib/customThresholds/schema";
import { THRESHOLD_CONFIG_DEFAULT_V1 } from "@/lib/customThresholds/defaults";

type ContractShape = {
  threshold_config_default?: unknown;
  gating?: unknown;
};

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  if (Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function fmt(x: unknown, digits = 3): string {
  if (!isFiniteNumber(x)) return "—";
  return x.toFixed(digits);
}

function normalizeOverrides(o: ThresholdConfigOverridesV1): ThresholdConfigOverridesV1 {
  // Keep it deterministic + safe. The API also normalizes, but UI should be predictable.
  const out: ThresholdConfigOverridesV1 = {};

  if (o.version === "v1") out.version = "v1";

  const gate = o.gate;
  if (gate && typeof gate === "object") {
    const ct = (gate as any).confidence_threshold;
    if (isFiniteNumber(ct)) out.gate = { confidence_threshold: clamp(ct, 0, 1) };
  }

  const trend = o.trend;
  if (trend && typeof trend === "object") {
    const eps = (trend as any).eps;
    if (isFiniteNumber(eps)) out.trend = { eps: Math.max(0, eps) };
  }

  const band = o.band;
  if (band && typeof band === "object") {
    const b: any = {};

    const pickBand = (key: "high" | "extreme_high" | "low" | "extreme_low") => {
      const src = (band as any)[key];
      if (!src || typeof src !== "object") return;

      const pct = (src as any).pct;
      const z = (src as any).z;

      const patch: any = {};
      if (isFiniteNumber(pct)) patch.pct = clamp(pct, 0, 100);
      if (isFiniteNumber(z)) patch.z = z;

      if (Object.keys(patch).length) b[key] = patch;
    };

    pickBand("high");
    pickBand("extreme_high");
    pickBand("low");
    pickBand("extreme_low");

    if (Object.keys(b).length) out.band = b;
  }

  return out;
}

function mergeEffective(base: ThresholdConfigV1, overrides: ThresholdConfigOverridesV1): ThresholdConfigV1 {
  // Lightweight merge used ONLY for UI preview. API remains the source of truth.
  const o = normalizeOverrides(overrides);

  const eff: ThresholdConfigV1 = JSON.parse(JSON.stringify(base)) as ThresholdConfigV1;

  if (o.gate?.confidence_threshold !== undefined) eff.gate.confidence_threshold = o.gate.confidence_threshold;
  if (o.trend?.eps !== undefined) eff.trend.eps = o.trend.eps;

  const band = o.band;
  if (band?.high) {
    if (band.high.pct !== undefined) eff.band.high.pct = band.high.pct;
    if (band.high.z !== undefined) eff.band.high.z = band.high.z;
  }
  if (band?.extreme_high) {
    if (band.extreme_high.pct !== undefined) eff.band.extreme_high.pct = band.extreme_high.pct;
    if (band.extreme_high.z !== undefined) eff.band.extreme_high.z = band.extreme_high.z;
  }
  if (band?.low) {
    if (band.low.pct !== undefined) eff.band.low.pct = band.low.pct;
    if (band.low.z !== undefined) eff.band.low.z = band.low.z;
  }
  if (band?.extreme_low) {
    if (band.extreme_low.pct !== undefined) eff.band.extreme_low.pct = band.extreme_low.pct;
    if (band.extreme_low.z !== undefined) eff.band.extreme_low.z = band.extreme_low.z;
  }

  return eff;
}

function safeParseJson<T>(s: string): { ok: true; value: T } | { ok: false; error: string } {
  try {
    const v = JSON.parse(s) as T;
    return { ok: true, value: v };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

function Pill(props: { children: React.ReactNode; tone?: "neutral" | "warn" }) {
  const tone = props.tone ?? "neutral";
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold",
        tone === "warn" ? "border-ui-warn/25 bg-ui-warn/10 text-ui-warn" : "border-ui-border bg-ui-bg/15 text-ui-muted"
      )}
    >
      {props.children}
    </span>
  );
}

function Field(props: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-ui-faint">{props.label}</div>
      {props.children}
      {props.hint ? <div className="text-[11px] text-ui-faint">{props.hint}</div> : null}
    </div>
  );
}

function Input(props: { value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-xl border border-ui-border bg-ui-bg/10 px-3 py-2 text-sm text-ui-text outline-none focus:ring-2 focus:ring-ui-accent/30"
      />
      {props.suffix ? <span className="text-xs text-ui-faint">{props.suffix}</span> : null}
    </div>
  );
}

function Button(props: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "neutral" | "primary" | "warn";
  disabled?: boolean;
}) {
  const tone = props.tone ?? "neutral";
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={clsx(
        "rounded-xl border px-3 py-2 text-xs font-semibold transition",
        props.disabled ? "cursor-not-allowed opacity-60" : "hover:bg-ui-bg/20",
        tone === "primary"
          ? "border-ui-border bg-ui-surface2 text-ui-text"
          : tone === "warn"
          ? "border-ui-warn/25 bg-ui-warn/10 text-ui-warn"
          : "border-ui-border bg-ui-bg/10 text-ui-muted"
      )}
    >
      {props.children}
    </button>
  );
}

export type ThresholdPanelProps = {
  chain: ChainId;
  /**
   * Optional meta as-of date for generating a pinned curl call.
   * If omitted, curl uses "latest".
   */
  date?: string | null;

  enabled: boolean;
  onChangeEnabled: (v: boolean) => void;

  overrides: ThresholdConfigOverridesV1;
  onChangeOverrides: (o: ThresholdConfigOverridesV1) => void;

  onClose?: () => void;

  /**
   * Optional: storage key override (defaults to per-chain).
   * Parent can ignore this and manage persistence itself.
   */
  storageKey?: string;
};

export function ThresholdPanel(props: ThresholdPanelProps) {
  const { chain, date, enabled, onChangeEnabled, overrides, onChangeOverrides, onClose, storageKey } = props;

  const effectiveStorageKey = useMemo(() => {
    if (typeof storageKey === "string" && storageKey.trim().length) return storageKey.trim();
    return null;
  }, [storageKey]);

  // Canonical defaults: contract.json (if available) else repo constant.
  const [contractDefault, setContractDefault] = useState<ThresholdConfigV1 | null>(null);
  const [contractErr, setContractErr] = useState<string | null>(null);

  // JSON export + copy surface
  const [showJson, setShowJson] = useState<boolean>(false);
  const [jsonDraft, setJsonDraft] = useState<string>("");
  const [jsonErr, setJsonErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<"none" | "json" | "curl">("none");

  // UI input state (string-backed)
  const [gateConfidence, setGateConfidence] = useState<string>("0.40");
  const [trendEps, setTrendEps] = useState<string>("0.15");

  const [highPct, setHighPct] = useState<string>("80");
  const [highZ, setHighZ] = useState<string>("1.5");

  const [xHighPct, setXHighPct] = useState<string>("90");
  const [xHighZ, setXHighZ] = useState<string>("2.5");

  const [lowPct, setLowPct] = useState<string>("20");
  const [lowZ, setLowZ] = useState<string>("-1.5");

  const [xLowPct, setXLowPct] = useState<string>("10");
  const [xLowZ, setXLowZ] = useState<string>("-2.5");

  // Optional persistence (does NOT take ownership; only hydrates once and mirrors props changes).
  const [storageHydrated, setStorageHydrated] = useState<boolean>(false);

  useEffect(() => {
    if (!effectiveStorageKey) {
      setStorageHydrated(true);
      return;
    }
    if (storageHydrated) return;

    try {
      const raw = window.localStorage.getItem(effectiveStorageKey);
      if (!raw) {
        setStorageHydrated(true);
        return;
      }
      const parsed = safeParseJson<{ enabled?: boolean; overrides?: ThresholdConfigOverridesV1 }>(raw);
      if (!parsed.ok) {
        setStorageHydrated(true);
        return;
      }

      const nextEnabled = typeof parsed.value.enabled === "boolean" ? parsed.value.enabled : null;
      const nextOverrides =
        parsed.value.overrides && typeof parsed.value.overrides === "object" ? parsed.value.overrides : null;

      if (nextOverrides) onChangeOverrides(normalizeOverrides(nextOverrides));
      if (nextEnabled !== null) onChangeEnabled(nextEnabled);

      setStorageHydrated(true);
    } catch {
      setStorageHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveStorageKey, storageHydrated]);

  useEffect(() => {
    if (!effectiveStorageKey) return;
    if (!storageHydrated) return;

    try {
      const payload = JSON.stringify(
        { enabled: Boolean(enabled), overrides: normalizeOverrides(overrides) },
        null,
        0
      );
      window.localStorage.setItem(effectiveStorageKey, payload);
    } catch {
      // ignore
    }
  }, [effectiveStorageKey, enabled, overrides, storageHydrated]);

  // Load contract defaults once
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function run() {
      try {
        setContractErr(null);
        const res = await fetch(`/data/published/v1/contract.json`, { cache: "no-store", signal: ac.signal });
        if (!res.ok) throw new Error(`contract.json HTTP ${res.status}`);
        const j = (await res.json()) as ContractShape;

        const rec = asRecord(j);
        const td = rec ? rec["threshold_config_default"] : null;

        // We accept either a valid v1-like object or fall back.
        const tdRec = asRecord(td);
        const looksLikeV1 =
          tdRec &&
          tdRec["version"] === "v1" &&
          asRecord(tdRec["gate"]) &&
          asRecord(tdRec["band"]) &&
          asRecord(tdRec["trend"]);

        if (!looksLikeV1) {
          if (!cancelled) setContractDefault(null);
          return;
        }

        const gate = asRecord(tdRec!["gate"])!;
        const band = asRecord(tdRec!["band"])!;
        const trend = asRecord(tdRec!["trend"])!;

        const mkBand = (k: string, fallback: any) => {
          const b = asRecord(band[k]) ?? null;
          const pct = b ? (b["pct"] as any) : null;
          const z = b ? (b["z"] as any) : null;

          return {
            pct: isFiniteNumber(pct) ? clamp(pct, 0, 100) : fallback.pct,
            z: isFiniteNumber(z) ? z : fallback.z,
          };
        };

        const base = THRESHOLD_CONFIG_DEFAULT_V1;

        const cfg: ThresholdConfigV1 = {
          version: "v1",
          gate: {
            confidence_threshold: isFiniteNumber(gate["confidence_threshold"])
              ? clamp(gate["confidence_threshold"] as number, 0, 1)
              : base.gate.confidence_threshold,
          },
          band: {
            high: mkBand("high", base.band.high),
            extreme_high: mkBand("extreme_high", base.band.extreme_high),
            low: mkBand("low", base.band.low),
            extreme_low: mkBand("extreme_low", base.band.extreme_low),
          },
          trend: {
            eps: isFiniteNumber(trend["eps"]) ? Math.max(0, trend["eps"] as number) : base.trend.eps,
          },
        };

        if (!cancelled) setContractDefault(cfg);
      } catch (e: any) {
        if (!cancelled) {
          setContractDefault(null);
          setContractErr(String(e?.message ?? e));
        }
      }
    }

    run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  const canonical = contractDefault ?? THRESHOLD_CONFIG_DEFAULT_V1;

  // Sync UI inputs from incoming overrides + canonical base.
  useEffect(() => {
    // Show effective values in inputs (canonical merged with overrides) so users see what will apply.
    const eff = mergeEffective(canonical, overrides);

    setGateConfidence(String(eff.gate.confidence_threshold));
    setTrendEps(String(eff.trend.eps));

    setHighPct(String(eff.band.high.pct));
    setHighZ(String(eff.band.high.z));

    setXHighPct(String(eff.band.extreme_high.pct));
    setXHighZ(String(eff.band.extreme_high.z));

    setLowPct(String(eff.band.low.pct));
    setLowZ(String(eff.band.low.z));

    setXLowPct(String(eff.band.extreme_low.pct));
    setXLowZ(String(eff.band.extreme_low.z));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonical.version, contractDefault, JSON.stringify(overrides)]);

  const effectivePreview = useMemo(() => mergeEffective(canonical, overrides), [canonical, overrides]);

  const hasOverrides = useMemo(() => {
    const o = normalizeOverrides(overrides);
    return Object.keys(o).length > 0;
  }, [overrides]);

  const presets = useMemo(() => {
    // Canonical = no overrides (API uses contract defaults anyway)
    const canonicalPreset: ThresholdConfigOverridesV1 = {};

    // Stricter = require higher confidence + higher extremes
    const stricter: ThresholdConfigOverridesV1 = {
      version: "v1",
      gate: { confidence_threshold: clamp(canonical.gate.confidence_threshold + 0.1, 0, 1) },
      band: {
        extreme_high: { pct: clamp(canonical.band.extreme_high.pct + 2, 0, 100), z: canonical.band.extreme_high.z + 0.25 },
        extreme_low: { pct: clamp(canonical.band.extreme_low.pct - 2, 0, 100), z: canonical.band.extreme_low.z - 0.25 },
      },
      trend: { eps: canonical.trend.eps + 0.05 },
    };

    // More sensitive = lower eps (switch easier) + slightly looser bands
    const moreSensitive: ThresholdConfigOverridesV1 = {
      version: "v1",
      gate: { confidence_threshold: clamp(canonical.gate.confidence_threshold - 0.05, 0, 1) },
      band: {
        high: { pct: clamp(canonical.band.high.pct - 3, 0, 100), z: canonical.band.high.z - 0.15 },
        low: { pct: clamp(canonical.band.low.pct + 3, 0, 100), z: canonical.band.low.z + 0.15 },
      },
      trend: { eps: Math.max(0, canonical.trend.eps - 0.05) },
    };

    return { canonicalPreset, stricter, moreSensitive };
  }, [canonical]);

  function applyFromInputs() {
    // Convert string inputs to overrides relative to canonical (only include fields that differ)
    const next: ThresholdConfigOverridesV1 = { version: "v1" };

    const ct = Number(gateConfidence);
    const eps = Number(trendEps);

    if (Number.isFinite(ct) && ct !== canonical.gate.confidence_threshold) {
      next.gate = { confidence_threshold: clamp(ct, 0, 1) };
    }

    if (Number.isFinite(eps) && eps !== canonical.trend.eps) {
      next.trend = { eps: Math.max(0, eps) };
    }

    const b: any = {};
    const pushBand = (key: "high" | "extreme_high" | "low" | "extreme_low", pctStr: string, zStr: string) => {
      const pct = Number(pctStr);
      const z = Number(zStr);
      const base = canonical.band[key];

      const patch: any = {};
      if (Number.isFinite(pct) && clamp(pct, 0, 100) !== base.pct) patch.pct = clamp(pct, 0, 100);
      if (Number.isFinite(z) && z !== base.z) patch.z = z;

      if (Object.keys(patch).length) b[key] = patch;
    };

    pushBand("high", highPct, highZ);
    pushBand("extreme_high", xHighPct, xHighZ);
    pushBand("low", lowPct, lowZ);
    pushBand("extreme_low", xLowPct, xLowZ);

    if (Object.keys(b).length) next.band = b;

    // If everything matches canonical, keep it empty (canonical)
    const normalized = normalizeOverrides(next);
    if (Object.keys(normalized).length === 1 && normalized.version === "v1") {
      onChangeOverrides({});
      return;
    }
    onChangeOverrides(normalized);
  }

  function resetToCanonical() {
    onChangeOverrides({});
  }

  function setPreset(p: ThresholdConfigOverridesV1) {
    onChangeOverrides(normalizeOverrides(p));
    onChangeEnabled(true);
  }

  const requestBody = useMemo(() => {
    const body = { config: enabled ? normalizeOverrides(overrides) : {} };
    return JSON.stringify(body, null, 2);
  }, [enabled, overrides]);

  const curl = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("chain", String(chain));
    if (date && typeof date === "string" && date.trim().length) qs.set("date", date.trim());

    const url = `http://localhost:3000/api/regime/custom?${qs.toString()}`;
    return `curl -s -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody.replace(/'/g, "'\\''")}' | jq`;
  }, [chain, date, requestBody]);

  useEffect(() => {
    if (!showJson) return;
    setJsonDraft(requestBody);
    setJsonErr(null);
    setCopied("none");
  }, [showJson, requestBody]);

  async function copyText(kind: "json" | "curl", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied("none"), 900);
    } catch {
      // If clipboard fails (permissions), we just leave it visible for manual copy.
      setCopied("none");
    }
  }

  function importJsonDraft() {
    const parsed = safeParseJson<{ config?: ThresholdConfigOverridesV1 }>(jsonDraft);
    if (!parsed.ok) {
      setJsonErr(parsed.error);
      return;
    }
    const cfg = parsed.value?.config ?? {};
    onChangeOverrides(normalizeOverrides(cfg));
    setJsonErr(null);
  }

  return (
    <div className="rounded-3xl border border-ui-border bg-ui-bg/10 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ui-text">Custom thresholds</div>
          <div className="mt-1 text-xs text-ui-faint">
            Deterministic UI for overrides used by <span className="font-mono text-ui-muted">/api/regime/custom</span>.
            Canonical data never changes.
          </div>
        </div>

        <div className="flex items-center gap-2">
          {typeof onClose === "function" ? <Button onClick={onClose}>Close</Button> : null}
          <Button tone="primary" onClick={() => setShowJson((v) => !v)}>
            {showJson ? "Hide JSON" : "Export / Copy"}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Pill>{`Chain: ${chain}`}</Pill>
        <Pill>{`Date: ${date && String(date).trim().length ? String(date) : "latest"}`}</Pill>
        {contractErr ? (
          <Pill tone="warn">{`Contract defaults unavailable (${contractErr})`}</Pill>
        ) : (
          <Pill>{`Defaults: ${contractDefault ? "contract.json" : "repo"}`}</Pill>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-ui-text">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => onChangeEnabled(e.target.checked)}
                className="h-4 w-4 accent-[rgb(var(--accent))]"
              />
              Enable custom thresholds
            </label>
            <Pill tone={enabled ? "neutral" : "warn"}>{enabled ? "Custom enabled" : "Canonical only"}</Pill>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setPreset(presets.canonicalPreset)}>Preset: Canonical</Button>
            <Button onClick={() => setPreset(presets.stricter)}>Preset: Stricter</Button>
            <Button onClick={() => setPreset(presets.moreSensitive)}>Preset: More sensitive</Button>
            <Button tone="warn" onClick={resetToCanonical}>
              Reset overrides
            </Button>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-ui-faint">
          Notes: Gate controls “Insufficient data” (confidence threshold). Bands interpret percentile/z evidence. Trend eps controls sensitivity of label switching.
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
          <div className="text-xs font-semibold text-ui-faint">Gate + trend</div>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <Field label="Gate: confidence_threshold (0..1)" hint={`Canonical: ${fmt(canonical.gate.confidence_threshold, 2)}`}>
              <Input value={gateConfidence} onChange={setGateConfidence} placeholder="0.40" />
            </Field>

            <Field label="Trend: eps (>= 0)" hint={`Canonical: ${fmt(canonical.trend.eps, 2)}`}>
              <Input value={trendEps} onChange={setTrendEps} placeholder="0.15" />
            </Field>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button tone="primary" onClick={applyFromInputs} disabled={!enabled}>
                Apply inputs → overrides
              </Button>
              <Pill tone={hasOverrides ? "neutral" : "warn"}>{hasOverrides ? "Overrides set" : "No overrides"}</Pill>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
          <div className="text-xs font-semibold text-ui-faint">Preview (effective config)</div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-ui-border bg-ui-bg/10 p-3">
              <div className="text-[11px] font-semibold text-ui-faint">Gate</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-ui-faint">confidence_threshold</span>
                <span className="font-mono text-ui-muted">{fmt(effectivePreview.gate.confidence_threshold, 3)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-ui-border bg-ui-bg/10 p-3">
              <div className="text-[11px] font-semibold text-ui-faint">Trend</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-ui-faint">eps</span>
                <span className="font-mono text-ui-muted">{fmt(effectivePreview.trend.eps, 3)}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-ui-border bg-ui-bg/10 p-3 text-xs">
            <div className="text-[11px] font-semibold text-ui-faint">Bands</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-ui-faint">high</span>
                <span className="font-mono text-ui-muted">{`pct ${fmt(effectivePreview.band.high.pct, 0)} · z ${fmt(
                  effectivePreview.band.high.z,
                  2
                )}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ui-faint">extreme_high</span>
                <span className="font-mono text-ui-muted">{`pct ${fmt(
                  effectivePreview.band.extreme_high.pct,
                  0
                )} · z ${fmt(effectivePreview.band.extreme_high.z, 2)}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ui-faint">low</span>
                <span className="font-mono text-ui-muted">{`pct ${fmt(effectivePreview.band.low.pct, 0)} · z ${fmt(
                  effectivePreview.band.low.z,
                  2
                )}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ui-faint">extreme_low</span>
                <span className="font-mono text-ui-muted">{`pct ${fmt(
                  effectivePreview.band.extreme_low.pct,
                  0
                )} · z ${fmt(effectivePreview.band.extreme_low.z, 2)}`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
        <div className="text-xs font-semibold text-ui-faint">Bands (edit)</div>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
            <div className="text-[11px] font-semibold text-ui-faint">High</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="pct (0..100)" hint={`Canonical: ${fmt(canonical.band.high.pct, 0)}`}>
                <Input value={highPct} onChange={setHighPct} placeholder="80" />
              </Field>
              <Field label="z (finite)" hint={`Canonical: ${fmt(canonical.band.high.z, 2)}`}>
                <Input value={highZ} onChange={setHighZ} placeholder="1.5" />
              </Field>
            </div>

            <div className="mt-4 text-[11px] font-semibold text-ui-faint">Extreme high</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="pct (0..100)" hint={`Canonical: ${fmt(canonical.band.extreme_high.pct, 0)}`}>
                <Input value={xHighPct} onChange={setXHighPct} placeholder="90" />
              </Field>
              <Field label="z (finite)" hint={`Canonical: ${fmt(canonical.band.extreme_high.z, 2)}`}>
                <Input value={xHighZ} onChange={setXHighZ} placeholder="2.5" />
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
            <div className="text-[11px] font-semibold text-ui-faint">Low</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="pct (0..100)" hint={`Canonical: ${fmt(canonical.band.low.pct, 0)}`}>
                <Input value={lowPct} onChange={setLowPct} placeholder="20" />
              </Field>
              <Field label="z (finite)" hint={`Canonical: ${fmt(canonical.band.low.z, 2)}`}>
                <Input value={lowZ} onChange={setLowZ} placeholder="-1.5" />
              </Field>
            </div>

            <div className="mt-4 text-[11px] font-semibold text-ui-faint">Extreme low</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="pct (0..100)" hint={`Canonical: ${fmt(canonical.band.extreme_low.pct, 0)}`}>
                <Input value={xLowPct} onChange={setXLowPct} placeholder="10" />
              </Field>
              <Field label="z (finite)" hint={`Canonical: ${fmt(canonical.band.extreme_low.z, 2)}`}>
                <Input value={xLowZ} onChange={setXLowZ} placeholder="-2.5" />
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button tone="primary" onClick={applyFromInputs} disabled={!enabled}>
            Apply inputs → overrides
          </Button>
          <div className="text-[11px] text-ui-faint">
            Apply writes a minimal override object (only values that differ from canonical defaults).
          </div>
        </div>
      </div>

      {showJson ? (
        <div className="mt-5 rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-ui-faint">Export / copy</div>
              <div className="mt-1 text-[11px] text-ui-faint">
                This is the exact request body for <span className="font-mono text-ui-muted">/api/regime/custom</span>.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => copyText("json", requestBody)} tone="primary">
                {copied === "json" ? "Copied JSON" : "Copy JSON"}
              </Button>
              <Button onClick={() => copyText("curl", curl)} tone="primary">
                {copied === "curl" ? "Copied curl" : "Copy curl"}
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-ui-border bg-black/30 p-3">
              <div className="text-[11px] font-semibold text-ui-faint">Request JSON</div>
              <textarea
                value={jsonDraft}
                onChange={(e) => setJsonDraft(e.target.value)}
                className="mt-2 h-[220px] w-full resize-none rounded-xl border border-ui-border bg-ui-bg/5 p-3 font-mono text-xs text-ui-muted outline-none focus:ring-2 focus:ring-ui-accent/30"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button onClick={importJsonDraft}>Import JSON → overrides</Button>
                {jsonErr ? <Pill tone="warn">{jsonErr}</Pill> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-ui-border bg-black/30 p-3">
              <div className="text-[11px] font-semibold text-ui-faint">curl</div>
              <textarea
                value={curl}
                readOnly
                className="mt-2 h-[220px] w-full resize-none rounded-xl border border-ui-border bg-ui-bg/5 p-3 font-mono text-xs text-ui-muted outline-none"
              />
              <div className="mt-2 text-[11px] text-ui-faint">
                Tip: remove <span className="font-mono">| jq</span> if you don’t have jq installed.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}