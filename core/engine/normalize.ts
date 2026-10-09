import { PROFILE_FIELDS, type Profile } from "../schema/profile";
import type { EffectiveProfile } from "./types";

// Declined fields keep a value in the profile, and the engine ignores it: limits become
// "no limit" and the rest take a neutral default. Returns the profile the engine uses plus
// the fields the card should flag as gaps.
export function applyDeclinedDefaults(profile: Profile): {
  profile: EffectiveProfile;
  profileGaps: string[];
} {
  // Unknown names are ignored and repeats collapse; only real profile fields count.
  const declinedFields = [...new Set(profile.declined)].filter((f) => PROFILE_FIELDS.includes(f));
  const declined = new Set(declinedFields);
  const out = (field: string) => declined.has(field);

  const effective: EffectiveProfile = {
    ...profile,
    tuitionBudgetUsd: out("tuitionBudgetUsd") ? null : profile.tuitionBudgetUsd,
    travelBudgetUsd: out("travelBudgetUsd") ? null : profile.travelBudgetUsd,
    hoursPerWeek: out("hoursPerWeek") ? null : profile.hoursPerWeek,
    maxProgramMonths: out("maxProgramMonths") ? null : profile.maxProgramMonths,
    maxOnsiteDays: out("maxOnsiteDays") ? null : profile.maxOnsiteDays,
    maxStretchDays: out("maxStretchDays") ? null : profile.maxStretchDays,
    // The city is for display. Where the user lives is decided by the coordinates, which are
    // declined together; without them the engine treats the location as unknown.
    homeCity: out("homeCity") || profile.homeCity === "" ? null : profile.homeCity,
    homeLat: out("homeLat") || out("homeLon") ? null : profile.homeLat,
    homeLon: out("homeLat") || out("homeLon") ? null : profile.homeLon,
    degreeRequired: out("degreeRequired") ? null : profile.degreeRequired,
    peerPreference: out("peerPreference") ? "doesnt_matter" : profile.peerPreference,
    travelComfort: out("travelComfort") ? "fine" : profile.travelComfort,
    airfareRange: out("airfareRange") ? "unknown" : profile.airfareRange,
    // No constraint, no rule-out and no experience figure when the user chose not to say.
    keepWorking: out("keepWorking") ? false : profile.keepWorking,
    relocate: out("relocate") ? null : profile.relocate,
    yearsExperience: out("yearsExperience") ? null : profile.yearsExperience,
    // The AI marks the goal unclear only after follow-ups, so a goal the user never rated is clear;
    // an unrated list of location values adds no fit points.
    goalClarity: out("goalClarity") ? "clear" : profile.goalClarity,
    locationValues: out("locationValues") ? [] : profile.locationValues,
    // The neutral goal is "step up": grow-in-role adds a bonus the user never asked for.
    careerGoal: out("careerGoal") ? { ...profile.careerGoal, kind: "step_up" } : profile.careerGoal,
  };

  const profileGaps = [...declinedFields];
  if (effective.airfareRange === "unknown" && !profileGaps.includes("airfareRange")) {
    profileGaps.push("airfareRange");
  }
  return { profile: effective, profileGaps };
}
