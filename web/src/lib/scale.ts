// Tiny scale helpers (no charting dependency): every chart is hand-built SVG.

export type Scale = ((v: number) => number) & { domain: [number, number]; range: [number, number] };

export function linearScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const f = ((v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)) as Scale;
  f.domain = domain;
  f.range = range;
  return f;
}

export function logScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain.map(Math.log10) as [number, number];
  const [r0, r1] = range;
  const f = ((v: number) => r0 + ((Math.log10(Math.max(v, 1e-9)) - d0) / (d1 - d0)) * (r1 - r0)) as Scale;
  f.domain = domain;
  f.range = range;
  return f;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Evenly spaced "nice" ticks covering [lo, hi]. */
export function niceTicks(lo: number, hi: number, count = 5): number[] {
  const span = hi - lo;
  if (span <= 0) return [lo];
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.ceil(lo / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= hi + step * 1e-9; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/** Domain that contains every value plus padding, always including zero. */
export function paddedDomain(values: number[], pad = 0.08, includeZero = true): [number, number] {
  let lo = Math.min(...values, includeZero ? 0 : Infinity);
  let hi = Math.max(...values, includeZero ? 0 : -Infinity);
  const span = hi - lo || 1;
  lo -= span * pad;
  hi += span * pad;
  return [lo, hi];
}
