"use client";

import { useEffect } from "react";

const MODAL_SCROLL_KEY = "__ua_modal_scroll_y";

function getCurrentPathWithoutHash() {
  return `${window.location.pathname}${window.location.search}`;
}

function isModalTarget(id: string) {
  const target = document.getElementById(id);
  return Boolean(target?.classList.contains("ta-modal"));
}

export default function HashModalScrollManager() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (href === "#") {
        if (!window.location.hash) return;
        const currentId = window.location.hash.slice(1);
        if (!currentId || !isModalTarget(currentId)) return;

        event.preventDefault();
        const rawSaved = sessionStorage.getItem(MODAL_SCROLL_KEY);
        const savedY = rawSaved ? Number(rawSaved) : window.scrollY;
        history.replaceState(null, "", getCurrentPathWithoutHash());
        requestAnimationFrame(() => {
          window.scrollTo({ top: Number.isFinite(savedY) ? savedY : window.scrollY, left: window.scrollX, behavior: "auto" });
        });
        return;
      }

      if (!href.startsWith("#")) return;

      const id = href.slice(1);
      if (!id || !isModalTarget(id)) return;

      event.preventDefault();
      sessionStorage.setItem(MODAL_SCROLL_KEY, String(window.scrollY));
      history.pushState(null, "", `${getCurrentPathWithoutHash()}#${id}`);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const currentId = window.location.hash.slice(1);
      if (!currentId || !isModalTarget(currentId)) return;

      const rawSaved = sessionStorage.getItem(MODAL_SCROLL_KEY);
      const savedY = rawSaved ? Number(rawSaved) : window.scrollY;
      history.replaceState(null, "", getCurrentPathWithoutHash());
      requestAnimationFrame(() => {
        window.scrollTo({ top: Number.isFinite(savedY) ? savedY : window.scrollY, left: window.scrollX, behavior: "auto" });
      });
    };

    document.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
