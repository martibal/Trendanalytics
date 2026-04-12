"use client";

// src/components/landing/CheckoutButton.tsx
//
// Handles the full checkout initiation flow:
//  1. If Clerk not configured or user not signed in → redirect to /sign-up
//  2. If Basic plan → show chain selector modal first
//  3. POST to /api/v1/checkout with { plan, chain? }
//  4. Redirect to Stripe checkout URL
//
// Safe when Clerk keys are missing (local dev without auth configured).

import { useState, useEffect } from "react";

type Plan = "basic" | "pro" | "history_addon";
type ChainId = "bitcoin" | "ethereum" | "arbitrum" | "base";

const CHAINS: { id: ChainId; label: string; name: string }[] = [
  { id: "bitcoin",  label: "BTC",  name: "Bitcoin" },
  { id: "ethereum", label: "ETH",  name: "Ethereum" },
  { id: "arbitrum", label: "ARB",  name: "Arbitrum" },
  { id: "base",     label: "BASE", name: "Base" },
];

const HAS_CLERK = Boolean(
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

type CheckoutButtonProps = {
  plan: Plan;
  className?: string;
  children: React.ReactNode;
};

export default function CheckoutButton({ plan, className, children }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainId | null>(null);

  // Check sign-in status by calling /api/v1/checkout with no body —
  // a 401 means not signed in, avoiding a direct Clerk hook dependency
  // so the component is safe without ClerkProvider.
  async function startCheckout(chain?: ChainId) {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = { plan };
      if (chain) body.chain = chain;

      const res = await fetch("/api/v1/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json() as {
        checkoutUrl?: string;
        message?: string;
        code?: string;
      };

      if (res.status === 401 || data.code === "unauthenticated") {
        // Not signed in — send to sign-up then back to plans
        window.location.href = "/sign-up?redirect_url=/#plans";
        return;
      }

      if (!res.ok || !data.checkoutUrl) {
        setError(data.message ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  function handleClick() {
    if (plan === "basic") {
      setShowChainPicker(true);
      return;
    }
    void startCheckout();
  }

  function handleChainConfirm() {
    if (!selectedChain) return;
    setShowChainPicker(false);
    void startCheckout(selectedChain);
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? "Redirecting…" : children}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {/* Chain picker modal — Basic plan only */}
      {showChainPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a1020] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Choose your chain</h3>
            <p className="mt-1.5 text-xs leading-5 text-slate-400">
              Basic includes one chain. Upgrade to Pro at any time to access all four.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {CHAINS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChain(c.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    selectedChain === c.id
                      ? "border-cyan-500/60 bg-cyan-500/15 text-white"
                      : "border-white/8 bg-white/3 text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="text-[11px] font-black tracking-widest text-cyan-400">{c.label}</div>
                  <div className="mt-0.5 text-[12px] font-medium">{c.name}</div>
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={handleChainConfirm}
                disabled={!selectedChain || loading}
                className="flex-1 rounded-full bg-cyan-500 py-2.5 text-sm font-black text-[#040a12] disabled:opacity-40 hover:bg-cyan-400 transition"
              >
                {loading ? "Redirecting…" : "Continue to checkout →"}
              </button>
              <button
                onClick={() => { setShowChainPicker(false); setSelectedChain(null); }}
                className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
            </div>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
