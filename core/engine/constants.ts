import type { Category, LocationValue, Need } from "../schema/enums";
import type { Profile } from "../schema/profile";

// Everything Thursday's tuning might touch lives here.

// Strong = 2, Some = 1, Little = 0 (docs/build-plan.md, Step 1).
export const TYPE_RATINGS: Record<Category, Record<Need, 0 | 1 | 2>> = {
  mba: {
    leadership_skills: 2,
    deep_expertise: 1,
    graduate_degree: 2,
    senior_network: 0,
    new_industry_or_city: 2,
  },
  emba: {
    leadership_skills: 2,
    deep_expertise: 1,
    graduate_degree: 2,
    senior_network: 2,
    new_industry_or_city: 1,
  },
  specialized_masters: {
    leadership_skills: 1,
    deep_expertise: 2,
    graduate_degree: 2,
    senior_network: 0,
    new_industry_or_city: 1,
  },
  executive: {
    leadership_skills: 2,
    deep_expertise: 1,
    graduate_degree: 0,
    senior_network: 2,
    new_industry_or_city: 1,
  },
  certificate: {
    leadership_skills: 1,
    deep_expertise: 1,
    graduate_degree: 1,
    senior_network: 0,
    new_industry_or_city: 0,
  },
  short_course: {
    leadership_skills: 1,
    deep_expertise: 1,
    graduate_degree: 0,
    senior_network: 0,
    new_industry_or_city: 0,
  },
};

// Matrix order, used to break ties deterministically.
export const CATEGORY_ORDER: readonly Category[] = [
  "mba",
  "emba",
  "specialized_masters",
  "executive",
  "certificate",
  "short_course",
];

// Weights for the user's #1, #2 and #3 need.
export const NEED_WEIGHTS = [3, 2, 1] as const;

export const DEGREE_ADJUST = { no: -3, unsure: -2, preferred: -1 } as const;
export const DEGREE_ADJUSTED_TYPES: readonly Category[] = ["mba", "emba", "specialized_masters"];

// Types ruled out when the user's employer requires a degree.
export const REQUIRED_RULES_OUT: readonly Category[] = ["executive", "certificate", "short_course"];

export const GROW_IN_ROLE_BONUS = 2;
export const GROW_IN_ROLE_TYPES: readonly Category[] = ["executive", "certificate", "short_course"];

export const NO_PROGRAM_THRESHOLD = 4;

// Percent over a limit that still counts as a near miss.
export const NEAR_MISS_PCT = 15;
// Hours are looser: both sides are estimates.
export const HOURS_PASS_PCT = 25;
export const HOURS_NEAR_PCT = 50;

// Each row sums to 1: network, depth, practicality, costValue, locationFit.
export const SCENARIO_WEIGHTS = {
  network: { network: 0.4, depth: 0.1, practicality: 0.15, costValue: 0.1, locationFit: 0.25 },
  depth: { network: 0.1, depth: 0.45, practicality: 0.15, costValue: 0.15, locationFit: 0.15 },
  practicality: { network: 0.1, depth: 0.1, practicality: 0.45, costValue: 0.25, locationFit: 0.1 },
} as const;

export const CATEGORY_BONUS = 0.5;

export const PEER_FIT = {
  moreSeniorBelow: -1,
  moreSeniorAtOrAbove: 0.5,
  sameLevelMaxGapYears: 5,
  sameLevelPenalty: -1,
} as const;

export const LOCATION_FIT = {
  base: 3,
  perMatchedValue: 1,
  appealBonus: 0.5,
  burdenPenalty: -1,
  min: 1,
  max: 5,
} as const;

export const LOCATION_VALUES_ORDER: readonly LocationValue[] = [
  "network_density",
  "industry_hub",
  "relocation_path",
  "immersion",
  "affordability",
  "travel_ease",
  "international",
];

// Midpoints of the airfare chips (D8). "unknown" has no midpoint.
export const AIRFARE_MIDPOINTS: Record<Profile["airfareRange"], number | null> = {
  under_500: 400,
  "500_1000": 750,
  "1000_1500": 1250,
  over_1500: 1750,
  unknown: null,
};

export const CONFIDENCE_WINDOW_DAYS = 60;

// Recurring weekends with no counts: every other weekend, two nights each.
export const WEEKEND_TRIPS_PER_YEAR = 26;
export const WEEKEND_NIGHTS_PER_TRIP = 2;

// A campus this close (great-circle km) to the home counts as local: no airfare or lodging, and a
// full-time or commuting program is reachable without relocating.
export const COMMUTE_KM = 80;

// Plain words for the card (confidence reasons name checks by these).
export const CHECK_LABELS = {
  tuition: "tuition",
  travelBudget: "travel cost",
  onsiteDays: "on-site days a year",
  longestStretch: "longest stretch away",
  length: "program length",
  hours: "hours a week",
  workCompatible: "work compatibility",
  location: "location",
} as const;
