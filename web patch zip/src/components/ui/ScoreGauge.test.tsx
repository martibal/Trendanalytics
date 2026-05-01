
import { render, screen } from "@testing-library/react";

import ScoreGauge from "@/components/ui/ScoreGauge";
import {
  getDesignTokenHex,
  getRegimeColorByLabel,
  hexToRgba,
} from "@/lib/design-tokens";

describe("components/ui/ScoreGauge", () => {
  it("renders default gauge semantics", () => {
    const { container } = render(
      <ScoreGauge score={72} label="Demand" note="Trend context" />
    );

    const gauge = screen.getByLabelText("Demand score: 72 out of 100");

    expect(gauge).toBeInTheDocument();
    expect(gauge).toHaveAttribute("role", "img");
    expect(gauge).toHaveAttribute("title", "Demand score: 72 out of 100");
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("DEMAND")).toBeInTheDocument();
    expect(screen.getByText("Trend context")).toBeInTheDocument();

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("viewBox", "0 0 220 140");
  });

  it("clamps score below 0 to zero", () => {
    render(<ScoreGauge score={-25} label="Capacity" />);

    const gauge = screen.getByLabelText("Capacity score: 0 out of 100");

    expect(gauge).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("CAPACITY")).toBeInTheDocument();
  });

  it("clamps score above 100 to one hundred", () => {
    render(<ScoreGauge score={130} label="Friction" />);

    const gauge = screen.getByLabelText("Friction score: 100 out of 100");

    expect(gauge).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("FRICTION")).toBeInTheDocument();
  });

  it("uses zero for non-finite score", () => {
    render(<ScoreGauge score={Number.NaN} label="Demand" />);

    expect(
      screen.getByLabelText("Demand score: 0 out of 100")
    ).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("uses custom title and className when provided", () => {
    render(
      <ScoreGauge
        score={55}
        label="Demand"
        className="custom-gauge"
        title="Custom gauge title"
      />
    );

    const gauge = screen.getByLabelText("Demand score: 55 out of 100");

    expect(gauge).toHaveAttribute("title", "Custom gauge title");
    expect(gauge).toHaveClass("custom-gauge");
  });

  it("scales width and height from widthPx", () => {
    const { container } = render(
      <ScoreGauge score={40} label="Demand" widthPx={220} />
    );

    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("width", "220");
    expect(svg).toHaveAttribute("height", "140");
    expect(svg).toHaveAttribute("viewBox", "0 0 220 140");
  });

  it("uses the expected gradient, text, and accent colors in the svg output", () => {
    const { container } = render(
      <ScoreGauge score={60} label="Demand" note="Context" />
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();

    const html = svg?.outerHTML ?? "";

    expect(html).toContain(`fill="${getDesignTokenHex("--color-text-primary")}"`);
    expect(html).toContain(`fill="${getDesignTokenHex("--color-text-secondary")}"`);
    expect(html).toContain(`stop-color="${getRegimeColorByLabel("CONGESTED")}"`);
    expect(html).toContain(`stop-color="${getRegimeColorByLabel("HEATING")}"`);
    expect(html).toContain(`stop-color="${getRegimeColorByLabel("STABLE")}"`);

    const accent16 = hexToRgba(getDesignTokenHex("--color-accent"), 0.16);
    const accent18 = hexToRgba(getDesignTokenHex("--color-accent"), 0.18);

    expect(
      html.includes(`stroke="${accent16}"`) || html.includes(`stroke="${accent18}"`)
    ).toBe(true);
  });
});
