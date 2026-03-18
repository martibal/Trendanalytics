// src/app/chains/loading.tsx
export default function ChainsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-9 w-44 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-full max-w-3xl animate-pulse rounded bg-muted" />
      </header>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="rounded-2xl border p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="h-6 w-28 animate-pulse rounded bg-muted" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
            </div>

            <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-muted" />

            <div className="mt-5 grid gap-3">
              <div className="h-16 animate-pulse rounded-xl border bg-muted/40" />
              <div className="h-16 animate-pulse rounded-xl border bg-muted/40" />
            </div>

            <div className="mt-5 h-10 animate-pulse rounded-xl bg-muted" />
          </article>
        ))}
      </section>
    </main>
  );
}