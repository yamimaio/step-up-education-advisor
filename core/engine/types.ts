import type { Category, Need } from "../schema/enums";
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
> & {
  tuitionBudgetUsd: number | null;
  travelBudgetUsd: number | null;
  hoursPerWeek: HoursRange | null;
  maxProgramMonths: number | null;
  maxOnsiteDays: number | null;
  maxStretchDays: number | null;
  homeCity: string | null;
  degreeRequired: Profile["degreeRequired"] | null;
};

export interface TravelEstimate {
  // none: no trips needed (online, same metro, no on-site time). unknown: a figure is missing.
  kind: "none" | "estimate" | "unknown";
  totalUsd: number | null;
  trips: number | null;
  nightsPerTrip: number | null;
  airfarePerTripUsd: number | null;
  lodgingPerNightUsd: number | null;
  // True when airfare isn't known, so the total covers lodging only.
  lodgingOnly: boolean;
  // True when the trip count was guessed (recurring weekends with no counts).
  tripsEstimated: boolean;
  notes: string[];
}

export interface PeerFit {
  points: number;
  text: string;
}

export type Confidence = "high" | "medium" | "low";

export interface ConfidenceResult {
  level: Confidence;
  reasons: string[];
}

export type Scenario = "network" | "depth" | "practicality";

export interface ProgramEvaluation {
  id: string;
  category: Category;
  checks: Check[];
  status: CheckStatus;
  peerFit: PeerFit;
  locationFit: number;
  travelEstimate: TravelEstimate;
  confidence: ConfidenceResult;
  scenarioScores: Record<Scenario, number>;
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

export interface EngineResult {
  category: CategoryResult;
  noProgram: NoProgramResult;
  programs: ProgramEvaluation[];
  scenarios: Record<Scenario, string[]>;
  profileGaps: string[];
}

export interface Contradiction {
  id: "R1" | "R2" | "R3" | "R4" | "R5" | "R6";
  text: string;
  // True when the profile already records the user's choice for this rule.
  resolved: boolean;
}
