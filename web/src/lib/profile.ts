// The valuation form's model: field specs, drafts, presets and client-side validation.
// Ranges come from the API contract; the two cross-field rules mirror PlayerFeatures.consistent
// (src/api/schemas.py), with the minutes-per-appearance range read from the generated catalog.

import type { PlayerFeatures, PlayerField, ValidationIssue } from "@/lib/api/types";
import { constraintFor } from "@/lib/contract";
import { MINUTES_PER_APPEARANCE_RANGE, SUB_POSITIONS, type Position } from "@/lib/football";

export type FieldGroup = "player" | "context" | "time" | "output";

interface BaseSpec {
  name: PlayerField;
  label: string;
  hint?: string;
  group: FieldGroup;
}

export interface NumberSpec extends BaseSpec {
  kind: "number";
  /** "percent" fields are typed as 0–100 and sent as 0–1. */
  display: "plain" | "percent";
  step: number;
  unit?: string;
}

export interface ChoiceSpec extends BaseSpec {
  kind: "position" | "sub_position" | "foot" | "league";
}

export type FieldSpec = NumberSpec | ChoiceSpec;

export const FIELD_GROUPS: { id: FieldGroup; title: string; note?: string }[] = [
  { id: "player", title: "Player" },
  { id: "context", title: "Club and league", note: "Used by Model A only" },
  { id: "time", title: "Playing time", note: "Club matches in the two years to the valuation date" },
  { id: "output", title: "Output and discipline", note: "Per 90 minutes played" },
];

export const FIELD_SPECS: FieldSpec[] = [
  { name: "age", kind: "number", display: "plain", step: 0.5, unit: "yrs", label: "Age", group: "player" },
  { name: "height_in_cm", kind: "number", display: "plain", step: 1, unit: "cm", label: "Height", hint: "Optional", group: "player" },
  { name: "position", kind: "position", label: "Position", group: "player" },
  { name: "sub_position", kind: "sub_position", label: "Role", group: "player" },
  { name: "foot", kind: "foot", label: "Preferred foot", group: "player" },
  { name: "valuation_league_id", kind: "league", label: "League", group: "context" },
  { name: "club_ppg", kind: "number", display: "plain", step: 0.05, label: "Club points per game", hint: "League, last 365 days. Optional", group: "context" },
  { name: "appearances", kind: "number", display: "plain", step: 1, label: "Appearances", group: "time" },
  { name: "minutes", kind: "number", display: "plain", step: 10, unit: "min", label: "Minutes played", group: "time" },
  { name: "start_share", kind: "number", display: "percent", step: 1, unit: "%", label: "Games started", group: "time" },
  { name: "minutes_last_365", kind: "number", display: "plain", step: 10, unit: "min", label: "Minutes, last 365 days", group: "time" },
  { name: "days_since_last_match", kind: "number", display: "plain", step: 1, unit: "days", label: "Days since last match", group: "time" },
  { name: "valuation_club_minutes_share", kind: "number", display: "percent", step: 1, unit: "%", label: "Minutes at current club", group: "time" },
  { name: "intl_club_minutes_share", kind: "number", display: "percent", step: 1, unit: "%", label: "Minutes in European cups", group: "time" },
  { name: "goals_p90", kind: "number", display: "plain", step: 0.01, label: "Goals", group: "output" },
  { name: "assists_p90", kind: "number", display: "plain", step: 0.01, label: "Assists", group: "output" },
  { name: "yellow_p90", kind: "number", display: "plain", step: 0.01, label: "Yellow cards", group: "output" },
  { name: "red_p90", kind: "number", display: "plain", step: 0.005, label: "Red cards", group: "output" },
];

export type ProfileDraft = Record<PlayerField, string>;

export function specFor(name: PlayerField): FieldSpec {
  const s = FIELD_SPECS.find((f) => f.name === name);
  if (!s) throw new Error(`No field spec for ${name}`);
  return s;
}

/** Display bounds (percent fields scaled to 0–100). */
export function displayBounds(spec: NumberSpec): { min: number; max: number } {
  const c = constraintFor(spec.name);
  const k = spec.display === "percent" ? 100 : 1;
  return { min: (c.min ?? 0) * k, max: (c.max ?? 0) * k };
}

function toDisplay(spec: FieldSpec, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (spec.kind === "number" && typeof value === "number") {
    const v = spec.display === "percent" ? value * 100 : value;
    return String(Number(v.toFixed(4)));
  }
  return String(value);
}

export function toDraft(player: PlayerFeatures): ProfileDraft {
  const out = {} as ProfileDraft;
  for (const spec of FIELD_SPECS) out[spec.name] = toDisplay(spec, player[spec.name]);
  return out;
}

export interface Preset {
  id: string;
  label: string;
  player: PlayerFeatures;
}

// Illustrative profiles inside the training ranges. They are not real players.
export const PRESETS: Preset[] = [
  {
    id: "api-example",
    label: "Centre-forward in LaLiga",
    player: {
      age: 24.5, height_in_cm: 181, position: "Attack", sub_position: "Centre-Forward", foot: "right",
      valuation_league_id: "ES1", club_ppg: 1.6, appearances: 60, minutes: 4200, start_share: 0.8,
      goals_p90: 0.45, assists_p90: 0.15, yellow_p90: 0.1, red_p90: 0, intl_club_minutes_share: 0.1,
      minutes_last_365: 2300, days_since_last_match: 7, valuation_club_minutes_share: 1,
    },
  },
  {
    id: "young-winger",
    label: "Teenage winger in the Eredivisie",
    player: {
      age: 19, height_in_cm: 176, position: "Attack", sub_position: "Left Winger", foot: "left",
      valuation_league_id: "NL1", club_ppg: 2.1, appearances: 38, minutes: 2100, start_share: 0.55,
      goals_p90: 0.3, assists_p90: 0.25, yellow_p90: 0.08, red_p90: 0, intl_club_minutes_share: 0.15,
      minutes_last_365: 1500, days_since_last_match: 5, valuation_club_minutes_share: 1,
    },
  },
  {
    id: "veteran-keeper",
    label: "Veteran goalkeeper in Serie A",
    player: {
      age: 34, height_in_cm: 191, position: "Goalkeeper", sub_position: "Goalkeeper", foot: "right",
      valuation_league_id: "IT1", club_ppg: 1.3, appearances: 70, minutes: 6300, start_share: 1,
      goals_p90: 0, assists_p90: 0, yellow_p90: 0.05, red_p90: 0, intl_club_minutes_share: 0,
      minutes_last_365: 3150, days_since_last_match: 4, valuation_club_minutes_share: 1,
    },
  },
  {
    id: "rotation-defender",
    label: "Rotation centre-back in the Süper Lig",
    player: {
      age: 27, height_in_cm: 188, position: "Defender", sub_position: "Centre-Back", foot: "right",
      valuation_league_id: "TR1", club_ppg: 1.5, appearances: 45, minutes: 3200, start_share: 0.7,
      goals_p90: 0.06, assists_p90: 0.03, yellow_p90: 0.25, red_p90: 0.01, intl_club_minutes_share: 0.2,
      minutes_last_365: 1300, days_since_last_match: 30, valuation_club_minutes_share: 0.8,
    },
  },
];

export const DEFAULT_PLAYER = PRESETS[0]!.player;

export type FieldErrors = Partial<Record<PlayerField, string>>;

export type ValidationResult =
  | { ok: true; player: PlayerFeatures }
  | { ok: false; fieldErrors: FieldErrors; formErrors: string[] };

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
}

/** Validate a draft against the API contract. Returns the request payload when valid. */
export function validateProfile(draft: ProfileDraft): ValidationResult {
  const errors: FieldErrors = {};
  const player: Record<string, unknown> = {};

  for (const spec of FIELD_SPECS) {
    const raw = (draft[spec.name] ?? "").trim();
    const c = constraintFor(spec.name);

    if (spec.kind !== "number") {
      if (raw === "") {
        if (c.nullable) player[spec.name] = null;
        else errors[spec.name] = "Choose an option.";
        continue;
      }
      if (c.enum && !c.enum.includes(raw)) {
        errors[spec.name] = "Choose one of the listed options.";
        continue;
      }
      player[spec.name] = raw;
      continue;
    }

    if (raw === "") {
      if (c.nullable) player[spec.name] = null;
      else if (c.default !== undefined) player[spec.name] = c.default;
      else errors[spec.name] = "Enter a value.";
      continue;
    }
    const shown = Number(raw.replace(",", "."));
    if (!Number.isFinite(shown)) {
      errors[spec.name] = "Enter a number.";
      continue;
    }
    const { min, max } = displayBounds(spec);
    if (shown < min || shown > max) {
      errors[spec.name] = `Enter ${fmt(min)}–${fmt(max)}${spec.unit === "%" ? "%" : ""}. The model was trained on this range.`;
      continue;
    }
    if (c.type === "integer" && !Number.isInteger(shown)) {
      errors[spec.name] = "Use a whole number.";
      continue;
    }
    player[spec.name] = spec.display === "percent" ? Number((shown / 100).toFixed(6)) : shown;
  }

  // Role must belong to the chosen position (the model only saw these combinations).
  const position = player.position as Position | undefined;
  const sub = player.sub_position as string | undefined;
  if (position && sub && !SUB_POSITIONS[position]?.includes(sub)) {
    errors.sub_position = `Choose a ${position.toLowerCase()} role.`;
  }

  // Cross-field rules from PlayerFeatures.consistent.
  const minutes = player.minutes as number | undefined;
  const last365 = player.minutes_last_365 as number | undefined;
  const apps = player.appearances as number | undefined;
  if (minutes !== undefined && last365 !== undefined && !errors.minutes && !errors.minutes_last_365 && last365 > minutes) {
    errors.minutes_last_365 = "Can't be more than total minutes over two years.";
  }
  if (minutes !== undefined && apps !== undefined && !errors.minutes && !errors.appearances) {
    const [lo, hi] = MINUTES_PER_APPEARANCE_RANGE;
    const perApp = minutes / apps;
    if (perApp < lo || perApp > hi) {
      errors.appearances = `That's ${Math.round(perApp)} minutes per appearance; the model was trained on ${lo}–${Math.round(hi)}.`;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors, formErrors: [] };
  return { ok: true, player: player as unknown as PlayerFeatures };
}

/** Map a FastAPI 422 body onto form fields so server-side rejections land in the right place. */
export function serverErrorsToForm(detail: unknown): { fieldErrors: FieldErrors; formErrors: string[] } {
  const fieldErrors: FieldErrors = {};
  const formErrors: string[] = [];
  if (typeof detail === "string") return { fieldErrors, formErrors: [detail] };
  if (!Array.isArray(detail)) return { fieldErrors, formErrors: ["The service rejected this profile."] };
  for (const issue of detail as ValidationIssue[]) {
    const loc = issue.loc ?? [];
    const field = loc[0] === "body" && loc[1] === "player" ? loc[2] : undefined;
    const msg = String(issue.msg ?? "Invalid value").replace(/^Value error, /, "");
    if (typeof field === "string" && FIELD_SPECS.some((s) => s.name === field)) {
      fieldErrors[field as PlayerField] = msg.charAt(0).toUpperCase() + msg.slice(1) + (msg.endsWith(".") ? "" : ".");
    } else {
      formErrors.push(msg.charAt(0).toUpperCase() + msg.slice(1));
    }
  }
  return { fieldErrors, formErrors };
}
