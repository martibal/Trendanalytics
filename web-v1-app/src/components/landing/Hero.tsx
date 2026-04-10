import Link from "next/link";
import {
  heroBodyParagraphs,
  heroDefinitionCards,
  heroFaqPrompt,
  heroPipelineBody,
  heroPipelineEyebrow,
  heroPipelinePoints,
  heroPipelineTitle,
  heroSalesPunch,
  heroTagline,
  landingProofChips,
} from "@/lib/landing";

export default function Hero() {
  return (
    <header className="mb-10">
      <div className="grid gap-6 rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm lg:grid-cols-[minmax(0,1.25fr)_360px]">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
            Daily on-chain regime model
          </div>

          <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
            {heroTagline}
          </h1>

          {heroBodyParagraphs.map((paragraph) => (
            <p key={paragraph} className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
              {paragraph}
            </p>
          ))}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="#plans"
              className="inline-flex items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
            >
              See plans →
            </Link>
            <Link
              href="#latest-surface"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              Latest published surface →
            </Link>
            <Link
              href="/api-docs/schema"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              JSON schema →
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
            <a href="#what-is-modal" className="hover:text-cyan-200">
              What this is
            </a>
            <span className="text-slate-500">•</span>
            <a href="#boundary-modal" className="hover:text-cyan-200">
              Interpretation boundary
            </a>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {landingProofChips.map((chip) => (
              <div key={chip.label} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  {chip.label}
                </div>
                <div className="mt-1 text-base font-semibold text-white">{chip.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-cyan-500/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(255,255,255,0.02))] p-5">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              What exactly are you buying?
            </div>

            <div className="mt-3 max-w-3xl space-y-2">
              <p className="text-lg font-medium leading-8 text-white">{heroSalesPunch[0]}</p>
              <p className="text-sm leading-7 text-slate-300">{heroSalesPunch[1]}</p>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {heroDefinitionCards.map((card) => (
                <div key={card.title} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="text-sm font-semibold text-white">{card.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{card.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span>{heroFaqPrompt}</span>
              <Link href="/faq" className="font-medium text-cyan-200 hover:underline">
                Read the Q&amp;A →
              </Link>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-white/10 bg-black/10 p-5">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
            {heroPipelineEyebrow}
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">{heroPipelineTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{heroPipelineBody}</p>

          <div className="mt-4 space-y-3">
            {heroPipelinePoints.map((point) => (
              <div key={point.title} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                <div className="text-sm font-semibold text-white">{point.title}</div>
                <div className="mt-1 text-sm leading-6 text-slate-400">{point.body}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4 text-sm leading-6 text-slate-300">
            Every published row is still chain-relative, confidence-gated, descriptive-only, and versioned for auditability. Usefulness comes first, but traceability stays visible.
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href="#plans" className="text-cyan-200 hover:underline">
              See plans →
            </Link>
            <Link href="/methodology" className="text-cyan-200 hover:underline">
              How it works →
            </Link>
          </div>
        </aside>
      </div>
    </header>
  );
}
