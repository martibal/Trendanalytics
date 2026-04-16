import Link from "next/link";
import JsonExampleViewer from "@/components/landing/JsonExampleViewer";
import { jsonLayers } from "@/lib/landing";

const LAYER_MENTAL_MODEL: Record<string, string> = {
  Gold: "What happened",
  Meta: "What it means",
  Derived: "How it is trending",
};

const LAYER_SHORT_COPY: Record<string, string> = {
  Gold:
    "The raw daily observations the chain actually recorded — in native units, ready for verification and feature work.",
  Meta:
    "The analytical layer subscribers are really paying for — regime label, confidence, scorecard, and drivers.",
  Derived:
    "The smoothed trend layer that separates persistence from one-day spikes and gives context for charting or monitoring.",
};

export default function JsonLayers() {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-4xl">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300/75">
            What subscribers receive
          </div>
          <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
            Three JSON files per chain, per day
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
            Every subscription gives you direct API access to the published artifacts below.
            The easiest way to think about them is simple:{" "}
            <span className="font-semibold text-white">Gold tells you what happened</span>,{" "}
            <span className="font-semibold text-white">Meta tells you what it means</span>, and{" "}
            <span className="font-semibold text-white">Derived tells you how it is trending</span>.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <JsonExampleViewer />
          <Link
            href="/api-docs/schema"
            className="inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-5 py-2.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
          >
            Full field reference →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {jsonLayers.map((layer) => {
          const moreCount = layer.moreCount ?? 0;
          const mentalModel = LAYER_MENTAL_MODEL[layer.eyebrow] ?? "";
          const shortCopy = LAYER_SHORT_COPY[layer.eyebrow] ?? layer.description;
          const visibleFields = layer.fields.slice(0, 3);

          return (
            <Link
              key={layer.eyebrow}
              href={layer.schemaHref}
              className={`block rounded-3xl border p-6 shadow-sm transition hover:border-cyan-500/30 ${layer.borderColor} ${layer.bgColor}`}
            >
              <div className={`text-[11px] font-black uppercase tracking-[0.18em] ${layer.accentColor}`}>
                {layer.eyebrow}
              </div>

              <h3 className="mt-3 text-[31px] font-semibold leading-tight text-white">
                {layer.title}
              </h3>

              <div className={`mt-3 text-[12px] font-bold ${layer.accentColor}`}>
                {mentalModel}
              </div>

              <p className="mt-3 text-[14px] leading-7 text-slate-200">
                {shortCopy}
              </p>

              <div className="mt-5 rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Representative fields
                </div>
                <ul className="space-y-2.5">
                  {visibleFields.map((field) => (
                    <li key={field.key} className="flex items-start gap-2.5 text-[12px]">
                      <span className={`mt-1 shrink-0 ${layer.dotColor}`}>•</span>
                      <span className="leading-6">
                        <code className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[11px] text-slate-100">
                          {field.key}
                        </code>{" "}
                        <span className="text-slate-400">{field.note}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                {moreCount > 0 ? (
                  <div className={`mt-3 text-[12px] font-medium ${layer.accentColor} opacity-85`}>
                    + {moreCount} more documented fields
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-[12px] leading-6 text-slate-300">
                {layer.bestFor}
              </div>

              <div className={`mt-4 inline-flex items-center text-[12px] font-semibold ${layer.accentColor}`}>
                See all {layer.eyebrow} fields →
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 text-sm leading-7 text-slate-300">
        Delivered via{" "}
        <code className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[11px] text-slate-100">
          GET /api/v1/files/&lt;genre&gt;/&lt;chain&gt;/&lt;window&gt;/latest.json
        </code>
        . Basic gives one chain with up to 90 days of history. Pro gives all four chains with up to
        365 days.{" "}
        <Link href="/api-docs/schema" className="text-cyan-200 hover:underline">
          Full schema reference
        </Link>{" "}
        ·{" "}
        <Link href="/api-docs" className="text-cyan-200 hover:underline">
          API docs
        </Link>
      </div>
    </section>
  );
}