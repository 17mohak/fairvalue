"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PlayerChip } from "@/components/players/PlayerChip";
import { leagueName } from "@/lib/football";
import { formatEur } from "@/lib/format";
import { createList, deleteList, renameList, setInList, useHydrated, watchlists, type Watchlist } from "@/lib/localStore";
import { matchesQuery, type IndexRow, type PlayerIndex } from "@/lib/players";
import { portraitFor } from "@/lib/portraits";
import { COMPARE_MAX, COMPARE_MIN } from "@/lib/terminal";
import styles from "./Watchlists.module.css";

type Sort = "added" | "value" | "name" | "age";

let indexCache: PlayerIndex | null = null;

/** Named player collections, kept in this browser. */
export function Watchlists() {
  const hydrated = useHydrated();
  const lists = watchlists.use();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname() ?? "/terminal/watchlists";
  const [index, setIndex] = useState<PlayerIndex | null>(indexCache);
  const [failed, setFailed] = useState(false);
  const [newName, setNewName] = useState("");
  const [sort, setSort] = useState<Sort>("added");
  const [filter, setFilter] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [adding, setAdding] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (indexCache) return;
    fetch("/api/players")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: PlayerIndex) => setIndex((indexCache = d)))
      .catch(() => setFailed(true));
  }, []);

  const selectedId = params.get("list");
  const current = lists.find((l) => l.id === selectedId) ?? lists[0] ?? null;
  const byId = useMemo(() => new Map((index?.players ?? []).map((p) => [p.id, p])), [index]);

  const select = (l: Watchlist) => {
    setPicked([]);
    setConfirmDelete(false);
    router.replace(`${path}?list=${l.id}`, { scroll: false });
  };

  const rows = useMemo(() => {
    if (!current) return [];
    const order = new Map(current.players.map((id, i) => [id, i]));
    const found = current.players.map((id) => byId.get(id)).filter((p): p is IndexRow => !!p && matchesQuery(p, filter));
    const cmp: Record<Sort, (a: IndexRow, b: IndexRow) => number> = {
      added: (a, b) => order.get(a.id)! - order.get(b.id)!,
      value: (a, b) => b.market_value_eur - a.market_value_eur,
      name: (a, b) => a.name.localeCompare(b.name),
      age: (a, b) => a.age - b.age,
    };
    return found.sort(cmp[sort]);
  }, [current, byId, filter, sort]);

  const missing = current ? current.players.filter((id) => index && !byId.has(id)).length : 0;
  const suggestions = useMemo(
    () => (current && adding ? (index?.players ?? []).filter((p) => !current.players.includes(p.id) && matchesQuery(p, adding)).slice(0, 6) : []),
    [current, adding, index],
  );

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), lists }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fairvalue-watchlists.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!hydrated) return <div className="fv-skeleton" style={{ height: "18rem", marginTop: "1rem" }} />;

  return (
    <div className={styles.wrap}>
      <aside className={`tm-panel ${styles.lists}`} aria-label="Your watchlists">
        <header className="tm-panel-head">
          <h2 className="tm-title">Lists</h2>
          <span className="tm-sub">{lists.length}</span>
        </header>
        <ul>
          {lists.map((l) => (
            <li key={l.id}>
              <button type="button" className={styles.listBtn} aria-current={current?.id === l.id || undefined} onClick={() => select(l)}>
                <span>{l.name}</span>
                <b className="num">{l.players.length}</b>
              </button>
            </li>
          ))}
        </ul>
        <form
          className={styles.newList}
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            const id = createList(newName);
            setNewName("");
            router.replace(`${path}?list=${id}`, { scroll: false });
          }}
        >
          <input className="tm-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New list name" aria-label="New list name" maxLength={48} />
          <button type="submit" className="tm-btn" disabled={!newName.trim()}>
            Create
          </button>
        </form>
        <p className={styles.storage}>
          Saved in this browser&apos;s local storage only: not synced to other devices or backed up. Clearing site data removes them.
        </p>
        {lists.length > 0 && (
          <button type="button" className="tm-btn" onClick={exportJson}>
            Export as JSON
          </button>
        )}
      </aside>

      <section className={`tm-panel ${styles.detail}`} aria-label={current ? current.name : "Watchlist"}>
        {!current ? (
          <div className="tm-empty">
            <b>No watchlists yet</b>
            <span>Create a list on the left, or star a player in the Explorer: the first star starts a list called “Shortlist”.</span>
            <Link href="/terminal" className="tm-btn" transitionTypes={["ws"]}>
              Open the Explorer
            </Link>
          </div>
        ) : (
          <>
            <header className={`tm-panel-head ${styles.detailHead}`}>
              {renaming === current.id ? (
                <form
                  className={styles.rename}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = new FormData(e.currentTarget).get("name");
                    if (typeof v === "string") renameList(current.id, v);
                    setRenaming(null);
                  }}
                >
                  <input name="name" className="tm-input" defaultValue={current.name} aria-label="List name" maxLength={48} autoFocus />
                  <button type="submit" className="tm-btn">
                    Save
                  </button>
                  <button type="button" className="tm-btn" onClick={() => setRenaming(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <h2 className={styles.listName}>
                  {current.name}
                  <small>
                    {current.players.length} player{current.players.length === 1 ? "" : "s"} · updated {new Date(current.updated).toLocaleDateString("en-GB")}
                  </small>
                </h2>
              )}
              <div className={styles.headActions}>
                {picked.length >= COMPARE_MIN ? (
                  <Link href={`/terminal/compare?ids=${picked.join(",")}`} className="tm-btn" data-tone="gold" transitionTypes={["ws"]}>
                    Compare {picked.length} →
                  </Link>
                ) : (
                  <span className="tm-btn" data-tone="gold" aria-disabled="true" title="Tick two to four players">
                    Compare
                  </span>
                )}
                <button type="button" className="tm-btn" onClick={() => setRenaming(current.id)}>
                  Rename
                </button>
                {confirmDelete ? (
                  <>
                    <button
                      type="button"
                      className="tm-btn"
                      data-tone="danger"
                      onClick={() => {
                        deleteList(current.id);
                        setConfirmDelete(false);
                        router.replace(path, { scroll: false });
                      }}
                    >
                      Delete “{current.name}”
                    </button>
                    <button type="button" className="tm-btn" onClick={() => setConfirmDelete(false)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <button type="button" className="tm-btn" onClick={() => setConfirmDelete(true)}>
                    Delete
                  </button>
                )}
              </div>
            </header>

            <div className={styles.tools}>
              <input className="tm-input" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter this list" aria-label="Filter this list" />
              <select className="tm-select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
                <option value="added">Order added</option>
                <option value="value">Observed value</option>
                <option value="name">Name</option>
                <option value="age">Age</option>
              </select>
              <div className={styles.addBox}>
                <input className="tm-input" value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add a player…" aria-label="Add a player to this list" />
                {suggestions.length > 0 && (
                  <ul className={styles.addList}>
                    {suggestions.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setInList(current.id, p.id, true);
                            setAdding("");
                          }}
                        >
                          <span className="fv-role">{p.role_code}</span> {p.name} <small>{formatEur(p.market_value_eur)}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {picked.length > 0 && (
                <span className={styles.picked}>
                  {picked.length} ticked{picked.length >= COMPARE_MAX ? ` (max ${COMPARE_MAX})` : ""}
                </span>
              )}
            </div>

            {failed && <p className="tm-note">The player index could not be loaded, so names are unavailable.</p>}
            {missing > 0 && <p className="tm-note">{missing} saved player{missing === 1 ? " is" : "s are"} not in this build&apos;s export.</p>}

            {current.players.length === 0 ? (
              <div className="tm-empty">
                <b>This list is empty</b>
                <span>Add players with the search above, or with the star in the Explorer and the dossiers.</span>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className="tm-table">
                  <thead>
                    <tr>
                      <th scope="col">
                        <span className="visually-hidden">Select</span>
                      </th>
                      <th scope="col">Player</th>
                      <th scope="col">League</th>
                      <th scope="col" data-num>
                        Age
                      </th>
                      <th scope="col" data-num>
                        Market value
                      </th>
                      <th scope="col">Tier</th>
                      <th scope="col" data-num>
                        Model A
                      </th>
                      <th scope="col">
                        <span className="visually-hidden">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const on = picked.includes(p.id);
                      return (
                        <tr key={p.id}>
                          <td>
                            <input
                              type="checkbox"
                              className={styles.box}
                              checked={on}
                              disabled={!on && picked.length >= COMPARE_MAX}
                              onChange={() => setPicked((ids) => (on ? ids.filter((x) => x !== p.id) : [...ids, p.id]))}
                              aria-label={`Select ${p.name} for comparison`}
                            />
                          </td>
                          <td>
                            <span className={styles.who}>
                              <span className={styles.chipBox}>
                                <PlayerChip name={p.name} tier={p.market_tier} portrait={portraitFor(p.id)} />
                              </span>
                              <span className="fv-role">{p.role_code}</span>
                              <b>{p.name}</b>
                            </span>
                          </td>
                          <td>{leagueName(p.league_id).split(",")[0]}</td>
                          <td data-num>{Math.floor(p.age)}</td>
                          <td data-num>{formatEur(p.market_value_eur)}</td>
                          <td>{p.market_tier ?? "–"}</td>
                          <td data-num>
                            {p.estimate ? formatEur(p.estimate.value) : "–"}
                            {p.estimate && <small className={styles.src}> {p.estimate.source === "heldout" ? "held-out" : "served"}</small>}
                          </td>
                          <td>
                            <span className={styles.rowActions}>
                              <Link href={`/players/${p.slug}?from=terminal`} className={styles.link} transitionTypes={["to-dossier"]}>
                                Dossier
                              </Link>
                              <button type="button" className={styles.remove} onClick={() => setInList(current.id, p.id, false)} aria-label={`Remove ${p.name} from ${current.name}`}>
                                Remove
                              </button>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
