"use client";

// src/components/landing/CheckoutButton.tsx

import { useState } from "react";

type Plan = "basic" | "pro" | "history_addon";
type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";

type CheckoutButtonProps = {
  plan: Plan;
  chain?: Chain;
  className?: string;
  children: React.ReactNode;
};

export default function CheckoutButton({
  plan,
  chain,
  className,
  children,
}: CheckoutButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setMessage(null);

    if (plan === "history_addon") {
      setMessage("History add-on checkout is not enabled yet.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ plan, chain }),
      });

      const payload = (await response.json().catch(() => null)) as {
        url?: string;
        message?: string;
        detail?: string | null;
      } | null;

      if (response.status === 401 && payload?.detail) {
        window.location.assign(payload.detail);
        return;
      }

      if (!response.ok || !payload?.url) {
        setMessage(payload?.message ?? "Could not start checkout.");
        setIsSubmitting(false);
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setMessage("Could not start checkout. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={className}
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Opening checkout…" : children}
      </button>

      {message && <p className="mt-2 text-xs text-slate-400">{message}</p>}
    </>
  );
}
