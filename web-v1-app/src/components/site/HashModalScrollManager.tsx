"use client";

import { useEffect } from "react";

const MODAL_SCROLL_KEY = "__ua_modal_scroll_y";

function getCurrentPathWithoutHash() {
  return `${window.location.pathname}${window.location.search}`;
}

function getModalTarget(id: string) {
  const target = document.getElementById(id);
  if (!target?.classList.contains("ta-modal")) return null;
  return target;
}

function openModal(id: string) {
  const target = getModalTarget(id);
  if (!target) return false;

  sessionStorage.setItem(MODAL_SCROLL_KEY, String(window.scrollY));

  document.querySelectorAll(".ta-modal.ua-modal-open").forEach((node) => {
    node.classList.remove("ua-modal-open");
  });

  target.classList.add("ua-modal-open");
  history.pushState(null, "", `${getCurrentPathWithoutHash()}#${id}`);

  requestAnimationFrame(() => {
    const rawSaved = sessionStorage.getItem(MODAL_SCROLL_KEY);
    const savedY = rawSaved ? Number(rawSaved) : window.scrollY;
    window.scrollTo({
      top: Number.isFinite(savedY) ? savedY : window.scrollY,
      left: window.scrollX,
      behavior: "auto",
    });
  });

  return true;
}

function closeModal() {
  const currentId = window.location.hash.slice(1);
  if (!currentId || !getModalTarget(currentId)) return false;

  document.querySelectorAll(".ta-modal.ua-modal-open").forEach((node) => {
    node.classList.remove("ua-modal-open");
  });

  const rawSaved = sessionStorage.getItem(MODAL_SCROLL_KEY);
  const savedY = rawSaved ? Number(rawSaved) : window.scrollY;
  history.replaceState(null, "", getCurrentPathWithoutHash());

  requestAnimationFrame(() => {
    window.scrollTo({
      top: Number.isFinite(savedY) ? savedY : window.scrollY,
      left: window.scrollX,
      behavior: "auto",
    });
  });

  return true;
}

export default function HashModalScrollManager() {
  useEffect(() => {
    const initialId = window.location.hash.slice(1);
    if (initialId) {
      getModalTarget(initialId)?.classList.add("ua-modal-open");
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (href === "#") {
        if (!closeModal()) return;
        event.preventDefault();
        return;
      }

      if (!href.startsWith("#")) return;

      const id = href.slice(1);
      if (!id || !getModalTarget(id)) return;

      event.preventDefault();
      openModal(id);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (closeModal()) event.preventDefault();
    };

    const onPopState = () => {
      document.querySelectorAll(".ta-modal.ua-modal-open").forEach((node) => {
        node.classList.remove("ua-modal-open");
      });

      const id = window.location.hash.slice(1);
      if (id) getModalTarget(id)?.classList.add("ua-modal-open");
    };

    document.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .ta-modal.ua-modal-open {
            display: flex !important;
          }
        `,
      }}
    />
  );
}
