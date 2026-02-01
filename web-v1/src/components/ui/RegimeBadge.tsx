import clsx from "clsx";

export function RegimeBadge({ label }: { label: string }) {
  const key = String(label ?? "").toUpperCase();

  const tone =
    key === "STABLE"
      ? "border-ui-ok/30 bg-ui-ok/10 text-ui-ok"
      : key === "HEATING"
      ? "border-ui-warn/30 bg-ui-warn/10 text-ui-warn"
      : key === "COOLING"
      ? "border-ui-accent2/30 bg-ui-accent2/10 text-ui-accent2"
      : "ui-border bg-ui-surface text-ui-muted";

  return (
    <span className={clsx("rounded-full border px-2.5 py-1 text-[11px] font-medium", tone)}>
      {label}
    </span>
  );
}
