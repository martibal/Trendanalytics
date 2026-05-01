// src/components/ui/WindowSelector.tsx
"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  getDesignTokenHex,
  hexToRgba,
} from "@/lib/design-tokens";

export type WindowOption = {
  key: string;
  label: string;
  href: string;
  disabled?: boolean;
};

export type WindowSelectorProps = {
  options: WindowOption[];
  activeKey: string;
  ariaLabel?: string;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function activeStyle(): CSSProperties {
  const accent = getDesignTokenHex("--color-accent");
  const text = getDesignTokenHex("--color-bg-primary");

  return {
    borderColor: accent,
    backgroundColor: accent,
    color: text,
    boxShadow: `0 0 0 1px ${hexToRgba(accent, 0.22)}, 0 0 18px ${hexToRgba(accent, 0.16)}`,
  };
}

function inactiveStyle(): CSSProperties {
  const border = getDesignTokenHex("--color-border");
  const text = getDesignTokenHex("--color-text-primary");
  const bg = getDesignTokenHex("--color-bg-card");

  return {
    borderColor: border,
    backgroundColor: bg,
    color: text,
  };
}

function disabledStyle(): CSSProperties {
  const border = getDesignTokenHex("--color-border");
  const text = getDesignTokenHex("--color-text-secondary");
  const bg = getDesignTokenHex("--color-bg-card");

  return {
    borderColor: hexToRgba(border, 0.7),
    backgroundColor: hexToRgba(bg, 0.65),
    color: text,
    opacity: 0.55,
  };
}

export default function WindowSelector({
  options,
  activeKey,
  ariaLabel = "Select time window",
  className,
}: WindowSelectorProps) {
  if (!Array.isArray(options) || options.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className={cx("flex flex-wrap items-center gap-2", className)}
    >
      {options.map((option) => {
        const isActive = option.key === activeKey;
        const isDisabled = !!option.disabled;

        const pillClass = cx(
          "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition",
          "select-none whitespace-nowrap",
          isActive && "hover:opacity-95",
          !isActive && !isDisabled && "hover:opacity-90",
          isDisabled && "cursor-not-allowed"
        );

        const style = isDisabled
          ? disabledStyle()
          : isActive
            ? activeStyle()
            : inactiveStyle();

        if (isDisabled) {
          return (
            <span
              key={option.key}
              aria-disabled="true"
              className={pillClass}
              style={style}
              title={`${option.label} unavailable`}
            >
              {option.label}
            </span>
          );
        }

        return (
          <Link
            key={option.key}
            href={option.href}
            aria-current={isActive ? "page" : undefined}
            className={pillClass}
            style={style}
            prefetch={false}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}