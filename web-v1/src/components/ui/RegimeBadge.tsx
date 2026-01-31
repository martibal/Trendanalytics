import clsx from "clsx";

export function RegimeBadge({ label }: { label: string }) {
  const key = label.toUpperCase();
  const tone =
    key === "STABLE"
      ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-200"
      : key === "HEATING"
      ? "border-amber-900/60 bg-amber-950/40 text-amber-200"
      : key === "COOLING"
      ? "border-sky-900/60 bg-sky-950/40 text-sky-200"
      : "border-zinc-800 bg-zinc-950 text-zinc-200";

  return (
    <span className={clsx("rounded-full border px-2.5 py-1 text-[11px] font-medium", tone)}>
      {label}
    </span>
  );
}
