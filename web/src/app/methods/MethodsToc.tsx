"use client";

import { useEffect, useState } from "react";
import styles from "./methods.module.css";

export interface TocItem {
  id: string;
  label: string;
}

/** Contents rail: marks the section being read and how far through the paper the reader is. */
export function MethodsToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const sections = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    // A section counts as "being read" once its heading passes the upper third of the viewport.
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    sections.forEach((s) => io.observe(s));

    const body = document.getElementById("methods-body");
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!body) return;
        const r = body.getBoundingClientRect();
        const total = r.height - window.innerHeight * 0.6;
        setProgress(Math.min(1, Math.max(0, -r.top / Math.max(1, total))));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [items]);

  return (
    <nav className={styles.toc} aria-label="Contents">
      <p className={styles.tocTitle}>Contents</p>
      <span className={styles.tocProgress} aria-hidden="true">
        <span style={{ transform: `scaleY(${progress})` }} />
      </span>
      <ol>
        {items.map((t, i) => (
          <li key={t.id}>
            <a href={`#${t.id}`} aria-current={active === t.id ? "location" : undefined}>
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              {t.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
