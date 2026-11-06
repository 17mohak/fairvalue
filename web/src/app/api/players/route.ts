import { NextResponse } from "next/server";
import { indexRow, type PlayerIndex } from "@/lib/players";
import { playerSet } from "@/lib/players.server";

// The compact player index behind the command palette, watchlists and comparison picker.
// Read from the same export as every page, so a name found here always opens the same dossier.
export function GET() {
  const set = playerSet();
  const body: PlayerIndex = { source: set.source, total: set.players.length, players: set.players.map(indexRow) };
  return NextResponse.json(body, { headers: { "Cache-Control": "private, max-age=300" } });
}
