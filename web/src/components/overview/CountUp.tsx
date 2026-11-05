"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { integer } from "@/lib/format";
import { useSeen } from "./Reveal";

/**
 * Counts up to a published figure once, the first time it is seen. The server renders the
 * final value, screen readers only ever get the final value, and it never re-animates.
 */
export function CountUp({ value, className, duration = 1.1 }: { value: number; className?: string; duration?: number }) {
  const format = (v: number) => integer(Math.round(v));
  const reduce = useReducedMotion();
  const [ref, seen] = useSeen<HTMLSpanElement>();
  const [shown, setShown] = useState<number | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!seen || done.current || reduce) return;
    done.current = true;
    const controls = animate(0, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: setShown, onComplete: () => setShown(null) });
    return () => controls.stop();
  }, [seen, reduce, value, duration]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{format(shown ?? value)}</span>
      <span className="visually-hidden">{format(value)}</span>
    </span>
  );
}
