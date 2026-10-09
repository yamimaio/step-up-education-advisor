import { COMMUTE_KM } from "./constants";
import type { Program } from "../schema/program";
import type { EffectiveProfile } from "./types";

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Great-circle distance between two points, in kilometres.
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  // Rounding can push `a` a hair past 1 for antipodal points.
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

// True when the campus is within commuting distance of home, false when it is farther, and
// null when either side has no coordinates: unknown, never a silent pass.
export function withinCommute(
  home: Pick<EffectiveProfile, "homeLat" | "homeLon">,
  program: Pick<Program, "campusLat" | "campusLon">,
): boolean | null {
  const { homeLat, homeLon } = home;
  const { campusLat, campusLon } = program;
  if (homeLat === null || homeLon === null || campusLat === null || campusLon === null) {
    return null;
  }
  return haversineKm(homeLat, homeLon, campusLat, campusLon) <= COMMUTE_KM;
}

// A full-time in-person program needs the student near campus or relocating. Evenings or daily
// attendance outside commuting distance do too. Everything else is left to the travel checks.
export function needsLocalPresence(
  program: Pick<Program, "format" | "workCompatible" | "attendance">,
): boolean {
  const fullTimeInPerson = program.format === "in_person" && !program.workCompatible;
  const commuting =
    program.attendance === "recurring_evenings" || program.attendance === "recurring_daily";
  return program.format !== "online" && (fullTimeInPerson || commuting);
}
