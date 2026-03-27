// src/app/chains/[chain]/loading.tsx
export default function ChainPageLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 animate-pulse">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="h-8 w-40 rounded-lg bg-muted" />
          </div>
          <div className="mt-2 h-4 w-72 rounded bg-muted/60" />
        </div>
        <div className="h-8 w-28 rounded-full bg-muted" />
      </div>

      {/* Staleness bar */}
      <div className="mb-6 h-20 rounded-xl bg-muted/40" />

      {/* Scorecard gauges */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border p-5">
            <div className="mx-auto h-28 w-44 rounded-full bg-muted" />
            <div className="mt-3 mx-auto h-4 w-20 rounded bg-muted/60" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border p-5">
            <div className="mb-3 h-5 w-40 rounded bg-muted" />
            <div className="h-48 rounded-xl bg-muted/40" />
          </div>
        ))}
      </div>

      {/* Drivers table */}
      <div className="rounded-2xl border p-5">
        <div className="mb-4 h-5 w-32 rounded bg-muted" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="py-3 border-b last:border-0">
            <div className="h-4 w-full rounded bg-muted/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
