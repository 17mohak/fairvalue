"use client";

import Link from "next/link";
import { compareTray, useHydrated, watchlists } from "@/lib/localStore";
import styles from "./PlayerAppearances.module.css";

export interface AppearanceLink {
  href: string;
  label: string;
  kind: string;
}

/**
 * Where this player appears across FairValue: published stories (from the server) and, from this
 * browser only, the comparison tray and watchlists. Local items wait for hydration so the server
 * HTML never claims anything about a viewer's lists.
 */
export function PlayerAppearances({ playerId, name, links }: { playerId: number; name: string; links: AppearanceLink[] }) {
  const hydrated = useHydrated();
  const lists = watchlists.use();
  const tray = compareTray.use();
  const onLists = hydrated ? lists.filter((l) => l.players.includes(playerId)) : [];
  const inTray = hydrated && tray.includes(playerId);

  return (
    <div className={styles.box}>
      <p className={styles.head}>Where {name} appears</p>
      <ul className={styles.list}>
        {links.map((l) => (
          <li key={l.href}>
            <span className={styles.kind}>{l.kind}</span>
            <Link href={l.href}>{l.label}</Link>
          </li>
        ))}
        {inTray && (
          <li>
            <span className={styles.kind}>Compare</span>
            <Link href={`/terminal/compare?ids=${tray.join(",")}`}>In your comparison tray ({tray.length})</Link>
          </li>
        )}
        {onLists.map((l) => (
          <li key={l.id}>
            <span className={styles.kind}>Watchlist</span>
            <Link href={`/terminal/watchlists?list=${l.id}`}>{l.name}</Link>
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        {hydrated && !inTray && !onLists.length
          ? "Not on your watchlists or in your comparison tray. Use Watch or Compare above; both are kept in this browser only."
          : "Watchlists and the comparison tray are kept in this browser only."}
      </p>
    </div>
  );
}
