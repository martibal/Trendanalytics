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

function getOpenJsonModal(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.ua3-modal[role="dialog"][aria-modal="true"]');
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
    document.documentElement.dataset.modalFocusGuard = "ready";

    function handleSubmit(event: SubmitEvent) {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) return;

      const plan = planFromAction(target.action);
      if (!plan) return;

      event.preventDefault();
      window.location.assign(`/checkout/start?plan=${plan}`);
    }

    function containModalTab(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      const modal = getOpenJsonModal();
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

    function containModalFocus(event: FocusEvent) {
      const modal = getOpenJsonModal();
      const target = event.target;
      if (!modal || !(target instanceof Node) || modal.contains(target)) return;

      const focusable = modalFocusableElements(modal);
      (focusable[0] ?? modal).focus();
    }

    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("keydown", containModalTab, true);
    document.addEventListener("focusin", containModalFocus, true);
    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("keydown", containModalTab, true);
      document.removeEventListener("focusin", containModalFocus, true);
      delete document.documentElement.dataset.modalFocusGuard;
    };
  }, []);

  return null;
}
