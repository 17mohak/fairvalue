"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { openPalette, prefetchPlayerIndex } from "./CommandPalette";

const subscribeNothing = () => () => {};
const isApple = () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

/** "⌘K" on Apple devices, "Ctrl K" elsewhere; the server renders the neutral "Ctrl K". */
export function useShortcutLabel(): string {
  return useSyncExternalStore(subscribeNothing, () => (isApple() ? "⌘K" : "Ctrl K"), () => "Ctrl K");
}

export function ShortcutKbd({ className }: { className?: string }) {
  const label = useShortcutLabel();
  return (
    <kbd className={className} suppressHydrationWarning>
      {label}
    </kbd>
  );
}

/**
 * Any button that opens global player search. Hovering or focusing it starts loading the player
 * index, so results are usually ready by the time the palette opens. Pass `label` only when the
 * visible text can disappear (the header on phones); otherwise the visible text is the name.
 */
export function SearchTrigger({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => openPalette()}
      onPointerEnter={prefetchPlayerIndex}
      onFocus={prefetchPlayerIndex}
      aria-label={label}
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K /"
    >
      {children}
    </button>
  );
}
