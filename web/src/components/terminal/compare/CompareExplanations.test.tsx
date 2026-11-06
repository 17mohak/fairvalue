import { render, screen } from "@testing-library/react";
import showcase from "@/data/players.json";
import { resetServiceStatus, setServiceStatus } from "@/lib/api/service";
import fixtures from "@/test/fixtures.json";
import type { PlayerProfile } from "@/lib/players";
import { CompareExplanations } from "./CompareExplanations";

const all = showcase.players as unknown as PlayerProfile[];
// Players outside the showcase have no published explanation (the full export's case).
const unpublished = all.slice(0, 2).map((p) => ({ ...p, explanation: null }));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  resetServiceStatus();
});

describe("Comparison explanations", () => {
  it("uses the published explanations when they exist, without calling the API", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<CompareExplanations players={all.slice(0, 2)} />);
    expect(screen.getByText(/Published SHAP values for the served Model A/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("asks the live API for players without a published explanation and labels the result live", async () => {
    setServiceStatus({ state: "online", reason: "Serving the registered models." });
    vi.stubGlobal("fetch", vi.fn(async () => json(fixtures.explain_A)));
    render(<CompareExplanations players={unpublished} />);
    expect(await screen.findByText(/Live SHAP values from the prediction API's served Model A/)).toBeInTheDocument();
    expect(screen.getByText("Starting point")).toBeInTheDocument();
  });

  it("drops an explanation that does not add up to its prediction", async () => {
    const broken = { ...fixtures.explain_A, predicted_log_value: fixtures.explain_A.predicted_log_value + 0.5 };
    vi.stubGlobal("fetch", vi.fn(async () => json(broken)));
    render(<CompareExplanations players={unpublished} />);
    expect(await screen.findByText(/or the live prediction API, which is not available/)).toBeInTheDocument();
  });

  it("says so when the API is offline instead of inventing explanations", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ detail: "down" }, 503)));
    render(<CompareExplanations players={unpublished} />);
    expect(await screen.findByText(/or the live prediction API, which is not available/)).toBeInTheDocument();
    expect(screen.queryByText("Starting point")).not.toBeInTheDocument();
  });
});
