// src/components/mobile/MobileBottomNav.tsx
import Link from "next/link";

const TABS = [
  { key: "overview", label: "Home", href: "/mobile" },
  { key: "btc", label: "BTC", href: "/mobile/chain/bitcoin" },
  { key: "eth", label: "ETH", href: "/mobile/chain/ethereum" },
  { key: "arb", label: "ARB", href: "/mobile/chain/arbitrum" },
  { key: "base", label: "BASE", href: "/mobile/chain/base" },
  { key: "plans", label: "Plans", href: "/mobile/plans" },
  { key: "dashboard", label: "Dash", href: "/mobile/dashboard" },
] as const;

export default function MobileBottomNav({ active = "overview" }: { active?: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-sky-100/10 bg-[#040b14]/82 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-22px_64px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={[
                "inline-flex min-h-11 min-w-[64px] flex-0 shrink-0 items-center justify-center rounded-2xl border px-3 text-[11px] font-black transition active:scale-[0.98]",
                isActive
                  ? "border-orange-300/38 bg-gradient-to-b from-[#ffae63] to-[#ff7d2f] text-[#09111d] shadow-[0_12px_32px_rgba(255,125,47,0.22)]"
                  : "border-sky-100/14 bg-white/[0.075] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
