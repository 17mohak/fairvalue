"use client";

import { motion, useReducedMotion } from "motion/react";
import { decimal } from "@/lib/format";
import styles from "./BarList.module.css";

export interface BarItem {
  key: string;
  label: string;
  value: number;
  detail?: string;
}

/** Horizontal magnitude bars in one neutral hue, values labelled at the bar end. */
/** `digits` (not a formatter function) so server components can render it. */
export function BarList({ items, digits = 2, caption, highlight }: { items: BarItem[]; digits?: number; caption?: string; highlight?: string }) {
  const reduce = useReducedMotion();
  const max = Math.max(...items.map((i) => i.value), 1e-9);
  return (
    <figure className={styles.figure}>
      <ul className={styles.list}>
        {items.map((item, i) => (
          <li key={item.key} className={styles.row} data-highlight={item.key === highlight || undefined} title={item.detail}>
            <span className={styles.label}>{item.label}</span>
            <span className={styles.track}>
              <motion.span
                className={styles.bar}
                style={{ width: `${(item.value / max) * 100}%` }}
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.035, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span className={`${styles.value} num`}>{decimal(item.value, digits)}</span>
          </li>
        ))}
      </ul>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}
