/**
 * @jest-environment node
 */

export {};

import { buildRunnableStarterNotebook } from "@/lib/analystKitNotebook";

describe("lib/analystKitNotebook", () => {
  it("builds a valid runnable notebook with example data cells", () => {
    const notebook = buildRunnableStarterNotebook();

    expect(notebook).toEqual(expect.objectContaining({
      nbformat: 4,
      nbformat_minor: 5,
    }));

    expect(Array.isArray(notebook.cells)).toBe(true);
    const cells = notebook.cells as Array<{ cell_type?: string; source?: string[] }>;
    const source = cells.flatMap((cell) => cell.source ?? []).join("");

    expect(source).toContain("Build a runnable example dataset");
    expect(source).toContain("example_dates = urd[['observation_date', 'chain']].tail(30).copy()");
    expect(source).toContain("my_daily_metrics.csv");
    expect(source).toContain("my_metrics_by_urd_network_state.csv");
    expect(source).toContain("not an automated instruction or future-state guarantee");
    expect(cells.some((cell) => cell.cell_type === "code")).toBe(true);
  });
});
