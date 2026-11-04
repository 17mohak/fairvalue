import { ROOMS, roomForPath, transitionTo } from "./rooms";

describe("rooms", () => {
  it("has four distinct routes in navigation order", () => {
    expect(ROOMS.map((r) => r.href)).toEqual(["/", "/studio", "/fairness", "/methods"]);
  });

  it("maps paths, including nested and query paths, to their room", () => {
    expect(roomForPath("/").id).toBe("overview");
    expect(roomForPath("/studio").id).toBe("studio");
    expect(roomForPath("/fairness").id).toBe("observatory");
    expect(roomForPath("/methods/anything").id).toBe("methods");
    expect(roomForPath("/studios").id).toBe("overview");
  });

  it("slides forward to later rooms and back to earlier ones", () => {
    const [home, studio, , methods] = ROOMS;
    expect(transitionTo(home!, methods!)).toEqual(["nav-forward"]);
    expect(transitionTo(methods!, studio!)).toEqual(["nav-back"]);
    expect(transitionTo(studio!, studio!)).toEqual([]);
  });
});
