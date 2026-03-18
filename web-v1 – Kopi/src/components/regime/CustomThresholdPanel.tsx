// src/components/regime/CustomThresholdPanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ChainId, MetaFile } from "@/lib/types";

import type { ThresholdConfigOverridesV1, ThresholdConfigV1 } from "@/lib/customThresholds/schema";
import { mergeThresholdConfig } from "@/lib/customThresholds/merge";
import { THRESHOLD_CONFIG_DEFAULT_V1 } from "@/lib/customThresholds/defaults";
import { getAllPresets, type ThresholdPresetId } from "@/lib/customThresholds/presets";
import { decodeOverridesFromQuery, encodeOverridesToQuery } from "@/lib/customThresholds/urlState";

type Props = {
  chain: ChainId;
  canonical: MetaFile | null;

  open: boolean;
  onClose: () => void;

  onApply: (args: {
    overrides: ThresholdConfigOverridesV1;
    effective: ThresholdConfigV1;
    preset: ThresholdPresetId | null;
  }) => void;
};

function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x));
}

function Field(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const { label, value, onChange, min, max, step = 0.01 } = props;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">{label}</div>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(n);
        }}
        className="rounded-xl border border-ui-border bg-ui-bg/10 px-3 py-2 text-sm text-ui-text focus:outline-none focus:ring-2 focus:ring-ui-accent/40"
      />
    </div>
  );
}

/**
 * URL state (web-safe; deterministic):
 * - ct  = "1" | "0" (custom enabled)
 * - ctp = preset id (optional)
 * - cto = overrides encoded (base64url of stable JSON)
 */
function readStateFromSearchParams(sp: URLSearchParams): {
  enabled: boolean;
  preset: ThresholdPresetId | null;
  overrides: ThresholdConfigOverridesV1;
} {
  const enabled = sp.get("ct") === "1";

  const presetRaw = sp.get("ctp");
  const preset = typeof presetRaw === "string" && presetRaw.length ? (presetRaw as ThresholdPresetId) : null;

  const overrides = decodeOverridesFromQuery(sp.get("cto")) ?? {};

  return { enabled, preset, overrides };
}

function writeStateToSearchParams(
  state: { enabled: boolean; preset: ThresholdPresetId | null; overrides: ThresholdConfigOverridesV1 },
  sp: URLSearchParams
): URLSearchParams {
  const next = new URLSearchParams(sp);

  if (state.enabled) next.set("ct", "1");
  else next.delete("ct");

  if (state.preset) next.set("ctp", state.preset);
  else next.delete("ctp");

  const hasOverrides = state.overrides && Object.keys(state.overrides).length > 0;
  if (state.enabled && hasOverrides) {
    next.set("cto", encodeOverridesToQuery(state.overrides));
  } else {
    next.delete("cto");
  }

  return next;
}

type BandKey = "high" | "extreme_high" | "low" | "extreme_low";

type BandItem = { pct: number; z: number };
type BandMap = Record<BandKey, BandItem>;

function asBandMap(v: unknown): BandMap | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const rec = v as Record<string, unknown>;

  const keys: BandKey[] = ["high", "extreme_high", "low", "extreme_low"];
  const out: Partial<BandMap> = {};

  for (const k of keys) {
    const item = rec[k];
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const it = item as Record<string, unknown>;
    const pct = typeof it.pct === "number" && Number.isFinite(it.pct) ? it.pct : null;
    const z = typeof it.z === "number" && Number.isFinite(it.z) ? it.z : null;
    if (pct == null || z == null) return null;
    out[k] = { pct, z };
  }

  return out as BandMap;
}

export function CustomThresholdPanel(props: Props) {
  const { chain, canonical, open, onClose, onApply } = props;

  const [urlBootstrapped, setUrlBootstrapped] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [preset, setPreset] = useState<ThresholdPresetId | null>(null);
  const [overrides, setOverrides] = useState<ThresholdConfigOverridesV1>({});

  const baseDefault = THRESHOLD_CONFIG_DEFAULT_V1;
  const effectiveDraft = useMemo(() => mergeThresholdConfig(overrides, baseDefault), [overrides, baseDefault]);

  useEffect(() => {
    if (urlBootstrapped) return;

    const sp = new URLSearchParams(window.location.search);
    const state = readStateFromSearchParams(sp);

    setEnabled(state.enabled);
    setPreset(state.preset);
    setOverrides(state.overrides ?? {});
    setUrlBootstrapped(true);
  }, [urlBootstrapped]);

  useEffect(() => {
    if (!urlBootstrapped) return;

    const sp = new URLSearchParams(window.location.search);
    const next = writeStateToSearchParams({ enabled, preset, overrides }, sp);

    const qs = next.toString();
    const url = qs.length ? `?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [enabled, preset, overrides, urlBootstrapped]);

  const presets = useMemo(() => getAllPresets(baseDefault), [baseDefault]);

  function applyPreset(id: ThresholdPresetId) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    setOverrides(p.overrides ?? {});
    setEnabled(id !== "canonical");
  }

  function resetToCanonical() {
    setPreset("canonical");
    setOverrides({});
    setEnabled(false);
  }

  function updateGateConfidence(v: number) {
    setOverrides((prev) => ({
      ...prev,
      version: "v1",
      gate: {
        ...(prev.gate ?? {}),
        confidence_threshold: clamp(v, 0, 1),
      },
    }));
  }

  function updateTrendEps(v: number) {
    setOverrides((prev) => ({
      ...prev,
      version: "v1",
      trend: {
        ...(prev.trend ?? {}),
        eps: Math.max(0, v),
      },
    }));
  }

  function updateBand(key: BandKey, field: "pct" | "z", v: number) {
    setOverrides((prev) => ({
      ...prev,
      version: "v1",
      band: {
        ...(prev.band ?? {}),
        [key]: {
          ...(typeof (prev.band as Record<string, unknown> | undefined)?.[key] === "object" &&
          (prev.band as Record<string, unknown> | undefined)?.[key] !== null
            ? ((prev.band as Record<string, unknown>)[key] as Record<string, unknown>)
            : {}),
          [field]: field === "pct" ? clamp(v, 0, 100) : v,
        },
      } as unknown as ThresholdConfigOverridesV1["band"],
    }));
  }

  if (!open) return null;

  const bandMap = asBandMap((effectiveDraft as unknown as { band?: unknown }).band);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl border border-ui-border bg-ui-bg/20 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ui-faint">Custom thresholds</div>
            <div className="mt-1 text-lg font-semibold text-ui-text">{chain} · noise vs structural overlay</div>
            <div className="mt-1 text-xs text-ui-faint">Canonical data remains unchanged. This is a deterministic overlay.</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-ui-border bg-ui-bg/10 px-3 py-1 text-xs font-semibold text-ui-muted hover:bg-ui-bg/20"
          >
            Close
          </button>
        </div>

        <div className="mt-6">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Presets</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  preset === p.id ? "border-ui-border bg-ui-bg/15 text-ui-text" : "border-ui-border/40 text-ui-faint"
                }`}
              >
                {p.title}
              </button>
            ))}
            <button onClick={resetToCanonical} className="rounded-full border border-ui-border/40 px-3 py-1 text-[11px] font-semibold text-ui-faint">
              Canonical only
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Confidence threshold (0–1)"
            value={effectiveDraft.gate.confidence_threshold}
            min={0}
            max={1}
            step={0.01}
            onChange={updateGateConfidence}
          />
          <Field label="Trend eps (≥0)" value={effectiveDraft.trend.eps} min={0} step={0.01} onChange={updateTrendEps} />
        </div>

        <div className="mt-8">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Bands (percentile 0–100, z finite)</div>

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            {(Object.keys({ high: 1, extreme_high: 1, low: 1, extreme_low: 1 }) as BandKey[]).map((k) => {
              const b = bandMap?.[k] ?? { pct: 0, z: 0 };
              return (
                <div key={k} className="rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
                  <div className="text-xs font-semibold text-ui-text">{k}</div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="pct" value={b.pct} min={0} max={100} step={1} onChange={(v) => updateBand(k, "pct", v)} />
                    <Field label="z" value={b.z} step={0.1} onChange={(v) => updateBand(k, "z", v)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="text-xs text-ui-faint">
            Effective confidence gate: <span className="font-mono text-ui-text">{(effectiveDraft.gate.confidence_threshold * 100).toFixed(0)}%</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={resetToCanonical} className="rounded-full border border-ui-border/40 px-4 py-2 text-xs font-semibold text-ui-faint">
              Reset
            </button>
            <button
              onClick={() => onApply({ overrides, effective: effectiveDraft, preset })}
              className="rounded-full border border-ui-border bg-ui-bg/15 px-4 py-2 text-xs font-semibold text-ui-text hover:bg-ui-bg/25"
            >
              Apply
            </button>
          </div>
        </div>

        {canonical ? null : null}
      </div>
    </div>
  );
}