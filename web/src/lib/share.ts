// Text for shared dossier links. Figures come from the export only, and nationality is left out
// because the observed value and a model estimate are shown together (D-042).

import { leagueName } from "@/lib/football";
import { formatEur } from "@/lib/format";
import type { PlayerProfile } from "@/lib/players";

export function shareDescription(p: Pick<PlayerProfile, "name" | "sub_position" | "club" | "league_id" | "market_value_eur" | "estimates">): string {
  const a = p.estimates.heldout.A ?? p.estimates.served.A;
  const basis = p.estimates.heldout.A !== null ? "held-out" : "served, in-sample";
  const where = `${p.sub_position}, ${p.club ?? leagueName(p.league_id)}`;
  const tail = "The valuation, its explanation and the audit context on FairValue.";
  return a
    ? `${p.name} (${where}): observed market value ${formatEur(p.market_value_eur)}; Model A estimate ${formatEur(a)} (${basis}). ${tail}`
    : `${p.name} (${where}): observed market value ${formatEur(p.market_value_eur)}. ${tail}`;
}
