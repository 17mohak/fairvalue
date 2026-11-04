/* eslint-disable @next/next/no-img-element -- local, pre-sized cutouts; next/image would add a wrapper that breaks the layered composition */
import type { Portrait } from "@/lib/portraits";
import styles from "./PortraitSlot.module.css";

/**
 * The hero's figure. With a licensed cutout it is composed into the scene with rim light and a
 * floor shadow. Without one it draws an explicitly labelled chalk silhouette: the composition
 * keeps its shape, and nobody mistakes it for a photo of the player.
 */
export function PortraitSlot({ portrait, name, size = "hero" }: { portrait: Portrait | null; name: string; size?: "hero" | "card" }) {
  if (portrait) {
    return (
      <figure className={styles.figure} data-size={size} data-kind={portrait.kind}>
        <img
          className={styles.cutout}
          src={portrait.src}
          width={portrait.width}
          height={portrait.height}
          alt={`Portrait of ${name}`}
          style={{ objectPosition: `${portrait.focus.x * 100}% ${portrait.focus.y * 100}%` }}
          decoding="async"
        />
        <span className={styles.floor} aria-hidden="true" />
        {size === "hero" && (
          <figcaption className={styles.credit}>
            {portrait.attribution} · {portrait.licence}
          </figcaption>
        )}
      </figure>
    );
  }
  return (
    <figure className={styles.figure} data-size={size} data-kind="none">
      <span className={styles.backglow} aria-hidden="true" />
      <svg className={styles.silhouette} viewBox="0 0 600 760" role="img" aria-label={`No licensed portrait of ${name} yet`}>
        <defs>
          <linearGradient id={`fill-${size}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#050a07" stopOpacity="0.96" />
            <stop offset="0.75" stopColor="#07100b" stopOpacity="0.92" />
            <stop offset="1" stopColor="#0a110d" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`rim-${size}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#edefe6" stopOpacity="0.1" />
            <stop offset="0.6" stopColor="#edefe6" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ffd680" stopOpacity="0.95" />
          </linearGradient>
        </defs>
          <radialGradient id={`light-${size}`} cx="0.72" cy="0.18" r="0.75">
            <stop offset="0" stopColor="#e9b949" stopOpacity="0.07" />
            <stop offset="1" stopColor="#e9b949" stopOpacity="0" />
          </radialGradient>
        {/* One continuous outline: shoulders, neck and head. */}
        <path
          d="M40 760 C 44 640 92 520 212 470 C 236 460 252 446 258 424 C 262 404 262 384 260 366 C 228 344 206 304 202 252 C 196 196 200 150 222 122 C 248 88 276 78 300 78 C 324 78 352 88 378 122 C 400 150 404 196 398 252 C 394 304 372 344 340 366 C 338 384 338 404 342 424 C 348 446 364 460 388 470 C 508 520 556 640 560 760 Z"
          fill={`url(#fill-${size})`}
          stroke={`url(#rim-${size})`}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M40 760 C 44 640 92 520 212 470 C 236 460 252 446 258 424 C 262 404 262 384 260 366 C 228 344 206 304 202 252 C 196 196 200 150 222 122 C 248 88 276 78 300 78 C 324 78 352 88 378 122 C 400 150 404 196 398 252 C 394 304 372 344 340 366 C 338 384 338 404 342 424 C 348 446 364 460 388 470 C 508 520 556 640 560 760 Z"
          fill={`url(#light-${size})`}
        />
        <path d="M258 424 C 272 446 286 462 300 476 C 314 462 328 446 342 424" fill="none" stroke="#e9b949" strokeOpacity="0.45" strokeWidth="2" />
      </svg>
      <span className={styles.floor} aria-hidden="true" />
      {size === "hero" && <figcaption className={styles.pending}>Portrait slot · no licensed image yet</figcaption>}
    </figure>
  );
}
