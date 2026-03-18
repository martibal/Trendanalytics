// src/components/ui/RegimeBadge.tsx
import clsx from "clsx";

type Tone =
  | "signal" // #00c9a0
  | "cool" // #48b4e0
  | "heat" // #e8724a
  | "cong" // #f0b840
  | "cheap" // #5ad88a
  | "stable" // #8888aa
  | "deg" // #3a4a5a
  | "neutral";

function resolveTone(label: string): Tone {
  const key = String(label ?? "").toUpperCase().trim();

  // Canonical states (keep descriptive-only: tones are visual, not “good/bad” semantics)
  if (key === "STABLE") return "stable";
  if (key === "DEGRADED") return "deg";
  if (key === "CONGESTED") return "cong";

  if (key === "HEATING") return "heat";
  if (key === "COOLING") return "cool";

  if (key === "SIGNAL") return "signal";
  if (key === "CHEAP") return "cheap";

  // Common variations / synonyms
  if (key.includes("CONGEST")) return "cong";
  if (key.includes("DEGRAD") || key.includes("LOW_CONF") || key.includes("INSUFFICIENT")) return "deg";
  if (key.includes("HEAT") || key.includes("HOT")) return "heat";
  if (key.includes("COOL")) return "cool";
  if (key.includes("STABL")) return "stable";

  return "neutral";
}

function toneClasses(tone: Tone): string {
  // We use CSS vars from globals.css to match landing-v2.html palette:
  // --tone-heat, --tone-cool, --tone-cong, --tone-cheap, --tone-stable, --tone-deg
  // plus --ok (signal) already mapped.
  switch (tone) {
    case "signal":
      return "border-ui-ok/25 bg-ui-ok/10 text-ui-ok";
    case "cool":
      return "border-[rgb(var(--tone-cool)/0.25)] bg-[rgb(var(--tone-cool)/0.10)] text-[rgb(var(--tone-cool)/0.95)]";
    case "heat":
      return "border-[rgb(var(--tone-heat)/0.25)] bg-[rgb(var(--tone-heat)/0.10)] text-[rgb(var(--tone-heat)/0.95)]";
    case "cong":
      return "border-[rgb(var(--tone-cong)/0.25)] bg-[rgb(var(--tone-cong)/0.10)] text-[rgb(var(--tone-cong)/0.95)]";
    case "cheap":
      return "border-[rgb(var(--tone-cheap)/0.25)] bg-[rgb(var(--tone-cheap)/0.10)] text-[rgb(var(--tone-cheap)/0.95)]";
    case "stable":
      return "border-[rgb(var(--tone-stable)/0.25)] bg-[rgb(var(--tone-stable)/0.10)] text-[rgb(var(--tone-stable)/0.95)]";
    case "deg":
      return "border-[rgb(var(--tone-deg)/0.25)] bg-[rgb(var(--tone-deg)/0.15)] text-ui-muted";
    default:
      return "border-ui-border bg-ui-bg/20 text-ui-muted";
  }
}

export function RegimeBadge({ label }: { label: string }) {
  const raw = String(label ?? "").trim();
  const key = raw.toUpperCase();
  const tone = resolveTone(key);

  return (
    <span
      className={clsx(
        // HTML parity: mono chip, small radius, subtle border, compact padding
        "inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold leading-none tracking-wide",
        toneClasses(tone)
      )}
      title={raw}
    >
      {raw}
    </span>
  );
}