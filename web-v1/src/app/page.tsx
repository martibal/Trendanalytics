import { ChainsOverview } from "@/components/ChainsOverview";

export default function Page() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Blockchain Trend Overview</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Price-agnostic, descriptive analytics. All charts and statements are observational and fully explainable.
        </p>
      </div>
      <ChainsOverview />
    </main>
  );
}
