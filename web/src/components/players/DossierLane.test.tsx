import { render, screen } from "@testing-library/react";
import { DossierLane } from "./DossierLane";

describe("dossier valuation lane", () => {
  it("names every figure and its basis for screen readers", () => {
    render(
      <DossierLane
        name="Erling Haaland"
        observed={200e6}
        estimates={[
          { model: "A", value: 159e6, source: "heldout" },
          { model: "B", value: 101e6, source: "heldout" },
        ]}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAccessibleName(/observed €200M; Model A €159M \(held-out\); Model B €101M \(held-out\)/);
  });

  it("labels a cached served estimate as in-sample and a missing one as live-only, without inventing a marker", () => {
    const { container } = render(
      <DossierLane
        name="Jean-Clair Todibo"
        observed={22e6}
        estimates={[
          { model: "A", value: 16.5e6, source: "cached" },
          { model: "B", value: null, source: "live-only" },
        ]}
      />,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName(/Model A €16.5M \(in-sample\); Model B needs the live service/);
    // One diamond (Model A only): Model B has no stored estimate to draw.
    expect(container.querySelectorAll('[data-model="B"] path[class*="diamond"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-model="A"] path[class*="diamond"]')).toHaveLength(1);
    expect(container.textContent).toContain("live service only");
  });
});
