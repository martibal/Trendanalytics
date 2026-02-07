// src/app/wiki/page.tsx
import Link from "next/link";
import { METRIC_KEYS, requireMetric } from "@/lib/metrics/catalog";

type Entry = {
  id: string;
  title: string;
  basic: string;
  advanced: string;
  seeAlso?: Array<{ label: string; href: string }>;
};

function metricToEntry(key: string): Entry {
  const m = requireMetric(key);
  return {
    id: m.key,
    title: m.key,
    basic: `${m.doc.what.basic} ${m.doc.why.basic}`,
    advanced: `${m.doc.what.advanced} ${m.doc.how.advanced}`,
    seeAlso: [
      { label: "Coverage", href: "#coverage" },
      { label: "Freshness", href: "#freshness" },
      { label: "Moving averages", href: "#moving-averages" },
      { label: "Methodology page", href: m.anchors.methodology },
    ],
  };
}

const CORE_ENTRIES: Entry[] = [
  {
    id: "moving-averages",
    title: "Moving averages (MA7 / MA30)",
    basic:
      "A moving average smooths daily noise by averaging recent days. MA7 is short-term smoothing; MA30 is longer-term context.",
    advanced:
      "MA7 and MA30 are returned by the API as separate series fields. They are sourced from derived outputs when available; otherwise computed as trailing averages over available (present) days. Missing days are not interpolated.",
  },
  {
    id: "coverage",
    title: "Coverage",
    basic: "Coverage tells you whether the selected window has complete data. Missing days are not treated as zero.",
    advanced:
      "Every series response includes expected_days, present_days, missing_days, and a nonNull_ratio. These fields are computed from the gold manifest and the actual values in the daily files.",
  },
  {
    id: "freshness",
    title: "Freshness / lag",
    basic: "Freshness tells you how up-to-date the dataset is (as-of date and lag).",
    advanced:
      "Freshness is derived from gold/<chain>/manifest.json (asof) and compared to today (UTC) to compute lag_days. Chains may legitimately have different lags depending on upstream indexing.",
  },
];

export default function WikiPage() {
  const metricEntries = METRIC_KEYS.map((k) => metricToEntry(String(k)));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Wiki</h1>
        <p className="mt-3 text-white/70">Short definitions and context for metrics and concepts used across the platform.</p>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-xl font-semibold text-white">Metric entries</h2>
          <p className="mt-2 text-sm text-white/70">
            Each metric has a stable anchor. Charts link here via <span className="font-mono">/wiki#&lt;metric_key&gt;</span>.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {metricEntries.map((e) => (
              <Link
                key={e.id}
                href={`#${e.id}`}
                className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/80 hover:border-white/20"
              >
                <div className="font-mono text-xs text-white/60">{e.id}</div>
                <div className="mt-1 font-semibold text-white">{requireMetric(e.id).label}</div>
              </Link>
            ))}
          </div>
        </section>

        {metricEntries.map((e) => (
          <section key={e.id} id={e.id} className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{e.title}</h2>
                <div className="mt-1 text-sm text-white/60">
                  See methodology:{" "}
                  <Link
                    className="text-white underline decoration-white/30 hover:decoration-white"
                    href={requireMetric(e.id).anchors.methodology}
                  >
                    /methodology#{e.id}
                  </Link>
                </div>
              </div>
              <a className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/70 hover:border-white/20" href={`#${e.id}`}>
                #{e.id}
              </a>
            </div>

            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-white/70">Basic</div>
                <p className="mt-2 text-sm text-white/75">{e.basic}</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-white/70">Advanced</div>
                <p className="mt-2 text-sm text-white/75">{e.advanced}</p>
              </div>
            </div>

            {e.seeAlso && e.seeAlso.length > 0 && (
              <div className="mt-4 text-sm text-white/70">
                See also:{" "}
                {e.seeAlso.map((s, i) => (
                  <span key={s.href}>
                    <Link className="text-white underline decoration-white/30 hover:decoration-white" href={s.href}>
                      {s.label}
                    </Link>
                    {i < e.seeAlso!.length - 1 ? " · " : ""}
                  </span>
                ))}
              </div>
            )}
          </section>
        ))}

        <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <h2 className="text-xl font-semibold text-white">Concepts</h2>
          <div className="mt-4 space-y-6">
            {CORE_ENTRIES.map((e) => (
              <div key={e.id} id={e.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">{e.title}</h3>
                  <a className="text-xs text-white/60 hover:text-white/80" href={`#${e.id}`}>
                    #{e.id}
                  </a>
                </div>
                <div className="mt-3 grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-white/70">Basic</div>
                    <p className="mt-2 text-sm text-white/75">{e.basic}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white/70">Advanced</div>
                    <p className="mt-2 text-sm text-white/75">{e.advanced}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}