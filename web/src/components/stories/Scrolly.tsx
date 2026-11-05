"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { GapGraphic, type GapData } from "./GapGraphic";
import { JourneyGraphic, type JourneyData } from "./JourneyGraphic";
import styles from "./story.module.css";

export type Graphic = { kind: "gap"; data: GapData } | { kind: "journey"; data: JourneyData };

export interface StoryStep {
  no: string;
  title: string;
  body: ReactNode;
}

/**
 * Scroll-driven chapters: the graphic stays pinned while the text scrolls past, and changes as
 * each chapter crosses the middle of the screen. Every state is reachable by scrolling, by
 * keyboard (the steps are ordinary content) and with motion reduced (changes just cut).
 */
export function Scrolly({ steps, graphic, offset = 0 }: { steps: StoryStep[]; graphic: Graphic; offset?: number }) {
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = [...(root.current?.querySelectorAll<HTMLElement>("[data-step]") ?? [])];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={root} className={styles.scrolly}>
      <div className={styles.steps}>
        {steps.map((s, i) => (
          <section key={s.no} data-step={i} data-active={i === active || undefined} className={styles.step} aria-label={s.title}>
            <p className={styles.stepNo} aria-hidden="true">
              {s.no}
            </p>
            <h2 className={styles.stepTitle}>
              <span className="visually-hidden">Chapter {s.no}: </span>
              {s.title}
            </h2>
            <div className={styles.copy}>{s.body}</div>
          </section>
        ))}
      </div>
      <div className={styles.stage} aria-live="polite">
        {graphic.kind === "gap" ? <GapGraphic data={graphic.data} step={active + offset} /> : <JourneyGraphic data={graphic.data} step={active + offset} />}
      </div>
    </div>
  );
}
