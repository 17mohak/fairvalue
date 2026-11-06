import { ImageResponse } from "next/og";
import { PRIMARY_GAP, research } from "@/lib/research";

// The site-wide share card (LinkedIn, X, Slack previews) for every page without its own; dossiers
// keep their per-player card. Every figure is read from the research export, never typed in here.
// Rendered with next/og's bundled Geist; the brand faces ship as woff2, which the renderer cannot read.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FairValue: price the player, audit the price. The headline fairness gap from held-out predictions.";

const GOLD = "#e9b949";
const CHALK = "#edefe6";
const FOG = "#8f9b93";
const INK = "#0a110d";

const fmt = (x: number) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(3);

export default function Image() {
  const funnel = research.population.funnel;
  const players = funnel[funnel.length - 1]!.total.toLocaleString("en-GB");
  const leagues = research.market.leagues.length;
  const gap = PRIMARY_GAP;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: INK, color: CHALK, padding: "56px 64px", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 22, letterSpacing: 3, color: FOG }}>
          <div style={{ display: "flex", background: GOLD, color: INK, padding: "6px 14px", fontWeight: 700 }}>FAIRVALUE</div>
          <div style={{ display: "flex" }}>
            2025–26 SNAPSHOT · {leagues} LEAGUES · {players} PLAYERS
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontSize: 88, lineHeight: 1, letterSpacing: -1 }}>
          <div style={{ display: "flex" }}>PRICE THE PLAYER.</div>
          <div style={{ display: "flex", color: GOLD }}>AUDIT THE PRICE.</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div style={{ display: "flex", fontSize: 112, color: GOLD, lineHeight: 1, letterSpacing: -3 }}>{fmt(gap.estimate)}</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 26, lineHeight: 1.35, color: CHALK }}>
            <div style={{ display: "flex" }}>Non-UEFA minus UEFA players, within leagues:</div>
            <div style={{ display: "flex", color: FOG }}>market value above a nationality-blind model</div>
            <div style={{ display: "flex", color: FOG }}>
              log units · 95% CI {gap.low.toFixed(3)} to {gap.high.toFixed(3)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: FOG, borderTop: `1px solid rgba(237,239,230,0.15)`, paddingTop: 18 }}>
          <div style={{ display: "flex" }}>Held-out predictions · an association in a selected population, not evidence of discrimination</div>
        </div>
      </div>
    ),
    size,
  );
}
