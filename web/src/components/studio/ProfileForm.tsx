"use client";

import type { RefObject } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import type { PlayerField } from "@/lib/api/types";
import { LEAGUE_IDS, LEAGUES, POSITIONS, SUB_POSITIONS, type ModelId, type Position } from "@/lib/football";
import {
  FIELD_GROUPS,
  FIELD_SPECS,
  displayBounds,
  type FieldErrors,
  type FieldSpec,
  type ProfileDraft,
} from "@/lib/profile";
import styles from "./ProfileForm.module.css";

interface Props {
  draft: ProfileDraft;
  errors: FieldErrors;
  model: ModelId;
  onChange: (field: PlayerField, value: string) => void;
  fieldRefs: RefObject<Partial<Record<PlayerField, HTMLElement | null>>>;
}

const FOOT_OPTIONS = [
  { value: "right", label: "Right" },
  { value: "left", label: "Left" },
  { value: "both", label: "Both" },
  { value: "", label: "Unknown" },
] as const;

const LEAGUES_SORTED = [...LEAGUE_IDS].sort((a, b) => (LEAGUES[a]?.country ?? a).localeCompare(LEAGUES[b]?.country ?? b));

export function ProfileForm({ draft, errors, model, onChange, fieldRefs }: Props) {
  const setRef = (name: PlayerField) => (el: HTMLElement | null) => {
    fieldRefs.current[name] = el;
  };

  function render(spec: FieldSpec) {
    const error = errors[spec.name];
    switch (spec.kind) {
      case "number": {
        const { min, max } = displayBounds(spec);
        return (
          <NumberField
            ref={setRef(spec.name)}
            name={spec.name}
            label={spec.label}
            hint={spec.hint}
            unit={spec.unit}
            min={min}
            max={max}
            step={spec.step}
            value={draft[spec.name]}
            error={error}
            onChange={(v) => onChange(spec.name, v)}
          />
        );
      }
      case "position":
        return (
          <div ref={setRef(spec.name)}>
            <Segmented
              legend={spec.label}
              name="position"
              value={draft.position as Position}
              options={POSITIONS.map((p) => ({ value: p, label: p === "Goalkeeper" ? "Keeper" : p === "Defender" ? "Defence" : p }))}
              onChange={(v) => onChange("position", v)}
              error={error}
            />
          </div>
        );
      case "sub_position": {
        const options = SUB_POSITIONS[draft.position as Position] ?? [];
        return (
          <SelectField ref={setRef(spec.name)} name="sub_position" label={spec.label} value={draft.sub_position} error={error} onChange={(v) => onChange("sub_position", v)}>
            {!options.includes(draft.sub_position) && <option value="">Choose a role</option>}
            {options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
        );
      }
      case "foot":
        return (
          <div ref={setRef(spec.name)}>
            <Segmented
              legend={spec.label}
              name="foot"
              value={draft.foot}
              options={FOOT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              onChange={(v) => onChange("foot", v)}
              error={error}
            />
          </div>
        );
      case "league":
        return (
          <SelectField ref={setRef(spec.name)} name="valuation_league_id" label={spec.label} value={draft.valuation_league_id} error={error} onChange={(v) => onChange("valuation_league_id", v)}>
            {LEAGUES_SORTED.map((id) => (
              <option key={id} value={id}>
                {LEAGUES[id]?.country ?? id}: {LEAGUES[id]?.name ?? id}
              </option>
            ))}
          </SelectField>
        );
    }
  }

  return (
    <div className={styles.form}>
      {FIELD_GROUPS.map((group) => {
        const inactive = group.id === "context" && model === "B";
        return (
          <fieldset key={group.id} className={styles.group} data-inactive={inactive || undefined}>
            <legend className={styles.legend}>
              <span className={styles.title}>{group.title}</span>
              {group.note && <span className={styles.note}>{inactive ? "Not used by Model B; kept for comparison" : group.note}</span>}
            </legend>
            <div className={`${styles.grid} ${group.id === "player" ? styles.gridPlayer : ""}`}>
              {FIELD_SPECS.filter((f) => f.group === group.id).map((spec) => (
                <div key={spec.name} className={styles.cell} data-field={spec.name}>
                  {render(spec)}
                </div>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
