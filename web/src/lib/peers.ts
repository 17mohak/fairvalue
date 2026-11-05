// Where a player's observed value sits among comparable players in the export, and who is valued
// nearby. Descriptive only: counts and ranks of observed Transfermarkt values. Residuals are never
// ranked here (the model card rules out reading them as "undervalued").

export interface ValueStanding {
  n: number;
  /** 1 = highest observed value; tied players share a rank. */
  rank: number;
  /** Players strictly below this value. */
  below: number;
  /** Players with exactly this value, this one included. */
  tied: number;
  median: number;
  min: number;
  max: number;
}

export function valueStanding(values: number[], value: number): ValueStanding {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const above = sorted.filter((v) => v > value).length;
  const below = sorted.filter((v) => v < value).length;
  const mid = Math.floor(n / 2);
  const median = n === 0 ? NaN : n % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return { n, rank: above + 1, below, tied: n - above - below, median, min: sorted[0] ?? NaN, max: sorted[n - 1] ?? NaN };
}

const ordinal = (k: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = k % 100;
  return `${k}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/**
 * Plain words for a standing; `group` is a plural noun phrase ("Premier League players", "attackers").
 * "The highest observed value among 555 Premier League players", "3rd highest …", "Valued above 62% of …".
 */
export function standingText(s: ValueStanding, group: string): string {
  const joint = s.tied > 1 ? "joint " : "";
  const n = s.n.toLocaleString("en-GB");
  if (s.n <= 1) return `No other ${group} in this build.`;
  if (s.rank === 1) return `The ${joint}highest observed value among ${n} ${group}.`;
  if (s.below === 0) return `The ${joint}lowest observed value among ${n} ${group}.`;
  if (s.rank <= 10) return `${s.tied > 1 ? "Joint " : ""}${ordinal(s.rank)} highest observed value among ${n} ${group}.`;
  const pct = Math.round((s.below / s.n) * 100);
  return `Valued above ${pct}% of the ${n} ${group}.`;
}

/** The k players closest in observed value (on the log scale), excluding the player; ties by id. */
export function nearestByValue<T extends { id: number; market_value_eur: number }>(pool: T[], player: { id: number; market_value_eur: number }, k = 4): T[] {
  const lv = Math.log(player.market_value_eur);
  return pool
    .filter((p) => p.id !== player.id && p.market_value_eur > 0)
    .map((p) => ({ p, d: Math.abs(Math.log(p.market_value_eur) - lv) }))
    .sort((a, b) => a.d - b.d || a.p.id - b.p.id)
    .slice(0, k)
    .map((x) => x.p);
}

/** Counts of values in equal-width log bins over [lo, hi]. */
export function logHistogram(values: number[], lo: number, hi: number, bins = 40): number[] {
  const out = new Array<number>(bins).fill(0);
  const L = Math.log(lo);
  const H = Math.log(hi);
  for (const v of values) {
    if (!(v > 0)) continue;
    const i = Math.floor(((Math.log(v) - L) / (H - L)) * bins);
    out[Math.min(bins - 1, Math.max(0, i))]! += 1;
  }
  return out;
}
