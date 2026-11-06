"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { SLOTS } from "@/lib/compare";
import { formatEur } from "@/lib/format";
import { compareTray } from "@/lib/localStore";
import { matchesQuery, type PlayerIndex } from "@/lib/players";
import { COMPARE_MAX } from "@/lib/terminal";
import { useCompareTray } from "../PlayerActions";
import { Marker } from "./Marker";
import styles from "./Compare.module.css";

interface Chip {
  id: number;
  name: string;
  role_code: string;
}

/** The players in the comparison: remove, add from the export, or load the Explorer's selection. */
export function ComparePicker({ players }: { players: Chip[] }) {
  const router = useRouter();
  const path = usePathname() ?? "/terminal/compare";
  const [pending, start] = useTransition();
  const [index, setIndex] = useState<PlayerIndex | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const tray = useCompareTray();
  const listId = useId();
  const ids = players.map((p) => p.id);

  useEffect(() => {
    if (!open || index) return;
    fetch("/api/players")
      .then((r) => (r.ok ? r.json() : null))
      .then(setIndex)
      .catch(() => {});
  }, [open, index]);

  const go = (next: number[]) => {
    compareTray.set(next);
    start(() => router.replace(next.length ? `${path}?ids=${next.join(",")}` : path, { scroll: false }));
  };

  const matches = useMemo(
    () => (index?.players ?? []).filter((p) => !ids.includes(p.id) && matchesQuery(p, q)).slice(0, 8),
    [index, q, ids],
  );
  const trayDiffers = tray.length >= 2 && tray.join(",") !== ids.join(",");

  return (
    <div className={styles.picker} data-pending={pending || undefined}>
      <ul className={styles.chips} aria-label="Players in this comparison">
        {players.map((p, i) => (
          <li key={p.id} className={styles.chip}>
            <Marker shape={SLOTS[i]!.shape} color={SLOTS[i]!.color} />
            <span className="fv-role">{p.role_code}</span>
            <b>{p.name}</b>
            <button type="button" onClick={() => go(ids.filter((x) => x !== p.id))} aria-label={`Remove ${p.name} from the comparison`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      {players.length < COMPARE_MAX && (
        <div className={styles.add}>
          <input
            className="tm-input"
            placeholder={`Add a player (${players.length} of ${COMPARE_MAX})`}
            value={q}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => setQ(e.target.value)}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label="Add a player to the comparison"
          />
          {open && (
            <ul id={listId} role="listbox" className={styles.addList}>
              {!index && <li className={styles.addEmpty}>Loading the player index…</li>}
              {index && matches.length === 0 && <li className={styles.addEmpty}>No other players match.</li>}
              {matches.map((p) => (
                <li key={p.id} role="option" aria-selected={false}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => (setQ(""), go([...ids, p.id]))}>
                    <span className="fv-role">{p.role_code}</span>
                    <span>{p.name}</span>
                    <small>{formatEur(p.market_value_eur)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {trayDiffers && (
        <button type="button" className="tm-btn" onClick={() => go(tray)}>
          Load Explorer selection ({tray.length})
        </button>
      )}
    </div>
  );
}
