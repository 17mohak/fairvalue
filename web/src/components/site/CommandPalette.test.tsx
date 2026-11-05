import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlayerIndex } from "@/lib/players";

const nav = vi.hoisted(() => ({ path: "/terminal", push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path, useRouter: () => ({ push: nav.push }) }));

// jsdom implements <dialog> only partly.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

const index: PlayerIndex = {
  source: "full",
  total: 3,
  players: [
    { id: 1, slug: "1-melih-kabasakal", name: "Melih Kabasakal", role_code: "DM", position: "Midfield", sub_position: "Defensive Midfield", league_id: "TR1", club: "Gaziantep FK", nationality: "Türkiye", age: 30, market_value_eur: 600_000, market_tier: "Emerging", minutes: 2000, estimate: null },
    { id: 433177, slug: "433177-bukayo-saka", name: "Bukayo Saka", role_code: "RW", position: "Attack", sub_position: "Right Winger", league_id: "GB1", club: "Arsenal FC", nationality: "England", age: 24, market_value_eur: 110_000_000, market_tier: "World Class", minutes: 5000, estimate: null },
    { id: 3, slug: "3-isa-sakamoto", name: "Isa Sakamoto", role_code: "AM", position: "Midfield", sub_position: "Attacking Midfield", league_id: "BE1", club: "KVC Westerlo", nationality: "Japan", age: 22, market_value_eur: 4_000_000, market_tier: "Established", minutes: 3895, estimate: null },
  ],
};

// One module instance for the whole file: the index is loaded once per page, as in the app.
const { CommandPalette, openPalette } = await import("./CommandPalette");

afterEach(() => {
  vi.unstubAllGlobals();
  nav.push.mockReset();
  window.localStorage.clear();
});

async function openAndType(text: string, viaShortcut = false) {
  render(<CommandPalette />);
  await act(async () => {
    // The open flag is shared module state (any search control can open it), so it may already be set.
    if (viaShortcut) fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    else openPalette();
  });
  const input = await screen.findByRole("combobox");
  await userEvent.type(input, text);
  return input;
}

describe("global player search", () => {
  it("shows an error with a retry when the index cannot load, then recovers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    await openAndType("saka", true);
    expect(await screen.findByText(/player index could not be loaded/i)).toBeInTheDocument();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(index), { status: 200 })));
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("option", { name: /Bukayo Saka/ })).toBeInTheDocument();
  });

  it("ranks the exact surname first and opens the canonical dossier with Enter, keeping the origin", async () => {
    nav.path = "/terminal/leagues";
    const input = await openAndType("saka");
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options[0]).toHaveTextContent("Bukayo Saka");
    expect(options[0]).toHaveTextContent("England");
    expect(options[0]).toHaveTextContent("€110M");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(nav.push).toHaveBeenCalledWith("/players/433177-bukayo-saka?from=terminal", expect.anything());
  });

  it("remembers the query that led to a player as a recent search", async () => {
    const input = await openAndType("sakam");
    fireEvent.keyDown(input, { key: "Enter" });
    // Newest first (the store keeps earlier queries from this file's other tests).
    expect(JSON.parse(window.localStorage.getItem("fv.searches.v1") ?? "[]")[0]).toBe("sakam");
  });

  it("says plainly when nothing matches", async () => {
    await openAndType("zzzz");
    expect(await screen.findByText(/No player matches “zzzz”/)).toBeInTheDocument();
  });
});

describe("pointer and keyboard together", () => {
  it("ignores mousemove events from a pointer that has not moved", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(index), { status: 200 })));
    const input = await openAndType("saka");
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    // A resting pointer over the third row: the browser repeats the same coordinates.
    fireEvent.mouseMove(options[2]!, { clientX: 300, clientY: 200 });
    fireEvent.mouseMove(options[2]!, { clientX: 300, clientY: 200 });
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    // Real movement does move the highlight.
    fireEvent.mouseMove(options[2]!, { clientX: 300, clientY: 230 });
    expect(options[2]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(nav.push).toHaveBeenCalledWith("/players/1-melih-kabasakal?from=terminal", expect.anything());
  });
});
