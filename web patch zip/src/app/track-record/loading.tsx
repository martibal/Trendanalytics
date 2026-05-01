// src/app/track-record/loading.tsx
export default function TrackRecordLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 animate-pulse">
      <div className="mb-8">
        <div className="h-9 w-48 rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-96 rounded bg-muted/60" />
        <div className="mt-4 h-24 rounded-xl border bg-muted/20" />
        <div className="mt-4 h-20 rounded-xl border bg-muted/20" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="h-3 w-24 rounded bg-muted/60" />
              <div className="mt-2 h-8 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
      {/* Timeline bar */}
      <div className="mb-8 rounded-xl border p-5">
        <div className="mb-4 h-5 w-40 rounded bg-muted" />
        <div className="h-10 w-full rounded-xl bg-muted/60" />
        <div className="mt-2 flex justify-between">
          <div className="h-3 w-16 rounded bg-muted/40" />
          <div className="h-3 w-16 rounded bg-muted/40" />
        </div>
      </div>
      {/* Confidence chart */}
      <div className="mb-8 rounded-xl border p-5">
        <div className="mb-2 h-5 w-44 rounded bg-muted" />
        <div className="h-40 w-full rounded-xl bg-muted/40" />
      </div>
      {/* Table */}
      <div className="rounded-xl border">
        <div className="border-b px-4 py-3">
          <div className="h-5 w-52 rounded bg-muted" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b px-4 py-3 last:border-0">
            <div className="h-4 w-full rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
