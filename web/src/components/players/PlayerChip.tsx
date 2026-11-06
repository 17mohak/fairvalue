/* eslint-disable @next/next/no-img-element -- local, pre-sized card portraits */
import type { TierName } from "@/lib/football";
import type { Portrait } from "@/lib/portraits";
import styles from "./PlayerChip.module.css";

const INK: Record<TierName, "gold" | "silver" | "green"> = { "World Class": "gold", Elite: "silver", Established: "green", Emerging: "green" };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts.length > 1 ? parts[0]![0]! : "") + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * The card's small form (D-053): the slanted portrait chip for rows, thumbnails and spotlights. It keeps the
 * card's ink-by-tier rule and its engraved monogram, and carries no figure the card does not.
 * Decorative: the player's name is always beside it, so it is hidden from assistive technology.
 */
export function PlayerChip({ name, tier, portrait, className }: { name: string; tier: TierName | null; portrait: Portrait | null; className?: string }) {
  return (
    <span className={`${styles.chip} ${className ?? ""}`} data-ink={tier ? INK[tier] : "green"} aria-hidden="true">
      {portrait ? <img src={portrait.src} width={portrait.width} height={portrait.height} alt="" loading="lazy" decoding="async" /> : <span className={styles.mono}>{initials(name)}</span>}
    </span>
  );
}
