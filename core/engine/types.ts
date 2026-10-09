import type { Category, Need } from "../schema/enums";
import type { Rating } from "./constants";
import type { HoursRange } from "../schema/common";
import type { Profile } from "../schema/profile";

export type CheckId =
  | "tuition"
  | "travelBudget"
  | "onsiteDays"
  | "longestStretch"
  | "length"
  | "hours"
  | "workCompatible"
  | "location";

export type CheckStatus = "pass" | "near_miss" | "fail";

export interface Check {
  id: CheckId;
  status: CheckStatus;
  // What the program has and what the user allows, as numbers or short text for the card.
  value: number | string | null;
  limit: number | string | null;
  unit: string;
  // True when the program doesn't publish the figure (the unknown-value rule).
  unknown: boolean;
  note?: string;
}

// The profile the engine uses: declined limits become null ("no limit").
export type EffectiveProfile = Omit<
  Profile,
  | "tuitionBudgetUsd"
  | "travelBudgetUsd"
  | "hoursPerWeek"
  | "maxProgramMonths"
  | "maxOnsiteDays"
  | "maxStretchDays"
  | "homeCity"
  | "degreeRequired"
  | "yearsExperience"
  | "relocate"
> & {
  tuitionBudgetUsd: number | null;
  travelBudgetUsd: number | null;
  hoursPerWeek: HoursRange | null;
  maxProgramMonths: number | null;
  maxOnsiteDays: number | null;
  maxStretchDays: number | null;
  // For the card only: the engine compares homeLat and homeLon, never the city name.
  homeCity: string | null;
  degreeRequired: Profile["degreeRequired"] | null;
  // Declined: no experience-based points or text; no location rule-out.
  yearsExperience: number | null;
  relocate: boolean | null;
};

// What stage 1 uses: the answers that decide the category, after the declined defaults.
export type EffectiveDirection = Pick<
  EffectiveProfile,
  | "careerGoal"
  | "goalClarity"
  | "needs"
  | "degreeRequired"
  | "maxProgramMonths"
  | "hoursPerWeek"
  | "keepWorking"
  | "tieBreaker"
>;

export interface TravelEstimate {
  // none: no trips needed (online, within commuting distance, no on-site time). unknown: a figure is missing.
  kind: "none" | "estimate" | "unknown";
  totalUsd: number | null;
  // Over the whole program, and in a year of it (the same for a program of a year or less). Kept on
  // an `unknown` estimate when the trips are published but another figure is missing.
  trips: number | null;
  tripsPerYear: number | null;
  nightsPerTrip: number | null;
  airfarePerTripUsd: number | null;
  lodgingPerNightUsd: number | null;
  // True when airfare isn't known, so the total covers lodging only.
  lodgingOnly: boolean;
  // True when the trip count was guessed (recurring weekends with no counts).
  tripsEstimated: boolean;
  notes: string[];
}

// The classmates' experience next to the user's, for the card. It doesn't score: seniority is the
// senior peers rating (docs/need-based-ranking.md, section 4).
export interface PeerFit {
  text: string;
}

export type Confidence = "high" | "medium" | "low";

export interface ConfidenceResult {
  level: Confidence;
  reasons: string[];
}

// One of the user's three needs in a program's score.
export interface NeedScore {
  need: Need;
  weight: number;
  rating: Rating;
  // weight × rating.
  points: number;
  // True when senior peers is computed from the published cohort figure, not taken from the record.
  derived: boolean;
  // The record's rating note, or the cohort figure ("cohort median 18 years") when derived.
  note: string;
  // The record lists this need as rated on thin evidence (never when derived).
  lowEvidence: boolean;
}

// Format fit or travel fit, 1 to 5, with the card line (null when there is nothing to say).
export interface Fit {
  fit: Rating;
  text: string | null;
}

// Stage 2 score (docs/need-based-ranking.md, sections 3 and 3a): 3/2/1 × the program's ratings on
// the user's needs, + 2 × format fit + 1 × travel fit.
export interface ProgramScore {
  total: number;
  needs: NeedScore[];
  format: Fit;
  travel: Fit;
  // The two needs that added most above the lowest rating (weight × (rating − 1)), the larger
  // first; ties go to the higher-ranked need. A need rated 1 is never listed.
  topNeeds: Need[];
}

export interface ProgramEvaluation {
  id: string;
  category: Category;
  checks: Check[];
  status: CheckStatus;
  peerFit: PeerFit;
  // Location values only; breaks ties.
  locationFit: number;
  travelEstimate: TravelEstimate;
  // Tuition plus the travel estimate (lodging only when the airfare range is unknown, as
  // travelEstimate.lodgingOnly says); null when either is unknown. Breaks ties.
  totalCostUsd: number | null;
  confidence: ConfidenceResult;
  score: ProgramScore;
}

// A listed program and its why line.
export interface RankedProgram {
  id: string;
  why: string;
}

// One list ranked by the user's needs: the confirmed category's programs (passing, then near
// misses). "Also worth a look" holds up to RUNNER_UP_LIMIT passing programs of the runner-up; when
// the confirmed category has nothing to rank, it holds programs of `access.alternative` instead
// (which may not be the runner-up), near misses included. Read each entry's status from `programs`.
export interface Ranking {
  ranked: RankedProgram[];
  alsoWorthALook: RankedProgram[];
}

export interface CategoryResult {
  scores: Record<Category, number | "out">;
  reasons: Record<Category, string[]>;
  winner: Category | null;
  runnerUp: Category | null;
  tie?: [Category, Category];
  decidingNeeds: Need[];
}

export type NoProgramTrigger = "no_type_fits" | "nothing_passes" | "goal_unclear";

export interface NoProgramResult {
  triggered: boolean;
  trigger?: NoProgramTrigger;
}

// Stage 1 (recommendCategory): the verdict and the stage-1 "not yet" triggers.
export interface DirectionResult {
  category: CategoryResult;
  // goal_unclear or no_type_fits only.
  noProgram: NoProgramResult;
  // Declined stage-1 fields.
  profileGaps: string[];
}

// Whether the confirmed category has a program within all of the user's limits. The verdict
// never changes in stage 2; when its programs are out of reach, the card says so and names the
// best-scoring category that has one (`alternative`).
export interface CategoryAccess {
  category: Category | null;
  // no_winner: an unresolved tie or every type out. no_programs: no records of that type yet.
  status: "available" | "none_within_limits" | "no_programs" | "no_winner";
  // The checks that failed the category's programs, most common first.
  blockedBy: CheckId[];
  alternative: Category | null;
}

// Stage 2 (evaluatePrograms): programs for the confirmed category and the user's limits.
export interface SearchResult {
  programs: ProgramEvaluation[];
  ranking: Ranking;
  // nothing_passes only.
  noProgram: NoProgramResult;
  access: CategoryAccess;
  profileGaps: string[];
}

// Both stages in one (evaluate). `noProgram` is stage 1's trigger when it fires, else stage 2's.
export interface EngineResult {
  category: CategoryResult;
  noProgram: NoProgramResult;
  programs: ProgramEvaluation[];
  ranking: Ranking;
  access: CategoryAccess;
  profileGaps: string[];
}

export interface Contradiction {
  id: "R1" | "R2" | "R3" | "R4" | "R5" | "R6";
  text: string;
  // True when the profile already records the user's choice for this rule.
  resolved: boolean;
}
