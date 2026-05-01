import Link from "next/link";

export default function MobileBottomNav({ active }: { active: string }) {
  const tabs = [
    { key: "overview", label: "Home", href: "/mobile", icon: "◉" },
    { key: "track", label: "Track", href: "/mobile/track-record", icon: "◌" },
    { key: "plans", label: "Plans", href: "/mobile/plans", icon: "$" },
    { key: "wiki", label: "Wiki", href: "/mobile/wiki", icon: "⊞" },
    { key: "desktop", label: "Desktop", href: "/?view=desktop", icon: "↗" },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/8 bg-[#0A0E1A]/98 backdrop-blur-sm pb-safe-bottom">
      <div className="flex">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              active === tab.key ? "text-cyan-400" : "text-slate-500 active:text-slate-300"
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
