"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cx, urd } from "./UrdDesignSystem";

function currentHash() {
  if (typeof window === "undefined") return "";
  return window.location.hash.replace(/^#/, "");
}

export function UrdHashModalTrigger({
  id,
  children = "More",
  className,
}: {
  id: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cx(urd.lightButton, className)}
      onClick={() => {
        const next = "#" + id;
        if (window.location.hash === next) {
          window.dispatchEvent(new HashChangeEvent("hashchange"));
          return;
        }
        window.history.pushState(null, "", next);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }}
    >
      {children}
    </button>
  );
}

export function UrdHashModal({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    const update = () => setActiveHash(currentHash());
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  const open = activeHash === id;

  return (
    <div
      id={id}
      className={cx(
        open ? "flex" : "hidden",
        "fixed inset-0 z-[180] items-center justify-center p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function UrdHashModalClose({
  children,
  className,
  ariaLabel = "Close dialog",
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      onClick={() => {
        const { pathname, search } = window.location;
        window.history.pushState(null, "", `${pathname}${search}`);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }}
    >
      {children}
    </button>
  );
}
