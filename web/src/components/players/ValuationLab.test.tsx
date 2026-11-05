import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import showcase from "@/data/players.json";
import { resetServiceStatus, setServiceStatus } from "@/lib/api/service";
import fixtures from "@/test/fixtures.json";
import type { PlayerProfile } from "@/lib/players";
import { ValuationLab } from "./ValuationLab";

const player = (showcase.players as unknown as PlayerProfile[]).find((p) => p.last_name === "Todibo")!;
const props = { player, mae: { A: 0.406, B: 0.725 }, regressorVersion: { A: "regressor_A-test", B: "regressor_B-test" } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  resetServiceStatus();
});

describe("Valuation lab", () => {
  it("falls back to the published served estimate and explanation when the API is offline", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ detail: "down" }, 503)));
    render(<ValuationLab {...props} />);
    expect(await screen.findByText(/Prediction API offline/)).toBeInTheDocument();
    expect(screen.getByText(/published research results \(cached\), not a live answer/)).toBeInTheDocument();
    expect(screen.getByText("Served · cached")).toBeInTheDocument();
    expect(screen.getByText("Cached research result")).toBeInTheDocument(); // the panel's source badge
    expect(screen.queryByText(/Served · live/)).not.toBeInTheDocument();
    expect(screen.getAllByText("€16.5M").length).toBeGreaterThan(0); // reports/explainability, served Model A
    // The offline Valuation Journey: the published SHAP run, from its starting point to the estimate.
    expect(screen.getByText("Starting point")).toBeInTheDocument();
    expect(screen.getByText("Model A estimate")).toBeInTheDocument();
    expect(screen.getByText(/Published SHAP run for the served Model A/)).toBeInTheDocument();
    // Model B has no offline explanation: it cannot be selected, and nothing is invented for it.
    const b = within(screen.getByRole("radiogroup", { name: "Explain model" })).getByRole("radio", { name: "Model B" });
    expect(b).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(b);
    expect(b).toHaveAttribute("aria-checked", "false");
  });

  it("uses live served estimates when the verified API answers, and sends only the player's model inputs", async () => {
    setServiceStatus({ state: "online", reason: "Serving the registered models." });
    const bodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)));
        if (url === "/api/explain") return json(fixtures.explain_A);
        return json((bodies.at(-1) as { model: string }).model === "B" ? fixtures.predict_B : fixtures.predict_A);
      }),
    );
    render(<ValuationLab {...props} />);
    await waitFor(() => expect(screen.getAllByText("Served · live")).toHaveLength(2));
    expect(screen.getByText(/Live: served estimates from the prediction API/)).toBeInTheDocument();
    for (const b of bodies) expect(JSON.stringify(b)).not.toMatch(/nation|citizen|confed|audit/);
    expect((bodies[0] as { player: unknown }).player).toEqual(player.features);
  });

  it("labels answers from an unverified service as such, never as plain live", async () => {
    setServiceStatus({ state: "unverified", reason: "The served regressor_A differs from the models the research results describe." });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => json(url === "/api/explain" ? fixtures.explain_A : fixtures.predict_A)),
    );
    render(<ValuationLab {...props} />);
    await waitFor(() => expect(screen.getAllByText("Served · live, unverified").length).toBeGreaterThan(0));
    expect(screen.getByText(/Live, but unverified/)).toBeInTheDocument();
    expect(screen.queryByText("Served · live")).not.toBeInTheDocument();
  });
});

describe("Valuation Journey as the dossier's centrepiece", () => {
  it("says which estimate it explains, lists the biggest movers and comes first in reading order", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ detail: "down" }, 503)));
    const { container } = render(<ValuationLab {...props} />);
    expect(await screen.findByRole("heading", { name: /Why Model A says €16.5M/ })).toBeInTheDocument();
    expect(screen.getByText(/This explains the served Model A estimate, €16.5M \(cached research result\)/)).toBeInTheDocument();
    expect(screen.getByText(/Explanations exist only for the served model/)).toBeInTheDocument();
    const moversBox = screen.getByLabelText("Inputs that moved this estimate most");
    expect(within(moversBox).getByText("Raised it most")).toBeInTheDocument();
    expect(within(moversBox).getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(within(moversBox).queryByText("×1.00")).not.toBeInTheDocument();
    // The journey section precedes Model A vs B in the DOM, not only visually.
    const ids = [...container.querySelectorAll("section[id]")].map((s) => s.id);
    expect(ids.indexOf("explain")).toBeLessThan(ids.indexOf("estimates"));
  });

  it("shows a loading skeleton, not a number, while the live explanation is on its way", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    const noExplanation = { ...player, explanation: null };
    render(<ValuationLab {...props} player={noExplanation} />);
    expect(screen.getByRole("status", { name: "Loading the explanation" })).toBeInTheDocument();
    expect(screen.getByText(/Asking the prediction API to explain Model A/)).toBeInTheDocument();
  });
});
