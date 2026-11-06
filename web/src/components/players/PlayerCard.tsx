/* eslint-disable @next/next/no-img-element -- local, pre-sized card portraits */
import type { CSSProperties } from "react";
import type { TierName } from "@/lib/football";
import { formatEur } from "@/lib/format";
import { guilloche } from "@/lib/guilloche";
import type { Portrait } from "@/lib/portraits";
import { Flag } from "@/components/brand/Flag";
import { ModelMark, Residual, TierMark } from "@/components/brand/Marks";
import styles from "./PlayerCard.module.css";

// Ink follows the value tier: a way to read the denomination, not a rarity or a rating.
const INK: Record<TierName, "gold" | "silver" | "green"> = { "World Class": "gold", Elite: "silver", Established: "green", Emerging: "green" };

// Log ruler, €100k to €200M, with the tier boundaries (the lane's scale, narrowed).
const LO = Math.log(1e5);
const HI = Math.log(2e8);
const pos = (v: number) => Math.min(100, Math.max(0, ((Math.log(v) - LO) / (HI - LO)) * 100));
const TICKS: [number, string][] = [[2e6, "€2M"], [1e7, "€10M"], [3e7, "€30M"]];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts.length > 1 ? parts[0]![0]! : "") + parts[parts.length - 1]![0]!).toUpperCase();
}

interface Props {
  id: number;
  name: string;
  firstName: string | null;
  lastName: string;
  roleCode: string;
  club: string | null;
  nationality: string | null;
  tier: TierName | null;
  observed: number;
  /** Model A, held-out. Null means this build has no held-out estimate for the player. */
  modelA: number | null;
  valuedLabel: string;
  portrait: Portrait | null;
}

const W = 360;
const H = 504;

/**
 * Direction C, "The Denomination" (D-053): the observed value is the card's face value, printed on
 * security-style paper. Card faces show Transfermarkt's value, the held-out Model A estimate and the
 * residual; nothing here is a rating or a claim about the player. Without a portrait the engraved
 * monogram takes the arch.
 */
export function PlayerCard({ id, name, firstName, lastName, roleCode, club, nationality, tier, observed, modelA, valuedLabel, portrait }: Props) {
  const ink = tier ? INK[tier] : "green";
  const g = guilloche(W, H, 200, 160, 158);
  const mono = guilloche(248, 290, 124, 150, 92, { noField: true });
  const value = formatEur(observed);
  const unit = /[Mk]$/.test(value) ? value.slice(-1) : "";
  const num = value.replace("€", "").replace(/[Mk]$/, "");
  const micro = `FAIRVALUE · TRANSFERMARKT VALUATION ${valuedLabel.toUpperCase()} · ${modelA !== null ? `MODEL A HELD-OUT ${formatEur(modelA)} · ` : ""}`;
  const pa = pos(observed);
  const pb = modelA !== null ? pos(modelA) : null;

  return (
    <article className={styles.card} data-ink={ink} aria-label={`${name}, observed value ${value}`} style={{ "--obs": `${pa}%` } as CSSProperties}>
      <div className={styles.paper}>
        <svg className={styles.guil} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {g.field.map((d, i) => <path key={`f${i}`} className={styles.f} d={d} />)}
          {g.rings.map((d, i) => <path key={`r${i}`} className={styles.r} d={d} />)}
        </svg>
      </div>
      <p className={styles.micro} aria-hidden="true">{micro.repeat(3)}</p>

      <div className={styles.arch} data-empty={portrait ? undefined : ""}>
        {portrait ? (
          <>
            <img src={portrait.src} width={portrait.width} height={portrait.height} alt={`Portrait of ${name}`} decoding="async" loading="lazy" className={styles.photo} data-ink={ink} />
            <i className={styles.screen} />
          </>
        ) : (
          <>
            <svg className={styles.guil} viewBox="0 0 248 290" aria-hidden="true">
              {mono.rings.map((d, i) => <path key={i} className={styles.r} d={d} />)}
            </svg>
            <span className={styles.mono} aria-hidden="true">{initials(name)}</span>
          </>
        )}
      </div>

      <div className={styles.denom} aria-hidden="true">
        {unit && <span className={styles.unit}>{unit}</span>}
        <span className={styles.figure}>{num}</span>
        <span className={styles.cur}>€</span>
      </div>

      <div className={styles.thread} aria-hidden="true">
        <div className={styles.ruler}>
          <i className={styles.rl} />
          {TICKS.map(([v, label]) => (
            <i key={v} className={styles.tk} style={{ left: `${pos(v)}%` }}><em>{label}</em></i>
          ))}
          {pb !== null && <i className={styles.seg} style={{ left: `${Math.min(pa, pb)}%`, width: `${Math.abs(pa - pb)}%` }} />}
          {pb !== null && <i className={styles.mkA} style={{ left: `${pb}%` }} />}
          <i className={styles.mkO} style={{ left: `${pa}%` }} />
        </div>
      </div>

      <div className={styles.id}>
        {firstName && <p className={styles.first}>{firstName}</p>}
        <p className={styles.last}>{lastName}</p>
        <p className={styles.meta}>
          <span className="fv-role">{roleCode}</span>
          {nationality && <Flag country={nationality} />}
          <span>{[nationality, club].filter(Boolean).join(" · ")}</span>
        </p>
      </div>

      <div className={styles.foot}>
        <span className={styles.serial}>№ {id}</span>
        <span className={styles.tier}><TierMark tier={tier} /></span>
        <span className={styles.model}>
          {modelA !== null ? (
            <>
              <ModelMark model="A" /> {formatEur(modelA)} <Residual value={Math.log(observed) - Math.log(modelA)} compact basis="held-out" />
            </>
          ) : (
            "Model A: live only"
          )}
        </span>
      </div>
      {portrait?.unlicensed && portrait.closeup && <p className={styles.note}>Close-up</p>}
    </article>
  );
}
