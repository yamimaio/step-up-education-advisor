import type { Program } from "../schema/program";
import { AIRFARE_MIDPOINTS, WEEKEND_NIGHTS_PER_TRIP, WEEKEND_TRIPS_PER_YEAR } from "./constants";
import { sameMetro } from "./metro";
import type { EffectiveProfile, TravelEstimate } from "./types";

const base: TravelEstimate = {
  kind: "none",
  totalUsd: 0,
  trips: 0,
  nightsPerTrip: 0,
  airfarePerTripUsd: null,
  lodgingPerNightUsd: null,
  lodgingOnly: false,
  tripsEstimated: false,
  notes: [],
};

const unknown = (note: string): TravelEstimate => ({
  ...base,
  kind: "unknown",
  totalUsd: null,
  trips: null,
  nightsPerTrip: null,
  notes: [note],
});

// Travel and lodging for the whole program, from published counts and fixed midpoints.
// It is an estimate and the card says so; nothing here is searched.
export function travelEstimate(
  program: Program,
  profile: Pick<EffectiveProfile, "homeCity" | "airfareRange">,
): TravelEstimate {
  if (program.format === "online" || program.onsiteDaysPerYear === 0) {
    return { ...base, notes: ["No on-site time."] };
  }
  if (sameMetro(profile.homeCity, program)) {
    return { ...base, notes: ["The program is in your metro area, so no airfare or lodging."] };
  }

  const months = program.durationMonths ?? program.durationMaxMonths;
  if (months === null) return unknown("Program length not published.");
  const years = Math.max(1, Math.ceil(months / 12));

  let trips: number;
  let nights: number;
  let tripsEstimated = false;
  const notes: string[] = [];
  if (
    program.residencyCount !== null &&
    program.residencyCount > 0 &&
    program.onsiteDaysPerYear !== null
  ) {
    trips = program.residencyCount * years;
    nights = program.onsiteDaysPerYear / program.residencyCount;
  } else if (program.attendance === "recurring_weekends") {
    trips = WEEKEND_TRIPS_PER_YEAR * years;
    nights = WEEKEND_NIGHTS_PER_TRIP;
    tripsEstimated = true;
    notes.push(
      `Trip count estimated: about ${WEEKEND_TRIPS_PER_YEAR} weekends a year, ${WEEKEND_NIGHTS_PER_TRIP} nights each.`,
    );
  } else {
    return unknown("On-site days and trips not published.");
  }

  let lodging = 0;
  let lodgingRate: number | null = null;
  if (program.lodgingIncluded === true) {
    notes.push("Tuition includes lodging.");
  } else if (program.lodgingPerNightUsd !== null) {
    lodgingRate = program.lodgingPerNightUsd.max;
    lodging = trips * nights * lodgingRate;
  } else {
    return unknown("Lodging rate not published.");
  }

  const airfare = AIRFARE_MIDPOINTS[profile.airfareRange];
  const lodgingOnly = airfare === null;
  if (lodgingOnly) notes.push("Airfare unknown, so this covers lodging only.");
  else notes.push("Airfare uses the midpoint of your range; lodging uses the top GSA rate.");

  return {
    kind: "estimate",
    totalUsd: trips * (airfare ?? 0) + lodging,
    trips,
    nightsPerTrip: nights,
    airfarePerTripUsd: airfare,
    lodgingPerNightUsd: lodgingRate,
    lodgingOnly,
    tripsEstimated,
    notes,
  };
}
