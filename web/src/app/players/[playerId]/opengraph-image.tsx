import { ImageResponse } from "next/og";
import { leagueName } from "@/lib/football";
import { formatEur, signed } from "@/lib/format";
import { idFromParam } from "@/lib/players";
import { playerById } from "@/lib/players.server";
import { relativeTo } from "@/lib/reading";
import { logScaleFor, pathOf, pitchDrawing, shortName, squareToQuad, type Quad } from "@/lib/theatre";

// The share card for a dossier link: the player's valuation lane, observed value against Model A.
// Built only from the export (no new figures). Nationality is left out: a residual is shown (D-042).
// Rendered with next/og's bundled Geist; the brand faces ship as woff2, which the renderer cannot read.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FairValue player dossier: observed market value against the Model A estimate";

const GOLD = "#e9b949";
const CHALK = "#edefe6";
const FOG = "#8f9b93";

// Lane geometry inside a 540 × 300 box on the right of the card.
const LW = 540;
const LH = 300;
const QUAD: Quad = [
  { x: 10, y: 270 },
  { x: 530, y: 256 },
  { x: 478, y: 70 },
  { x: 70, y: 80 },
];
const P = squareToQuad(QUAD);
const PITCH = pitchDrawing(P, { stripes: 10 });

function Disc({ size: s = 18 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 10 10">
      <circle cx="5" cy="5" r="4.2" fill={CHALK} stroke="#0b100d" strokeWidth="1.2" />
    </svg>
  );
}
function Diamond({ size: s = 20 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 12 12">
      <path d="M6 1 11 6 6 11 1 6Z" fill="#0b100d" stroke={GOLD} strokeWidth="1.8" />
    </svg>
  );
}

export default async function Image({ params }: { params: Promise<{ playerId: string }> }) {
  const id = idFromParam((await params).playerId);
  const p = id === null ? undefined : playerById(id);

  if (!p) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#0a110d", color: CHALK, fontSize: 56 }}>
          FairValue · player not found
        </div>
      ),
      size,
    );
  }

  const heldout = p.estimates.heldout.A;
  const estimate = heldout ?? p.estimates.served.A;
  const basis = heldout !== null ? "held-out" : "served, in-sample";
  const league = leagueName(p.league_id).split(",")[0]!;
  const r = estimate ? Math.log(p.market_value_eur) - Math.log(estimate) : null;

  // The lane: observed line, Model A diamond and the arc between them.
  const scale = logScaleFor([p.market_value_eur, ...(estimate ? [estimate] : [])], 1.32, 4);
  const u = (eur: number) => 0.08 + scale.at(eur) * 0.84;
  const v = 0.45;
  const obs = P(u(p.market_value_eur), v);
  const est = estimate ? P(u(estimate), v) : null;
  const lift = est ? 16 + Math.min(40, Math.abs(obs.x - est.x) * 0.12) : 0;
  const mid = est ? { x: (obs.x + est.x) / 2, y: (obs.y + est.y) / 2 } : obs;
  const ticks = scale.ticks.map((t) => ({ t, ...P(u(t), -0.14) }));

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "56px 60px",
          background: "radial-gradient(circle at 82% 8%, rgba(233,185,73,0.18), rgba(10,17,13,0) 55%), linear-gradient(180deg, #0f1814, #0a110d)",
          color: CHALK,
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 560, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 20, letterSpacing: 4, color: GOLD }}>
              <div style={{ display: "flex", padding: "4px 14px", background: GOLD, color: "#1b1505" }}>FAIRVALUE</div>
              PLAYER DOSSIER
            </div>
            <div style={{ display: "flex", marginTop: 30, fontSize: 30, color: "#c3cbc3" }}>{p.first_name || " "}</div>
            <div style={{ display: "flex", fontSize: p.last_name.length > 11 ? 74 : 100, lineHeight: 0.95, letterSpacing: -1, textTransform: "uppercase" }}>{shortName(p)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18, fontSize: 24, color: "#c3cbc3" }}>
              {/* league shown on its own line below */}
              <div style={{ display: "flex", flexShrink: 0, padding: "2px 12px", background: GOLD, color: "#1b1505", fontSize: 22 }}>{p.role_code}</div>
              <div style={{ display: "flex" }}>
                {p.sub_position} · {p.club ?? league}
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 22, color: FOG }}>{league}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Disc />
              <div style={{ display: "flex", fontSize: 22, color: FOG, width: 250 }}>Observed market value</div>
              <div style={{ display: "flex", fontSize: 46 }}>{formatEur(p.market_value_eur)}</div>
            </div>
            {estimate && (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Diamond />
                <div style={{ display: "flex", fontSize: 22, color: FOG, width: 250 }}>Model A · {basis}</div>
                <div style={{ display: "flex", fontSize: 46, color: GOLD }}>{formatEur(estimate)}</div>
              </div>
            )}
            {r !== null && estimate && (
              <div style={{ display: "flex", fontSize: 22, color: "#c3cbc3", marginTop: 4 }}>
                Residual {signed(r, 3)}: the market value is {relativeTo(p.market_value_eur, estimate)} the estimate.
              </div>
            )}
            <div style={{ display: "flex", fontSize: 17, color: FOG, marginTop: 6 }}>A gap describes the model&apos;s arithmetic, not what the player is worth.</div>
          </div>
        </div>

        <div style={{ display: "flex", position: "relative", width: LW, height: LH, marginLeft: 20, marginTop: 120 }}>
          <svg width={LW} height={LH} viewBox={`0 0 ${LW} ${LH}`}>
            <path d={PITCH.outline} fill="#142019" />
            {PITCH.stripes.map((d, i) => (
              <path key={i} d={d} fill="rgba(237,239,230,0.03)" />
            ))}
            {PITCH.markings.map((d, i) => (
              <path key={`m${i}`} d={d} fill="none" stroke="rgba(237,239,230,0.35)" strokeWidth="1.4" />
            ))}
            <path d={PITCH.line(u(p.market_value_eur), -0.02, u(p.market_value_eur), 1.02)} stroke="rgba(237,239,230,0.6)" strokeWidth="1.4" strokeDasharray="3 5" fill="none" />
            {ticks.map(({ t }) => (
              <path key={t} d={PITCH.line(u(t), 0, u(t), -0.07)} stroke="rgba(237,239,230,0.55)" strokeWidth="1.4" fill="none" />
            ))}
            {est && (
              <>
                <path d={pathOf([est, obs])} stroke="rgba(233,185,73,0.3)" strokeWidth="4" fill="none" />
                <path d={`M ${est.x} ${est.y} Q ${mid.x} ${mid.y - lift * 2} ${obs.x} ${obs.y}`} stroke={GOLD} strokeWidth="3.5" fill="none" />
                <path d={`M ${est.x} ${est.y - 14} L ${est.x + 14} ${est.y} L ${est.x} ${est.y + 14} L ${est.x - 14} ${est.y} Z`} fill="#0b100d" stroke={GOLD} strokeWidth="3.5" />
              </>
            )}
            <circle cx={obs.x} cy={obs.y} r="11" fill={CHALK} stroke="#0b100d" strokeWidth="2.5" />
          </svg>
          {ticks.map(({ t, x, y }) => (
            <div key={t} style={{ display: "flex", position: "absolute", left: x - 40, top: y - 6, width: 80, justifyContent: "center", fontSize: 17, color: "#c3cbc3" }}>
              {formatEur(t)}
            </div>
          ))}
          {r !== null && (
            <div style={{ display: "flex", position: "absolute", left: mid.x - 70, top: mid.y - lift - 44, width: 140, justifyContent: "center", fontSize: 24, color: CHALK }}>
              {signed(r, 2)}
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
