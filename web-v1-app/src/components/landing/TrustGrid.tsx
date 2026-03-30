import Link from "next/link";
import { trustCards } from "@/lib/landing";

export default function TrustGrid() {
  return (
    <section className="mt-10">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
        Trust and verification
      </div>
      <h2 className="mt-1 text-3xl font-semibold">Check the method before you trust the output</h2>
      <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
        The model is documented, the fields are explained, and the historical surface is inspectable.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {trustCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-3xl border p-6 shadow-sm hover:border-cyan-500/30"
          >
            <div className="text-xs uppercase tracking-[0.14em] text-cyan-200">{card.eyebrow}</div>
            <h3 className="mt-3 text-xl font-semibold text-white">{card.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{card.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
