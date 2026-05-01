"use client";

// src/components/landing/CheckoutButton.tsx
//
// Temporary pre-launch mode:
// - keeps the same button footprint and styling
// - disables all Stripe checkout initiation
// - shows a short message instead of redirecting

import { useState } from "react";

type Plan = "basic" | "pro" | "history_addon";

type CheckoutButtonProps = {
  plan: Plan;
  className?: string;
  children: React.ReactNode;
};

export default function CheckoutButton({ plan, className, children }: CheckoutButtonProps) {
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    void plan;
    setMessage(
      "Payments are temporarily unavailable while business setup is being completed."
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={className}
        aria-disabled="true"
      >
        {children}
      </button>

      {message && (
        <p className="mt-2 text-xs text-slate-400">{message}</p>
      )}
    </>
  );
}
