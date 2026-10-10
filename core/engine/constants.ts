import { Category, type Format, type Need } from "../schema/enums";
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

// The words a type's reasons use (issue #130): the user reads why a type fits, never its score.
export const NEED_WORDS: Record<Need, string> = {
  leadership_skills: "leadership skills",
  deep_expertise: "deep expertise in a field",
  graduate_degree: "a graduate degree",
  senior_network: "a senior network",
  new_industry_or_city: "access to a new industry or city",
};
export const RATING_WORDS: Record<Rating, string> = {
  5: "Strong for",
  4: "Strong for",
  3: "Some help with",
  2: "Little help with",
  1: "Little help with",
};
// For graduate_degree on a type in REQUIRED_RULES_OUT, in place of its rating words.
export const NO_DEGREE_WORDS = "Doesn't award a graduate degree.";
export const DEGREE_WORDS = {
  no: "Built around a degree you said you don't need.",
  unsure: "Built around a degree you're not sure you need.",
  preferred: "Built around a degree the role you want prefers but doesn't require.",
} as const;
export const GROW_IN_ROLE_WORDS = "Made for growing in the role you have.";
export const GROW_IN_ROLE_TYPES: readonly Category[] = ["executive", "certificate", "short_course"];

export const NO_PROGRAM_THRESHOLD = 14;

// Percent over a limit that still counts as a near miss.
export const NEAR_MISS_PCT = 15;
// Hours are looser: both sides are estimates.
export const HOURS_PASS_PCT = 25;
export const HOURS_NEAR_PCT = 50;

// Stage 2 program score (docs/need-based-ranking.md, section 3): NEED_WEIGHTS × the program's
// ratings on the user's three needs, plus these weights × format fit and travel fit. 9 to 45.
export const FORMAT_FIT_WEIGHT = 2;
export const TRAVEL_FIT_WEIGHT = 1;

// Format fit (section 3a): exact match; a neighbouring format (blended neighbours both online and
// in person); the opposite format (online vs in person). No preference scores every program 3.
export const FORMAT_FIT = { match: 5, neighbour: 3, opposite: 1, noPreference: 3 } as const;

// Travel fit (section 3a): a program that needs trips for this user scores `wanted` for someone
// who enjoys travel and `burden` for someone who finds it a burden; everything else is neutral.
export const TRAVEL_FIT = { wanted: 5, neutral: 3, burden: 1 } as const;

// Senior peers from the published cohort figure (section 2): the fewest years for each rating.
export const SENIOR_PEER_BANDS: readonly { minYears: number; rating: Rating }[] = [
  { minYears: 20, rating: 5 },
  { minYears: 15, rating: 4 },
  { minYears: 10, rating: 3 },
  { minYears: 5, rating: 2 },
  { minYears: 0, rating: 1 },
];

// How many programs "Also worth a look" holds: passing runner-up programs, or the access card's
// alternative (near misses included) when the confirmed category has nothing to rank.
export const RUNNER_UP_LIMIT = 2;

// Location fit (D9) now carries only the user's location values, and only breaks ties.
export const LOCATION_FIT = {
  base: 3,
  perMatchedValue: 1,
  min: 1,
  max: 5,
} as const;

// Plain words for the card's why line.
export const NEED_LABELS: Record<Need, string> = {
  leadership_skills: "leadership skills",
  deep_expertise: "deep expertise",
  graduate_degree: "a graduate degree",
  senior_network: "senior peers",
  new_industry_or_city: "a new industry or city",
};

// A type's programs in words, one and many, for a ruled-out type's reason (issue #188).
export const TYPE_PROGRAM_WORDS: Record<Category, { one: string; many: string }> = {
  mba: { one: "full-time MBA program", many: "full-time MBA programs" },
  emba: { one: "Executive MBA program", many: "Executive MBA programs" },
  specialized_masters: {
    one: "specialized master's program",
    many: "specialized master's programs",
  },
  executive: { one: "executive program", many: "executive programs" },
  certificate: { one: "certificate program", many: "certificate programs" },
  short_course: { one: "short course", many: "short courses" },
};

export const FORMAT_LABELS: Record<Format, string> = {
  online: "Online",
  hybrid: "Blended",
  in_person: "In person",
};

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
