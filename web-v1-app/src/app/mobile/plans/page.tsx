// src/app/mobile/plans/page.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import CheckoutButton from "@/components/landing/CheckoutButton";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileRouteMenu from "@/components/mobile/MobileRouteMenu";

const buttonClass =
  "mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-b from-[#ffae63] to-[#ff7d2f] px-5 text-[13px] font-black text-[#09111d] shadow-[0_16px_38px_rgba(255,125,47,0.22)] transition active:scale-[0.99]";

function Plan({
  name,
  price,
  detail,
  children,
}: {
  name: string;
  price: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-sky-100/14 bg-white/[0.075] p-5 shadow-[0_22px_64px_rgba(0,0,0,0.20),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-200">{name}</div>
          <div className="mt-2 text-[30px] font-black tracking-[-0.06em] text-white">{price}</div>
        </div>
      </div>
      <p className="mt-3 text-[13px] font-semibold leading-6 text-slate-300">{detail}</p>
      {children}
    </section>
  );
}

export default function MobilePlansPage() {
  return (
    <div className="min-h-screen bg-[#040b14] text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_18%_-5%,rgba(126,208,255,0.20),transparent_18rem),radial-gradient(circle_at_92%_8%,rgba(255,154,74,0.12),transparent_16rem),linear-gradient(180deg,#040b14_0%,#071425_100%)] pb-28">
        <header className="px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
          <div className="flex items-center justify-between gap-3">
            <Link href="/mobile" className="text-[20px] font-black tracking-[-0.04em] text-white">
              Urd Atlas
            </Link>
            <MobileRouteMenu />
          </div>

          <div className="mt-8">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-200">Subscriber plans</div>
            <h1 className="mt-2 text-[36px] font-black leading-none tracking-[-0.07em] text-white">
              Choose access level.
            </h1>
            <p className="mt-3 max-w-md text-[14px] font-semibold leading-6 text-slate-300">
              Three active options: free public browsing, one-chain JSON access, or full four-chain JSON access.
            </p>
          </div>
        </header>

        <main className="space-y-4 px-4 py-5">
          <Plan
            name="Free"
            price="$0"
            detail="Public historical charts and mobile browsing. No authenticated JSON delivery."
          >
            <Link href="/mobile/track-record" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-sky-100/14 bg-white/[0.07] px-5 text-[13px] font-black text-slate-100">
              Browse public track record
            </Link>
          </Plan>

          <Plan
            name="Single Chain"
            price="$49/mo"
            detail="One blockchain. Gold, Derived and Meta JSON. Built for users who want one chain in their own workflow."
          >
            <CheckoutButton plan="basic" className={buttonClass}>
              Start Single Chain
            </CheckoutButton>
          </Plan>

          <Plan
            name="Full Access"
            price="$149/mo"
            detail="All supported chains: BTC, ETH, ARB and BASE. Full daily JSON access across Gold, Derived and Meta."
          >
            <CheckoutButton plan="pro" className={buttonClass}>
              Start Full Access
            </CheckoutButton>
          </Plan>

          <div className="rounded-2xl border border-orange-200/16 bg-orange-300/8 px-4 py-3 text-[12px] font-semibold leading-5 text-orange-50/90">
            The separate full-history package is not shown on mobile because it is not an active offer.
          </div>
        </main>

        <MobileBottomNav active="plans" />
      </div>
    </div>
  );
}
