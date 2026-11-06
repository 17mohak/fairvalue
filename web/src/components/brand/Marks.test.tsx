import { render, screen } from "@testing-library/react";
import { Residual, TierMark } from "./Marks";

describe("brand marks", () => {
  it("residual: positive means observed above the estimate, shown up and gold", () => {
    const { container } = render(<Residual value={Math.log(1.25)} basis="held-out" />);
    const el = screen.getByLabelText(/Observed above the estimate: residual \+0\.223 \(×1\.25\), held-out/);
    expect(el).toHaveAttribute("data-dir", "up");
    expect(container.textContent).toContain("▲");
  });

  it("residual: negative means observed below the estimate, shown down", () => {
    render(<Residual value={-0.085} compact basis="in-sample" />);
    const el = screen.getByLabelText(/Observed below the estimate: residual −0\.085/);
    expect(el).toHaveAttribute("data-dir", "down");
    expect(el.textContent).toContain("▼");
  });

  it("tier gauge lights one step per tier, up to the player's", () => {
    const { container } = render(<TierMark tier="Elite" />);
    expect(container.querySelectorAll("i[data-on]")).toHaveLength(3);
    expect(screen.getByText("Elite")).toBeInTheDocument();
    const { container: none } = render(<TierMark tier={null} />);
    expect(none.textContent).toBe("–");
  });
});
