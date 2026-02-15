// src/components/legal/InlineDisclaimer.tsx
import Link from "next/link";

export type InlineDisclaimerVariant = "neutral" | "legal" | "warning";

export default function InlineDisclaimer(props: {
  variant?: InlineDisclaimerVariant;
  className?: string;
  compact?: boolean;
}) {
  const variant = props.variant ?? "neutral";
  const compact = props.compact ?? false;

  const base =
    "rounded-2xl border px-4 py-3 text-[13px] leading-6 backdrop-blur";
  const variants: Record<InlineDisclaimerVariant, string> = {
    neutral: "border-white/10 bg-white/5 text-white/70",
    legal: "border-red-400/30 bg-red-500/10 text-white/75",
    warning: "border-amber-400/30 bg-amber-500/10 text-white/75",
  };

  return (
    <aside
      role="note"
      aria-label="Descriptive-only disclaimer"
      className={`${base} ${variants[variant]} ${props.className ?? ""}`}
    >
      <div className={compact ? "space-y-1" : "space-y-2"}>
        <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/60">
          Descriptive-only
        </div>

        <p>
          The content on this page is descriptive. It does not include financial advice,
          investment recommendations, or price predictions.
        </p>

        {!compact && (
          <p className="text-white/65">
            For definitions and how metrics are computed, see{" "}
            <Link
              href="/methodology"
              className="text-blue-300 underline underline-offset-4 hover:text-blue-200"
            >
              Methodology
            </Link>{" "}
            and{" "}
            <Link
              href="/terms"
              className="text-blue-300 underline underline-offset-4 hover:text-blue-200"
            >
              Terms
            </Link>
            .
          </p>
        )}
      </div>
    </aside>
  );
}