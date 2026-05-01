// src/app/about/loading.tsx
export default function AboutLoading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-9 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-full max-w-3xl animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-5/6 max-w-2xl animate-pulse rounded bg-muted" />
      </header>

      <section className="space-y-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <section key={index} className="rounded-2xl border p-6">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-muted" />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="h-24 animate-pulse rounded-xl border bg-muted/40" />
              <div className="h-24 animate-pulse rounded-xl border bg-muted/40" />
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}