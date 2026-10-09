import type { HoursRange } from "../schema/common";

// Quick-reply chips (implementation plan section 3). The options come from this table, never
// from the model, so numbers are identical every run and scoring never parses free text.
// A range chip stores its upper bound, so a program at the edge of the range passes; hours are
// stored as a range because both the user's answer and the school's figure are estimates.

export type Chip<V> = { label: string; value: V };

export const CHIPS = {
  degreeLevel: [
    { label: "Bachelor's", value: "bachelor" },
    { label: "Master's", value: "master" },
    { label: "Doctorate", value: "doctorate" },
    { label: "Something else", value: "other" },
  ],
  currentRole: [
    { label: "Individual contributor", value: "ic" },
    { label: "Manager", value: "manager" },
    { label: "Director", value: "director" },
    { label: "Executive", value: "executive" },
    { label: "Other", value: "other" },
  ],
  careerGoalKind: [
    { label: "Step up to a bigger leadership role", value: "step_up" },
    { label: "Lead better in my current role", value: "grow_in_role" },
  ],
  needs: [
    { label: "Leadership skills", value: "leadership_skills" },
    { label: "Deep expertise in a field", value: "deep_expertise" },
    { label: "A graduate degree", value: "graduate_degree" },
    { label: "A senior network", value: "senior_network" },
    { label: "Access to a new industry or city", value: "new_industry_or_city" },
  ],
  peerPreference: [
    { label: "More senior leaders", value: "more_senior" },
    { label: "Peers at my level", value: "same_level" },
    { label: "It doesn't matter", value: "doesnt_matter" },
  ],
  degreeRequired: [
    { label: "Required", value: "required" },
    { label: "Preferred", value: "preferred" },
    { label: "Not needed", value: "no" },
    { label: "Not sure", value: "unsure" },
  ],
  tuitionBudgetUsd: [
    { label: "Under $5k", value: 5000 },
    { label: "$5k to $15k", value: 15000 },
    { label: "$15k to $40k", value: 40000 },
    { label: "$40k to $80k", value: 80000 },
    { label: "Over $80k", value: 250000 },
    { label: "No set limit", value: null },
  ],
  paymentPlan: [
    { label: "Savings", value: "savings" },
    { label: "Installments", value: "installments" },
    { label: "Employer support", value: "employer" },
    { label: "Loans", value: "loans" },
    { label: "A mix", value: "mixed" },
    { label: "No preference", value: "no_preference" },
  ],
  travelBudgetUsd: [
    { label: "Under $2k", value: 2000 },
    { label: "$2k to $5k", value: 5000 },
    { label: "$5k to $10k", value: 10000 },
    { label: "Over $10k", value: 50000 },
    { label: "Not a concern", value: null },
  ],
  airfareRange: [
    { label: "Under $500", value: "under_500" },
    { label: "$500 to $1,000", value: "500_1000" },
    { label: "$1,000 to $1,500", value: "1000_1500" },
    { label: "Over $1,500", value: "over_1500" },
    { label: "I don't know", value: "unknown" },
  ],
  travelComfort: [
    { label: "Part of the appeal", value: "appeal" },
    { label: "Fine", value: "fine" },
    { label: "A burden", value: "burden" },
  ],
  hoursPerWeek: [
    { label: "Under 5", value: { min: 0, max: 5 } },
    { label: "5 to 10", value: { min: 5, max: 10 } },
    { label: "10 to 15", value: { min: 10, max: 15 } },
    { label: "15 to 20", value: { min: 15, max: 20 } },
    { label: "More than 20", value: { min: 20, max: 40 } },
  ] satisfies Chip<HoursRange>[],
  maxProgramMonths: [
    { label: "About 2 months", value: 3 },
    { label: "Up to 6 months", value: 6 },
    { label: "Up to a year", value: 12 },
    { label: "Up to 2 years", value: 24 },
    { label: "Longer is fine", value: 60 },
  ],
  keepWorking: [
    { label: "Yes, I keep working", value: true },
    { label: "No, I can stop", value: false },
  ],
  maxOnsiteDays: [
    { label: "None", value: 0 },
    { label: "Up to 10", value: 10 },
    { label: "Up to 20", value: 20 },
    { label: "Up to 40", value: 40 },
    { label: "More", value: 365 },
  ],
  maxStretchDays: [
    { label: "Can't travel", value: 0 },
    { label: "A few days", value: 4 },
    { label: "About a week", value: 7 },
    { label: "Two weeks", value: 14 },
    { label: "Longer", value: 60 },
  ],
  relocate: [
    { label: "Yes, I would relocate", value: true },
    { label: "No, I would not", value: false },
  ],
  locationValues: [
    { label: "Network density", value: "network_density" },
    { label: "A target industry hub", value: "industry_hub" },
    { label: "A path to relocate", value: "relocation_path" },
    { label: "Immersion", value: "immersion" },
    { label: "Affordability", value: "affordability" },
    { label: "Ease of travel", value: "travel_ease" },
    { label: "International exposure", value: "international" },
  ],
} as const;

export type ChipField = keyof typeof CHIPS;
export const CHIP_FIELDS = Object.keys(CHIPS) as ChipField[];

// Where each chip set's value lands in the profile ("degree.level" is a nested field).
export const CHIP_TARGET: Record<ChipField, string> = {
  degreeLevel: "degree.level",
  currentRole: "currentRole",
  careerGoalKind: "careerGoal.kind",
  needs: "needs",
  peerPreference: "peerPreference",
  degreeRequired: "degreeRequired",
  tuitionBudgetUsd: "tuitionBudgetUsd",
  paymentPlan: "paymentPlan",
  travelBudgetUsd: "travelBudgetUsd",
  airfareRange: "airfareRange",
  travelComfort: "travelComfort",
  hoursPerWeek: "hoursPerWeek",
  maxProgramMonths: "maxProgramMonths",
  keepWorking: "keepWorking",
  maxOnsiteDays: "maxOnsiteDays",
  maxStretchDays: "maxStretchDays",
  relocate: "relocate",
  locationValues: "locationValues",
};
