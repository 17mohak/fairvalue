"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { formatEur } from "@/lib/format";

/** Counts to a EUR value in log space, so a jump from €1M to €40M feels as even as €1M to €2M. */
export function AnimatedEur({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const previous = useRef<number | null>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const from = previous.current ?? value / 6;
    previous.current = value;
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(Math.log(from), Math.log(value), {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.exp(v)),
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span className={`num ${className ?? ""}`} aria-hidden="true">
      {formatEur(shown)}
    </span>
  );
}
