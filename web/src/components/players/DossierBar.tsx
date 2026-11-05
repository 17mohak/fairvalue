"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CompareToggle, useCompareTray, WatchButton } from "@/components/terminal/PlayerActions";
import { experience, type ExperienceId } from "@/lib/experiences";
import { recentPlayers, withRecent } from "@/lib/localStore";
import { COMPARE_MIN } from "@/lib/terminal";
import styles from "./DossierBar.module.css";

const BACK: Record<ExperienceId, { href: string; label: string }> = {
  terminal: { href: "/terminal", label: "Terminal · Player Explorer" },
  stories: { href: "/stories", label: "Stories" },
  overview: { href: "/", label: "Overview" },
};

/**
 * The dossier is the same record in every environment; this bar is the only part that changes:
 * where you came from, and the actions that environment offers.
 */
export function DossierBar({ from, player, story }: { from: ExperienceId | null; player: { id: number; slug: string; name: string; role_code: string }; story: string | null }) {
  const tray = useCompareTray();
  const back = from ? BACK[from] : null;

  useEffect(() => {
    recentPlayers.set((list) => withRecent(list, player));
  }, [player]);

  const compareIds = tray.includes(player.id) ? tray : [...tray, player.id].slice(-4);

  return (
    <nav className={styles.bar} aria-label="Dossier" data-from={from ?? undefined}>
      {back ? (
        <Link href={back.href} className={styles.back} transitionTypes={[`to-${from}`]}>
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      ) : (
        <span className={styles.context}>Shared player record · opens the same in every environment</span>
      )}
      <span className={styles.actions}>
        <CompareToggle id={player.id} name={player.name} className={styles.btn} withLabel />
        <WatchButton id={player.id} name={player.name} className={styles.btn} withLabel />
        {compareIds.length >= COMPARE_MIN && (
          <Link href={`/terminal/compare?ids=${compareIds.join(",")}`} className={styles.btn} data-tone="gold" transitionTypes={["to-terminal"]}>
            Compare {compareIds.length} in Terminal →
          </Link>
        )}
        {story && from !== "stories" && (
          <Link href={story} className={styles.btn} transitionTypes={["to-stories"]}>
            Read the valuation story
          </Link>
        )}
        {from !== "terminal" && (
          <Link href={`/terminal?focus=${player.id}`} className={styles.btn} transitionTypes={["to-terminal"]}>
            Open in {experience("terminal").label}
          </Link>
        )}
      </span>
    </nav>
  );
}
