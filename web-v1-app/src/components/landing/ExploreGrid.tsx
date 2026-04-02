import Link from "next/link";
import { exploreCards } from "@/lib/landing";

export default function ExploreGrid() {
  return (
    <section className="mt-10">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
        READY TO EXPLORE?
      </div>
      <h2 className="mt-1 text-3xl font-semibold">Check the method before you trust the output.</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {exploreCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-3xl border p-5 shadow-sm transition hover:border-cyan-500/30"
          >
            <h3 className="text-lg font-semibold text-white">{card.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{card.body}</p>
            <div className="mt-4 text-xs text-cyan-200">Open →</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
