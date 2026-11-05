"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ValuationJourney } from "@/components/journey/ValuationJourney";
import { MiniRuler } from "@/components/players/MiniRuler";
import { leagueName } from "@/lib/football";
import { formatEur, integer } from "@/lib/format";
import type { PlayerProfile } from "@/lib/players";
import { CompareToggle, WatchButton } from "./PlayerActions";
import styles from "./Inspector.module.css";

const cache = new Map<number, PlayerProfile>();

type State = { status: "loading" } | { status: "error" } | { status: "ready"; player: PlayerProfile };

/** A quick read of one player beside the table: the same record the dossier shows, condensed. */
export function Inspector({ id, onClose }: { id: number; onClose: () => void }) {
  const [state, setState] = useState<State>(() => (cache.has(id) ? { status: "ready", player: cache.get(id)! } : { status: "loading" }));
  const [shownId, setShownId] = useState(id);
  const panel = useRef<HTMLElement>(null);

  if (shownId !== id) {
    setShownId(id);
    setState(cache.has(id) ? { status: "ready", player: cache.get(id)! } : { status: "loading" });
  }

  useEffect(() => {
    if (cache.has(id)) return;
    let live = true;
    fetch(`/api/players/${id}`)
      .then((r) => (r.ok ? (r.json() as Promise<PlayerProfile>) : Promise.reject(new Error(String(r.status)))))
      .then((p) => {
        cache.set(id, p);
        if (live) setState({ status: "ready", player: p });
      })
      .catch(() => live && setState({ status: "error" }));
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("dialog[open]") && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside ref={panel} className={styles.inspector} aria-label="Player inspector" aria-busy={state.status === "loading"}>
      <div className={styles.bar}>
        <span className="tm-title">Inspector</span>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close inspector">
          ×
        </button>
      </div>
      {state.status === "loading" && (
        <div className={styles.body}>
          <div className="fv-skeleton" style={{ height: "2.6rem" }} />
          <div className="fv-skeleton" style={{ height: "4.5rem" }} />
          <div className="fv-skeleton" style={{ height: "12rem" }} />
        </div>
      )}
      {state.status === "error" && (
        <div className={styles.body}>
          <p className="tm-note">This player could not be loaded from the export. Try again, or open the dossier directly.</p>
        </div>
      )}
      {state.status === "ready" && <Body p={state.player} />}
    </aside>
  );
}

function Body({ p }: { p: PlayerProfile }) {
  const a = p.estimates.heldout.A ?? p.estimates.served.A;
  const aSource = p.estimates.heldout.A !== null ? "held-out (cross-validated)" : p.estimates.served.A !== null ? "served model, cached; in-sample" : null;
  const b = p.estimates.heldout.B ?? p.estimates.served.B;
  return (
    <div className={styles.body}>
      <header className={styles.who}>
        <span className="fv-role">{p.role_code}</span>
        <div>
          <h2>{p.name}</h2>
          <p>
            {p.sub_position} · {p.club ?? leagueName(p.league_id)} · {Math.floor(p.age)} yrs
          </p>
        </div>
      </header>

      <section className={styles.values} aria-label="Valuation">
        <div>
          <p className="fv-label">Observed market value</p>
          <p className={`${styles.market} num`}>{formatEur(p.market_value_eur)}</p>
          {p.market_tier && <span className="fv-chip" data-tone="flood">{p.market_tier}</span>}
        </div>
        <dl className={styles.estimates}>
          <div>
            <dt>Model A</dt>
            <dd className="num">{a !== null ? formatEur(a) : "–"}</dd>
            <dd className={styles.src}>{aSource ?? "needs the live service"}</dd>
          </div>
          <div>
            <dt>Model B</dt>
            <dd className="num">{b !== null ? formatEur(b) : "–"}</dd>
            <dd className={styles.src}>{b !== null ? (p.estimates.heldout.B !== null ? "held-out" : "served, cached") : "live service or full export"}</dd>
          </div>
        </dl>
        <MiniRuler
          showScale
          marks={[{ value: p.market_value_eur, kind: "market", label: "Market value" }, ...(a !== null ? [{ value: a, kind: "model" as const, label: "Model A" }] : [])]}
        />
      </section>

      {p.explanation ? (
        <section className={styles.section} aria-label="Valuation journey">
          <p className="tm-title">Valuation journey · Model {p.explanation.model}</p>
          <ValuationJourney
            variant="compact"
            explanation={p.explanation}
            observed={p.market_value_eur}
            subject={p.last_name}
            provenance="Served Model A, published SHAP run; this player was in its training data."
          />
        </section>
      ) : (
        <p className="tm-note">No published explanation for this player; the dossier can request one from the live service.</p>
      )}

      <dl className={styles.record}>
        <div>
          <dt>Apps</dt>
          <dd className="num">{p.window.appearances}</dd>
        </div>
        <div>
          <dt>Minutes</dt>
          <dd className="num">{integer(p.window.minutes)}</dd>
        </div>
        {p.position !== "Goalkeeper" && (
          <>
            <div>
              <dt>Goals</dt>
              <dd className="num">{p.window.goals ?? "–"}</dd>
            </div>
            <div>
              <dt>Assists</dt>
              <dd className="num">{p.window.assists ?? "–"}</dd>
            </div>
          </>
        )}
        <div>
          <dt>Started</dt>
          <dd className="num">{p.window.started}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <Link href={`/players/${p.slug}?from=terminal`} className="tm-btn" data-tone="gold" transitionTypes={["to-dossier"]}>
          Open dossier →
        </Link>
        <CompareToggle id={p.id} name={p.name} className="tm-btn" withLabel />
        <WatchButton id={p.id} name={p.name} className="tm-btn" withLabel />
      </div>
    </div>
  );
}
