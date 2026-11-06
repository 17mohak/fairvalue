import { render } from "@testing-library/react";
import { Scatter } from "./TmCharts";

const pts = (n: number) => Array.from({ length: n }, (_, i) => ({ key: String(i), x: 18 + (i % 20), y: 1e5 * (1 + (i % 50)), label: `Player ${i}` }));

describe("Terminal scatter", () => {
  it("draws a few points as labelled circles", () => {
    const { container } = render(<Scatter points={pts(8)} xLabel="Age" yLabel="Value" />);
    expect(container.querySelectorAll("circle")).toHaveLength(8);
    expect(container.querySelectorAll("circle title")).toHaveLength(8);
  });

  it("draws the full population as one compact path with every point", () => {
    const { container } = render(<Scatter points={pts(5820)} xLabel="Age" yLabel="Value" />);
    expect(container.querySelectorAll("circle")).toHaveLength(0);
    const d = container.querySelector("path")!.getAttribute("d")!;
    expect(d.match(/M/g)).toHaveLength(5820);
    expect(container.querySelector("svg")!.getAttribute("aria-label")).toMatch(/5820 players/);
  });
});
