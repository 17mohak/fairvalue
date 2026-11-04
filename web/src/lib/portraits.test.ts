import fs from "node:fs";
import path from "node:path";
import { PORTRAITS, portraitProblems, type Portrait } from "./portraits";

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
