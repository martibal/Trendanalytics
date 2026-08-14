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

function modalFocusableElements(modal: HTMLElement): HTMLElement[] {
  return Array.from(
    modal.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
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

    function containModalFocus(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      const modal = document.querySelector<HTMLElement>('.ua3-modal[role="dialog"][aria-modal="true"]');
      if (!modal) return;

      const focusable = modalFocusableElements(modal);
      if (focusable.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !modal.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !modal.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("keydown", containModalFocus);
    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      document.removeEventListener("keydown", containModalFocus);
    };
  }, []);

  return null;
}
