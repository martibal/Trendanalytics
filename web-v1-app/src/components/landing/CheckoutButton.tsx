"use client";

// src/components/landing/CheckoutButton.tsx

import { useState, type FormEvent } from "react";

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setMessage(null);

    if (plan === "history_addon") {
      event.preventDefault();
      setMessage("History add-on checkout is not enabled yet.");
      return;
    }

    setIsSubmitting(true);
  }

  return (
    <form action="/api/v1/checkout" method="post" onSubmit={handleSubmit} className="contents">
      <input type="hidden" name="plan" value={plan} />
      {chain ? <input type="hidden" name="chain" value={chain} /> : null}

      <button
        type="submit"
        className={className}
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Opening checkout…" : children}
      </button>

      {message && <p className="mt-2 text-xs text-slate-400">{message}</p>}
    </form>
  );
}
