// src/app/methodology/page.tsx
import Link from "next/link";
import { METRIC_KEYS, requireMetric } from "@/lib/metrics/catalog";

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Methodology</h1>
        <p className="mt-3 text-white/70">
          This page is the transparency layer: what each metric is, how it is computed, why it is included, and what value it gives.
          All content is descriptive (no forecasts, no recommendations).
        </p>
      </div>

      <div className="space-y-6">
        {METRIC_KEYS.map((k) => {
          const m = requireMetric(String(k));
          return (
            <section key={m.key} id={m.key} className="rounded-2xl border border-white/10 bg-black/20 p-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-white">{m.label}</h2>
                <div className="text-sm text-white/60">
                  Key: <span className="font-mono">{m.key}</span> · Category: {m.category} · Unit: {m.unit}
                </div>
              </div>

              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">Basic</h3>
                  <ul className="mt-2 space-y-2 text-sm text-white/75">
                    <li>
                      <span className="text-white/60">What:</span> {m.doc.what.basic}
                    </li>
                    <li>
                      <span className="text-white/60">How:</span> {m.doc.how.basic}
                    </li>
                    <li>
                      <span className="text-white/60">Why:</span> {m.doc.why.basic}
                    </li>
                    <li>
                      <span className="text-white/60">Value:</span> {m.doc.value.basic}
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white">Advanced</h3>
                  <ul className="mt-2 space-y-2 text-sm text-white/75">
                    <li>
                      <span className="text-white/60">What:</span> {m.doc.what.advanced}
                    </li>
                    <li>
                      <span className="text-white/60">How:</span> {m.doc.how.advanced}
                    </li>
                    <li>
                      <span className="text-white/60">Why:</span> {m.doc.why.advanced}
                    </li>
                    <li>
                      <span className="text-white/60">Value:</span> {m.doc.value.advanced}
                    </li>
                  </ul>

                  <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="text-xs font-semibold text-white/70">Method details</div>
                    <div className="mt-2 text-sm text-white/75">
                      <div className="mb-2">
                        <span className="text-white/60">Definition:</span> {m.methodology.definition}
                      </div>
                      <div className="mb-2">
                        <span className="text-white/60">Computation:</span> {m.methodology.computation}
                      </div>
                      {m.methodology.caveats.length > 0 && (
                        <div>
                          <span className="text-white/60">Caveats:</span>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/75">
                            {m.methodology.caveats.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-white/70">
                    See also:{" "}
                    <Link className="text-white underline decoration-white/30 hover:decoration-white" href={m.anchors.wiki}>
                      Wiki entry
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}