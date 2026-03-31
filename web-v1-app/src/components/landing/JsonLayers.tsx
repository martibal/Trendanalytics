// src/components/landing/JsonLayers.tsx
import Link from "next/link";
import { jsonLayers } from "@/lib/landing";

export default function JsonLayers() {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
            What paid plans unlock
          </div>
          <h2 className="mt-1 text-3xl font-semibold">Three JSON files per chain, per day</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
            Free gives you the readable web surface. Basic and Pro unlock direct API access to the
            published artifacts below, with every field documented in the schema reference.
          </p>
        </div>
        <Link
          href="/api-docs/schema"
          className="shrink-0 inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
        >
          Full field reference →
        </Link>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {jsonLayers.map((layer) => {
          const moreCount = layer.moreCount ?? 0;

          return (
            <div
              key={layer.eyebrow}
              className={`rounded-3xl border p-6 shadow-sm ${layer.borderColor} ${layer.bgColor}`}
            >
              <div className={`text-xs font-semibold uppercase tracking-[0.14em] ${layer.accentColor}`}>
                {layer.eyebrow}
              </div>
              <h3 className="mt-2 text-xl font-semibold text-white">{layer.title}</h3>

              <p className="mt-3 text-sm leading-7 text-slate-300">{layer.description}</p>

              <ul className="mt-4 space-y-2">
                {layer.fields.map((f) => (
                  <li key={f.key} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 shrink-0 ${layer.dotColor}`}>·</span>
                    <span>
                      <code className="rounded bg-black/20 px-1 py-0.5 font-mono text-[11px] text-slate-200">
                        {f.key}
                      </code>{" "}
                      <span className="text-slate-400">{f.note}</span>
                    </span>
                  </li>
                ))}
                {moreCount > 0 ? (
                  <li className={`text-xs ${layer.accentColor} opacity-70`}>
                    + {moreCount} more fields
                  </li>
                ) : null}
              </ul>

              <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-xs leading-5 text-slate-300">
                {layer.bestFor}
              </div>

              <Link
                href={layer.schemaHref}
                className={`mt-4 inline-flex items-center text-xs hover:underline ${layer.accentColor}`}
              >
                See all {layer.eyebrow} fields →
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-white/3 px-5 py-4 text-sm leading-7 text-slate-300">
        Delivered via{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          GET /api/v1/files/&lt;gold|meta|derived&gt;/&lt;chain&gt;/&lt;window&gt;.json
        </code>
        . Basic: one chain, up to 90 days. Pro: all four chains, up to 365 days.{" "}
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
