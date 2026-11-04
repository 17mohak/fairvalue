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
    // Track section headings: the active section is the last one whose heading has passed the
    // upper fifth of the viewport. At the very bottom of the page the last section wins, even
    // when it is too short for its heading to get that far.
    const headings = items
      .map((i) => document.getElementById(i.id)?.querySelector("h2"))
      .filter((el): el is HTMLHeadingElement => !!el);
    const pick = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) return setActive(items[items.length - 1]?.id);
      let current = items[0]?.id;
      headings.forEach((h, i) => {
        if (h.getBoundingClientRect().top < window.innerHeight * 0.2) current = items[i]?.id;
      });
      setActive(current);
    };
    const io = new IntersectionObserver(pick, { rootMargin: "0px 0px -80% 0px", threshold: [0, 1] });
    headings.forEach((h) => io.observe(h));

    const body = document.getElementById("methods-body");
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        pick();
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
