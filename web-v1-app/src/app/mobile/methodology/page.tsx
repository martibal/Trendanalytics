import Link from "next/link";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";

const cards = [
  {
    title: "What the model does",
    body: "Every day, Urd Atlas reads chain data, scores it against that chain's own recent history, and publishes a descriptive regime label with confidence and drivers.",
  },
  {
    title: "The four named labels",
    body: "STABLE, HEATING, CONGESTED, and CHEAP. If evidence is too weak, the model publishes UNKNOWN/DEGRADED instead of guessing.",
  },
  {
    title: "Chain-relative by design",
    body: "A label always means relative to that chain's own baseline. HEATING on Ethereum means Ethereum is running hotter than Ethereum normally does — not hotter than Bitcoin.",
  },
  {
    title: "Why confidence matters",
    body: "The confidence score tells you how strong the evidence is behind the published label. Low confidence is visible, not hidden.",
  },
  {
    title: "Why subscribers pay",
    body: "You are buying the daily classification layer, confidence logic, drivers, publication, and archive handling — not just raw observations.",
  },
  {
    title: "Interpretation boundary",
    body: "Urd Atlas is descriptive only. No price targets, no forecasts, no recommendations, and no prescriptive trading signals.",
  },
] as const;

export default function MobileMethodologyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">Methodology</div>
              <div className="mt-0.5 text-[14px] font-bold text-white">Compact model walkthrough for mobile</div>
            </div>
            <Link href="/methodology?view=desktop" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-slate-200">Desktop</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">
        <div className="rounded-3xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
          <p className="text-[13px] leading-[1.75] text-slate-200">
            This is the short version for phones. It tells you what the model does, what the labels mean, and how to read the output without forcing the full desktop documentation onto a small screen.
          </p>
        </div>

        <div className="space-y-3">
          {cards.map((card) => (
            <section key={card.title} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[15px] font-bold text-white">{card.title}</div>
              <p className="mt-2 text-[13px] leading-[1.75] text-slate-300">{card.body}</p>
            </section>
          ))}
        </div>

        <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Need more detail?</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/mobile/wiki" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200">Open mobile wiki</Link>
            <Link href="/methodology?view=desktop" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200">Open full desktop methodology</Link>
          </div>
        </div>
      </main>

      <MobileBottomNav active="wiki" />
    </div>
  );
}
