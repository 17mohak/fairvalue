import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { resetServiceStatus } from "@/lib/api/service";
import fixtures from "@/test/fixtures.json";
import { Studio } from "./Studio";

vi.mock("next/navigation", () => ({ usePathname: () => "/studio" }));

type Handler = (url: string, body: { model?: string } | null) => Response | Promise<Response>;

function mockApi(handler: Handler) {
  const calls: { url: string; body: unknown }[] = [];
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url, body });
    return handler(url, body);
  });
  vi.stubGlobal("fetch", f);
  return calls;
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

const realApi: Handler = (url, body) => {
  // The app's /api/health route adds a verdict after checking the models against the registry.
  if (url === "/api/health") return ok({ status: "ok", service: { state: "online", reason: "Serving the registered models." } });
  if (url === "/api/explain") return ok(fixtures.explain_A);
  if (url === "/api/predict") return ok(body?.model === "B" ? fixtures.predict_B : fixtures.predict_A);
  return new Response("{}", { status: 404 });
};

afterEach(() => {
  vi.unstubAllGlobals();
  resetServiceStatus();
});

describe("Valuation studio", () => {
  it("values the starting profile as soon as the service is up, and explains it", async () => {
    const calls = mockApi(realApi);
    render(<Studio />);

    const region = await screen.findByRole("region", { name: "Valuation result" });
    await waitFor(() => expect(within(region).getByText("€17,056,329")).toBeInTheDocument());
    expect(within(region).getByText(/Elite tier, from Model A/)).toBeInTheDocument();
    // Model B comparison comes from the second model's own response, not from arithmetic on the first.
    const duel = within(region).getByRole("region", { name: /Model A compared with Model B/ });
    expect(duel).toHaveTextContent("€17.1M");
    expect(duel).toHaveTextContent("€11.9M");
    expect(screen.getByRole("button", { name: "Value again" })).toBeInTheDocument();
    // Local explanation: the waterfall ends at the served prediction.
    expect(within(region).getByRole("tab", { name: "This estimate" })).toHaveAttribute("aria-selected", "true");
    expect(within(region).getByText("Average training player")).toBeInTheDocument();
    expect(within(region).getByText("League")).toBeInTheDocument();
    expect(within(region).getByText(fixtures.predict_A.model_version.regressor)).toBeInTheDocument();

    const posted = calls.filter((c) => c.url !== "/api/health");
    expect(posted.map((c) => c.url).sort()).toEqual(["/api/explain", "/api/predict", "/api/predict"]);
    for (const c of posted) expect(JSON.stringify(c.body)).not.toMatch(/nation|citizen|confed/);
  });

  it("blocks invalid input in the browser and points at the field", async () => {
    const calls = mockApi(realApi);
    render(<Studio />);
    await screen.findByText("€17,056,329"); // the automatic first valuation
    const before = calls.filter((c) => c.url === "/api/predict").length;

    const age = screen.getByRole("textbox", { name: "Age" });
    await userEvent.clear(age);
    await userEvent.type(age, "12");
    await userEvent.click(screen.getByRole("button", { name: "Value again" }));

    expect(await screen.findByText(/Enter 16–44/)).toBeInTheDocument();
    expect(age).toHaveAttribute("aria-invalid", "true");
    expect(age).toHaveFocus();
    expect(calls.filter((c) => c.url === "/api/predict")).toHaveLength(before);
  });

  it("explains clearly when the model service is down", async () => {
    mockApi(() => new Response(JSON.stringify({ detail: "The valuation service is unreachable." }), { status: 503 }));
    render(<Studio />);
    expect(await screen.findByText("Model service offline")).toBeInTheDocument();
    // Nothing is valued automatically while the service is down; the user asks explicitly.
    expect(screen.queryByText("Valuing…")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Value this player" }));
    expect(await screen.findByText("The valuation service is offline")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("still shows the estimate when only the explanation fails", async () => {
    mockApi((url, body) => {
      if (url === "/api/explain") return new Response(JSON.stringify({ detail: "Explanations need the 'shap' package on the server" }), { status: 501 });
      return realApi(url, body);
    });
    render(<Studio />);
    expect(await screen.findByText("€17,056,329")).toBeInTheDocument();
    expect(screen.getByText(/Explanations need the 'shap' package/)).toBeInTheDocument();
  });

  it("maps a server-side 422 back onto the form", async () => {
    mockApi((url, body) => {
      if (url === "/api/health") return realApi(url, body);
      return new Response(
        JSON.stringify({ detail: [{ loc: ["body", "player", "club_ppg"], msg: "Input should be less than or equal to 2.7", type: "less_than_equal" }] }),
        { status: 422 },
      );
    });
    render(<Studio />);
    expect(await screen.findByText("Input should be less than or equal to 2.7.")).toBeInTheDocument();
    expect(screen.getByText("The model can't value this profile")).toBeInTheDocument();
  });

  it("does not auto-value over a profile the user started editing before the service answered", async () => {
    let answerHealth: () => void = () => {};
    const calls = mockApi((url, body) => {
      if (url === "/api/health") return new Promise<Response>((resolve) => (answerHealth = () => resolve(realApi(url, body) as Response)));
      return realApi(url, body);
    });
    render(<Studio />);
    await userEvent.click(screen.getByRole("radio", { name: "Keeper" }));
    answerHealth();
    expect(await screen.findByText("Model service online")).toBeInTheDocument();
    expect(calls.filter((c) => c.url === "/api/predict")).toHaveLength(0);
  });

  it("never auto-values against a service that does not match the research registry", async () => {
    const calls = mockApi((url, body) =>
      url === "/api/health"
        ? ok({ status: "ok", service: { state: "unverified", reason: "The served regressor_A differs from the models the research results describe." } })
        : realApi(url, body),
    );
    render(<Studio />);
    expect(await screen.findByText("Model service unverified")).toBeInTheDocument();
    expect(screen.queryByText("Model service online")).not.toBeInTheDocument();
    expect(calls.filter((c) => c.url === "/api/predict")).toHaveLength(0);
    // Valuing on request still works, and the answer is flagged.
    await userEvent.click(screen.getByRole("button", { name: "Value this player" }));
    expect(await screen.findByText("Unverified service.")).toBeInTheDocument();
  });

  it("keeps roles consistent when the position changes", async () => {
    mockApi(realApi);
    render(<Studio />);
    await userEvent.click(screen.getByRole("radio", { name: "Keeper" }));
    expect(screen.getByRole("combobox", { name: "Role" })).toHaveValue("Goalkeeper");
  });
});
