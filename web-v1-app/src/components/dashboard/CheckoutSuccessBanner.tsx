"use client";

// src/components/dashboard/CheckoutSuccessBanner.tsx
// Shows a success/cancelled banner when returning from Stripe checkout.
// Reads ?checkout=success|cancelled from the URL and clears it after display.

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function CheckoutSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [banner, setBanner] = useState<"success" | "cancelled" | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      setBanner("success");
    } else if (checkout === "cancelled") {
      setBanner("cancelled");
    }

    // Remove query param from URL without reloading
    if (checkout) {
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

  if (!banner) return null;

  if (banner === "success") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
        <div>
          <div className="text-sm font-bold text-emerald-300">Subscription activated</div>
          <p className="mt-1 text-xs leading-5 text-emerald-200/70">
            Your plan is now active. Create an API key below to start pulling JSON.
            It may take a few seconds for your entitlements to reflect — refresh if needed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
      <div>
        <div className="text-sm font-bold text-amber-300">Checkout cancelled</div>
        <p className="mt-1 text-xs leading-5 text-amber-200/70">
          No charge was made. Return to{" "}
          <a href="/#plans" className="underline hover:text-amber-100">the plans page</a>{" "}
          to try again.
        </p>
      </div>
    </div>
  );
}
