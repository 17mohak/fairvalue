import { render, screen } from "@testing-library/react";
import { PlayerCard } from "./PlayerCard";
import { portraitFor } from "@/lib/portraits";

const base = { id: 605184, name: "Jean-Clair Todibo", firstName: "Jean-Clair", lastName: "Todibo", roleCode: "CB", club: "West Ham United", nationality: "France",
  tier: "Elite" as const, observed: 22_000_000, modelA: 15_683_788, valuedLabel: "3 Jun 2026" };

describe("PlayerCard", () => {
  it("prints the observed value as the denomination and the held-out Model A estimate", () => {
    render(<PlayerCard {...base} portrait={portraitFor(605184)} />);
    expect(screen.getByLabelText(/observed value €22M/)).toBeInTheDocument();
    expect(screen.getByText("Todibo")).toBeInTheDocument();
    expect(screen.getByText("€15.7M")).toBeInTheDocument();
    expect(screen.getByAltText("Portrait of Jean-Clair Todibo")).toBeInTheDocument();
  });

  it("uses the engraved monogram without a portrait, and never invents a Model A value", () => {
    render(<PlayerCard {...base} modelA={null} portrait={null} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("JT")).toBeInTheDocument();
    expect(screen.getByText("Model A: live only")).toBeInTheDocument();
  });
});
