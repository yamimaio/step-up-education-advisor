import { AMBIGUOUS_HOME_CITIES, METROS, PROGRAM_CITY_METROS } from "./constants";
import type { Program } from "../schema/program";

// Lower case, no accents, punctuation as single spaces: "São Paulo" and "sao paulo" match.
export function normalizeCity(city: string): string {
  return city
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const metroKey = (name: string) => METROS[normalizeCity(name)] ?? null;
const programCityKey = (city: string) =>
  metroKey(city) ?? PROGRAM_CITY_METROS[normalizeCity(city)] ?? null;

// The user's city is free text ("Boston, MA"). Try the whole text first so "San Jose, CA"
// can be told from San José, Costa Rica, then the part before the first comma. Names shared
// by several well-known cities (Cambridge, Arlington, Washington, San Jose) only match
// as written with a qualifier, because the profile has no state or country.
function homeParts(homeCity: string): { name: string; key: string | null } {
  const name = normalizeCity(homeCity.split(",")[0] ?? "");
  // "San Jose, CA, USA": try the whole text, then the city with its state or country.
  const parts = homeCity.split(",");
  const whole =
    METROS[normalizeCity(homeCity)] ?? METROS[normalizeCity(parts.slice(0, 2).join(" "))];
  if (whole) return { name, key: whole };
  return { name, key: AMBIGUOUS_HOME_CITIES.includes(name) ? null : (METROS[name] ?? null) };
}

// True when the user's home city is the program's city or in the same metro (DQ18 plus the
// metro table). Unknown cities match only on an exact name.
export function sameMetro(
  homeCity: string | null,
  program: Pick<Program, "city" | "metro">,
): boolean {
  if (!homeCity || !program.city) return false;
  const home = homeParts(homeCity);
  if (home.name === "") return false;
  if (home.name === normalizeCity(program.city)) return true;
  if (program.metro && home.name === normalizeCity(program.metro)) return true;
  if (!home.key) return false;
  // A program's own metro label only counts when the table knows it; otherwise its city decides.
  const programKey =
    (program.metro ? metroKey(program.metro) : null) ?? programCityKey(program.city);
  return home.key === programKey;
}

// A full-time in-person program needs the home metro or relocation. Evenings or daily
// attendance outside the metro does too. Everything else is left to the travel checks.
export function needsLocalPresence(
  program: Pick<Program, "format" | "workCompatible" | "attendance">,
): boolean {
  const fullTimeInPerson = program.format === "in_person" && !program.workCompatible;
  const commuting =
    program.attendance === "recurring_evenings" || program.attendance === "recurring_daily";
  return program.format !== "online" && (fullTimeInPerson || commuting);
}
