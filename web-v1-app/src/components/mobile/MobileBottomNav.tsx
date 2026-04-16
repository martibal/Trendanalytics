import Link from "next/link";

export default function MobileBottomNav({ active }: { active: string }) {
  const tabs = [
    { key: "overview", label: "Overview", href: "/mobile", icon: "◉" },
    { key: "btc", label: "BTC", href: "/mobile/chain/bitcoin", icon: "₿" },
    { key: "eth", label: "ETH", href: "/mobile/chain/ethereum", icon: "Ξ" },
    { key: "l2", label: "L2s", href: "/mobile/chain/arbitrum", icon: "⬡" },
    { key: "wiki", label: "Wiki", href: "/mobile/wiki", icon: "⊞" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/8 bg-[#0A0E1A]/98 backdrop-blur-sm pb-safe-bottom">
      <div className="flex">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              active === tab.key
                ? "text-cyan-400"
                : "text-slate-500 active:text-slate-300"
            }`}
          >
            <span className="text-sm leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}