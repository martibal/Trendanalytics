// src/components/legal/SiteFooterDisclaimer.tsx
import Link from "next/link";

export default function SiteFooterDisclaimer() {
  return (
    <section
      className="mt-16 border-t border-red-400/30 bg-red-500/10 px-4 py-10"
      role="contentinfo"
      aria-label="Legal disclaimer"
    >
      <div className="mx-auto w-full max-w-6xl text-center">
        <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-red-300">
          Descriptive analysis only
        </div>

        <p className="mx-auto mt-4 max-w-3xl text-[13px] leading-6 text-white/80">
          This platform provides descriptive blockchain activity analysis. It does not provide
          financial advice, investment recommendations, or price predictions.
        </p>

        <p className="mx-auto mt-3 max-w-3xl text-[13px] leading-6 text-white/75">
          Outputs represent historical observations of network conditions within explicit windows.
          Users are responsible for interpretation and verification of freshness, lag, and coverage.
        </p>

        <div className="mt-5">
          <Link
            href="/terms"
            className="text-[13px] text-blue-300 underline underline-offset-4 hover:text-blue-200"
          >
            View Terms of Service
          </Link>
        </div>
      </div>
    </section>
  );
}