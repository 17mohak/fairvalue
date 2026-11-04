// The four environments of the product, in navigation order. The order also sets the direction
// of route transitions: moving to a later room slides forward, an earlier one slides back.

export type RoomId = "overview" | "studio" | "observatory" | "methods";

export interface Room {
  id: RoomId;
  index: string;
  href: string;
  label: string;
  /** Short label for tight spaces (mobile bar). */
  short: string;
  /** One line for the mobile menu and the home page directory. */
  summary: string;
}

export const ROOMS: Room[] = [
  { id: "overview", index: "01", href: "/", label: "Overview", short: "Overview", summary: "What FairValue predicts and what the audit found." },
  { id: "studio", index: "02", href: "/studio", label: "Valuation studio", short: "Studio", summary: "Build a player profile and value it with the live model." },
  { id: "observatory", index: "03", href: "/fairness", label: "Fairness observatory", short: "Observatory", summary: "Explore the UEFA / non-UEFA error gap, with its uncertainty." },
  { id: "methods", index: "04", href: "/methods", label: "Methods", short: "Methods", summary: "Data, models, validation, explainability and limits." },
];

export function roomForPath(path: string): Room {
  const match = ROOMS.slice(1).find((r) => path === r.href || path.startsWith(`${r.href}/`));
  return match ?? ROOMS[0]!;
}

/** View-transition type for navigating from one room to another. */
export function transitionTo(from: Room, to: Room): string[] {
  const a = ROOMS.indexOf(from);
  const b = ROOMS.indexOf(to);
  if (a === b) return [];
  return [b > a ? "nav-forward" : "nav-back"];
}
