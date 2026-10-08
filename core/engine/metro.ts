import { METROS } from "./constants";
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

// True when the user's home city is the program's city or in the same metro (DQ18 plus the
// metro table). Unknown cities match only on an exact name.
export function sameMetro(
  homeCity: string | null,
  program: Pick<Program, "city" | "metro">,
): boolean {
  if (!homeCity || !program.city) return false;
  const home = normalizeCity(homeCity);
  if (home === "") return false;
  if (home === normalizeCity(program.city)) return true;
  const homeKey = metroKey(homeCity);
  if (!homeKey) return false;
  const programKey =
    (program.metro ? (metroKey(program.metro) ?? normalizeCity(program.metro)) : null) ??
    metroKey(program.city);
  return homeKey === programKey;
}
