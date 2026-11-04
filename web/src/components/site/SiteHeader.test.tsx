import { render, screen } from "@testing-library/react";
import { resetServiceStatus } from "@/lib/api/service";
import { SiteHeader } from "./SiteHeader";

vi.mock("next/navigation", () => ({ usePathname: () => "/players" }));

const health = (status: number, service: unknown) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "ok", service }), { status })));

afterEach(() => {
  vi.unstubAllGlobals();
  resetServiceStatus();
});

describe("masthead service status", () => {
  it("says online only for a verified service", async () => {
    health(200, { state: "online", reason: "Serving the registered models, trained on the research dataset." });
    render(<SiteHeader />);
    expect(await screen.findAllByText("Model online")).not.toHaveLength(0);
  });

  it("never shows online for something that answers with other models (a stub, another build)", async () => {
    health(200, { state: "unverified", reason: "The prediction API does not report regressor_A." });
    render(<SiteHeader />);
    expect(await screen.findAllByText("Model unverified")).not.toHaveLength(0);
    expect(screen.queryByText("Model online")).not.toBeInTheDocument();
  });

  it("shows offline when the health check fails", async () => {
    health(503, { state: "offline", reason: "The prediction API is unreachable." });
    render(<SiteHeader />);
    expect(await screen.findAllByText("Model offline")).not.toHaveLength(0);
  });
});
