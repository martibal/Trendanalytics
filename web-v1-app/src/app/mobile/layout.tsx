import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import PwaRegister from "@/components/mobile/PwaRegister";
import "./mobile.css";

export const metadata: Metadata = {
  title: "Urd Atlas Mobile",
  description: "Mobile-first daily on-chain regime classification for BTC, ETH, ARB, and BASE.",
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
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mobile-shell min-h-screen bg-[#040b14] text-[#f8fbff]">
      {children}
      <PwaRegister />
    </div>
  );
}
