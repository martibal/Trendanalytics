// src/app/mobile/plans/page.tsx
import Link from "next/link";
import type { ReactNode } from "react";

import CheckoutButton from "@/components/landing/CheckoutButton";
import {
  MobileCard,
  MobileMetric,
  MobilePage,
  MobilePrimaryLink,
  MobileSection,
} from "@/components/mobile/MobileShell";

const buttonClass =
  "mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[#c49230]/38 bg-[#c49230] px-5 text-[13px] font-black text-[#061322] shadow-[0_18px_44px_rgba(196,146,48,0.20)] transition active:scale-[0.99]";

function Plan({
  name,
  price,
  detail,
  children,
  highlights,
}: {
  name: string;
  price: string;
  detail: string;
  children: ReactNode;
  highlights: string[];
}) {
  return (
    <MobileCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c49230]">
            {name}
          </div>
          <div className="mt-2 text-[31px] font-black leading-none tracking-[-0.06em] text-white">
            {price}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[13px] font-semibold leading-6 text-[#d7e8fb]">{detail}</p>

      <div className="mt-4 grid gap-2">
        {highlights.map((item) => (
          <div key={item} className="rounded-2xl border border-white/10 bg-black/[0.12] px-3 py-2 text-[12px] font-semibold leading-5 text-[#cfe0f4]">
            {item}
          </div>
        ))}
      </div>

      {children}
    </MobileCard>
  );
}

export default function MobilePlansPage() {
  return (
    <MobilePage
      active="plans"
      eyebrow="Mobile plans"
      title={<>Access the same JSON layers shown on the mobile site.</>}
      subtitle={
        <>
          Pricing mirrors the main product: public browsing, one-chain JSON access,
          or full four-chain access. All paid plans include Gold, Derived, Meta and Briefs.
        </>
      }
    >
      <MobileSection>
        <div className="grid grid-cols-3 gap-2">
          <MobileMetric label="Free" value="$0" sub="Browse public context" />
          <MobileMetric label="Single" value="$49" sub="One chain / month" />
          <MobileMetric label="Full" value="$149" sub="All chains / month" />
        </div>
      </MobileSection>

      <MobileSection eyebrow="Plans" title="Choose your access level.">
        <div className="space-y-3">
          <Plan
            name="Free"
            price="$0"
            detail="Public chain context, sample JSON, methodology pages, and track-record browsing."
            highlights={[
              "Public mobile pages",
              "Sample JSON and methodology",
              "No authenticated API delivery",
            ]}
          >
            <MobilePrimaryLink href="/mobile/track-record">Browse public track record</MobilePrimaryLink>
          </Plan>

          <Plan
            name="Single Chain"
            price="$49/mo"
            detail="One blockchain with daily Gold, Derived, Meta, and Briefs JSON."
            highlights={[
              "One chosen chain",
              "Gold, Derived, Meta and Briefs",
              "Built for focused chain-specific workflows",
            ]}
          >
            <CheckoutButton plan="basic" className={buttonClass}>
              Start Single Chain
            </CheckoutButton>
          </Plan>

          <Plan
            name="Full Access"
            price="$149/mo"
            detail="All supported chains: BTC, ETH, ARB and BASE, including cross-chain Briefs."
            highlights={[
              "All four supported chains",
              "Cross-chain context",
              "Best for research workflows",
            ]}
          >
            <CheckoutButton plan="pro" className={buttonClass}>
              Start Full Access
            </CheckoutButton>
          </Plan>
        </div>
      </MobileSection>

      <MobileSection eyebrow="Boundary" title="What this is not.">
        <MobileCard tone="warning">
          <p className="text-[12px] leading-6 text-[#f2dfbd]">
            Urd Atlas is not a signal product. It does not publish price data, forecasts,
            buy/sell language, or portfolio recommendations. Subscription gives access to
            descriptive reference-data JSON and readable Briefs.
          </p>
          <div className="mt-4">
            <Link href="/mobile/api-docs" className="text-[13px] font-black text-[#f5d386] underline decoration-[#c49230]/35 underline-offset-4">
              Read the mobile API reference →
            </Link>
          </div>
        </MobileCard>
      </MobileSection>
    </MobilePage>
  );
}
