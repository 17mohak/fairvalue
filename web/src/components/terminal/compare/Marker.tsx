import type { Shape } from "@/lib/compare";

/** A player's identity marker: colour plus shape, so identity never rests on colour alone. */
export function Marker({ shape, color, size = 12, hollow = false, title }: { shape: Shape; color: string; size?: number; hollow?: boolean; title?: string }) {
  const fill = hollow ? "none" : color;
  const stroke = color;
  const s = size;
  const sw = hollow ? 2 : 0;
  return (
    <svg width={s} height={s} viewBox="0 0 12 12" aria-hidden={title ? undefined : true} role={title ? "img" : undefined} style={{ flex: "none", overflow: "visible" }}>
      {title && <title>{title}</title>}
      {shape === "circle" && <circle cx="6" cy="6" r={hollow ? 4.5 : 5.5} fill={fill} stroke={stroke} strokeWidth={sw} />}
      {shape === "square" && <rect x={hollow ? 1.5 : 1} y={hollow ? 1.5 : 1} width={hollow ? 9 : 10} height={hollow ? 9 : 10} fill={fill} stroke={stroke} strokeWidth={sw} />}
      {shape === "triangle" && <path d={hollow ? "M6 1.8 10.6 10.2H1.4Z" : "M6 0.6 11.6 11H0.4Z"} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />}
      {shape === "diamond" && <path d={hollow ? "M6 1.2 10.8 6 6 10.8 1.2 6Z" : "M6 0 12 6 6 12 0 6Z"} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />}
    </svg>
  );
}
