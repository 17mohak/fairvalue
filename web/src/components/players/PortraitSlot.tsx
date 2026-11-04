/* eslint-disable @next/next/no-img-element -- local, pre-sized cutouts; next/image's wrapper would break the overflowing frame */
import type { Portrait } from "@/lib/portraits";
import styles from "./PortraitSlot.module.css";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts.length > 1 ? parts[0]![0]! : "") + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * The player's frame. A licensed cutout is composed into it and allowed to break out of the top
 * edge; without one the frame shows the player's monogram and says plainly that no licensed
 * portrait exists. Nothing person-shaped stands in for a photo.
 */
export function PortraitSlot({ portrait, name, roleCode, size = "hero" }: { portrait: Portrait | null; name: string; roleCode: string; size?: "hero" | "card" | "thumb" }) {
  if (portrait) {
    return (
      <figure className={styles.frame} data-size={size} data-kind={portrait.kind}>
        <img
          className={styles.cutout}
          src={portrait.src}
          width={portrait.width}
          height={portrait.height}
          alt={`Portrait of ${name}`}
          style={{ objectPosition: `${portrait.focus.x * 100}% ${portrait.focus.y * 100}%` }}
          decoding="async"
        />
        {size === "hero" && <figcaption className={styles.credit}>{portrait.attribution}</figcaption>}
      </figure>
    );
  }
  return (
    <figure className={styles.frame} data-size={size} data-kind="none" aria-label={`${name}: no licensed portrait`}>
      <span className={styles.monogram} aria-hidden="true">
        {initials(name)}
      </span>
      <span className={styles.role} aria-hidden="true">
        {roleCode}
      </span>
      {size === "hero" && <figcaption className={styles.none}>No licensed portrait</figcaption>}
    </figure>
  );
}
