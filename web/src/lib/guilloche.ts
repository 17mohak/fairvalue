// The card's security-print background (D-053): woven rings and a fine wavy tint field, drawn as SVG
// path data. Deterministic, so the server render and the client agree; no randomness, no dependencies.

function ring(cx: number, cy: number, R: number, amp: number, petals: number, lines: number, steps = 360): string[] {
  const out: string[] = [];
  for (let j = 0; j < lines; j++) {
    const ph = ((j / lines) * Math.PI * 2) / petals;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const r = R + amp * Math.sin(petals * t + ph * petals) + amp * 0.35 * Math.sin(3 * petals * t - ph * petals);
      d += `${i ? "L" : "M"}${(cx + r * Math.cos(t)).toFixed(1)} ${(cy + r * Math.sin(t)).toFixed(1)}`;
    }
    out.push(`${d}Z`);
  }
  return out;
}

function field(w: number, h: number, gap = 7, amp = 2.6, wl = 30): string[] {
  const out: string[] = [];
  for (let y = -gap; y <= h + gap; y += gap) {
    let d = "";
    for (let x = 0; x <= w; x += 6) d += `${x ? "L" : "M"}${x} ${(y + amp * Math.sin(((x + y * 1.7) / wl) * Math.PI)).toFixed(1)}`;
    out.push(d);
  }
  return out;
}

export interface Guilloche {
  field: string[];
  rings: string[];
}

export function guilloche(w: number, h: number, cx: number, cy: number, R: number, opts: { noField?: boolean; gap?: number } = {}): Guilloche {
  return {
    field: opts.noField ? [] : field(w, h, opts.gap ?? 7),
    rings: [...ring(cx, cy, R, R * 0.07, 22, 12), ...ring(cx, cy, R * 0.84, R * 0.045, 30, 8)],
  };
}
