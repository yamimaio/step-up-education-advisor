import { AMBIGUOUS_HOME_CITIES, METROS, METRO_STATES, PROGRAM_CITY_METROS } from "./constants";
import { countryCode, stateCode } from "./places";
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

interface Home {
  name: string;
  whole: string;
  states: string[];
  // Recognised countries only. A US state implies "US". A province or an unrecognised word is
  // neutral: it never rules a match out.
  countries: string[];
}

// The user's city is free text: "Boston", "Boston, MA", "Cambridge, Massachusetts, USA",
// "Washington, D.C.", "Brooklyn, NY 11201" or "Boston MA". Split off the city and sort the rest
// into US states and countries.
function parseHome(homeCity: string): Home {
  const parts = homeCity
    .split(",")
    .map(normalizeCity)
    .filter((p) => p !== "");
  let name = parts[0] ?? "";
  let qualifiers = parts.slice(1);
  if (parts.length === 1) {
    // No comma: a trailing state ("Boston MA", "Cambridge Massachusetts") is the qualifier.
    const words = name.split(" ");
    for (const n of [3, 2, 1]) {
      const tail = words.slice(-n).join(" ");
      if (words.length > n && stateCode(tail, true)) {
        name = words.slice(0, -n).join(" ");
        qualifiers = [tail];
        break;
      }
    }
  }
  const states: string[] = [];
  const countries: string[] = [];
  for (const raw of qualifiers) {
    // Drop a ZIP or postal number: "ny 11201" is "ny".
    const q = raw
      .split(" ")
      .filter((w) => !/^\d+$/.test(w))
      .join(" ");
    if (q === "") continue;
    const state = stateCode(q, true);
    const country = countryCode(q);
    if (state) states.push(state);
    else if (country) countries.push(country);
  }
  // A written non-US country decides: "Perth, WA, Australia" is not a US state. Otherwise a US
  // state implies the US.
  if (countries.some((c) => c !== "US"))
    return { name, whole: normalizeCity(homeCity), states: [], countries };
  if (states.length > 0) countries.push("US");
  return { name, whole: normalizeCity(homeCity), states, countries };
}

// A metro for the user's city. Names shared by several well-known cities (Cambridge,
// Arlington, Washington, San Jose) only resolve with a state, because the profile has no
// structured location yet. A written state must belong to the metro it resolves to.
function homeKey(home: Home): string | null {
  const key =
    METROS[home.whole] ??
    home.states.map((s) => METROS[`${home.name} ${s}`]).find((k) => k) ??
    (AMBIGUOUS_HOME_CITIES.includes(home.name) ? undefined : METROS[home.name]);
  if (!key) return null;
  const covered = METRO_STATES[key];
  if (home.states.length > 0 && covered && !home.states.some((s) => covered.includes(s))) {
    return null;
  }
  return key;
}

// True when the user's home city is the program's city or in the same metro (DQ18 plus the
// metro table). Unknown cities match only on an exact name. A state or country the user wrote
// that contradicts the program's rules out a same-name match (Cambridge, UK is not Cambridge, MA).
export function sameMetro(
  homeCity: string | null,
  program: Pick<Program, "city" | "metro" | "state" | "country">,
): boolean {
  if (!homeCity || !program.city) return false;
  const home = parseHome(homeCity);
  if (home.name === "") return false;
  if (program.country && home.countries.some((c) => c !== program.country)) return false;

  const programState = program.state ? stateCode(normalizeCity(program.state)) : null;
  const stateAgrees = !programState || home.states.every((s) => s === programState);
  if (home.name === normalizeCity(program.city) && stateAgrees) return true;
  if (program.metro && home.name === normalizeCity(program.metro) && stateAgrees) return true;

  const key = homeKey(home);
  if (!key) return false;
  // A program's own metro label only counts when the table knows it; otherwise its city decides.
  const programKey =
    (program.metro ? metroKey(program.metro) : null) ?? programCityKey(program.city);
  return key === programKey;
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
