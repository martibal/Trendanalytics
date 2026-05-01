// src/app/chains/loading.tsx
export default function ChainsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 animate-pulse">
      <div className="mb-8">
        <div className="h-9 w-48 rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-96 rounded bg-muted/60" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="h-5 w-24 rounded bg-muted" />
            </div>
            <div className="mt-4 h-7 w-28 rounded-full bg-muted" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded bg-muted/60" />
              <div className="h-3 w-3/4 rounded bg-muted/60" />
            </div>
            <div className="mt-4 h-4 w-20 rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
