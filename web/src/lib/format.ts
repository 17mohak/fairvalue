// Number formatting shared by every page. Uses a true minus sign (−) so signed values align.

const MINUS = "−";

/** €17.1M, €850k, €25k. Compact, for headlines and axes. */
export function formatEur(value: number, digits?: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? MINUS : "";
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    const d = digits ?? (m >= 100 ? 0 : 1);
    return `${sign}€${trimZeros(m.toFixed(d))}M`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    const d = digits ?? 0;
    return `${sign}€${trimZeros(k.toFixed(d))}k`;
  }
  return `${sign}€${Math.round(abs)}`;
}

/** €17,056,329: the full figure, for detail lines. */
export function formatEurExact(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** +0.093 / −0.017 with a fixed number of decimals. */
export function signed(value: number, digits = 3): string {
  const s = Math.abs(value).toFixed(digits);
  if (Number(s) === 0) return s;
  return `${value < 0 ? MINUS : "+"}${s}`;
}

/** Plain decimal with a true minus sign. */
export function decimal(value: number, digits = 3): string {
  const s = Math.abs(value).toFixed(digits);
  return value < 0 && Number(s) !== 0 ? `${MINUS}${s}` : s;
}

/** A log-scale gap as a relative difference: 0.093 -> "+9.7%". */
export function logGapAsPercent(gap: number, digits = 0): string {
  return signedPercent(Math.expm1(gap) * 100, digits);
}

export function signedPercent(pct: number, digits = 0): string {
  const s = Math.abs(pct).toFixed(digits);
  if (Number(s) === 0) return `${s}%`;
  return `${pct < 0 ? MINUS : "+"}${s}%`;
}

/** 0.2005 -> "20.1%". */
export function percent(rate: number, digits = 1): string {
  return `${(rate * 100).toFixed(digits)}%`;
}

/** 0.0248 -> "+2.5 pp". */
export function percentagePoints(diff: number, digits = 1): string {
  const s = Math.abs(diff * 100).toFixed(digits);
  if (Number(s) === 0) return `${s} pp`;
  return `${diff < 0 ? MINUS : "+"}${s} pp`;
}

/** A SHAP contribution on the ln scale as a multiplier on the estimate: 0.39 -> "×1.48". */
export function multiplier(logContribution: number): string {
  const m = Math.exp(logContribution);
  return `×${m >= 10 ? m.toFixed(1) : m.toFixed(2)}`;
}

export function integer(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(value);
}

/** "0.063 to 0.124" interval text. */
export function interval(low: number, high: number, digits = 3): string {
  return `${decimal(low, digits)} to ${decimal(high, digits)}`;
}
