import Link from "next/link";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";

const thresholdCards = [
  {
    title: "Confidence gate",
    body: "Below 0.40, the model publishes UNKNOWN/DEGRADED instead of presenting a weak label as strong.",
  },
  {
    title: "Chain-relative scoring",
    body: "Signals are evaluated against each chain's own historical baseline, not a universal threshold shared across all chains.",
  },
  {
    title: "Persistence matters",
    body: "A one-day spike is not enough. The model looks for persistence before treating change as structural.",
  },
  {
    title: "Interpretation boundary",
    body: "Thresholds help classify current network state. They are not predictions, recommendations, or price signals.",
  },
] as const;

export default function MobileThresholdsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="flex items-center gap-3 py-3">
          <Link href="/mobile" className="pr-1 text-lg text-slate-400">
            ←
          </Link>
          <div>
            <div className="text-[14px] font-bold text-white">Thresholds</div>
            <div className="text-[10px] text-slate-500">
              Simplified mobile explanation
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">
        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3">
          <p className="text-[11px] leading-[1.65] text-slate-200">
            This mobile page explains the role thresholds play in classification.
            It is a lighter version of the full desktop thresholds surface.
          </p>
          <a
            href="/thresholds?view=desktop"
            className="mt-2 inline-block text-[11px] font-semibold text-cyan-300"
          >
            Open full desktop thresholds page →
          </a>
        </div>

        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            What thresholds do
          </div>
          <p className="text-[12px] leading-[1.7] text-slate-200">
            Thresholds are part of the model's classification logic. They help decide
            whether the current state still looks normal, is heating up, or has become
            structurally unusual.
          </p>
        </section>

        <section className="space-y-3">
          {thresholdCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
            >
              <div className="text-[13px] font-semibold text-white">{card.title}</div>
              <p className="mt-2 text-[12px] leading-[1.65] text-slate-300">{card.body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Most important takeaway
          </div>
          <p className="text-[12px] leading-[1.7] text-slate-200">
            Urd Atlas does not use thresholds to tell you what to do. It uses thresholds
            to describe how unusual current network conditions are relative to each chain's
            own published history.
          </p>
        </section>
      </main>

      <MobileBottomNav active="overview" />
    </div>
  );
}