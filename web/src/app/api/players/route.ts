import { indexRow, type PlayerIndex } from "@/lib/players";
import { playerSet } from "@/lib/players.server";

// The compact player index behind global search, watchlists and the comparison picker.
// Read from the same export as every page, so a name found here always opens the same dossier.
//
// About 1.9 MB raw, ~0.3 MB gzipped. Next.js compresses it itself (D-052) because next.config.ts
// sets this route's Content-Type up front; see the comment there. Serialised once per process.

let json: string | null = null;

export function GET() {
  if (json === null) {
    const set = playerSet();
    const index: PlayerIndex = { source: set.source, total: set.players.length, players: set.players.map(indexRow) };
    json = JSON.stringify(index);
  }
  return new Response(json, { headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=300" } });
}
