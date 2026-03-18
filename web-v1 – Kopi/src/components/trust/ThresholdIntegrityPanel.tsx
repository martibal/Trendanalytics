// src/components/trust/ThresholdIntegrityPanel.tsx
"use client";

import React, { useMemo } from "react";

type MetaDay = any;

export type CustomEvalLike = {
  label?: string | null;
  verdict?: string | null;

  // best-effort: custom threshold config object
  threshold_config?: any;
  config?: any;

  // optional explainer structures
  drivers?: any;
  axes?: any;
  notes?: any;
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">{children}</div>;
}

function Chip({
  label,
  value,
  tone = "neutral",
  title,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "ok" | "warn";
  title?: string;
}) {
  const cls =
    tone === "ok"
      ? "border-ui-ok/25 bg-ui-ok/10 text-ui-ok"
      : tone === "warn"
      ? "border-[rgb(var(--tone-heat)/0.25)] bg-[rgb(var(--tone-heat)/0.10)] text-[rgb(var(--tone-heat)/0.95)]"
      : "border-ui-border bg-ui-bg/15 text-ui-muted";

  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold leading-none tracking-wide",
        cls,
      ].join(" ")}
    >
      <span className="text-ui-faint">{label}</span>
      <span className="text-ui-text tabular-nums">{value}</span>
    </span>
  );
}

function fmtPct01(x: unknown): string {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function fmtNum(x: unknown, digits = 2): string {
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function safeString(x: unknown): string | null {
  return typeof x === "string" && x.trim().length ? x.trim() : null;
}

function asObj(x: unknown): Record<string, any> | null {
  if (!x || typeof x !== "object") return null;
  if (Array.isArray(x)) return null;
  return x as Record<string, any>;
}

/**
 * Pull canonical "gate" context from META day-json (best-effort).
 * We do NOT assume a single schema path; we search typical locations.
 */
function readCanonicalGate(metaDay: MetaDay | null, fallbackGateThreshold: number) {
  const meta = asObj(metaDay) ?? null;

  // Common candidates
  const gate =
    asObj(meta?.regime?.gate) ??
    asObj(meta?.gate) ??
    asObj(meta?.confidence?.gate) ??
    asObj(meta?.regime?.confidence_gate) ??
    null;

  const threshold =
    (typeof gate?.threshold === "number" && Number.isFinite(gate.threshold) ? gate.threshold : null) ??
    (typeof meta?.regime?.gate_threshold === "number" && Number.isFinite(meta.regime.gate_threshold) ? meta.regime.gate_threshold : null) ??
    fallbackGateThreshold;

  const score =
    (typeof gate?.score === "number" && Number.isFinite(gate.score) ? gate.score : null) ??
    (typeof meta?.regime?.confidence_score === "number" && Number.isFinite(meta.regime.confidence_score) ? meta.regime.confidence_score : null) ??
    (typeof meta?.confidence?.score === "number" && Number.isFinite(meta.confidence.score) ? meta.confidence.score : null) ??
    null;

  const status =
    safeString(gate?.status) ??
    safeString(meta?.regime?.gate_status) ??
    safeString(meta?.regime?.status) ??
    safeString(meta?.gate_status) ??
    null;

  // Some pipelines carry the top-level verdict/label too:
  const verdict =
    safeString(meta?.regime?.verdict) ??
    safeString(meta?.verdict) ??
    safeString(meta?.regime?.classification) ??
    null;

  const label = safeString(meta?.regime?.label) ?? safeString(meta?.label) ?? null;

  const pass =
    score != null && Number.isFinite(score)
      ? score >= threshold
      : status
      ? status.toUpperCase().includes("PASS")
      : null;

  return { threshold, score, status, verdict, label, pass };
}

function verdictTone(v: string | null): "neutral" | "ok" | "warn" {
  if (!v) return "neutral";
  const key = v.toUpperCase();
  if (key.includes("NOISE")) return "ok";
  if (key.includes("SHIFT") || key.includes("STRUCT")) return "warn";
  if (key.includes("INSUFFICIENT") || key.includes("DEGRA")) return "neutral";
  return "neutral";
}

function gateTone(pass: boolean | null): "neutral" | "ok" | "warn" {
  if (pass === true) return "ok";
  if (pass === false) return "warn";
  return "neutral";
}

function pickCustomConfig(custom: CustomEvalLike | null) {
  if (!custom) return null;
  return custom.threshold_config ?? custom.config ?? null;
}

function countKeysDeep(obj: any, maxDepth = 3): number {
  const seen = new Set<any>();
  function walk(x: any, depth: number): number {
    if (!x || typeof x !== "object") return 0;
    if (seen.has(x)) return 0;
    seen.add(x);
    if (depth > maxDepth) return 0;
    if (Array.isArray(x)) return x.reduce((acc, v) => acc + walk(v, depth + 1), 0);
    const keys = Object.keys(x);
    return keys.length + keys.reduce((acc, k) => acc + walk(x[k], depth + 1), 0);
  }
  return walk(obj, 0);
}

function stablePreview(obj: any, maxKeys = 14): Array<[string, string]> {
  const o = asObj(obj);
  if (!o) return [];
  const keys = Object.keys(o).sort().slice(0, maxKeys);
  const rows: Array<[string, string]> = [];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string") rows.push([k, v.length > 80 ? v.slice(0, 80) + "…" : v]);
    else if (typeof v === "number") rows.push([k, Number.isFinite(v) ? String(v) : "—"]);
    else if (typeof v === "boolean") rows.push([k, v ? "true" : "false"]);
    else if (v === null || v === undefined) rows.push([k, "—"]);
    else if (Array.isArray(v)) rows.push([k, `Array(${v.length})`]);
    else rows.push([k, "Object"]);
  }
  return rows;
}

export function ThresholdIntegrityPanel(props: {
  canonicalMetaDay: MetaDay | null;
  custom: CustomEvalLike | null;

  /** Used when META does not carry a gate threshold. */
  fallbackGateThreshold: number;

  /** Optional: methodology/how-to deep link */
  learnMoreHref?: string;

  title?: string;
}) {
  const canonical = useMemo(
    () => readCanonicalGate(props.canonicalMetaDay, props.fallbackGateThreshold),
    [props.canonicalMetaDay, props.fallbackGateThreshold]
  );

  const customVerdict = useMemo(() => safeString(props.custom?.verdict) ?? safeString(props.custom?.label) ?? null, [props.custom]);
  const customConfig = useMemo(() => pickCustomConfig(props.custom), [props.custom]);

  const canonicalVerdictPretty = canonical.verdict ? canonical.verdict.replaceAll("_", " ").toLowerCase() : "—";
  const customVerdictPretty = customVerdict ? customVerdict.replaceAll("_", " ").toLowerCase() : "—";

  const hasMeta = Boolean(props.canonicalMetaDay);
  const hasCustom = Boolean(props.custom);

  const customConfigKeyCount = useMemo(() => (customConfig ? countKeysDeep(customConfig, 3) : 0), [customConfig]);
  const customPreview = useMemo(() => stablePreview(customConfig, 16), [customConfig]);

  const canonicalTone = verdictTone(canonical.verdict);
  const customTone = verdictTone(customVerdict);

  const gatePassTone = gateTone(canonical.pass);

  return (
    <section className="ui-card ui-lift p-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>Integrity</Eyebrow>
          <div className="mt-2 text-sm font-semibold text-ui-text">{props.title ?? "Threshold integrity"}</div>
          <div className="mt-1 text-xs text-ui-muted">
            This panel explains what your verdict depends on: canonical META gating + optional custom thresholds overlay.
            It does not modify published artifacts.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Chip label="canonical meta" value={hasMeta ? "loaded" : "—"} tone={hasMeta ? "ok" : "neutral"} />
          <Chip label="custom overlay" value={hasCustom ? "present" : "—"} tone={hasCustom ? "ok" : "neutral"} />
          {props.learnMoreHref ? (
            <a
              href={props.learnMoreHref}
              className="ui-lift rounded-md border border-ui-border bg-ui-bg/15 px-3 py-2 font-mono text-[11px] font-semibold tracking-wide text-ui-muted hover:border-ui-border-soft hover:bg-ui-bg/20 hover:text-ui-text"
            >
              Learn more
            </a>
          ) : null}
        </div>
      </div>

      {/* Canonical META gate */}
      <div className="mt-5 ui-inset p-4">
        <Eyebrow>Canonical gate</Eyebrow>
        <div className="mt-2 text-sm text-ui-muted">
          Canonical verdicts are only considered interpretable when gating requirements are met. Gating is a descriptive confidence control
          (coverage / consistency / freshness dependent, per META schema).
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip
            label="gate threshold"
            value={fmtNum(canonical.threshold, 2)}
            title="Minimum gate score required for canonical interpretation (best-effort)."
          />
          <Chip
            label="gate score"
            value={canonical.score == null ? "—" : fmtNum(canonical.score, 2)}
            tone={gatePassTone}
            title="Best-effort read from META day-json; if absent, status is used when available."
          />
          <Chip label="gate status" value={canonical.status ?? "—"} tone={gatePassTone} />
          <Chip
            label="pass"
            value={canonical.pass == null ? "—" : canonical.pass ? "yes" : "no"}
            tone={gatePassTone}
            title="Derived from score>=threshold when available; otherwise inferred from status string."
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-ui-border bg-ui-bg/10 p-4">
            <Eyebrow>Canonical verdict</Eyebrow>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Chip label="verdict" value={canonicalVerdictPretty} tone={canonicalTone} />
              <Chip label="label" value={canonical.label ?? "—"} />
            </div>
            <div className="mt-2 text-[11px] text-ui-faint">
              If gate does not pass, treat the canonical verdict as non-actionable context (insufficient / degraded).
            </div>
          </div>

          <div className="rounded-lg border border-ui-border bg-ui-bg/10 p-4">
            <Eyebrow>Canonical confidence</Eyebrow>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Chip label="confidence" value={fmtPct01((props.canonicalMetaDay as any)?.regime?.confidence_score ?? canonical.score)} />
              <Chip label="source" value="META day-json" />
            </div>
            <div className="mt-2 text-[11px] text-ui-faint">
              Confidence is a descriptive quality control, not a prediction probability.
            </div>
          </div>
        </div>

        {!hasMeta ? (
          <div className="mt-4 rounded-lg border border-ui-border bg-[rgb(var(--tone-heat)/0.10)] p-4">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--tone-heat)/0.95)]">
              Canonical META missing
            </div>
            <div className="mt-2 text-sm text-ui-muted">
              Provide the selected day’s META day-json to read gate score/status and show integrity constraints.
            </div>
          </div>
        ) : null}
      </div>

      {/* Custom overlay */}
      <div className="mt-5 ui-inset p-4">
        <Eyebrow>Custom overlay</Eyebrow>
        <div className="mt-2 text-sm text-ui-muted">
          Custom thresholds are an overlay evaluation for the selected day. They do not change canonical labels or published files.
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip label="custom verdict" value={customVerdictPretty} tone={customTone} />
          <Chip
            label="config size"
            value={customConfig ? `${customConfigKeyCount} keys` : "—"}
            title="Approximate number of keys (depth-limited) to indicate config complexity."
          />
        </div>

        {!hasCustom ? (
          <div className="mt-4 rounded-lg border border-ui-border bg-ui-bg/10 p-4 text-sm text-ui-muted">
            No custom result provided. Run custom thresholds to compare against canonical gating and verdict.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-ui-border bg-ui-bg/10 p-4">
              <Eyebrow>What changed</Eyebrow>
              <div className="mt-2 text-sm text-ui-muted">
                Compare canonical vs custom verdict to see how sensitive the classification is to threshold assumptions.
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip label="canonical" value={canonicalVerdictPretty} tone={canonicalTone} />
                <Chip label="custom" value={customVerdictPretty} tone={customTone} />
              </div>

              <div className="mt-2 text-[11px] text-ui-faint">
                If canonical gate fails, canonical verdict is already “integrity-blocked”; custom overlays should be interpreted with the same
                data quality constraints.
              </div>
            </div>

            <div className="rounded-lg border border-ui-border bg-ui-bg/10 p-4">
              <Eyebrow>Config preview</Eyebrow>
              <div className="mt-2 text-[11px] text-ui-faint">
                This is a stable, shallow preview of the config object (not a full dump).
              </div>

              {customConfig ? (
                <div className="mt-3 overflow-hidden rounded-md border border-ui-border bg-ui-bg/10">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-ui-border bg-ui-bg/15">
                        <th className="px-3 py-2 font-mono font-semibold tracking-wide text-ui-faint">key</th>
                        <th className="px-3 py-2 font-mono font-semibold tracking-wide text-ui-faint">value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customPreview.map(([k, v]) => (
                        <tr key={k} className="border-b border-ui-border last:border-b-0">
                          <td className="px-3 py-2 font-mono text-ui-muted">{k}</td>
                          <td className="px-3 py-2 text-ui-text">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-3 text-sm text-ui-muted">Custom config object not present.</div>
              )}
            </div>
          </div>
        )}

        {hasCustom && props.custom?.notes ? (
          <details className="mt-4 rounded-lg border border-ui-border bg-ui-bg/10 p-3">
            <summary className="cursor-pointer select-none font-mono text-[11px] font-semibold tracking-wide text-ui-text">
              Notes (advanced)
            </summary>
            <pre className="mt-3 overflow-auto rounded-md border border-ui-border bg-ui-bg/10 p-3 text-[11px] text-ui-muted">
{typeof props.custom.notes === "string" ? props.custom.notes : JSON.stringify(props.custom.notes, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>

      {/* Guardrail */}
      <div className="mt-5 rounded-lg border border-ui-border bg-ui-bg/10 px-4 py-3 text-[11px] text-ui-faint">
        Guardrail: descriptive-only · no prices · no forecasts · no advice. Integrity controls describe when interpretation is supported by the
        published data contract.
      </div>
    </section>
  );
}