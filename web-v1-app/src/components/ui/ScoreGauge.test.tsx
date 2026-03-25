// src/components/ui/ScoreGauge.test.tsx
import { render, screen } from "@testing-library/react";

import ScoreGauge from "@/components/ui/ScoreGauge";
import {
  getDesignTokenHex,
  getRegimeColorByLabel,
  hexToRgba,
} from "@/lib/design-tokens";

describe("components/ui/ScoreGauge", () => {
  it("renders default gauge and matches snapshot", () => {
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

    expect(container.firstChild).toMatchInlineSnapshot(`
<div
  aria-label="Demand score: 72 out of 100"
  class=""
  role="img"
  title="Demand score: 72 out of 100"
>
  <svg
    class="block"
    height="97"
    viewBox="0 0 220 140"
    width="180"
  >
    <defs>
      <lineargradient
        id="scoreGaugeGradient-_r_0_"
        x1="0%"
        x2="100%"
        y1="0%"
        y2="0%"
      >
        <stop
          offset="0%"
          stop-color="#FF4444"
        />
        <stop
          offset="50%"
          stop-color="#FFD700"
        />
        <stop
          offset="100%"
          stop-color="#00FF88"
        />
      </lineargradient>
      <filter
        id="scoreGaugeGlow-_r_0_"
      >
        <fegaussianblur
          result="blur"
          stdDeviation="3"
        />
        <femerge>
          <femergenode
            in="blur"
          />
          <femergenode
            in="SourceGraphic"
          />
        </femerge>
      </filter>
    </defs>
    <path
      d="M 110 40 A 78 78 0 0 0 110 196"
      fill="none"
      stroke="#1E2D3D"
      stroke-linecap="round"
      stroke-width="8"
    />
    <path
      d="M 170.10003293651158 68.28092879960221 A 78 78 0 0 0 110 196"
      fill="none"
      filter="url(#scoreGaugeGlow-_r_0_)"
      stroke="rgba(0, 212, 255, 0.16)"
      stroke-linecap="round"
      stroke-width="12"
    />
    <path
      d="M 170.10003293651158 68.28092879960221 A 78 78 0 0 0 110 196"
      fill="none"
      stroke="url(#scoreGaugeGradient-_r_0_)"
      stroke-linecap="round"
      stroke-width="8"
    />
    <text
      fill="#F1F5F9"
      font-size="26"
      font-weight="700"
      text-anchor="middle"
      x="110"
      y="86"
    >
      72
    </text>
    <text
      fill="#94A3B8"
      font-size="10"
      letter-spacing="1.2"
      text-anchor="middle"
      x="110"
      y="110"
    >
      DEMAND
    </text>
    <text
      fill="#94A3B8"
      font-size="9"
      text-anchor="middle"
      x="110"
      y="126"
    >
      Trend context
    </text>
  </svg>
</div>
`);
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

    expect(screen.getByLabelText("Demand score: 0 out of 100")).toBeInTheDocument();
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
    expect(svg).toHaveAttribute("height", "119");
    expect(svg).toHaveAttribute("viewBox", "0 0 220 140");
  });

  it("uses the expected design-token colors in the svg output", () => {
    const { container } = render(
      <ScoreGauge score={60} label="Demand" note="Context" />
    );

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();

    const html = svg?.outerHTML ?? "";

    expect(html).toContain(`stroke="${getDesignTokenHex("--color-border")}"`);
    expect(html).toContain(`fill="${getDesignTokenHex("--color-text-primary")}"`);
    expect(html).toContain(`fill="${getDesignTokenHex("--color-text-secondary")}"`);
    expect(html).toContain(`stop-color="${getRegimeColorByLabel("CONGESTED")}"`);
    expect(html).toContain(`stop-color="${getRegimeColorByLabel("HEATING")}"`);
    expect(html).toContain(`stop-color="${getRegimeColorByLabel("STABLE")}"`);
    expect(html).toContain(
      `stroke="${hexToRgba(getDesignTokenHex("--color-accent"), 0.16)}"`
    );
  });
});