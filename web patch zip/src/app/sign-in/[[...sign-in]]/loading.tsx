// src/app/sign-in/[[...sign-in]]/loading.tsx
export default function SignInLoading() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-6 py-10">
      <section className="grid w-full gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="rounded-2xl border p-8">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-10 w-56 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-4 w-full max-w-md animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-4/5 max-w-sm animate-pulse rounded bg-muted" />

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="h-24 animate-pulse rounded-xl border bg-muted/40" />
            <div className="h-24 animate-pulse rounded-xl border bg-muted/40" />
          </div>

          <div className="mt-6 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        </div>

        <div className="rounded-2xl border p-8">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-6 space-y-4">
            <div className="h-12 animate-pulse rounded-xl border bg-muted/40" />
            <div className="h-12 animate-pulse rounded-xl border bg-muted/40" />
            <div className="h-12 animate-pulse rounded-xl border bg-muted/40" />
          </div>
          <div className="mt-6 h-11 animate-pulse rounded-xl bg-muted" />
          <div className="mt-4 h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </section>
    </main>
  );
}