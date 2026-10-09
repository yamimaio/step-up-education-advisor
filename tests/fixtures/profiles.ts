import type { Profile } from "../../core/schema/profile";

// Home locations for tests. The fixture programs' campus is in Boston (42.3601, -71.0589).
export const BUENOS_AIRES = {
  homeCity: "Buenos Aires",
  homeRegion: "C",
  homeCountry: "AR",
  homeLat: -34.6037,
  homeLon: -58.3816,
} as const;
export const BOSTON = {
  homeCity: "Boston",
  homeRegion: "MA",
  homeCountry: "US",
  homeLat: 42.3601,
  homeLon: -71.0589,
} as const;
// About 4.5 km from the Boston campus: nearby, though a different town.
export const CAMBRIDGE_MA = {
  homeCity: "Cambridge",
  homeRegion: "MA",
  homeCountry: "US",
  homeLat: 42.3736,
  homeLon: -71.1097,
} as const;
// About 1,370 km away.
export const CHICAGO = {
  homeCity: "Chicago",
  homeRegion: "IL",
  homeCountry: "US",
  homeLat: 41.8781,
  homeLon: -87.6298,
} as const;
// A declined home: placeholders for every part, and the names to put in `declined`.
export const NO_HOME = {
  homeCity: "",
  homeRegion: null,
  homeCountry: "",
  homeLat: null,
  homeLon: null,
} as const;
export const NO_HOME_DECLINED = ["homeCity", "homeRegion", "homeCountry", "homeLat", "homeLon"];

// Persona A (docs/implementation-plan.md section 9): 16 years in, 12 leading, wants an
// executive role, senior classmates, a year at most, prefers blended and enjoys the trips.
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
  formatPreference: "blended",
  hoursPerWeek: { min: 5, max: 10 },
  maxProgramMonths: 12,
  keepWorking: true,
  maxOnsiteDays: 20,
  maxStretchDays: 7,
  ...BUENOS_AIRES,
  relocate: false,
  locationValues: ["immersion", "network_density"],
  resolvedTensions: [],
  declined: [],
};

// The plan's worked example (docs/build-plan.md, Step 1), set in Boston so the fixtures'
// evening master's isn't ruled out on location: needs senior network, leadership, expertise;
// no degree required; nothing longer than 12 months.
export const workedExampleProfile: Profile = {
  ...personaAProfile,
  ...BOSTON,
  airfareRange: "unknown",
  travelComfort: "fine",
};

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return { ...workedExampleProfile, ...overrides };
}
