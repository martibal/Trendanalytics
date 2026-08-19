import type { HomeChainSnapshot } from "./InteractiveHomeDashboard";

type Props = {
  snapshots: HomeChainSnapshot[];
  lastRun: string;
};

export default function PublicationFreshnessStrip({ snapshots, lastRun }: Props) {
  return (
    <section
      aria-label="Publication freshness"
      className="border-y border-white/10 bg-[#0B2028] text-[#E8F0EF]"
    >
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#9CB1B3]">
            Last successful pipeline run
          </span>
          <strong className="font-mono text-[11px] font-medium text-[#F3F6F5]">{lastRun}</strong>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">
          {snapshots.map((chain) => (
            <div key={chain.id} className="min-w-0">
              <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#9CB1B3]">{chain.ticker}</div>
              <div className="mt-0.5 whitespace-nowrap font-mono text-[10px] text-[#F3F6F5]">
                data through {chain.asOf}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
