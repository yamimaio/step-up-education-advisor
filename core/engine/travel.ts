import type { Program } from "../schema/program";
import { AIRFARE_MIDPOINTS, WEEKEND_NIGHTS_PER_TRIP, WEEKEND_TRIPS_PER_YEAR } from "./constants";
import { needsLocalPresence, sameMetro } from "./metro";
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

const cents = (n: number) => Math.round(n * 100) / 100;

// Travel and lodging for the whole program, from published counts and fixed midpoints.
// It is an estimate and the card says so; nothing here is searched.
export function travelEstimate(
  program: Program,
  profile: Pick<EffectiveProfile, "homeCity" | "airfareRange"> & { relocate?: boolean | null },
): TravelEstimate {
  if (program.format === "online" || program.onsiteDaysPerYear === 0) {
    return { ...base, notes: ["No on-site time."] };
  }
  const local = sameMetro(profile.homeCity, program);
  if (local) {
    return { ...base, notes: ["The program is in your metro area, so no airfare or lodging."] };
  }
  // A user who would move (or hasn't said they wouldn't) to attend a program that needs them
  // local is not commuting from home.
  if (needsLocalPresence(program) && profile.relocate !== false) {
    const note =
      profile.relocate === true
        ? "You'd relocate for this program, so no recurring travel."
        : "You didn't say whether you'd relocate, so no recurring travel is counted.";
    return { ...base, notes: [note] };
  }

  const months = program.durationMonths ?? program.durationMaxMonths;
  if (months === null) return unknown("Program length not published.");
  const years = Math.max(1, Math.ceil(months / 12));

  const count = program.residencyCount !== null && program.residencyCount > 0;
  const days = program.onsiteDaysPerYear;
  const weekends = program.attendance === "recurring_weekends";

  let trips: number;
  let nights: number;
  let tripsEstimated = false;
  const notes: string[] = [];
  if (count && days !== null) {
    trips = (program.residencyCount as number) * years;
    nights = days / (program.residencyCount as number);
  } else if (count && weekends) {
    // The trip count is published; only the nights per trip are a guess.
    trips = (program.residencyCount as number) * years;
    nights = WEEKEND_NIGHTS_PER_TRIP;
    notes.push(`Nights per trip estimated at ${WEEKEND_NIGHTS_PER_TRIP}.`);
  } else if (weekends && days !== null) {
    // No trip count, but the school publishes its on-site days: count weekends from those.
    const perYear = Math.max(1, Math.ceil(days / WEEKEND_NIGHTS_PER_TRIP));
    trips = perYear * years;
    nights = days / perYear;
    tripsEstimated = true;
    notes.push(`Trip count estimated from the ${days} published on-site days a year.`);
  } else if (weekends) {
    trips = WEEKEND_TRIPS_PER_YEAR * years;
    nights = WEEKEND_NIGHTS_PER_TRIP;
    tripsEstimated = true;
    notes.push(
      `Trip count estimated: about ${WEEKEND_TRIPS_PER_YEAR} weekends a year, ${WEEKEND_NIGHTS_PER_TRIP} nights each.`,
    );
  } else if (count) {
    return unknown("On-site days a year not published.");
  } else if (days !== null) {
    return unknown("Number of trips not published.");
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
  const gsa = lodgingRate !== null ? "; lodging uses the top GSA rate" : "";
  if (lodgingOnly) notes.push("Airfare unknown, so this covers lodging only.");
  else notes.push(`Airfare uses the midpoint of your range${gsa}.`);

  return {
    kind: "estimate",
    totalUsd: cents(trips * (airfare ?? 0) + lodging),
    trips,
    nightsPerTrip: nights,
    airfarePerTripUsd: airfare,
    lodgingPerNightUsd: lodgingRate,
    lodgingOnly,
    tripsEstimated,
    notes,
  };
}
