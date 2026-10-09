import { Category, type Need } from "../schema/enums";
import type { Profile } from "../schema/profile";

// Everything Thursday's tuning might touch lives here.

// Every rating in the product is an integer from 1 to 5 (docs/need-based-ranking.md, section 1).
export type Rating = 1 | 2 | 3 | 4 | 5;
export const RATING_MIN = 1;

// Strong = 5, Some = 3, Little = 1 (docs/build-plan.md, Step 1, mapped 2→5, 1→3, 0→1). A rating
// answers "how strongly does this type address this need for our target user (a senior
// leader)?", not "could this type teach it at all?".
export const TYPE_RATINGS: Record<Category, Record<Need, Rating>> = {
  mba: {
    leadership_skills: 3,
    deep_expertise: 3,
    graduate_degree: 5,
    senior_network: 1,
    new_industry_or_city: 5,
  },
  emba: {
    leadership_skills: 5,
    deep_expertise: 3,
    graduate_degree: 5,
    senior_network: 5,
    new_industry_or_city: 3,
  },
  specialized_masters: {
    leadership_skills: 3,
    deep_expertise: 5,
    graduate_degree: 5,
    senior_network: 1,
    new_industry_or_city: 3,
  },
  executive: {
    leadership_skills: 5,
    deep_expertise: 3,
    graduate_degree: 1,
    senior_network: 5,
    new_industry_or_city: 3,
  },
  // A certificate is not a degree. Credit that counts toward one is a program fact; see
  // docs/decisions.md (post-challenge).
  certificate: {
    leadership_skills: 3,
    deep_expertise: 3,
    graduate_degree: 1,
    senior_network: 1,
    new_industry_or_city: 1,
  },
  short_course: {
    leadership_skills: 3,
    deep_expertise: 3,
    graduate_degree: 1,
    senior_network: 1,
    new_industry_or_city: 1,
  },
};

// Matrix order, used to break ties deterministically. Taken from the schema enum, so a new
// category can't be left unscored.
export const CATEGORY_ORDER: readonly Category[] = Category.options;

// Weights for the user's #1, #2 and #3 need.
export const NEED_WEIGHTS = [3, 2, 1] as const;

export const DEGREE_ADJUST = { no: -6, unsure: -4, preferred: -2 } as const;
export const DEGREE_ADJUSTED_TYPES: readonly Category[] = ["mba", "emba", "specialized_masters"];

// Types ruled out when the user's employer requires a degree.
export const REQUIRED_RULES_OUT: readonly Category[] = ["executive", "certificate", "short_course"];

export const GROW_IN_ROLE_BONUS = 4;
export const GROW_IN_ROLE_TYPES: readonly Category[] = ["executive", "certificate", "short_course"];

export const NO_PROGRAM_THRESHOLD = 14;

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
