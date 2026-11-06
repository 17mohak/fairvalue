import fs from "node:fs";
import path from "node:path";
import { PORTRAITS, cardPortraitProblems, portraitFor, portraitProblems, type Portrait } from "./portraits";

const ok: Portrait = {
  player_id: 1, src: "/players/portraits/1.webp", kind: "cutout", width: 1200, height: 1600, focus: { x: 0.5, y: 0.2 },
  licence: "CC-BY-4.0", author: "A. Photographer", source_url: "https://commons.wikimedia.org/wiki/File:Example.jpg", attribution: "Photo: A. Photographer, CC BY 4.0",
};

describe("portrait manifest", () => {
  it("lists only licensed, attributed, local files that exist", () => {
    for (const p of PORTRAITS.portraits) {
      expect(portraitProblems(p)).toEqual([]);
      expect(fs.existsSync(path.join(process.cwd(), "public", p.src))).toBe(true);
    }
  });

  it("accepts a complete entry", () => {
    expect(portraitProblems(ok)).toEqual([]);
  });

  it("rejects unlicensed, unattributed, remote or low-resolution images", () => {
    expect(portraitProblems({ ...ok, licence: "All rights reserved" })).toContain("licence All rights reserved is not on the allow-list");
    expect(portraitProblems({ ...ok, attribution: " " })).toContain("attribution missing");
    expect(portraitProblems({ ...ok, src: "https://img.example.com/portrait.png" })).toContain("src must be a local file under /players/portraits/");
    expect(portraitProblems({ ...ok, height: 600 })).toContain("cutouts need at least 1400px of height");
  });
});

describe("card portraits (D-053)", () => {
  const cards = [605184, 463618, 670681].map((id) => portraitFor(id));

  it("serves a card portrait for FootyLogos and Berlin players, with credit", () => {
    const todibo = portraitFor(605184);
    expect(todibo?.unlicensed).toBe(true);
    expect(todibo?.attribution).toBe("Image: FootyLogos");
    const neves = portraitFor(670681);
    expect(neves?.unlicensed).toBeUndefined();
    expect(neves?.attribution).toContain("background removed");
    expect(neves?.source_url).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  });

  it("every card portrait passes its checks and its file exists", () => {
    for (const p of cards) {
      expect(p).not.toBeNull();
      expect(cardPortraitProblems(p!)).toEqual([]);
      expect(fs.existsSync(path.join(process.cwd(), "public", p!.src))).toBe(true);
    }
  });

  it("an unlicensed image cannot claim a licence or live outside the FootyLogos folder", () => {
    const fl = portraitFor(605184)!;
    expect(cardPortraitProblems({ ...fl, licence: "CC-BY-4.0" })).toContain("unlicensed images must say so");
    expect(cardPortraitProblems({ ...fl, src: "/players/portraits/cards/berlin/1.webp" })).toContain("only FootyLogos images may be unlicensed");
  });

  it("NEXT_PUBLIC_FAIRVALUE_FOOTYLOGOS_PORTRAITS=off removes every unlicensed image but keeps licensed ones", () => {
    process.env.NEXT_PUBLIC_FAIRVALUE_FOOTYLOGOS_PORTRAITS = "off";
    try {
      expect(portraitFor(605184)).toBeNull();
      expect(portraitFor(670681)).not.toBeNull();
    } finally {
      delete process.env.NEXT_PUBLIC_FAIRVALUE_FOOTYLOGOS_PORTRAITS;
    }
  });
});
