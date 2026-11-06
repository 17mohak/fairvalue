import Link from "next/link";
import { Suspense } from "react";
import { UrlSelect } from "@/components/terminal/UrlControls";
import { WorkspaceHead } from "@/components/terminal/WorkspaceHead";
import { leagueName, POSITIONS } from "@/lib/football";
import { formatEur, integer, signed } from "@/lib/format";
import { factor } from "@/lib/journey";
import { playerSet } from "@/lib/players.server";
import { heldOutLogMae } from "@/lib/research";
import styles from "../landscape.module.css";
import d from "./discrepancies.module.css";

export const metadata = { title: "Discrepancy Explorer" };

type SP = Record<string, string | string[] | undefined>;
const one = (sp: SP, k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";

export default async function DiscrepanciesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const set = playerSet();
  // One basis per ranking, never mixed: held-out where the export has it, else the served model.
  const basis: "heldout" | "served" = set.source === "full" ? "heldout" : "served";
  const model = one(sp, "model") === "B" ? "B" : "A";
  const position = POSITIONS.find((p) => p === one(sp, "position")) ?? "";
  const league = /^[A-Z0-9]{2,5}$/.test(one(sp, "league")) ? one(sp, "league") : "";
  const side = one(sp, "side") === "above" || one(sp, "side") === "below" ? one(sp, "side") : "";
  const order = one(sp, "order") === "below" ? "below" : one(sp, "order") === "size" ? "size" : "above";

  const all = set.players
    .map((p) => {
      const est = p.estimates[basis][model];
      return est ? { p, est, r: Math.log(p.market_value_eur) - Math.log(est) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const modelAvailable = { A: set.players.some((p) => p.estimates[basis].A !== null), B: set.players.some((p) => p.estimates[basis].B !== null) };
  const rows = all
    .filter((x) => (!position || x.p.position === position) && (!league || x.p.league_id === league) && (!side || (side === "above" ? x.r > 0 : x.r < 0)))
    .sort((a, b) => (order === "size" ? Math.abs(b.r) - Math.abs(a.r) : order === "below" ? a.r - b.r : b.r - a.r))
    .slice(0, 100);
  const max = Math.max(0.1, ...rows.map((x) => Math.abs(x.r))) * 1.08;
  const mae = heldOutLogMae(model);
  const leagues = [...new Set(set.players.map((p) => p.league_id))].sort((a, b) => leagueName(a).localeCompare(leagueName(b)));

  return (
    <div className={styles.page}>
      <WorkspaceHead id="discrepancies" note="Where a player's observed value and the model's estimate part ways. A residual is a disagreement between a model and Transfermarkt's valuation, not a verdict on the player or the price." />

      <div className={d.terms}>
        <p>
          <b className={d.pos}>Positive residual</b> observed value exceeds the estimate: the model <em>under-predicts</em>.
        </p>
        <p>
          <b className={d.neg}>Negative residual</b> observed value is below the estimate: the model <em>over-predicts</em>.
        </p>
        <p>
          Residual = log(observed) − log(estimate). A typical held-out miss for Model {model} is <b>{factor(mae)}</b> either way (mean absolute log error{" "}
          {mae.toFixed(3)}).
        </p>
      </div>

      {basis === "served" && (
        <p className={styles.warn}>
          <b>In-sample.</b> This build has the showcase export only, so these residuals use the served model&apos;s cached estimates for players it was
          trained on. They run smaller than honest held-out residuals and only illustrate the view; the full local export ranks held-out residuals.
        </p>
      )}

      <section className="tm-panel" aria-labelledby="dx-list">
        <header className="tm-panel-head">
          <h2 id="dx-list" className="tm-title">
            Residuals · Model {model} · {basis === "heldout" ? "held-out" : "served, in-sample"}
          </h2>
          <div className={d.controls}>
            <Suspense>
              <UrlSelect
                name="model"
                label="Model"
                value={model === "A" ? "" : "B"}
                options={[{ value: "", label: "Model A" }, ...(modelAvailable.B ? [{ value: "B", label: "Model B" }] : [])]}
              />
              <UrlSelect name="position" label="Position" value={position} options={[{ value: "", label: "All" }, ...POSITIONS.map((p) => ({ value: p, label: p }))]} />
              <UrlSelect name="league" label="League" value={league} options={[{ value: "", label: "All" }, ...leagues.map((l) => ({ value: l, label: leagueName(l).split(",")[0]! }))]} />
              <UrlSelect
                name="side"
                label="Side"
                value={side}
                options={[
                  { value: "", label: "Both" },
                  { value: "above", label: "Observed above" },
                  { value: "below", label: "Observed below" },
                ]}
              />
              <UrlSelect
                name="order"
                label="Order"
                value={order === "above" ? "" : order}
                options={[
                  { value: "", label: "Most above first" },
                  { value: "below", label: "Most below first" },
                  { value: "size", label: "Largest either way" },
                ]}
              />
            </Suspense>
          </div>
        </header>
        {!modelAvailable.B && model === "A" && <p className={d.subnote}>Model B residuals need held-out or served Model B estimates, which this export does not carry.</p>}
        {rows.length === 0 ? (
          <div className="tm-empty">
            <b>No players match.</b>
            <Link href="/terminal/discrepancies" className="tm-btn">
              Clear filters
            </Link>
          </div>
        ) : (
          <ol className={d.list}>
            <li className={d.axis} aria-hidden="true">
              <span />
              <span className={d.axisTrack}>
                <i style={{ left: "0%" }}>{factor(-max)}</i>
                <i style={{ left: "25%" }}>{factor(-max / 2)}</i>
                <i style={{ left: "50%" }}>×1</i>
                <i style={{ left: "75%" }}>{factor(max / 2)}</i>
                <i style={{ left: "100%" }}>{factor(max)}</i>
              </span>
              <span>Observed · estimate</span>
            </li>
            {rows.map(({ p, est, r }) => (
              <li key={p.id} className={d.row}>
                <Link href={`/players/${p.slug}?from=terminal`} className={d.who} transitionTypes={["to-dossier"]}>
                  <span className="fv-role">{p.role_code}</span>
                  <span>
                    <b>{p.name}</b>
                    <small>
                      {p.sub_position} · {leagueName(p.league_id).split(",")[0]}
                    </small>
                  </span>
                </Link>
                <span className={d.track} title={`Residual ${signed(r, 3)} (${factor(r)})`}>
                  <i className={d.zero} />
                  <span className={d.bar} data-sign={r >= 0 ? "pos" : "neg"} style={r >= 0 ? { left: "50%", width: `${(r / max) * 50}%` } : { right: "50%", width: `${(-r / max) * 50}%` }} />
                  <span className={d.label} data-sign={r >= 0 ? "pos" : "neg"} style={r >= 0 ? { left: `calc(50% + ${(r / max) * 50}% + 0.4rem)` } : { right: `calc(50% + ${(-r / max) * 50}% + 0.4rem)` }}>
                    {signed(r, 2)} <small>{factor(r)}</small>
                  </span>
                </span>
                <span className={`${d.vals} num`}>
                  <b>{formatEur(p.market_value_eur)}</b>
                  <small>est. {formatEur(est)}</small>
                </span>
                <span className={d.reading}>
                  {r >= 0 ? "Observed above estimate" : "Observed below estimate"}
                  <small>{r >= 0 ? "model under-predicts" : "model over-predicts"}</small>
                </span>
              </li>
            ))}
          </ol>
        )}
        <div className="tm-panel-body">
          <p className="tm-note">
            {integer(rows.length)} of {integer(all.length)} players shown{all.length > 100 ? " (at most 100)" : ""}. A large residual can reflect anything the model does not see, such as injuries, contract situations or reputation, as well as gaps in the data. Group-level patterns in these
            residuals are studied, with uncertainty, in the{" "}
            <Link href="/terminal/audit" transitionTypes={["ws"]}>
              Fairness Audit
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
