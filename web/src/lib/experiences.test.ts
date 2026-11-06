import { describe, expect, it } from "vitest";
import { contextForPath, dossierHref, parseFrom, transitionTypes } from "./experiences";
import { parseIds, workspaceForPath } from "./terminal";

describe("experiences", () => {
  it("maps paths to environments", () => {
    expect(contextForPath("/")).toBe("overview");
    expect(contextForPath("/terminal")).toBe("terminal");
    expect(contextForPath("/terminal/compare?ids=1,2")).toBe("terminal");
    expect(contextForPath("/stories/valuation/x")).toBe("stories");
    expect(contextForPath("/methods#limitations")).toBe("stories");
    expect(contextForPath("/players/1-x")).toBe("dossier");
    expect(contextForPath("/terminalx")).toBe("overview");
  });

  it("gives crossings their environment's entrance and workspace moves a quick swap", () => {
    expect(transitionTypes("/", "/terminal")).toEqual(["to-terminal"]);
    expect(transitionTypes("/terminal", "/stories")).toEqual(["to-stories"]);
    expect(transitionTypes("/terminal", "/terminal/market")).toEqual(["ws"]);
    expect(transitionTypes("/stories", "/methods")).toEqual(["chapter"]);
    expect(transitionTypes("/terminal", "/players/1")).toEqual(["to-dossier"]);
    expect(transitionTypes("/terminal/market", "/terminal/market?x=1")).toEqual([]);
  });

  it("carries the origin of a dossier visit", () => {
    expect(parseFrom("terminal")).toBe("terminal");
    expect(parseFrom(["stories"])).toBe("stories");
    expect(parseFrom("elsewhere")).toBeNull();
    expect(dossierHref("1-x", "stories")).toBe("/players/1-x?from=stories");
  });
});

describe("terminal routing", () => {
  it("finds the workspace for a path", () => {
    expect(workspaceForPath("/terminal")?.id).toBe("explorer");
    expect(workspaceForPath("/terminal/audit?view=leagues")?.id).toBe("audit");
    expect(workspaceForPath("/stories")).toBeNull();
  });

  it("parses comparison ids: unique, positive, at most four", () => {
    expect(parseIds("3,1,3,x,-2,9,8,7")).toEqual([3, 1, 9, 8]);
    expect(parseIds(undefined)).toEqual([]);
  });
});
