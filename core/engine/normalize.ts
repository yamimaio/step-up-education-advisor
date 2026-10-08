import type { Profile } from "../schema/profile";
import type { EffectiveProfile } from "./types";

// Declined fields keep a value in the profile, and the engine ignores it: limits become
// "no limit" and the rest take a neutral default. Returns the profile the engine uses plus
// the fields the card should flag as gaps.
export function applyDeclinedDefaults(profile: Profile): {
  profile: EffectiveProfile;
  profileGaps: string[];
} {
  const declined = new Set(profile.declined);
  const out = (field: string) => declined.has(field);

  const effective: EffectiveProfile = {
    ...profile,
    tuitionBudgetUsd: out("tuitionBudgetUsd") ? null : profile.tuitionBudgetUsd,
    travelBudgetUsd: out("travelBudgetUsd") ? null : profile.travelBudgetUsd,
    hoursPerWeek: out("hoursPerWeek") ? null : profile.hoursPerWeek,
    maxProgramMonths: out("maxProgramMonths") ? null : profile.maxProgramMonths,
    maxOnsiteDays: out("maxOnsiteDays") ? null : profile.maxOnsiteDays,
    maxStretchDays: out("maxStretchDays") ? null : profile.maxStretchDays,
    homeCity: out("homeCity") ? null : profile.homeCity,
    degreeRequired: out("degreeRequired") ? null : profile.degreeRequired,
    peerPreference: out("peerPreference") ? "doesnt_matter" : profile.peerPreference,
    travelComfort: out("travelComfort") ? "fine" : profile.travelComfort,
    airfareRange: out("airfareRange") ? "unknown" : profile.airfareRange,
  };

  const profileGaps = [...profile.declined];
  if (effective.airfareRange === "unknown" && !profileGaps.includes("airfareRange")) {
    profileGaps.push("airfareRange");
  }
  return { profile: effective, profileGaps };
}
