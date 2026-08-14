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
    let lastInfoTrigger: HTMLButtonElement | null = null;

    function restoreInfoTriggerFocus() {
      window.setTimeout(() => lastInfoTrigger?.focus(), 0);
    }

    function handleSubmit(event: SubmitEvent) {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) return;

      const plan = planFromAction(target.action);
      if (!plan) return;

      event.preventDefault();
      window.location.assign(`/checkout/start?plan=${plan}`);
    }

    function handleInfoClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const trigger = target.closest<HTMLButtonElement>(".ua3-info-button");
      if (trigger) {
        lastInfoTrigger = trigger;
        return;
      }

      if (target.closest(".ua3-info-close") && lastInfoTrigger) restoreInfoTriggerFocus();
    }

    function handleInfoEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !lastInfoTrigger) return;
      if (!document.querySelector(".ua3-info-popover")) return;
      restoreInfoTriggerFocus();
    }

    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("click", handleInfoClick, true);
    document.addEventListener("keydown", handleInfoEscape, true);
    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      document.removeEventListener("click", handleInfoClick, true);
      document.removeEventListener("keydown", handleInfoEscape, true);
    };
  }, []);

  return null;
}
