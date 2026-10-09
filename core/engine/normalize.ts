import {
  DIRECTION_FIELDS,
  PROFILE_FIELDS,
  type DirectionProfile,
  type Profile,
} from "../schema/profile";
import type { EffectiveDirection, EffectiveProfile } from "./types";

// Declined names in the order given, without repeats or names that aren't one of `fields`.
const declinedOf = (declined: string[], fields: readonly string[]) =>
  [...new Set(declined)].filter((f) => fields.includes(f));

// Stage 1's share of the declined defaults: only the fields that decide the category.
export function applyDirectionDefaults(profile: DirectionProfile): {
  profile: EffectiveDirection;
  profileGaps: string[];
} {
  const profileGaps = declinedOf(profile.declined, DIRECTION_FIELDS);
  const out = (field: string) => profileGaps.includes(field);
  return {
    profile: {
      // Needs have no neutral value: the verdict is built from them. Declined, there are none, so
      // no type wins and stage 1 says "not yet" (noProgramForDirection), rather than letting the
      // placeholders the schema requires pick a type the card would explain with them.
      needs: out("needs") ? [] : profile.needs,
      ...(profile.tieBreaker ? { tieBreaker: profile.tieBreaker } : {}),
      hoursPerWeek: out("hoursPerWeek") ? null : profile.hoursPerWeek,
      maxProgramMonths: out("maxProgramMonths") ? null : profile.maxProgramMonths,
      degreeRequired: out("degreeRequired") ? null : profile.degreeRequired,
      // No constraint and no rule-out when the user chose not to say.
      keepWorking: out("keepWorking") ? false : profile.keepWorking,
      // The AI marks the goal unclear only after follow-ups, so a goal the user never rated is clear.
      goalClarity: out("goalClarity") ? "clear" : profile.goalClarity,
      // The neutral goal is "step up": grow-in-role adds a bonus the user never asked for.
      careerGoal: out("careerGoal")
        ? { ...profile.careerGoal, kind: "step_up" }
        : profile.careerGoal,
    },
    profileGaps,
  };
}

// Declined fields keep a value in the profile, and the engine ignores it: limits become
// "no limit" and the rest take a neutral default. Returns the profile the engine uses plus
// the fields the card should flag as gaps. Stage 1's fields get the same defaults as in
// applyDirectionDefaults, so both stages read a declined answer the same way.
export function applyDeclinedDefaults(profile: Profile): {
  profile: EffectiveProfile;
  profileGaps: string[];
} {
  // Unknown names are ignored and repeats collapse; only real profile fields count.
  const declinedFields = declinedOf(profile.declined, PROFILE_FIELDS);
  const out = (field: string) => declinedFields.includes(field);

  const effective: EffectiveProfile = {
    ...profile,
    ...applyDirectionDefaults(profile).profile,
    tuitionBudgetUsd: out("tuitionBudgetUsd") ? null : profile.tuitionBudgetUsd,
    travelBudgetUsd: out("travelBudgetUsd") ? null : profile.travelBudgetUsd,
    maxOnsiteDays: out("maxOnsiteDays") ? null : profile.maxOnsiteDays,
    maxStretchDays: out("maxStretchDays") ? null : profile.maxStretchDays,
    // The city is for display. Where the user lives is decided by the coordinates, which are
    // declined together; without them the engine treats the location as unknown.
    homeCity: out("homeCity") || profile.homeCity === "" ? null : profile.homeCity,
    homeLat: out("homeLat") || out("homeLon") ? null : profile.homeLat,
    homeLon: out("homeLat") || out("homeLon") ? null : profile.homeLon,
    peerPreference: out("peerPreference") ? "doesnt_matter" : profile.peerPreference,
    travelComfort: out("travelComfort") ? "fine" : profile.travelComfort,
    formatPreference: out("formatPreference") ? "no_preference" : profile.formatPreference,
    airfareRange: out("airfareRange") ? "unknown" : profile.airfareRange,
    // No rule-out and no experience figure when the user chose not to say.
    relocate: out("relocate") ? null : profile.relocate,
    yearsExperience: out("yearsExperience") ? null : profile.yearsExperience,
    // An unrated list of location values adds no fit points.
    locationValues: out("locationValues") ? [] : profile.locationValues,
  };

  const profileGaps = [...declinedFields];
  if (effective.airfareRange === "unknown" && !profileGaps.includes("airfareRange")) {
    profileGaps.push("airfareRange");
  }
  return { profile: effective, profileGaps };
}
