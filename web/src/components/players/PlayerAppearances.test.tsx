import { act, render, screen } from "@testing-library/react";
import { compareTray, watchlists } from "@/lib/localStore";
import { PlayerAppearances } from "./PlayerAppearances";

const links = [{ href: "/stories/valuation/605184-jean-clair-todibo", label: "Inside a valuation: Jean-Clair Todibo", kind: "Story · Valuation" }];

afterEach(() => {
  act(() => {
    compareTray.set([]);
    watchlists.set([]);
  });
  window.localStorage.clear();
});

describe("where a player appears", () => {
  it("lists published stories and says plainly when the player is on none of this browser's lists", () => {
    render(<PlayerAppearances playerId={605184} name="Todibo" links={links} />);
    expect(screen.getByRole("link", { name: "Inside a valuation: Jean-Clair Todibo" })).toHaveAttribute("href", links[0]!.href);
    expect(screen.getByText(/Not on your watchlists or in your comparison tray/)).toBeInTheDocument();
  });

  it("adds the comparison tray and the watchlists that hold the player, and only those", () => {
    act(() => {
      compareTray.set([605184, 418560]);
      watchlists.set([
        { id: "a", name: "Centre-backs", players: [605184], created: "t", updated: "t" },
        { id: "b", name: "Strikers", players: [418560], created: "t", updated: "t" },
      ]);
    });
    render(<PlayerAppearances playerId={605184} name="Todibo" links={links} />);
    expect(screen.getByRole("link", { name: "In your comparison tray (2)" })).toHaveAttribute("href", "/terminal/compare?ids=605184,418560");
    expect(screen.getByRole("link", { name: "Centre-backs" })).toHaveAttribute("href", "/terminal/watchlists?list=a");
    expect(screen.queryByRole("link", { name: "Strikers" })).not.toBeInTheDocument();
  });
});
