import Link from "next/link";
import { jsonLayers } from "@/lib/landing";

export default function JsonLayers() {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
            Subscriber outputs
          </div>
          <h2 className="mt-1 text-3xl font-semibold">What you actually get</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
            Three daily JSON layers, each serving a different role in the workflow.
          </p>
        </div>
        <Link
          href="/api-docs/schema"
          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
        >
          See full schema →
        </Link>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {jsonLayers.map((layer) => (
          <div key={layer.eyebrow} className="rounded-3xl border p-6 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              {layer.eyebrow}
            </div>
            <h3 className="mt-3 text-xl font-semibold text-white">{layer.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{layer.body}</p>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-slate-200">
              {layer.bestFor}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
