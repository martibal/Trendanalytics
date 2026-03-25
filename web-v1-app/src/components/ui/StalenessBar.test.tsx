import React from "react";
import { render, screen } from "@testing-library/react";

import StalenessBar, {
  computeStalenessState,
  getStalenessPolicy,
} from "@/components/ui/StalenessBar";

describe("StalenessBar logic", () => {
  test("bitcoin policy matches locked governance thresholds", () => {
    expect(getStalenessPolicy("bitcoin")).toEqual({
      expected_lag_days: 1,
      soft_warn_lag_days: 2,
      hard_fail_lag_days: 4,
    });
  });

  test("ethereum policy matches locked governance thresholds", () => {
    expect(getStalenessPolicy("ethereum")).toEqual({
      expected_lag_days: 1,
      soft_warn_lag_days: 2,
      hard_fail_lag_days: 4,
    });
  });

  test("arbitrum policy matches locked governance thresholds", () => {
    expect(getStalenessPolicy("arbitrum")).toEqual({
      expected_lag_days: 7,
      soft_warn_lag_days: 10,
      hard_fail_lag_days: 15,
    });
  });

  test("base policy matches locked governance thresholds", () => {
    expect(getStalenessPolicy("base")).toEqual({
      expected_lag_days: 7,
      soft_warn_lag_days: 10,
      hard_fail_lag_days: 15,
    });
  });

  test("returns OK when lag is missing", () => {
    expect(computeStalenessState("bitcoin", undefined)).toBe("OK");
    expect(computeStalenessState("bitcoin", null)).toBe("OK");
  });

  test("returns OK when lag is NaN", () => {
    expect(computeStalenessState("bitcoin", Number.NaN)).toBe("OK");
  });

  test("returns OK at and below expected/soft threshold boundary", () => {
    expect(computeStalenessState("bitcoin", 0)).toBe("OK");
    expect(computeStalenessState("bitcoin", 1)).toBe("OK");
    expect(computeStalenessState("bitcoin", 2)).toBe("OK");
  });

  test("returns WARN only when lag is above soft threshold and not above hard threshold", () => {
    expect(computeStalenessState("bitcoin", 3)).toBe("WARN");
    expect(computeStalenessState("bitcoin", 4)).toBe("WARN");

    expect(computeStalenessState("arbitrum", 11)).toBe("WARN");
    expect(computeStalenessState("arbitrum", 15)).toBe("WARN");
  });

  test("returns FAIL only when lag is above hard threshold", () => {
    expect(computeStalenessState("bitcoin", 5)).toBe("FAIL");
    expect(computeStalenessState("ethereum", 5)).toBe("FAIL");
    expect(computeStalenessState("arbitrum", 16)).toBe("FAIL");
    expect(computeStalenessState("base", 16)).toBe("FAIL");
  });
});

describe("StalenessBar rendering", () => {
  test("does not render for bitcoin when OK and showWhenOk is false", () => {
    const { container } = render(
      <StalenessBar chain="bitcoin" lagDays={1} asOfDate="2026-03-22" />
    );

    expect(container.firstChild).toBeNull();
  });

  test("renders for bitcoin when OK and showWhenOk is true", () => {
    render(
      <StalenessBar
        chain="bitcoin"
        lagDays={1}
        asOfDate="2026-03-22"
        showWhenOk
      />
    );

    expect(screen.getByText(/on schedule/i)).toBeInTheDocument();
    expect(
      screen.getByText(/btc policy:\s*expected 1d · soft 2d · hard 4d/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/data as of/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-03-22/i)).toBeInTheDocument();
    expect(
      screen.getByText(/observed lag:\s*1d\. expected publish lag is ~1 day\(s\)\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/meta\.confidence\.lag_days_vs_utc_today/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/meta\.updated_through/i)).toBeInTheDocument();
  });

  test("renders informational OK banner for arbitrum even when showWhenOk is false", () => {
    render(
      <StalenessBar chain="arbitrum" lagDays={7} asOfDate="2026-03-22" />
    );

    expect(screen.getByText(/on schedule/i)).toBeInTheDocument();
    expect(
      screen.getByText(/arb policy:\s*expected 7d · soft 10d · hard 15d/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /this chain is published with an expected delay of approximately 7 days/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/meta\.confidence\.lag_days_vs_utc_today/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/meta\.updated_through/i)).toBeInTheDocument();
  });

  test("renders WARN state for bitcoin soft staleness", () => {
    const { container } = render(
      <StalenessBar chain="bitcoin" lagDays={3} asOfDate="2026-03-22" />
    );

    expect(screen.getByText(/soft staleness/i)).toBeInTheDocument();
    expect(
      screen.getByText(/updates appear delayed beyond the expected schedule/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/btc policy:\s*expected 1d · soft 2d · hard 4d/i)
    ).toBeInTheDocument();

    expect(container).toHaveTextContent(/data as of\s*2026-03-22/i);
    expect(container).toHaveTextContent(/observed lag\s*3\s*d/i);
  });

  test("renders FAIL state for bitcoin hard staleness", () => {
    const { container } = render(
      <StalenessBar chain="bitcoin" lagDays={5} asOfDate="2026-03-22" />
    );

    expect(screen.getByText(/hard staleness/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /updates appear significantly delayed relative to the expected schedule/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/btc policy:\s*expected 1d · soft 2d · hard 4d/i)
    ).toBeInTheDocument();

    expect(container).toHaveTextContent(/data as of\s*2026-03-22/i);
    expect(container).toHaveTextContent(/observed lag\s*5\s*d/i);
    expect(screen.getByText(/this banner never hides data/i)).toBeInTheDocument();
  });

  test("renders WARN state for arbitrum soft staleness", () => {
    const { container } = render(
      <StalenessBar chain="arbitrum" lagDays={11} asOfDate="2026-03-22" />
    );

    expect(screen.getByText(/soft staleness/i)).toBeInTheDocument();
    expect(
      screen.getByText(/arb policy:\s*expected 7d · soft 10d · hard 15d/i)
    ).toBeInTheDocument();

    expect(container).toHaveTextContent(/data as of\s*2026-03-22/i);
    expect(container).toHaveTextContent(/observed lag\s*11\s*d/i);
  });

  test("renders FAIL state for base hard staleness", () => {
    const { container } = render(
      <StalenessBar chain="base" lagDays={16} asOfDate="2026-03-22" />
    );

    expect(screen.getByText(/hard staleness/i)).toBeInTheDocument();
    expect(
      screen.getByText(/base policy:\s*expected 7d · soft 10d · hard 15d/i)
    ).toBeInTheDocument();

    expect(container).toHaveTextContent(/data as of\s*2026-03-22/i);
    expect(container).toHaveTextContent(/observed lag\s*16\s*d/i);
  });

  test("renders placeholder lag text when lag is unavailable", () => {
    render(
      <StalenessBar chain="arbitrum" lagDays={undefined} asOfDate="2026-03-22" />
    );

    expect(screen.getByText(/on schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/data as of/i)).toBeInTheDocument();
    expect(screen.getByText(/\(observed lag:\s*—\)/i)).toBeInTheDocument();
  });
});