import Link from "next/link";
import type { DatasetManifest } from "@/lib/dataset";

type DataContractDetailsProps = {
  dataset: DatasetManifest | null;
  dataSource: string;
};

export default function DataContractDetails({ dataset, dataSource }: DataContractDetailsProps) {
  return (
    <section className="mt-10">
      <details className="rounded-3xl border border-white/10 bg-white/4 p-6">
        <summary className="cursor-pointer list-none text-sm font-semibold text-white">
          Published reference data contract details
        </summary>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-sm leading-7 text-slate-300">
              Urd Atlas reads from the published reference data artifacts rather than recomputing the public surface in the UI.
              That keeps the website aligned with the same contract subscribers consume downstream.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/api-docs/schema" className="text-cyan-200 hover:underline">
                Schema docs
              </Link>
              <Link href="/status" className="text-cyan-200 hover:underline">
                System status
              </Link>
              <Link href="/thresholds" className="text-cyan-200 hover:underline">
                Threshold defaults
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-slate-300">
            <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Dataset</div>
            <div className="mt-3 space-y-2">
              <div>
                Revision <span className="font-semibold text-white">{dataset?.version ?? "—"}</span>
              </div>
              <div>
                Published <span className="font-semibold text-white">{dataset?.published_at?.slice(0, 10) ?? "—"}</span>
              </div>
              <div>
                Methodology <span className="font-semibold text-white">{dataset?.methodology_version ?? "—"}</span>
              </div>
              <div>
                Primary provenance fields <span className="font-semibold text-white">date · updated_through · methodology_version · determinism_hash</span>
              </div>
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
