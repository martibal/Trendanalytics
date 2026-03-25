// src/components/RegimeBadge.test.tsx
import { render, screen } from "@testing-library/react";

import RegimeBadge, { resolveRegimeHex } from "@/components/RegimeBadge";
import { getRegimeColorByLabel, hexToRgba } from "@/lib/design-tokens";

describe("components/RegimeBadge", () => {
  it("renders normalized STABLE badge and matches snapshot", () => {
    const { container } = render(<RegimeBadge label="stable" />);

    const badge = screen.getByLabelText("Regime: STABLE");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("STABLE");
    expect(badge).toHaveAttribute("title", "STABLE");
    expect(container.firstChild).toMatchInlineSnapshot(`
<span
  aria-label="Regime: STABLE"
  class="inline-flex items-center justify-center h-7 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase select-none whitespace-nowrap"
  style="border-color: rgb(0, 255, 136); background-color: rgba(0, 255, 136, 0.15); color: rgb(0, 255, 136); box-shadow: 0 0 0 1px rgba(0, 255, 136, 0.25), 0 0 18px rgba(0, 255, 136, 0.14);"
  title="STABLE"
>
  STABLE
</span>
`);
  });

  it("renders UNKNOWN/DEGRADED for empty label and matches snapshot", () => {
    const { container } = render(<RegimeBadge label="" />);

    const badge = screen.getByLabelText("Regime: UNKNOWN/DEGRADED");

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("UNKNOWN/DEGRADED");
    expect(container.firstChild).toMatchInlineSnapshot(`
<span
  aria-label="Regime: UNKNOWN/DEGRADED"
  class="inline-flex items-center justify-center h-7 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase select-none whitespace-nowrap"
  style="border-color: rgb(107, 114, 128); background-color: rgba(107, 114, 128, 0.15); color: rgb(107, 114, 128); box-shadow: 0 0 0 1px rgba(107, 114, 128, 0.25), 0 0 18px rgba(107, 114, 128, 0.14);"
  title="UNKNOWN/DEGRADED"
>
  UNKNOWN/DEGRADED
</span>
`);
  });

  it("adds pulse class for CONGESTED and honors custom title", () => {
    render(<RegimeBadge label="CONGESTED" title="Custom regime title" />);

    const badge = screen.getByLabelText("Regime: CONGESTED");

    expect(badge).toHaveTextContent("CONGESTED");
    expect(badge).toHaveAttribute("title", "Custom regime title");
    expect(badge.className).toContain("motion-safe:animate-pulse");
  });

  it("uses colorHexOverride ahead of statusColor and label mapping", () => {
    render(
      <RegimeBadge
        label="STABLE"
        statusColor="red"
        colorHexOverride="#123ABC"
      />
    );

    const badge = screen.getByLabelText("Regime: STABLE");

    expect(badge).toHaveStyle({
      borderColor: "#123ABC",
      backgroundColor: hexToRgba("#123ABC", 0.15),
      color: "#123ABC",
      boxShadow: `0 0 0 1px ${hexToRgba("#123ABC", 0.25)}, 0 0 18px ${hexToRgba("#123ABC", 0.14)}`,
    });
  });

  it("uses statusColor mapping when override is absent", () => {
    render(<RegimeBadge label="STABLE" statusColor="red" />);

    const badge = screen.getByLabelText("Regime: STABLE");
    const congestedHex = getRegimeColorByLabel("CONGESTED");

    expect(badge).toHaveStyle({
      borderColor: congestedHex,
      backgroundColor: hexToRgba(congestedHex, 0.15),
      color: congestedHex,
      boxShadow: `0 0 0 1px ${hexToRgba(congestedHex, 0.25)}, 0 0 18px ${hexToRgba(congestedHex, 0.14)}`,
    });
  });

  it("falls back to label mapping when statusColor is invalid", () => {
    render(<RegimeBadge label="CHEAP" statusColor="not-a-real-color" />);

    const badge = screen.getByLabelText("Regime: CHEAP");
    const cheapHex = getRegimeColorByLabel("CHEAP");

    expect(badge).toHaveStyle({
      borderColor: cheapHex,
      backgroundColor: hexToRgba(cheapHex, 0.15),
      color: cheapHex,
      boxShadow: `0 0 0 1px ${hexToRgba(cheapHex, 0.25)}, 0 0 18px ${hexToRgba(cheapHex, 0.14)}`,
    });
  });

  it("normalizes degraded-like variants to UNKNOWN/DEGRADED", () => {
    const variants = [
      "unknown",
      "degraded",
      "UNKNOWN / DEGRADED",
      "unknown_degraded",
      "unknown-degraded",
    ];

    for (const label of variants) {
      const { unmount } = render(<RegimeBadge label={label} />);
      expect(screen.getByLabelText("Regime: UNKNOWN/DEGRADED")).toBeInTheDocument();
      unmount();
    }
  });

  it("resolveRegimeHex enforces the same precedence rules as the component", () => {
    const stableHex = getRegimeColorByLabel("STABLE");
    const heatingHex = getRegimeColorByLabel("HEATING");

    expect(resolveRegimeHex("stable")).toBe(stableHex);
    expect(resolveRegimeHex("stable", "yellow")).toBe(heatingHex);
    expect(resolveRegimeHex("stable", "yellow", "#ABCDEF")).toBe("#ABCDEF");
  });
});