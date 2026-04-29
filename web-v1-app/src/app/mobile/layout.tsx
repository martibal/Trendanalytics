import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import PwaRegister from "@/components/mobile/PwaRegister";
import "./mobile.css";

export const metadata: Metadata = {
  title: "Urd Atlas Mobile",
  description: "Daily on-chain regime classification for BTC, ETH, ARB, and BASE",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Urd Atlas",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mobile-shell min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      {children}
      <PwaRegister />
    </div>
  );
}
