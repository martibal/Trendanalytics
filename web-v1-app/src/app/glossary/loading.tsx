// src/app/glossary/loading.tsx
export default function GlossaryLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 animate-pulse">
      <div className="mb-8">
        <div className="h-9 w-40 rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-80 rounded bg-muted/60" />
      </div>
      {/* Filter skeleton */}
      <div className="mb-6 rounded-2xl border p-5">
        <div className="h-5 w-36 rounded bg-muted" />
        <div className="mt-4 grid gap-4 md:grid-cols-[1.6fr_0.8fr]">
          <div className="h-10 rounded-lg bg-muted/60" />
          <div className="h-10 rounded-lg bg-muted/60" />
        </div>
      </div>
      {/* Entry skeletons */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="mb-3 rounded-xl border px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-5 w-5 rounded bg-muted/40" />
          </div>
          <div className="mt-1 h-3 w-32 rounded bg-muted/40" />
        </div>
      ))}
    </div>
  );
}
