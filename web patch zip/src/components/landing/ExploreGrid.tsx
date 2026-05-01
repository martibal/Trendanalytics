import Link from "next/link";
import { exploreCards } from "@/lib/landing";

export default function ExploreGrid() {
  return (
    <section className="mt-10">
      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-500">
        Methodology &amp; transparency
      </div>
      <h2 className="mt-1 text-3xl font-semibold text-white">
        Every classification decision is documented and verifiable.
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-400 max-w-3xl">
        The thresholds, confidence rules, persistence logic, and field definitions are all published.
        The track record shows exactly what the model published on any past date — not a reconstruction.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {exploreCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-3xl border border-white/8 bg-white/[0.02] p-5 transition hover:border-cyan-500/30 hover:bg-white/[0.04]"
          >
            <h3 className="text-base font-semibold text-white">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{card.body}</p>
            <div className="mt-4 text-xs text-cyan-400 group-hover:underline">Open →</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
