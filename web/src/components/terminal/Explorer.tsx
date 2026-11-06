"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ModelMark, ObsMark, Residual, TierMark } from "@/components/brand/Marks";
import { MiniRuler } from "@/components/players/MiniRuler";
import { compareTray } from "@/lib/localStore";
import { DEFAULT_DIR, explorerParams, type ExplorerQuery, type ExplorerRow, type ExplorerSort } from "@/lib/explorer";
import { encodeSequence, explorerSequence } from "@/lib/sequence";
import { leagueName, TIER_NAMES } from "@/lib/football";
import { formatEur, integer } from "@/lib/format";
import { COMPARE_MIN } from "@/lib/terminal";
import { Inspector } from "./Inspector";
import { CompareToggle, useCompareTray, WatchButton } from "./PlayerActions";
import styles from "./Explorer.module.css";
import { LeagueFlag } from "@/components/brand/Flag";
import { PlayerChip } from "@/components/players/PlayerChip";
import { portraitFor } from "@/lib/portraits";

const POSITIONS = [
  { value: "", label: "All" },
  { value: "Goalkeeper", label: "GK" },
  { value: "Defender", label: "DEF" },
  { value: "Midfield", label: "MID" },
  { value: "Attack", label: "ATT" },
] as const;

interface Props {
  query: ExplorerQuery;
  rows: ExplorerRow[];
  count: number;
  total: number;
  page: number;
  pages: number;
  leagues: string[];
}

const COLUMNS: { key: ExplorerSort | null; label: string; num?: boolean; title?: string; col?: string }[] = [
  { key: "name", label: "Player" },
  { key: null, label: "League", col: "league" },
  { key: "age", label: "Age", num: true },
  { key: "minutes", label: "Min", num: true, title: "Club minutes, two years to the valuation date" },
  { key: null, label: "Apps", num: true, col: "apps" },
  { key: "g90", label: "G/90", num: true },
  { key: "a90", label: "A/90", num: true },
  { key: "value", label: "Market value", num: true, title: "Observed Transfermarkt value: the model's target" },
  { key: null, label: "Tier" },
  { key: "model", label: "Model A", num: true, title: "Held-out estimate where exported, else the cached served result" },
];

/** The Player Explorer: every control writes the URL, so a view is linkable and survives reload. */
export function Explorer({ query, rows, count, total, page, pages, leagues }: Props) {
  const router = useRouter();
  const path = usePathname() ?? "/terminal";
  const [pending, start] = useTransition();
  // The dossier steps through this exact view (filters and sort) with previous / next.
  const seqParam = encodeURIComponent(encodeSequence(explorerSequence(explorerParams(query))));
  const [text, setText] = useState(query.q);
  const [focus, setFocus] = useState<number | null>(query.focus);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tray = useCompareTray();
  const tableRef = useRef<HTMLTableSectionElement>(null);

  const go = (patch: Partial<ExplorerQuery>) => {
    const next = { ...query, page: 1, ...patch, focus };
    const s = explorerParams(next).toString();
    start(() => router.replace(s ? `${path}?${s}` : path, { scroll: false }));
  };

  // Follow the URL when it changes underneath us (back/forward, a link).
  const [seen, setSeen] = useState(query.q);
  if (seen !== query.q) {
    setSeen(query.q);
    setText(query.q);
  }

  const onSearch = (v: string) => {
    setText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ q: v }), 220);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const openInspector = (id: number | null) => {
    setFocus(id);
    // The inspector is client state; record it in the URL without a server round-trip.
    const s = explorerParams({ ...query, focus: id }).toString();
    window.history.replaceState(null, "", s ? `${path}?${s}` : path);
  };

  const sortBy = (k: ExplorerSort) => go({ sort: k, dir: k === query.sort ? (query.dir === "asc" ? "desc" : "asc") : DEFAULT_DIR[k], page: query.page });

  const num = (k: "ageMin" | "ageMax" | "minMinutes" | "valueMin" | "valueMax", scale = 1) => ({
    value: query[k],
    scale,
    onCommit: (n: number | null) => go({ [k]: n } as Partial<ExplorerQuery>),
  });

  const onRowKey = (e: React.KeyboardEvent<HTMLTableRowElement>, id: number) => {
    if (e.key === "Enter") openInspector(id);
    const rowsEls = [...(tableRef.current?.querySelectorAll<HTMLTableRowElement>("tr[tabindex]") ?? [])];
    const i = rowsEls.indexOf(e.currentTarget);
    if (e.key === "ArrowDown" && rowsEls[i + 1]) (e.preventDefault(), rowsEls[i + 1]!.focus());
    if (e.key === "ArrowUp" && rowsEls[i - 1]) (e.preventDefault(), rowsEls[i - 1]!.focus());
  };

  const filtered = !!(query.q || query.position || query.league || query.tier || query.ageMin !== null || query.ageMax !== null || query.minMinutes !== null || query.valueMin !== null || query.valueMax !== null);

  return (
    <div className={styles.explorer} data-inspecting={focus !== null || undefined}>
      <div className={styles.toolbar} role="search" aria-label="Filter players">
        <input className={`tm-input ${styles.search}`} type="search" placeholder="Name, club or role" aria-label="Search players" value={text} onChange={(e) => onSearch(e.target.value)} />
        <div className={styles.seg} role="group" aria-label="Position">
          {POSITIONS.map((p) => (
            <button key={p.value} type="button" aria-pressed={query.position === p.value} onClick={() => go({ position: p.value })}>
              {p.label}
            </button>
          ))}
        </div>
        <select className="tm-select" aria-label="League" value={query.league} onChange={(e) => go({ league: e.target.value })}>
          <option value="">All leagues</option>
          {leagues.map((l) => (
            <option key={l} value={l}>
              {leagueName(l)}
            </option>
          ))}
        </select>
        <select className="tm-select" aria-label="Valuation tier" value={query.tier} onChange={(e) => go({ tier: e.target.value as ExplorerQuery["tier"] })}>
          <option value="">All tiers</option>
          {TIER_NAMES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <fieldset className={styles.range}>
          <legend>Age</legend>
          <NumField inputMode="decimal" min={15} max={45} placeholder="min" aria-label="Minimum age" {...num("ageMin")} />
          <span aria-hidden="true">–</span>
          <NumField inputMode="decimal" min={15} max={45} placeholder="max" aria-label="Maximum age" {...num("ageMax")} />
        </fieldset>
        <fieldset className={styles.range}>
          <legend>Min. minutes</legend>
          <NumField inputMode="numeric" min={0} step={90} placeholder="450" aria-label="Minimum club minutes" {...num("minMinutes")} />
        </fieldset>
        <fieldset className={styles.range}>
          <legend>Value €M</legend>
          <NumField inputMode="decimal" min={0} placeholder="min" aria-label="Minimum market value, € million" {...num("valueMin", 1e6)} />
          <span aria-hidden="true">–</span>
          <NumField inputMode="decimal" min={0} placeholder="max" aria-label="Maximum market value, € million" {...num("valueMax", 1e6)} />
        </fieldset>
        <div className={styles.toolEnd}>
          <p className={styles.count} aria-live="polite">
            <b className="num">{integer(count)}</b> of {integer(total)} players
          </p>
          {filtered && (
            <Link href={path} className={styles.reset} scroll={false}>
              Reset
            </Link>
          )}
          <div className={styles.seg} role="group" aria-label="View">
            <button type="button" aria-pressed={query.view === "table"} onClick={() => go({ view: "table", page: query.page })}>
              Table
            </button>
            <button type="button" aria-pressed={query.view === "cards"} onClick={() => go({ view: "cards", page: query.page })}>
              Cards
            </button>
          </div>
        </div>
      </div>

      <div className={styles.tray} data-active={tray.length > 0 || undefined}>
        <span className={styles.trayLabel}>Comparison</span>
        {tray.length === 0 ? (
          <span className={styles.trayHint}>Tick up to four players to compare them on one scale.</span>
        ) : (
          <span className={styles.trayHint}>
            <b className="num">{tray.length}</b> selected {tray.length < COMPARE_MIN ? "· pick at least two" : ""}
          </span>
        )}
        <span className={styles.trayEnd}>
          {tray.length > 0 && (
            <button type="button" className="tm-btn" onClick={() => compareTray.set([])}>
              Clear
            </button>
          )}
          {tray.length >= COMPARE_MIN ? (
            <Link href={`/terminal/compare?ids=${tray.join(",")}`} className="tm-btn" data-tone="gold" transitionTypes={["ws"]}>
              Compare {tray.length} →
            </Link>
          ) : (
            <span className="tm-btn" data-tone="gold" aria-disabled="true">
              Compare
            </span>
          )}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.results} data-pending={pending || undefined}>
          {rows.length === 0 ? (
            <div className="tm-empty">
              <b>No players match these filters.</b>
              <span>{total < 100 ? `This build carries the ${total}-player showcase export, so most combinations are empty.` : "Loosen a filter to see more."}</span>
              <Link href={path} className="tm-btn">
                Reset filters
              </Link>
            </div>
          ) : query.view === "table" ? (
            <div className={styles.tableWrap}>
              <table className="tm-table">
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="visually-hidden">Compare</span>
                    </th>
                    {COLUMNS.map((c) => (
                      <th
                        key={c.label}
                        scope="col"
                        data-num={c.num || undefined}
                        data-col={c.col}
                        aria-sort={c.key && c.key === query.sort ? (query.dir === "asc" ? "ascending" : "descending") : undefined}
                        title={c.title}
                      >
                        {c.key ? (
                          <button type="button" className={styles.sort} onClick={() => sortBy(c.key!)} data-active={c.key === query.sort || undefined}>
                            {c.label}
                            <span aria-hidden="true">{c.key === query.sort ? (query.dir === "asc" ? "▲" : "▼") : "↕"}</span>
                          </button>
                        ) : (
                          c.label
                        )}
                      </th>
                    ))}
                    <th scope="col" data-num data-col="ratio" title="Residual: log(observed) − log(Model A). ▲ observed above the estimate, ▼ below it">
                      Obs vs A
                    </th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody ref={tableRef}>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      tabIndex={0}
                      data-focus={focus === r.id || undefined}
                      onClick={() => openInspector(r.id)}
                      onKeyDown={(e) => onRowKey(e, r.id)}
                      aria-label={`${r.name}, ${r.sub_position}, ${formatEur(r.market_value_eur)}. Press Enter to inspect.`}
                    >
                      <td>
                        <CompareToggle id={r.id} name={r.name} className={styles.check} />
                      </td>
                      <td>
                        <span className={styles.who}>
                          <span className={styles.chipBox}>
                            <PlayerChip name={r.name} tier={r.market_tier} portrait={portraitFor(r.id)} />
                          </span>
                          <span className="fv-role">{r.role_code}</span>
                          <span>
                            <b>{r.name}</b>
                            <small>{r.club ? `${r.sub_position} · ${r.club}` : r.sub_position}</small>
                          </span>
                        </span>
                      </td>
                      <td data-col="league">
                        <LeagueFlag leagueId={r.league_id} />
                        {leagueName(r.league_id).split(",")[0]}
                      </td>
                      <td data-num>{Math.floor(r.age)}</td>
                      <td data-num>{integer(r.window.minutes)}</td>
                      <td data-num data-col="apps">{r.window.appearances}</td>
                      <td data-num>{r.position === "Goalkeeper" ? "–" : r.goals_p90.toFixed(2)}</td>
                      <td data-num>{r.position === "Goalkeeper" ? "–" : r.assists_p90.toFixed(2)}</td>
                      <td data-num className={styles.value}>
                        <span className={styles.withMark}>
                          <ObsMark />
                          {formatEur(r.market_value_eur)}
                        </span>
                      </td>
                      <td>
                        <TierMark tier={r.market_tier} showName={focus === null} />
                      </td>
                      <td data-num>
                        {r.estimate ? (
                          <span className={styles.model}>
                            <span className={styles.withMark}>
                              <ModelMark />
                              {formatEur(r.estimate.value)}
                            </span>
                            <small data-source={r.estimate.source}>{r.estimate.source === "heldout" ? "held-out" : "served"}</small>
                          </span>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td data-num data-col="ratio" className={styles.ratio}>
                        {r.estimate ? <Residual value={Math.log(r.market_value_eur) - Math.log(r.estimate.value)} compact basis={r.estimate.source === "heldout" ? "held-out" : "in-sample"} /> : ""}
                      </td>
                      <td>
                        <span className={styles.rowActions}>
                          <WatchButton id={r.id} name={r.name} className={styles.icon} />
                          <Link href={`/players/${r.slug}?from=terminal&seq=${seqParam}`} className={styles.icon} aria-label={`Open ${r.name}'s dossier`} onClick={(e) => e.stopPropagation()} transitionTypes={["to-dossier"]}>
                            →
                          </Link>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className={styles.cards}>
              {rows.map((r) => (
                <li key={r.id} className={styles.card} data-focus={focus === r.id || undefined}>
                  <button type="button" className={styles.cardHit} onClick={() => openInspector(r.id)} aria-label={`Inspect ${r.name}`} />
                  <div className={styles.cardHead}>
                    <span className="fv-role">{r.role_code}</span>
                    <span>
                      <b>{r.name}</b>
                      <small>
                        {r.sub_position} · {leagueName(r.league_id).split(",")[0]}
                      </small>
                    </span>
                  </div>
                  <dl className={styles.cardVals}>
                    <div>
                      <dt>Market</dt>
                      <dd className="num">{formatEur(r.market_value_eur)}</dd>
                    </div>
                    <div>
                      <dt>Model A · {r.estimate?.source === "heldout" ? "held-out" : "served"}</dt>
                      <dd className="num">{r.estimate ? formatEur(r.estimate.value) : "–"}</dd>
                    </div>
                  </dl>
                  <MiniRuler
                    marks={[
                      { value: r.market_value_eur, kind: "market", label: "Market value" },
                      ...(r.estimate ? [{ value: r.estimate.value, kind: "model" as const, label: "Model A" }] : []),
                    ]}
                  />
                  <dl className={styles.cardStats}>
                    <div>
                      <dt>Age</dt>
                      <dd className="num">{Math.floor(r.age)}</dd>
                    </div>
                    <div>
                      <dt>Min</dt>
                      <dd className="num">{integer(r.window.minutes)}</dd>
                    </div>
                    <div>
                      <dt>G/90</dt>
                      <dd className="num">{r.position === "Goalkeeper" ? "–" : r.goals_p90.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>A/90</dt>
                      <dd className="num">{r.position === "Goalkeeper" ? "–" : r.assists_p90.toFixed(2)}</dd>
                    </div>
                  </dl>
                  <div className={styles.cardActions}>
                    <CompareToggle id={r.id} name={r.name} className={styles.check} withLabel />
                    <WatchButton id={r.id} name={r.name} className={styles.icon} />
                    <Link href={`/players/${r.slug}?from=terminal&seq=${seqParam}`} className={styles.cardLink} transitionTypes={["to-dossier"]}>
                      Dossier →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 && (
            <nav className={styles.pager} aria-label="Pages">
              <button type="button" className="tm-btn" disabled={page <= 1} onClick={() => go({ page: page - 1 })}>
                ← Previous
              </button>
              <span className="num">
                Page {page} of {pages}
              </span>
              <button type="button" className="tm-btn" disabled={page >= pages} onClick={() => go({ page: page + 1 })}>
                Next →
              </button>
            </nav>
          )}
        </div>
        {focus !== null && <Inspector id={focus} onClose={() => openInspector(null)} />}
      </div>
    </div>
  );
}

/** A number input that commits on blur or Enter and follows the URL when it changes elsewhere. */
function NumField({ value, scale, onCommit, ...rest }: { value: number | null; scale: number; onCommit: (n: number | null) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const shown = value === null ? "" : String(value / scale);
  const [text, setText] = useState(shown);
  const [seen, setSeen] = useState(shown);
  if (seen !== shown) {
    setSeen(shown);
    setText(shown);
  }
  const commit = () => {
    const t = text.trim();
    const n = t === "" ? null : Number(t) * scale;
    if (n !== value && (n === null || Number.isFinite(n))) onCommit(n);
  };
  return (
    <input
      className="tm-input"
      type="number"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      {...rest}
    />
  );
}
