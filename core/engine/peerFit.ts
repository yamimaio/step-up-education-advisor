import type { Program } from "../schema/program";
import { PEER_FIT } from "./constants";
import type { EffectiveProfile, PeerFit } from "./types";

// Classmates are often the main reason to enroll: compare the user's experience with the
// program's cohort. A declined experience figure gives no points and no comparison.
export function peerFit(
  profile: Pick<EffectiveProfile, "yearsExperience" | "peerPreference">,
  program: Pick<Program, "cohortMedianExperienceYears">,
): PeerFit {
  const cohort = program.cohortMedianExperienceYears;
  if (cohort === null) {
    return { points: 0, text: "The school doesn't publish its classmates' experience." };
  }
  const you = profile.yearsExperience;
  if (you === null) {
    return { points: 0, text: `Most classmates have about ${cohort} years of experience.` };
  }
  const text = `Most classmates have about ${cohort} years of experience; you have ${you}.`;
  if (profile.peerPreference === "more_senior") {
    return {
      points: cohort < you ? PEER_FIT.moreSeniorBelow : PEER_FIT.moreSeniorAtOrAbove,
      text,
    };
  }
  if (
    profile.peerPreference === "same_level" &&
    Math.abs(cohort - you) > PEER_FIT.sameLevelMaxGapYears
  ) {
    return { points: PEER_FIT.sameLevelPenalty, text };
  }
  return { points: 0, text };
}
