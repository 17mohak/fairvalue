// Licensed player portraits (web/src/data/portraits.json + web/public/players/portraits/).
// A profile shows a portrait only when a manifest entry exists; otherwise the hero says so.

import manifest from "@/data/portraits.json";

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
}

export interface PortraitManifest {
  policy: string;
  allowed_licences: string[];
  portraits: Portrait[];
}

export const PORTRAITS = manifest as unknown as PortraitManifest;

export function portraitFor(playerId: number): Portrait | null {
  return PORTRAITS.portraits.find((p) => p.player_id === playerId) ?? null;
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
