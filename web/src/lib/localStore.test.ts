import { describe, expect, it } from "vitest";
import { cleanName, MAX_LISTS, toggleCompare, withList, withPlayer, withRecent } from "./localStore";

describe("watchlist updates", () => {
  it("creates named lists, trimming and capping the name", () => {
    const ls = withList([], "  Left   backs  ", "a", "t0");
    expect(ls).toEqual([{ id: "a", name: "Left backs", players: [], created: "t0", updated: "t0" }]);
    expect(withList([], "   ", "b", "t0")[0]!.name).toBe("Untitled list");
    expect(cleanName("x".repeat(80))).toHaveLength(48);
  });

  it("refuses more than the maximum number of lists", () => {
    let ls = withList([], "one", "0");
    for (let i = 1; i < MAX_LISTS + 3; i++) ls = withList(ls, `l${i}`, String(i));
    expect(ls).toHaveLength(MAX_LISTS);
  });

  it("adds and removes players without duplicates", () => {
    let ls = withList([], "Shortlist", "a", "t0");
    ls = withPlayer(ls, "a", 7, true, "t1");
    ls = withPlayer(ls, "a", 7, true, "t2");
    expect(ls[0]!.players).toEqual([7]);
    expect(ls[0]!.updated).toBe("t1");
    ls = withPlayer(ls, "a", 7, false, "t3");
    expect(ls[0]!.players).toEqual([]);
  });
});

describe("comparison tray", () => {
  it("toggles and holds at most four players", () => {
    let ids: number[] = [];
    for (const id of [1, 2, 3, 4, 5]) ids = toggleCompare(ids, id);
    expect(ids).toEqual([1, 2, 3, 4]);
    expect(toggleCompare(ids, 2)).toEqual([1, 3, 4]);
  });
});

describe("recently viewed", () => {
  it("moves a revisited player to the front and keeps eight", () => {
    let list = [] as ReturnType<typeof withRecent>;
    for (let i = 0; i < 10; i++) list = withRecent(list, { id: i, slug: `${i}`, name: `P${i}`, role_code: "CB" }, `t${i}`);
    expect(list).toHaveLength(8);
    list = withRecent(list, { id: 5, slug: "5", name: "P5", role_code: "CB" }, "tz");
    expect(list[0]!.id).toBe(5);
    expect(list.filter((r) => r.id === 5)).toHaveLength(1);
  });
});
