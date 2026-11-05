import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fairnessData } from "./data";
import { Observatory } from "./Observatory";

const nav = vi.hoisted(() => ({ query: "", replace: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/terminal/audit",
  useSearchParams: () => new URLSearchParams(nav.query),
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
}));

const data = fairnessData();

beforeEach(() => {
  nav.replace.mockReset();
  nav.push.mockReset();
  // jsdom has no <dialog> modal support
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
});

describe("Fairness observatory", () => {
  it("opens on the gap view for Model A by default, with the research figure", () => {
    nav.query = "";
    render(<Observatory data={data} />);
    expect(screen.getByRole("heading", { level: 2, name: /errors different/ })).toBeInTheDocument();
    expect(screen.getAllByText("+0.093").length).toBeGreaterThan(0);
    const rail = screen.getByRole("navigation", { name: "Instruments" });
    expect(within(rail).getByRole("link", { name: /The gap/ })).toHaveAttribute("aria-current", "page");
  });

  it("renders the view and model named in the URL", () => {
    nav.query = "view=leagues&model=B";
    render(<Observatory data={data} />);
    expect(screen.getByRole("heading", { level: 2, name: "Where does the gap sit?" })).toBeInTheDocument();
    expect(screen.getByText(/Within-league signed gap · Model B/)).toBeInTheDocument();
    expect(screen.getAllByText(signedOf(data.B.gap.estimate)).length).toBeGreaterThan(0);
  });

  it("falls back to defaults for unknown URL values", () => {
    nav.query = "view=nope&model=Z";
    render(<Observatory data={data} />);
    expect(screen.getByText(/Within-league signed gap · Model A/)).toBeInTheDocument();
  });

  it("links every instrument to its own URL and keeps model settings in the query", () => {
    nav.query = "model=B";
    render(<Observatory data={data} />);
    const rail = screen.getByRole("navigation", { name: "Instruments" });
    expect(within(rail).getByRole("link", { name: /Robustness/ })).toHaveAttribute("href", "/terminal/audit?view=robustness&model=B");
  });

  it("switches model and overlay through the URL", async () => {
    nav.query = "";
    render(<Observatory data={data} />);
    await userEvent.click(screen.getByRole("radio", { name: "Model B" }));
    expect(nav.replace).toHaveBeenCalledWith("/terminal/audit?model=B", { scroll: false });
    // The control responds immediately, before the URL round-trip completes.
    expect(screen.getByText(/Within-league signed gap · Model B/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /Overlay Model A/ }));
    expect(nav.replace).toHaveBeenLastCalledWith("/terminal/audit?model=B&compare=1", { scroll: false });
  });
});

function signedOf(v: number): string {
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(3)}`;
}
