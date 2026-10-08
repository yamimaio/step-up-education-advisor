import type { ChipField } from "./chips";

// The 17-field checklist (docs/build-plan.md, "Intake questions"). The advisor does not
// recommend until every entry is filled or the user declines it. The server's "set by chip"
// check uses `chips` to know which profile fields must come from a tap.
// `pick` is how many chips a multi-select takes: needs are ranked top 3, locations up to 2.
export type ChecklistEntry = {
  id: string;
  step: 1 | 2 | 3 | 4;
  // Profile fields this entry fills.
  fields: string[];
  // What the question is for, in plain words (the advisor words it in conversation).
  intent: string;
  chips: ChipField[];
  pick?: number;
};

export const CHECKLIST: ChecklistEntry[] = [
  {
    id: "yearsExperience",
    step: 1,
    fields: ["yearsExperience"],
    intent: "Years of professional experience (the advisor is for 8 or more)",
    chips: [],
  },
  {
    id: "degree",
    step: 1,
    fields: ["degree"],
    intent: "Highest degree and its field",
    chips: ["degreeLevel"],
  },
  {
    id: "currentRole",
    step: 1,
    fields: ["currentRole"],
    intent: "Current role and level",
    chips: ["currentRole"],
  },
  {
    id: "yearsLeading",
    step: 1,
    fields: ["yearsLeading"],
    intent: "Years leading people or teams",
    chips: [],
  },
  {
    id: "careerGoal",
    step: 2,
    fields: ["careerGoal", "goalClarity"],
    intent:
      "Step up to a bigger leadership role, or lead better in the current one, and what that looks like",
    chips: ["careerGoalKind"],
  },
  {
    id: "needs",
    step: 2,
    fields: ["needs"],
    intent: "What is missing today, ranked top 3",
    chips: ["needs"],
    pick: 3,
  },
  {
    id: "peerPreference",
    step: 2,
    fields: ["peerPreference"],
    intent: "Who they want as classmates",
    chips: ["peerPreference"],
  },
  {
    id: "degreeRequired",
    step: 2,
    fields: ["degreeRequired"],
    intent: "Whether the role they want requires a graduate degree or only prefers one",
    chips: ["degreeRequired"],
  },
  {
    id: "tuition",
    step: 3,
    fields: ["tuitionBudgetUsd", "paymentPlan"],
    intent: "Tuition budget and how they would pay",
    chips: ["tuitionBudgetUsd", "paymentPlan"],
  },
  {
    id: "travelBudget",
    step: 3,
    fields: ["travelBudgetUsd"],
    intent: "A separate budget for travel and housing, if any",
    chips: ["travelBudgetUsd"],
  },
  {
    id: "airfare",
    step: 3,
    fields: ["airfareRange"],
    intent: "Typical airfare to a US program, asked when they live far from the programs",
    chips: ["airfareRange"],
  },
  {
    id: "travelComfort",
    step: 3,
    fields: ["travelComfort"],
    intent: "How they feel about traveling for the program",
    chips: ["travelComfort"],
  },
  {
    id: "time",
    step: 3,
    fields: ["hoursPerWeek", "maxProgramMonths"],
    intent: "Hours per week available and the longest program they would take on now",
    chips: ["hoursPerWeek", "maxProgramMonths"],
  },
  {
    id: "keepWorking",
    step: 3,
    fields: ["keepWorking"],
    intent: "Whether they can stop working",
    chips: ["keepWorking"],
  },
  {
    id: "onsite",
    step: 3,
    fields: ["maxOnsiteDays", "maxStretchDays"],
    intent: "Days per year on site and the longest single stretch away",
    chips: ["maxOnsiteDays", "maxStretchDays"],
  },
  {
    id: "home",
    step: 4,
    fields: ["homeCity", "relocate"],
    intent: "Where they live and whether they would relocate",
    chips: ["relocate"],
  },
  {
    id: "locationValues",
    step: 4,
    fields: ["locationValues"],
    intent: "What a location should give them, up to 2",
    chips: ["locationValues"],
    pick: 2,
  },
];
