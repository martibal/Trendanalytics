// src/app/chains/loading.tsx
function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`animate-pulse rounded-xl bg-muted/50 ${className}`} />;
}

export default function ChainsIndexLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <SkeletonBlock className="h-10 w-40" />
              <SkeletonBlock className="mt-3 h-4 w-96 max-w-full" />
            </div>

            <div className="flex flex-wrap gap-3">
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
          </div>

          <SkeletonBlock className="h-24 w-full" />
        </div>
      </header>

      <section>
        <div className="mb-4">
          <SkeletonBlock className="h-7 w-40" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SkeletonBlock className="h-64 w-full" />
          <SkeletonBlock className="h-64 w-full" />
          <SkeletonBlock className="h-64 w-full" />
          <SkeletonBlock className="h-64 w-full" />
        </div>
      </section>

      <footer className="mt-10">
        <SkeletonBlock className="h-4 w-96 max-w-full" />
      </footer>
    </main>
  );
}