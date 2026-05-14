// src/components/mobile/MobileRouteMenu.tsx
import Link from "next/link";

const CHAIN_LINKS = [
  { href: "/mobile/chain/bitcoin", label: "BTC · Bitcoin" },
  { href: "/mobile/chain/ethereum", label: "ETH · Ethereum" },
  { href: "/mobile/chain/arbitrum", label: "ARB · Arbitrum" },
  { href: "/mobile/chain/base", label: "BASE · Base" },
] as const;

const MOBILE_LINKS = [
  { href: "/mobile", label: "Landing" },
  { href: "/mobile/plans", label: "Plans" },
  { href: "/mobile/dashboard", label: "Dashboard" },
  { href: "/mobile/api-docs", label: "JSON/API" },
  { href: "/mobile/methodology", label: "Methodology" },
  { href: "/mobile/wiki", label: "Terms" },
  { href: "/mobile/track-record", label: "Track record" },
] as const;

export default function MobileRouteMenu() {
  return (
    <details className="relative z-40">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center justify-center rounded-full border border-sky-200/18 bg-white/[0.075] px-3 text-[12px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-md transition active:scale-[0.98] [&::-webkit-details-marker]:hidden">
        Menu
      </summary>

      <div className="absolute right-0 top-11 z-50 w-[250px] overflow-hidden rounded-2xl border border-sky-100/20 bg-[#071426]/96 shadow-[0_28px_90px_rgba(0,0,0,0.46)] backdrop-blur-xl">
        <div className="border-b border-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-200/80">
          Mobile pages
        </div>

        <div className="grid p-2">
          {MOBILE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-10 items-center justify-between rounded-xl px-3 text-[13px] font-black text-slate-100 transition active:bg-white/10"
            >
              {item.label}
              <span className="text-sky-300">→</span>
            </Link>
          ))}
        </div>

        <div className="border-y border-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-200/80">
          Chains
        </div>

        <div className="grid p-2">
          {CHAIN_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-10 items-center justify-between rounded-xl px-3 text-[13px] font-black text-slate-100 transition active:bg-white/10"
            >
              {item.label}
              <span className="text-sky-300">→</span>
            </Link>
          ))}
        </div>
      </div>
    </details>
  );
}
