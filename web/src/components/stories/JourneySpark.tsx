import { buildJourney, type Explanation } from "@/lib/journey";

/**
 * A valuation journey reduced to its path: each step's running estimate, left to right, with the
 * observed value as a dashed line. Drawn from the same SHAP values as the full journey.
 */
export function JourneySpark({ explanation, observed, width = 260, height = 70 }: { explanation: Explanation; observed: number; width?: number; height?: number }) {
  const j = buildJourney(explanation, 8);
  const pts = j.steps.filter((s) => s.kind !== "final").map((s) => s.after);
  const obs = Math.log(observed);
  const lo = Math.min(...pts, obs) - 0.15;
  const hi = Math.max(...pts, obs) + 0.15;
  const pad = 4;
  const X = (i: number) => pad + (i / (pts.length - 1)) * (width - pad * 2 - 8);
  const Y = (v: number) => height - pad - ((v - lo) / (hi - lo)) * (height - pad * 2);
  const d = pts.map((v, i) => (i === 0 ? `M${X(0)},${Y(v)}` : `V${Y(v)}H${X(i)}`)).join("");
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <line x1={0} x2={width} y1={Y(obs)} y2={Y(obs)} stroke="rgb(242 241 234 / 0.45)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke="#e9b949" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <rect x={X(pts.length - 1) + 1} y={Y(j.final) - 4} width="8" height="8" transform={`rotate(45 ${X(pts.length - 1) + 5} ${Y(j.final)})`} fill="#050605" stroke="#e9b949" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
