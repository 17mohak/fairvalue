import { ViewTransition, type ReactNode } from "react";

// Transition type -> the class that names its animation in globals.css. Crossing into an
// environment plays that environment's entrance; "ws" is a Terminal workspace swap; "chapter"
// moves between stories. Browser back/forward and reloads carry no type and simply swap.
const ENVIRONMENT = {
  "to-overview": "to-overview",
  "to-terminal": "to-terminal",
  "to-stories": "to-stories",
  "to-dossier": "to-dossier",
  chapter: "chapter",
  default: "none",
} as const;

const WORKSPACE = { ws: "ws", default: "none" } as const;
const CHAPTER = { chapter: "chapter", default: "none" } as const;

/**
 * Wraps a page (or the Terminal shell) so it enters and leaves with its environment's motion.
 * It must sit below the root layout: layouts persist, so they never enter or exit themselves.
 * `scope="workspace"` is for content inside the Terminal shell, which only animates on "ws".
 */
export function PageTransition({ children, scope = "environment" }: { children: ReactNode; scope?: "environment" | "workspace" | "chapter" }) {
  if (scope !== "environment") {
    // Inside a persistent layout the boundary never enters or exits; its content updates.
    const map = scope === "workspace" ? WORKSPACE : CHAPTER;
    return (
      <ViewTransition update={map} enter={map} exit={map} default="none">
        {children}
      </ViewTransition>
    );
  }
  return (
    <ViewTransition enter={ENVIRONMENT} exit={ENVIRONMENT} default="none">
      {children}
    </ViewTransition>
  );
}
