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
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#184066]/40 bg-[#031329]/98 shadow-[0_-12px_32px_rgba(3,19,41,0.22)] backdrop-blur-md pb-safe-bottom">
      <div className="flex">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              active === tab.key ? "text-[#9fe8ff]" : "text-[#d8e9ff]/70 active:text-white"
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
