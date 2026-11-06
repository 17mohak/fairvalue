// Licensed player portraits (web/src/data/portraits.json + web/public/players/portraits/).
// A profile shows a portrait only when a manifest entry exists; otherwise the hero says so.

import manifest from "@/data/portraits.json";
import cardManifest from "@/data/portrait_cards.json";
import flManifest from "@/data/generated/portrait_cards_fl.json";

export interface Portrait {
  player_id: number;
  /** Path under /public, e.g. "/players/portraits/605184.webp". */
  src: string;
  /** "cutout" = transparent background, composed into the hero; "photo" = framed image. */
  kind: "cutout" | "photo";
  width: number;
  height: number;
  /** Where the face sits, 0-1, used to keep it clear of the identity column. */
  focus: { x: number; y: number };
  licence: string;
  author: string;
  source_url: string;
  attribution: string;
  /** Card portraits only (D-053): an unlicensed image used at the owner's risk (D-044). */
  unlicensed?: boolean;
  /** Card portraits only: a tight face with no shoulders. */
  closeup?: boolean;
}

export interface PortraitManifest {
  policy: string;
  allowed_licences: string[];
  portraits: Portrait[];
}

export const PORTRAITS = manifest as unknown as PortraitManifest;

const CARD_SIZE = { width: 400, height: 500 };
const BERLIN = new Map(cardManifest.berlin.map((b) => [b.id, b]));
const FOOTYLOGOS = new Map((flManifest.footylogos as { id: number; closeup: boolean }[]).map((f) => [f.id, f]));

/** NEXT_PUBLIC_FAIRVALUE_FOOTYLOGOS_PORTRAITS=off removes every unlicensed image at once (a takedown, D-044). Build-time: Next inlines it so client rows agree with server pages; rebuild after changing it. */
export function footylogosEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FAIRVALUE_FOOTYLOGOS_PORTRAITS !== "off";
}

/** A licensed cutout from the manifest, else a card portrait (D-053), else null. */
export function portraitFor(playerId: number): Portrait | null {
  const licensed = PORTRAITS.portraits.find((p) => p.player_id === playerId);
  if (licensed) return licensed;
  const b = BERLIN.get(playerId);
  if (b)
    return {
      player_id: playerId, src: `/players/portraits/cards/berlin/${playerId}.webp`, kind: "cutout", ...CARD_SIZE, focus: { x: 0.5, y: 0.2 },
      licence: b.licence, author: b.author, source_url: b.source_url,
      attribution: `Photo: ${b.author}, CC BY-SA 4.0 (background removed)`,
    };
  const f = FOOTYLOGOS.get(playerId);
  if (f && footylogosEnabled())
    return {
      player_id: playerId, src: `/players/portraits/cards/fl/${playerId}.webp`, kind: "cutout", ...CARD_SIZE, focus: { x: 0.5, y: 0.2 },
      licence: "unlicensed", author: "FootyLogos", source_url: "https://www.footylogos.com/player-pngs",
      attribution: "Image: FootyLogos", unlicensed: true, closeup: f.closeup,
    };
  return null;
}

/** Problems with a card-portrait entry (D-053). The 1,400 px cutout rule belongs to licensed hero cutouts. */
export function cardPortraitProblems(p: Portrait): string[] {
  const out: string[] = [];
  if (!p.attribution?.trim()) out.push("attribution missing");
  if (!p.author?.trim()) out.push("author missing");
  if (!/^https?:\/\//.test(p.source_url ?? "")) out.push("source_url missing");
  if (!/^\/players\/portraits\/cards\/(berlin|fl)\/\d+\.webp$/.test(p.src)) out.push("src must be a local card file");
  if (p.unlicensed) {
    if (p.licence !== "unlicensed") out.push("unlicensed images must say so");
    if (!p.src.includes("/cards/fl/")) out.push("only FootyLogos images may be unlicensed");
  } else if (!["CC-BY-SA-4.0", ...PORTRAITS.allowed_licences].includes(p.licence)) out.push(`licence ${p.licence} is not on the allow-list`);
  return out;
}

/** Problems with a manifest entry; an empty list means it may be shown. */
export function portraitProblems(p: Portrait, allowed: string[] = PORTRAITS.allowed_licences): string[] {
  const out: string[] = [];
  if (!allowed.includes(p.licence)) out.push(`licence ${p.licence} is not on the allow-list`);
  if (!p.author?.trim()) out.push("author missing");
  if (!/^https?:\/\//.test(p.source_url ?? "")) out.push("source_url missing");
  if (!p.attribution?.trim()) out.push("attribution missing");
  if (!/^\/players\/portraits\/[\w.-]+\.(webp|png|avif)$/.test(p.src)) out.push("src must be a local file under /players/portraits/");
  if (p.kind === "cutout" && p.height < 1400) out.push("cutouts need at least 1400px of height");
  return out;
}
