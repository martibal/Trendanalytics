// src/components/RegimeBadge.test.tsx
import { render, screen } from "@testing-library/react";

import RegimeBadge, { resolveRegimeHex } from "@/components/RegimeBadge";
import { getRegimeColorByLabel } from "@/lib/design-tokens";

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
  class="regime-token"
  style="color: rgb(16, 185, 129); border-bottom-color: rgb(16, 185, 129);"
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
    expect(badge).toHaveAttribute("title", "UNKNOWN/DEGRADED");
    expect(container.firstChild).toMatchInlineSnapshot(`
<span
  aria-label="Regime: UNKNOWN/DEGRADED"
  class="regime-token"
  style="color: rgb(82, 94, 110); border-bottom-color: rgb(82, 94, 110);"
  title="UNKNOWN/DEGRADED"
>
  UNKNOWN/DEGRADED
</span>
`);
  });

  it("honors custom title and preserves token class for CONGESTED", () => {
    render(<RegimeBadge label="CONGESTED" title="Custom regime title" />);

    const badge = screen.getByLabelText("Regime: CONGESTED");

    expect(badge).toHaveTextContent("CONGESTED");
    expect(badge).toHaveAttribute("title", "Custom regime title");
    expect(badge.className).toBe("regime-token");
  });

  it("merges custom className after the token class", () => {
    render(<RegimeBadge label="STABLE" className="extra-class" />);

    const badge = screen.getByLabelText("Regime: STABLE");

    expect(badge.className).toBe("regime-token extra-class");
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
      color: "#123ABC",
      borderBottomColor: "#123ABC",
    });
  });

  it("uses statusColor mapping when override is absent", () => {
    render(<RegimeBadge label="STABLE" statusColor="red" />);

    const badge = screen.getByLabelText("Regime: STABLE");
    const congestedHex = getRegimeColorByLabel("CONGESTED");

    expect(badge).toHaveStyle({
      color: congestedHex,
      borderBottomColor: congestedHex,
    });
  });

  it("falls back to label mapping when statusColor is invalid", () => {
    render(<RegimeBadge label="CHEAP" statusColor="not-a-real-color" />);

    const badge = screen.getByLabelText("Regime: CHEAP");
    const cheapHex = getRegimeColorByLabel("CHEAP");

    expect(badge).toHaveStyle({
      color: cheapHex,
      borderBottomColor: cheapHex,
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