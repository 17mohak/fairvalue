import { describe, expect, it } from "vitest";
import showcase from "@/data/players.json";
import { explorerParams, explorerRow, filterSort, paginate, parseExplorerQuery } from "./explorer";
import type { PlayerProfile } from "./players";

const rows = (showcase.players as unknown as PlayerProfile[]).map(explorerRow);

describe("explorer query", () => {
  it("parses defaults and ignores junk", () => {
    const q = parseExplorerQuery({ position: "Striker", league: "<script>", sort: "residual", page: "-3" });
    expect(q).toMatchObject({ position: "", league: "", sort: "value", dir: "desc", view: "table", page: 1 });
  });

  it("round-trips through URL parameters", () => {
    const q = parseExplorerQuery({ q: "kubo", position: "Attack", sort: "age", value_min: "5", min_minutes: "900", view: "cards" });
    expect(parseExplorerQuery(Object.fromEntries(explorerParams(q)))).toEqual(q);
    expect(q.valueMin).toBe(5_000_000);
  });

  it("never offers a residual sort", () => {
    expect(parseExplorerQuery({ sort: "residual" }).sort).toBe("value");
  });
});

describe("explorer filtering", () => {
  it("filters by position, value and minutes", () => {
    const q = parseExplorerQuery({ position: "Defender", value_min: "3" });
    const out = filterSort(rows, q);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.position === "Defender" && r.market_value_eur >= 3e6)).toBe(true);
  });

  it("sorts in both directions with a stable tie-break", () => {
    const asc = filterSort(rows, parseExplorerQuery({ sort: "age", dir: "asc" })).map((r) => r.age);
    expect([...asc].sort((a, b) => a - b)).toEqual(asc);
    const desc = filterSort(rows, parseExplorerQuery({ sort: "value" })).map((r) => r.market_value_eur);
    expect([...desc].sort((a, b) => b - a)).toEqual(desc);
  });

  it("pages and clamps past the end", () => {
    const p = paginate(rows, 9, 3);
    expect(p.page).toBe(3);
    expect(p.rows).toHaveLength(2);
  });
});
