import type { PlayerFeatures } from "@/lib/api/types";
import { CONTRACT_FIELDS, PLAYER_CONSTRAINTS, constraintFor } from "@/lib/contract";
import { SUB_POSITIONS } from "@/lib/football";
import { DEFAULT_PLAYER, FIELD_SPECS, PRESETS, serverErrorsToForm, toDraft, validateProfile } from "./profile";

const draftWith = (change: Partial<Record<keyof PlayerFeatures, string>>) => ({ ...toDraft(DEFAULT_PLAYER), ...change });

describe("API contract sync", () => {
  it("has a form field for every PlayerFeatures property and no extras", () => {
    expect(new Set(FIELD_SPECS.map((f) => f.name))).toEqual(new Set(CONTRACT_FIELDS));
  });

  it("reads ranges and nullability from the OpenAPI document", () => {
    expect(constraintFor("age")).toMatchObject({ min: 16, max: 44, required: true, nullable: false });
    expect(constraintFor("height_in_cm")).toMatchObject({ min: 160, max: 206, nullable: true });
    expect(constraintFor("appearances").type).toBe("integer");
    expect(constraintFor("valuation_league_id").enum).toHaveLength(14);
  });

  it("never offers a demographic input", () => {
    const names = Object.keys(PLAYER_CONSTRAINTS).join(" ");
    expect(names).not.toMatch(/nation|citizen|confed|birth/);
  });
});

describe("validateProfile", () => {
  it.each(PRESETS.map((p) => [p.label, p.player] as const))("accepts the preset '%s'", (_, player) => {
    const r = validateProfile(toDraft(player));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.player).toEqual(player);
  });

  it("presets only use roles that belong to their position", () => {
    for (const p of PRESETS) expect(SUB_POSITIONS[p.player.position]).toContain(p.player.sub_position);
  });

  it("converts percentage inputs back to shares", () => {
    const r = validateProfile(draftWith({ start_share: "80" }));
    expect(r.ok && r.player.start_share).toBe(0.8);
  });

  it("rejects values outside the training range", () => {
    const r = validateProfile(draftWith({ age: "12" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors.age).toMatch(/16–44/);
  });

  it("requires whole numbers for integer fields", () => {
    const r = validateProfile(draftWith({ appearances: "60.5" }));
    expect(!r.ok && r.fieldErrors.appearances).toMatch(/whole number/);
  });

  it("allows optional fields to be empty and sends null", () => {
    const r = validateProfile(draftWith({ height_in_cm: "", club_ppg: "", foot: "" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect([r.player.height_in_cm, r.player.club_ppg, r.player.foot]).toEqual([null, null, null]);
  });

  it("enforces last-365 minutes <= two-year minutes", () => {
    const r = validateProfile(draftWith({ minutes: "1000", minutes_last_365: "1500", appearances: "20" }));
    expect(!r.ok && r.fieldErrors.minutes_last_365).toMatch(/more than total minutes/);
  });

  it("enforces the minutes-per-appearance training range", () => {
    const r = validateProfile(draftWith({ minutes: "4200", appearances: "30" })); // 140 per game
    expect(!r.ok && r.fieldErrors.appearances).toMatch(/140 minutes per appearance/);
  });

  it("rejects a role from another position", () => {
    const r = validateProfile(draftWith({ position: "Goalkeeper", sub_position: "Centre-Forward" }));
    expect(!r.ok && r.fieldErrors.sub_position).toBeTruthy();
  });
});

describe("serverErrorsToForm", () => {
  it("maps FastAPI 422 locations onto fields and model-level errors onto the form", () => {
    const { fieldErrors, formErrors } = serverErrorsToForm([
      { loc: ["body", "player", "age"], msg: "Input should be greater than or equal to 16", type: "greater_than_equal" },
      { loc: ["body", "player"], msg: "Value error, minutes_last_365 cannot exceed minutes (two-year total)", type: "value_error" },
    ]);
    expect(fieldErrors.age).toBe("Input should be greater than or equal to 16.");
    expect(formErrors).toEqual(["Minutes_last_365 cannot exceed minutes (two-year total)"]);
  });

  it("passes plain-string details through", () => {
    expect(serverErrorsToForm("Unknown sub_position 'Libero'").formErrors).toEqual(["Unknown sub_position 'Libero'"]);
  });
});
