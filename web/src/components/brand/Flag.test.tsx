import fs from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import countries from "@/data/countries.json";
import { LEAGUES } from "@/lib/football";
import { Flag, flagCode, LeagueFlag } from "./Flag";

const FLAGS = countries.flags as Record<string, string | null>;
const dir = path.join(process.cwd(), "public", "flags");

describe("Flags", () => {
  it("ships exactly the SVG files the mapping names (node scripts/sync-flags.mjs)", () => {
    const wanted = new Set(Object.values(FLAGS).filter((c): c is string => !!c).map((c) => `${c}.svg`));
    const shipped = new Set(fs.readdirSync(dir).filter((f) => f.endsWith(".svg")));
    expect([...wanted].filter((f) => !shipped.has(f))).toEqual([]);
    expect([...shipped].filter((f) => !wanted.has(f))).toEqual([]);
    expect(fs.existsSync(path.join(dir, "LICENSE-flag-icons.txt"))).toBe(true);
  });

  it("has a flag for every covered league's country", () => {
    for (const l of Object.values(LEAGUES)) expect(flagCode(l.country), l.country).not.toBeNull();
    expect(flagCode("England")).toBe("gb-eng");
    expect(flagCode("Scotland")).toBe("gb-sct");
  });

  it("is decorative beside a text label, and labelled when it stands alone", () => {
    const { container, rerender } = render(<LeagueFlag leagueId="IT1" />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/flags/it.svg");
    expect(img.getAttribute("alt")).toBe("");
    expect(img.getAttribute("aria-hidden")).toBe("true");
    rerender(<Flag country="Argentina" label />);
    expect(container.querySelector("img")!.getAttribute("alt")).toBe("Argentina flag");
  });

  it("renders nothing rather than guessing for countries without a settled flag or unknown names", () => {
    for (const c of ["Northern Ireland", "Guadeloupe", "Atlantis", null]) {
      const { container } = render(<Flag country={c} />);
      expect(container.querySelector("img")).toBeNull();
    }
  });
});
