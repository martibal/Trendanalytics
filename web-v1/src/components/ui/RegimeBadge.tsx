import clsx from "clsx";

export function RegimeBadge({ label }: { label: string }) {
  const key = String(label ?? "").toUpperCase().trim();

  // Only tone, no “good/bad” semantics. Keep it subtle/premium.
  const tone =
    key === "STABLE"
      ? "border-ui-ok/25 bg-ui-ok/10 text-ui-ok"
      : key === "HEATING"
      ? "border-ui-warn/25 bg-ui-warn/10 text-ui-warn"
      : key === "COOLING"
      ? "border-ui-accent2/25 bg-ui-accent2/10 text-ui-accent2"
      : "border-ui-border bg-ui-bg/20 text-ui-muted";

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        tone
      )}
      title={label}
    >
      {label}
    </span>
  );
}
