"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CompareToggle, useCompareTray, WatchButton } from "@/components/terminal/PlayerActions";
import { experience, type ExperienceId } from "@/lib/experiences";
import { recentPlayers, withRecent } from "@/lib/localStore";
import { useCanGoBack } from "@/lib/navHistory";
import { COMPARE_MIN } from "@/lib/terminal";
import styles from "./DossierBar.module.css";

const CRUMBS: Record<ExperienceId, { href: string; label: string }[]> = {
  terminal: [
    { href: "/terminal", label: "Terminal" },
    { href: "/terminal", label: "Player Explorer" },
  ],
  stories: [{ href: "/stories", label: "Stories" }],
  overview: [
    { href: "/", label: "Overview" },
    { href: "/#players", label: "The Players" },
  ],
};

/**
 * The dossier is the same record in every environment; this bar is the only part that changes:
 * where you came from, and the actions that environment offers.
 */
export function DossierBar({ from, player, story }: { from: ExperienceId | null; player: { id: number; slug: string; name: string; role_code: string }; story: string | null }) {
  const tray = useCompareTray();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // Opened from a shared link (no ?from=): the trail starts at the Overview.
  const trail = from ? CRUMBS[from] : [{ href: "/", label: "Overview" }];
  const env: ExperienceId = from ?? "overview";

  useEffect(() => {
    recentPlayers.set((list) => withRecent(list, player));
  }, [player]);

  const compareIds = tray.includes(player.id) ? tray : [...tray, player.id].slice(-4);

  return (
    <nav className={styles.bar} aria-label="Dossier navigation" data-from={from ?? undefined}>
      <span className={styles.where}>
        {canGoBack && (
          <button type="button" className={styles.backBtn} onClick={() => router.back()}>
            <span aria-hidden="true">←</span> Back
          </button>
        )}
        <ol className={styles.crumbs} aria-label="Breadcrumb">
          {trail.map((c, i) => (
            <li key={`${c.href}-${i}`}>
              <Link href={c.href} transitionTypes={[`to-${env}`]}>
                {c.label}
              </Link>
            </li>
          ))}
          <li aria-current="page">{player.name}</li>
        </ol>
      </span>
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
