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

function focusLabel(element: Element | null): string {
  if (!(element instanceof HTMLElement)) return "none";
  const text = element.textContent?.trim().replace(/\s+/g, " ").slice(0, 40) || "";
  return `${element.tagName.toLowerCase()}:${text}`;
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
      if (!modal) {
        document.documentElement.dataset.modalFocusDebug = "tab:no-modal";
        return;
      }

      const focusable = modalFocusableElements(modal);
      const active = document.activeElement;
      document.documentElement.dataset.modalFocusDebug = `tab:active=${focusLabel(active)};first=${focusLabel(focusable[0] ?? null)};last=${focusLabel(focusable[focusable.length - 1] ?? null)};shift=${event.shiftKey}`;

      if (focusable.length === 0) {
        event.preventDefault();
        modal.focus();
        document.documentElement.dataset.modalFocusDebugResult = `empty->${focusLabel(document.activeElement)}`;
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && (active === first || !modal.contains(active))) {
        event.preventDefault();
        last.focus();
        document.documentElement.dataset.modalFocusDebugResult = `wrap-back->${focusLabel(document.activeElement)}`;
      } else if (!event.shiftKey && (active === last || !modal.contains(active))) {
        event.preventDefault();
        first.focus();
        document.documentElement.dataset.modalFocusDebugResult = `wrap-forward->${focusLabel(document.activeElement)}`;
      } else {
        document.documentElement.dataset.modalFocusDebugResult = "native-tab";
      }
    }

    function containModalFocus(event: FocusEvent) {
      const modal = getOpenJsonModal();
      const target = event.target;
      if (!modal || !(target instanceof Node) || modal.contains(target)) return;

      const focusable = modalFocusableElements(modal);
      (focusable[0] ?? modal).focus();
      document.documentElement.dataset.modalFocusDebugFocusin = `${focusLabel(target instanceof Element ? target : null)}->${focusLabel(document.activeElement)}`;
    }

    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("keydown", containModalTab, true);
    document.addEventListener("focusin", containModalFocus, true);
    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("keydown", containModalTab, true);
      document.removeEventListener("focusin", containModalFocus, true);
      delete document.documentElement.dataset.modalFocusGuard;
      delete document.documentElement.dataset.modalFocusDebug;
      delete document.documentElement.dataset.modalFocusDebugResult;
      delete document.documentElement.dataset.modalFocusDebugFocusin;
    };
  }, []);

  return null;
}
