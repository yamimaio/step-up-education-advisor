import type { ChipField } from "./chips";

// The 17-field checklist (docs/build-plan.md, "Intake questions"), split by stage
// (docs/ux-two-stage.md). Stage 1 asks only what decides the category and ends at
// propose_direction; stage 2 (not wired yet) asks the rest before programs are shown.
// The server's "set by chip" check uses `chips` to know which profile fields must come from a tap.
// `pick` is how many chips a multi-select takes: needs are ranked top 3, locations up to 2.
export type ChecklistEntry = {
  id: string;
  stage: 1 | 2;
  // Profile fields this entry fills.
  fields: string[];
  // What the question is for, in plain words (the advisor words it in conversation).
  intent: string;
  chips: ChipField[];
  pick?: number;
};

export const CHECKLIST: ChecklistEntry[] = [
  {
    id: "careerGoal",
    stage: 1,
    fields: ["careerGoal", "goalClarity"],
    intent:
      "Step up to a bigger leadership role, or lead better in the current one, and what that looks like",
    chips: ["careerGoalKind"],
  },
  {
    id: "needs",
    stage: 1,
    fields: ["needs"],
    intent: "What is missing today, ranked top 3",
    chips: ["needs"],
    pick: 3,
  },
  {
    id: "peerPreference",
    stage: 1,
    fields: ["peerPreference"],
    intent: "Who they want as classmates",
    chips: ["peerPreference"],
  },
  {
    id: "time",
    stage: 1,
    fields: ["maxProgramMonths", "hoursPerWeek"],
    intent: "The longest program they would take on now, and hours per week available",
    chips: ["maxProgramMonths", "hoursPerWeek"],
  },
  {
    id: "keepWorking",
    stage: 1,
    fields: ["keepWorking"],
    intent: "Whether they must keep working",
    chips: ["keepWorking"],
  },
  {
    id: "degreeRequired",
    stage: 1,
    fields: ["degreeRequired"],
    intent: "Whether the role they want requires a graduate degree or only prefers one",
    chips: ["degreeRequired"],
  },
  {
    id: "tuition",
    stage: 2,
    fields: ["tuitionBudgetUsd", "paymentPlan"],
    intent: "Tuition budget and how they would pay",
    chips: ["tuitionBudgetUsd", "paymentPlan"],
  },
  {
    id: "travelBudget",
    stage: 2,
    fields: ["travelBudgetUsd"],
    intent: "A separate budget for travel and housing, if any",
    chips: ["travelBudgetUsd"],
  },
  {
    id: "travelComfort",
    stage: 2,
    fields: ["travelComfort"],
    intent: "How they feel about traveling for the program",
    chips: ["travelComfort"],
  },
  {
    id: "onsite",
    stage: 2,
    fields: ["maxOnsiteDays", "maxStretchDays"],
    intent: "Days per year on site and the longest single stretch away",
    chips: ["maxOnsiteDays", "maxStretchDays"],
  },
  {
    id: "home",
    stage: 2,
    fields: ["homeCity", "homeRegion", "homeCountry", "homeLat", "homeLon", "relocate"],
    intent: "Where they live and whether they would relocate",
    chips: ["relocate"],
  },
  {
    id: "airfare",
    stage: 2,
    fields: ["airfareRange"],
    intent: "Typical airfare to a US program, asked when they live far from the programs",
    chips: ["airfareRange"],
  },
  {
    id: "locationValues",
    stage: 2,
    fields: ["locationValues"],
    intent: "What a location should give them, up to 2",
    chips: ["locationValues"],
    pick: 2,
  },
  {
    id: "yearsExperience",
    stage: 2,
    fields: ["yearsExperience"],
    intent: "Years of professional experience (the advisor is for 8 or more)",
    chips: [],
  },
  {
    id: "degree",
    stage: 2,
    fields: ["degree"],
    intent: "Highest degree and its field",
    chips: ["degreeLevel"],
  },
  {
    id: "currentRole",
    stage: 2,
    fields: ["currentRole"],
    intent: "Current role and level",
    chips: ["currentRole"],
  },
  {
    id: "yearsLeading",
    stage: 2,
    fields: ["yearsLeading"],
    intent: "Years leading people or teams",
    chips: [],
  },
];

export const STAGE_1_CHECKLIST = CHECKLIST.filter((e) => e.stage === 1);
export const STAGE_2_CHECKLIST = CHECKLIST.filter((e) => e.stage === 2);
