import { render, screen, within } from "@testing-library/react";
import { resetServiceStatus } from "@/lib/api/service";
import { SiteHeader } from "./SiteHeader";

const nav = vi.hoisted(() => ({ path: "/terminal/compare" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path, useRouter: () => ({ push: vi.fn() }) }));

const health = (status: number, service: unknown) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "ok", service }), { status })));

afterEach(() => {
  vi.unstubAllGlobals();
  resetServiceStatus();
});

describe("experience switcher", () => {
  beforeEach(() => health(503, { state: "offline", reason: "down" }));

  it("lights the environment the page belongs to", () => {
    nav.path = "/terminal/compare";
    render(<SiteHeader />);
    const sw = screen.getByRole("navigation", { name: "Experiences" });
    expect(within(sw).getByRole("link", { name: "Terminal" })).toHaveAttribute("aria-current", "page");
    expect(within(sw).getByRole("link", { name: "Stories" })).not.toHaveAttribute("aria-current");
  });

  it("treats Methods as part of Stories and the dossier as shared", () => {
    nav.path = "/methods";
    const { unmount } = render(<SiteHeader />);
    expect(within(screen.getByRole("navigation", { name: "Experiences" })).getByRole("link", { name: "Stories" })).toHaveAttribute("aria-current", "page");
    unmount();
    nav.path = "/players/849520-santiago-castro";
    render(<SiteHeader />);
    const sw = screen.getByRole("navigation", { name: "Experiences" });
    for (const name of ["Overview", "Terminal", "Stories"]) expect(within(sw).getByRole("link", { name })).not.toHaveAttribute("aria-current");
  });
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
