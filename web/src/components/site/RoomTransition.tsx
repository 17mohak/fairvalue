import { ViewTransition, type ReactNode } from "react";

const DIRECTIONAL = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" } as const;

/**
 * Wraps one page so route changes between rooms slide in the direction of travel.
 * It must sit in each page (not the layout): layouts persist, so they never enter or exit.
 * Browser back/forward and refreshes carry no transition type and simply swap.
 */
export function RoomTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={DIRECTIONAL} exit={DIRECTIONAL} default="none">
      {children}
    </ViewTransition>
  );
}
