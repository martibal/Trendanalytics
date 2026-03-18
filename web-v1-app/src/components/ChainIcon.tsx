// src/components/ChainIcon.tsx
import type { CSSProperties } from "react";
import type { ChainId } from "@/config/chains";
import { getChainAccentColor, hexToRgba } from "@/lib/design-tokens";

export type ChainIconProps = {
  chain: ChainId;
  className?: string;
  label?: string;
};

function iconForChain(chain: ChainId) {
  switch (chain) {
    case "bitcoin":
      return "₿";
    case "ethereum":
      return "◆";
    case "arbitrum":
      return "▲";
    case "base":
      return "◼";
    default:
      return "•";
  }
}

function buildStyleForChain(chain: ChainId): CSSProperties {
  const accent = getChainAccentColor(chain);

  return {
    color: accent,
    borderColor: hexToRgba(accent, 0.28),
    backgroundColor: hexToRgba(accent, 0.10),
    boxShadow: `0 0 0 1px ${hexToRgba(accent, 0.10)}, 0 0 14px ${hexToRgba(
      accent,
      0.10
    )}`,
  };
}

export default function ChainIcon(props: ChainIconProps) {
  const { chain, className, label } = props;

  const icon = iconForChain(chain);
  const style = buildStyleForChain(chain);

  return (
    <span
      aria-label={label ?? `${chain} icon`}
      title={label ?? chain}
      style={style}
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
        "select-none",
        className ?? "",
      ].join(" ")}
    >
      <span aria-hidden="true">{icon}</span>
    </span>
  );
}