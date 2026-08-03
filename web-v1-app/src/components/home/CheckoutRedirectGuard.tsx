"use client";

import { useEffect } from "react";

function planFromAction(action: string): "basic" | "pro" | null {
  try {
    const url = new URL(action, window.location.origin);
    if (url.pathname !== "/api/v1/checkout") return null;

    const plan = url.searchParams.get("plan");
    if (plan === "basic" || plan === "pro") return plan;
    return null;
  } catch {
    return null;
  }
}

export default function CheckoutRedirectGuard() {
  useEffect(() => {
    function handleSubmit(event: SubmitEvent) {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) return;

      const plan = planFromAction(target.action);
      if (!plan) return;

      event.preventDefault();
      window.location.assign(`/checkout/start?plan=${plan}`);
    }

    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
  }, []);

  return null;
}
