// The three environments of FairValue and the routing rules between them (D-038).
// Overview balances the other two; Terminal is the analytical workstation; Stories is editorial.
// The player dossier belongs to none of them: it is the shared record all three open.

export type ExperienceId = "overview" | "terminal" | "stories";
export type Context = ExperienceId | "dossier";

export interface Experience {
  id: ExperienceId;
  href: string;
  label: string;
  /** One line under the label in the switcher menu and the command palette. */
  summary: string;
  /** Keyboard shortcut digit (Alt + digit). */
  key: "1" | "2" | "3";
}

export const EXPERIENCES: Experience[] = [
  { id: "overview", href: "/", label: "Overview", summary: "What FairValue measures, what it found, where to go next.", key: "1" },
  { id: "terminal", href: "/terminal", label: "Terminal", summary: "Explore, compare and track players; market, league and model views.", key: "2" },
  { id: "stories", href: "/stories", label: "Stories", summary: "Valuations, head-to-heads and research findings, told as stories.", key: "3" },
];

export function experience(id: ExperienceId): Experience {
  return EXPERIENCES.find((e) => e.id === id)!;
}

const strip = (href: string) => href.split(/[?#]/)[0] || "/";

export function contextForPath(path: string): Context {
  const p = strip(path);
  if (p === "/terminal" || p.startsWith("/terminal/")) return "terminal";
  if (p === "/stories" || p.startsWith("/stories/") || p === "/methods" || p.startsWith("/methods/")) return "stories";
  if (p.startsWith("/players/")) return "dossier";
  return "overview";
}

/**
 * View-transition types for a navigation (consumed by components/site/PageTransition.tsx and the
 * ::view-transition rules in globals.css). Crossing environments gets that environment's entrance;
 * moving inside the Terminal is a quick workspace swap; anything else is a plain swap.
 */
export function transitionTypes(fromPath: string, toHref: string): string[] {
  const from = contextForPath(fromPath);
  const to = contextForPath(toHref);
  if (strip(fromPath) === strip(toHref)) return [];
  if (from === to) return to === "terminal" ? ["ws"] : to === "stories" ? ["chapter"] : [];
  return [`to-${to}`];
}

/** Where a dossier was opened from, carried as ?from= so its back link and accents match. */
export function parseFrom(value: string | string[] | undefined): ExperienceId | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "terminal" || v === "stories" || v === "overview" ? v : null;
}

export function dossierHref(slug: string, from?: ExperienceId): string {
  return from ? `/players/${slug}?from=${from}` : `/players/${slug}`;
}
