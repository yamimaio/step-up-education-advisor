import type { Profile } from "../../core/schema/profile";

// Persona A (docs/implementation-plan.md section 9): 16 years in, 12 leading, wants an
// executive role, senior classmates, a year at most, blended is fine.
export const personaAProfile: Profile = {
  yearsExperience: 16,
  yearsLeading: 12,
  degree: { level: "bachelor", field: "Engineering" },
  currentRole: "manager",
  careerGoal: { kind: "step_up", description: "Move into an executive role" },
  goalClarity: "clear",
  needs: ["senior_network", "leadership_skills", "deep_expertise"],
  peerPreference: "more_senior",
  degreeRequired: "no",
  tuitionBudgetUsd: 80000,
  paymentPlan: "installments",
  travelBudgetUsd: 10000,
  airfareRange: "1000_1500",
  travelComfort: "appeal",
  hoursPerWeek: { min: 5, max: 10 },
  maxProgramMonths: 12,
  keepWorking: true,
  maxOnsiteDays: 20,
  maxStretchDays: 7,
  homeCity: "Buenos Aires",
  relocate: false,
  locationValues: ["immersion", "network_density"],
  resolvedTensions: [],
  declined: [],
};
