import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PeerStats, TraitValue } from "@/lib/players";
import { TraitsRadar } from "./TraitsRadar";

// Test values only: the radar's logic, not any real player's numbers.
const traits: TraitValue[] = [
  { key: "goals_p90", value: 0.31, percentile: 81.5 },
  { key: "assists_p90", value: 0.12, percentile: 55 },
  { key: "minutes", value: 4100, percentile: 62 },
  { key: "start_share", value: 0.8, percentile: 70.2 },
  { key: "minutes_last_365", value: 2100, percentile: 66 },
  { key: "intl_club_minutes_share", value: 0.1, percentile: 41 },
];
const deciles = (lo: number, hi: number) => Array.from({ length: 11 }, (_, i) => lo + ((hi - lo) * i) / 10);
const peers: PeerStats = {
  n: 1400,
  traits: {
    goals_p90: { deciles: deciles(0, 0.8), median: 0.22 },
    assists_p90: { deciles: deciles(0, 0.4), median: 0.11 },
    minutes: { deciles: deciles(450, 7000), median: 3600 },
    start_share: { deciles: deciles(0, 1), median: 0.7 },
    minutes_last_365: { deciles: deciles(0, 3400), median: 1800 },
    intl_club_minutes_share: { deciles: deciles(0, 0.5), median: 0.05 },
  },
};

describe("Traits radar", () => {
  it("opens on the strongest trait and switches on click", async () => {
    render(<TraitsRadar traits={traits} peers={peers} position="Attack" playerName="Test" />);
    const list = screen.getByRole("list", { name: "Traits" });
    expect(within(list).getByRole("button", { name: /Goals per 90/ })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(list).getByRole("button", { name: /Starts/ }));
    expect(within(list).getByRole("button", { name: /Starts/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Share of appearances started rather than entered from the bench.")).toBeInTheDocument();
    expect(screen.getByText("70th", { selector: "b" })).toBeInTheDocument();
  });

  it("draws no radar or percentiles without peer data, but shows the player's own values", () => {
    const { container } = render(<TraitsRadar traits={null} peers={null} position="Goalkeeper" playerName="Test" raw={{ minutes: 3100, start_share: 0.9 }} />);
    expect(screen.getByText(/need the full player export/)).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.queryByText(/\d+(st|nd|rd|th)$/)).not.toBeInTheDocument();
    expect(screen.getByText("3,100")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    // Goalkeepers get no scoring axes.
    expect(screen.queryByRole("button", { name: /Goals per 90/ })).not.toBeInTheDocument();
  });
});
