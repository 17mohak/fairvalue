import fixtures from "@/data/players.json";
import type { PlayerProfile } from "@/lib/players";
import { shareDescription } from "./share";

const base = (fixtures as unknown as { players: PlayerProfile[] }).players[0]!;

describe("share description", () => {
  it("states observed value and the labelled Model A estimate, without nationality", () => {
    const p = { ...base, name: "Erling Haaland", sub_position: "Centre-Forward", club: "Manchester City", nationality: "Norway", market_value_eur: 200e6, estimates: { served: { A: 197e6, B: null }, heldout: { A: 159e6, B: null } } };
    const d = shareDescription(p);
    expect(d).toContain("observed market value €200M");
    expect(d).toContain("Model A estimate €159M (held-out)");
    expect(d).not.toContain("Norway");
  });

  it("labels a served estimate as in-sample and copes with none", () => {
    const served = { ...base, market_value_eur: 22e6, estimates: { served: { A: 16.5e6, B: null }, heldout: { A: null, B: null } } };
    expect(shareDescription(served)).toContain("(served, in-sample)");
    const none = { ...base, market_value_eur: 5e6, estimates: { served: { A: null, B: null }, heldout: { A: null, B: null } } };
    expect(shareDescription(none)).not.toContain("Model A");
  });
});
