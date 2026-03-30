
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

  test("returns UNKNOWN when lag is missing", () => {
    expect(computeStalenessState("bitcoin", undefined)).toBe("UNKNOWN");
    expect(computeStalenessState("bitcoin", null)).toBe("UNKNOWN");
  });

  test("returns UNKNOWN when lag is NaN", () => {
    expect(computeStalenessState("bitcoin", Number.NaN)).toBe("UNKNOWN");
  });

  test("returns DEGRADED when confidence is below 0.40", () => {
    expect(computeStalenessState("bitcoin", 1, 0.39)).toBe("DEGRADED");
    expect(computeStalenessState("arbitrum", 7, 0.1)).toBe("DEGRADED");
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
    const { container } = render(
      <StalenessBar
        chain="bitcoin"
        lagDays={1}
        asOfDate="2026-03-22"
        showWhenOk
      />
    );

    expect(screen.getByText(/^On schedule$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/btc policy:\s*expected 1d · soft 2d · hard 4d/i)
    ).toBeInTheDocument();

    expect(container).toHaveTextContent(/data as of\s*2026-03-22/i);
    expect(container).toHaveTextContent(/observed lag\s*1d/i);
    expect(container).toHaveTextContent(
      /observed lag is 1d\..*normal publication policy is approximately 1 day\(s\).*inside expected schedule/i
    );
  });

  test("renders informational OK banner for arbitrum even when showWhenOk is false", () => {
    const { container } = render(
      <StalenessBar chain="arbitrum" lagDays={7} asOfDate="2026-03-22" />
    );

    expect(screen.getByText(/^On schedule$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/arb policy:\s*expected 7d · soft 10d · hard 15d/i)
    ).toBeInTheDocument();

    expect(container).toHaveTextContent(
      /intentionally published on a slower cadence than btc and eth/i
    );
    expect(container).toHaveTextContent(
      /observed lag around 7 days is part of the normal publication policy/i
    );
    expect(container).toHaveTextContent(/observed lag in the current row:\s*7d/i);
    expect(container).toHaveTextContent(/data as of\s*2026-03-22/i);
    expect(container).toHaveTextContent(/observed lag\s*7d/i);
  });

  test("renders WARN state for bitcoin soft staleness", () => {
    const { container } = render(
      <StalenessBar chain="bitcoin" lagDays={3} asOfDate="2026-03-22" />
    );

    expect(screen.getByText(/^Soft staleness$/i)).toBeInTheDocument();
    expect(screen.getByText(/published data appears delayed/i)).toBeInTheDocument();
    expect(
      screen.getByText(/btc policy:\s*expected 1d · soft 2d · hard 4d/i)
    ).toBeInTheDocument();

    expect(container).toHaveTextContent(/data as of\s*2026-03-22/i);
    expect(container).toHaveTextContent(/observed lag\s*3d/i);
    expect(container).toHaveTextContent(
      /observed lag is above the chain.s usual publication policy but not yet beyond the hard-fail boundary/i
    );
  });

  test("renders FAIL state for bitcoin hard staleness", () => {
    const { container } = render(
      <StalenessBar chain="bitcoin" lagDays={5} asOfDate="2026-03-22" />
    );

    expect(screen.getByText(/^Hard staleness$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/published data appears materially delayed/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/btc policy:\s*expected 1d · soft 2d · hard 4d/i)
    ).toBeInTheDocument();

    expect(container).toHaveTextContent(/data as of\s*2026-03-22/i);
    expect(container).toHaveTextContent(/observed lag\s*5d/i);
    expect(container).toHaveTextContent(
      /freshness is now outside the hard-fail boundary/i
    );
  });

  test("renders WARN state for arbitrum soft staleness", () => {
    const { container } = render(
      <StalenessBar chain="arbitrum" lagDays={11} asOfDate="2026-03-22" />
    );

    expect(screen.getByText(/^Soft staleness$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/arb policy:\s*expected 7d · soft 10d · hard 15d/i)
    ).toBeInTheDocument();

    expect(container).toHaveTextContent(/data as of\s*2026-03-22/i);
    expect(container).toHaveTextContent(/observed lag\s*11d/i);
  });

  test("renders FAIL state for base hard staleness", () => {
    const { container } = render(
      <StalenessBar chain="base" lagDays={16} asOfDate="2026-03-22" />
    );

    expect(screen.getByText(/^Hard staleness$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/base policy:\s*expected 7d · soft 10d · hard 15d/i)
    ).toBeInTheDocument();

    expect(container).toHaveTextContent(/data as of\s*2026-03-22/i);
    expect(container).toHaveTextContent(/observed lag\s*16d/i);
  });

  test("renders UNKNOWN state when lag is unavailable", () => {
    const { container } = render(
      <StalenessBar
        chain="arbitrum"
        lagDays={undefined}
        asOfDate="2026-03-22"
      />
    );

    expect(screen.getByText(/^Freshness unknown$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/freshness could not be classified/i)
    ).toBeInTheDocument();
    expect(container).toHaveTextContent(/data as of\s*2026-03-22/i);
    expect(container).toHaveTextContent(/observed lag\s*—/i);
  });

  test("renders DEGRADED state when confidence is below threshold", () => {
    const { container } = render(
      <StalenessBar
        chain="bitcoin"
        lagDays={1}
        asOfDate="2026-03-22"
        confidenceScore={0.39}
      />
    );

    expect(screen.getByText(/^Unknown \/ degraded$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/published state should be treated as degraded/i)
    ).toBeInTheDocument();
    expect(container).toHaveTextContent(
      /confidence is below the canonical 0\.40 publish threshold/i
    );
    expect(container).toHaveTextContent(/confidence\s*0\.390/i);
  });
});
