// A small national or league-country flag beside a name that is always shown as text too.
// Flags come from flag-icons (MIT) via src/data/countries.json; a country without a settled flag
// renders nothing, so the text label stands alone. Display only: never a model input.

import countries from "@/data/countries.json";
import { leagueCountry } from "@/lib/football";
import styles from "./Flag.module.css";

const FLAGS = countries.flags as Record<string, string | null>;

/** The flag file for a Transfermarkt country name, or null when none is shown. */
export function flagCode(country: string | null | undefined): string | null {
  return country ? (FLAGS[country] ?? null) : null;
}

/** Decorative by default: the adjacent text names the country. Pass `label` when it stands alone. */
export function Flag({ country, label }: { country: string | null | undefined; label?: boolean }) {
  const code = flagCode(country);
  if (!code) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs; next/image adds nothing here
    <img
      className={styles.flag}
      src={`/flags/${code}.svg`}
      width={16}
      height={12}
      loading="lazy"
      decoding="async"
      alt={label ? `${country} flag` : ""}
      aria-hidden={label ? undefined : true}
    />
  );
}

/** The flag of the country a covered league belongs to. */
export function LeagueFlag({ leagueId }: { leagueId: string }) {
  return <Flag country={leagueCountry(leagueId)} />;
}
