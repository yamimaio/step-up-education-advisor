import type { Program } from "../schema/program";
import { AIRFARE_MIDPOINTS, WEEKEND_NIGHTS_PER_TRIP, WEEKEND_TRIPS_PER_YEAR } from "./constants";
import { needsLocalPresence, withinCommute } from "./distance";
import type { EffectiveProfile, TravelEstimate } from "./types";

const base: TravelEstimate = {
  kind: "none",
  totalUsd: 0,
  trips: 0,
  tripsPerYear: 0,
  nightsPerTrip: 0,
  airfarePerTripUsd: null,
  lodgingPerNightUsd: null,
  lodgingOnly: false,
  tripsEstimated: false,
  notes: [],
};

// `earlier` carries notes already made (an unknown location), so they survive the return. `known`
// keeps the trip figures already worked out when something else is missing, for the card.
const unknown = (
  note: string,
  earlier: string[] = [],
  known: Partial<
    Pick<TravelEstimate, "trips" | "tripsPerYear" | "nightsPerTrip" | "tripsEstimated">
  > = {},
): TravelEstimate => ({
  ...base,
  kind: "unknown",
  totalUsd: null,
  trips: null,
  tripsPerYear: null,
  nightsPerTrip: null,
  ...known,
  notes: [...earlier, note],
});

const cents = (n: number) => Math.round(n * 100) / 100;

// Travel and lodging for the whole program, from published counts and fixed midpoints.
// It is an estimate and the card says so; nothing here is searched.
export function travelEstimate(
  program: Program,
  profile: Pick<EffectiveProfile, "homeLat" | "homeLon" | "airfareRange"> & {
    relocate?: boolean | null;
  },
): TravelEstimate {
  if (program.format === "online" || program.onsiteDaysPerYear === 0) {
    return { ...base, notes: ["No on-site time."] };
  }
  // null: a coordinate is missing. The user is then treated as away, never as local.
  const local = withinCommute(profile, program);
  if (local) {
    return {
      ...base,
      notes: ["The campus is within commuting distance, so no airfare or lodging."],
    };
  }
  // A program that needs the student local has no recurring trips, whatever the distance. A user
  // who would move (or hasn't said they wouldn't) isn't commuting from home; one who won't move
  // is judged by the location check, so no trips are costed and no data gap is blamed on the
  // program.
  if (needsLocalPresence(program)) {
    const note =
      profile.relocate === true
        ? "You'd relocate for this program, so no recurring travel."
        : profile.relocate === null || profile.relocate === undefined
          ? "You didn't say whether you'd relocate, so no recurring travel is counted."
          : "This program needs you near campus, so the location check decides; no recurring travel is counted.";
    return { ...base, notes: [note] };
  }

  const notes: string[] = [];
  if (local === null) {
    notes.push("Your home or the campus location is unknown, so this assumes you travel.");
  }
  const months = program.durationMonths ?? program.durationMaxMonths;
  if (months === null) return unknown("Program length not published.", notes);
  const years = Math.max(1, Math.ceil(months / 12));

  const count = program.residencyCount !== null && program.residencyCount > 0;
  const days = program.onsiteDaysPerYear;
  const weekends = program.attendance === "recurring_weekends";

  let trips: number;
  let perYear: number;
  let nights: number;
  let tripsEstimated = false;
  if (count && days !== null) {
    perYear = program.residencyCount as number;
    trips = perYear * years;
    nights = days / (program.residencyCount as number);
  } else if (count && weekends) {
    // The trip count is published; only the nights per trip are a guess.
    perYear = program.residencyCount as number;
    trips = perYear * years;
    nights = WEEKEND_NIGHTS_PER_TRIP;
    notes.push(`Nights per trip estimated at ${WEEKEND_NIGHTS_PER_TRIP}.`);
  } else if (weekends && days !== null) {
    // No trip count, but the school publishes its on-site days: count weekends from those.
    perYear = Math.max(1, Math.ceil(days / WEEKEND_NIGHTS_PER_TRIP));
    trips = perYear * years;
    nights = days / perYear;
    tripsEstimated = true;
    notes.push(`Trip count estimated from the ${days} published on-site days a year.`);
  } else if (weekends) {
    perYear = WEEKEND_TRIPS_PER_YEAR;
    trips = perYear * years;
    nights = WEEKEND_NIGHTS_PER_TRIP;
    tripsEstimated = true;
    notes.push(
      `Trip count estimated: about ${WEEKEND_TRIPS_PER_YEAR} weekends a year, ${WEEKEND_NIGHTS_PER_TRIP} nights each.`,
    );
  } else if (count) {
    // The trips are published; only their length, and so the lodging, is missing.
    const perYearCount = program.residencyCount as number;
    return unknown("On-site days a year not published.", notes, {
      trips: perYearCount * years,
      tripsPerYear: perYearCount,
    });
  } else if (days !== null) {
    return unknown("Number of trips not published.", notes);
  } else {
    return unknown("On-site days and trips not published.", notes);
  }

  let lodging = 0;
  let lodgingRate: number | null = null;
  if (program.lodgingIncluded === true) {
    notes.push("Tuition includes lodging.");
  } else if (program.lodgingPerNightUsd !== null) {
    lodgingRate = program.lodgingPerNightUsd.max;
    lodging = trips * nights * lodgingRate;
  } else {
    return unknown("Lodging rate not published.", notes, {
      trips,
      tripsPerYear: perYear,
      nightsPerTrip: nights,
      tripsEstimated,
    });
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
    tripsPerYear: perYear,
    nightsPerTrip: nights,
    airfarePerTripUsd: airfare,
    lodgingPerNightUsd: lodgingRate,
    lodgingOnly,
    tripsEstimated,
    notes,
  };
}
