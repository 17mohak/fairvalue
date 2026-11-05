"use client";

import { compareTray, quickWatch, toggleCompare, useHydrated, watchlists } from "@/lib/localStore";
import { COMPARE_MAX } from "@/lib/terminal";

/** Star: in any watchlist or not. The first list (or a new "Shortlist") receives quick adds. */
export function WatchButton({ id, name, className, withLabel = false }: { id: number; name: string; className?: string; withLabel?: boolean }) {
  const lists = watchlists.use();
  const hydrated = useHydrated();
  const on = hydrated && lists.some((l) => l.players.includes(id));
  return (
    <button
      type="button"
      className={className}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from watchlists` : `Add ${name} to a watchlist`}
      title={on ? "In a watchlist (this browser)" : "Watch (saved in this browser)"}
      onClick={(e) => {
        e.stopPropagation();
        quickWatch(id, !on);
      }}
      data-on={on || undefined}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 1.8l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.2l-3.7 2.1.8-4.2L2 6.2l4.2-.5z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
      {withLabel && <span>{on ? "Watching" : "Watch"}</span>}
    </button>
  );
}

export function useCompareTray() {
  const hydrated = useHydrated();
  const tray = compareTray.use();
  return hydrated ? tray : [];
}

/** Checkbox-style toggle for the comparison tray (at most four players). */
export function CompareToggle({ id, name, className, withLabel = false }: { id: number; name: string; className?: string; withLabel?: boolean }) {
  const tray = useCompareTray();
  const on = tray.includes(id);
  const full = !on && tray.length >= COMPARE_MAX;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-disabled={full || undefined}
      aria-label={withLabel ? undefined : `Compare ${name}`}
      title={full ? `A comparison holds at most ${COMPARE_MAX} players` : on ? "Selected for comparison" : "Select for comparison"}
      className={className}
      data-on={on || undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (!full) compareTray.set((ids) => toggleCompare(ids, id));
      }}
    >
      <span aria-hidden="true" data-box>
        {on ? "✓" : ""}
      </span>
      {withLabel && <span>{on ? "In comparison" : "Compare"}</span>}
    </button>
  );
}
