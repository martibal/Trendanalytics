
import { render, screen, waitFor } from "@testing-library/react";

import MetricLineChart, { type MetricPoint } from "@/components/MetricLineChart";

class ResizeObserverMock {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 640,
            height: 280,
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            bottom: 280,
            right: 640,
            toJSON() {
              return {};
            },
          },
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver
    );
  }

  unobserve() {}

  disconnect() {}
}

describe("components/MetricLineChart", () => {
  const originalResizeObserver = global.ResizeObserver;
  const originalClientWidth = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "clientWidth"
  );

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 640;
      },
    });

    global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    if (originalClientWidth) {
      Object.defineProperty(HTMLElement.prototype, "clientWidth", originalClientWidth);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (HTMLElement.prototype as any).clientWidth;
    }

    if (originalResizeObserver) {
      global.ResizeObserver = originalResizeObserver;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).ResizeObserver;
    }
  });

  it("renders chart title, subtitle, units, legend, and current signal", async () => {
    const data: MetricPoint[] = [
      { date: "2026-03-18", value: 12, ma7: 11, ma30: 10 },
      { date: "2026-03-19", value: 13, ma7: 11.5, ma30: 10.2 },
      { date: "2026-03-20", value: 14, ma7: 12, ma30: 10.4 },
    ];

    const { container } = render(
      <MetricLineChart
        title="Transaction count"
        subtitle="90d context"
        data={data}
        unitLabel="tx"
      />
    );

    expect(screen.getByText("Transaction count")).toBeInTheDocument();
    expect(screen.getByText("Units: tx")).toBeInTheDocument();

    await waitFor(() => {
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    expect(screen.getByText("Current signal")).toBeInTheDocument();
    expect(screen.getByText("MA7 +15.4% above MA30")).toBeInTheDocument();

    expect(screen.getByText("Daily raw value")).toBeInTheDocument();
    expect(screen.getByText("MA7 — 7-day moving average")).toBeInTheDocument();
    expect(screen.getByText("MA30 — 30-day trend baseline")).toBeInTheDocument();

    expect(screen.getByText("90d context")).toBeInTheDocument();
  });

  it("renders preparing state before width is available", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 0;
      },
    });

    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    render(
      <MetricLineChart
        title="Fees"
        data={[{ date: "2026-03-20", value: 1.2 }]}
      />
    );

    expect(screen.getByText("Preparing chart…")).toBeInTheDocument();
  });

  it("renders only the series that actually exist", async () => {
    const data: MetricPoint[] = [
      { date: "2026-03-18", ma7: 11 },
      { date: "2026-03-19", ma7: 12 },
      { date: "2026-03-20", ma7: 13 },
    ];

    const { container } = render(
      <MetricLineChart
        title="Only moving average"
        data={data}
      />
    );

    await waitFor(() => {
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    expect(screen.getByText("MA7 — 7-day moving average")).toBeInTheDocument();
    expect(screen.queryByText("Daily raw value")).not.toBeInTheDocument();
    expect(screen.queryByText("MA30 — 30-day trend baseline")).not.toBeInTheDocument();
    expect(screen.queryByText("Current signal")).not.toBeInTheDocument();
  });

  it("uses the provided height on the chart container", () => {
    const { container } = render(
      <MetricLineChart
        title="Height test"
        data={[{ date: "2026-03-20", value: 5 }]}
        height={320}
      />
    );

    const chartHost = container.querySelector('[style*="min-height: 320px"]');
    expect(chartHost).toBeInTheDocument();
  });

  it("handles empty data safely", async () => {
    const { container } = render(
      <MetricLineChart
        title="Empty chart"
        data={[]}
      />
    );

    await waitFor(() => {
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    expect(screen.getByText("Empty chart")).toBeInTheDocument();
    expect(screen.queryByText("Daily raw value")).not.toBeInTheDocument();
    expect(screen.queryByText("MA7 — 7-day moving average")).not.toBeInTheDocument();
    expect(screen.queryByText("MA30 — 30-day trend baseline")).not.toBeInTheDocument();
    expect(screen.queryByText("Current signal")).not.toBeInTheDocument();
  });
});
