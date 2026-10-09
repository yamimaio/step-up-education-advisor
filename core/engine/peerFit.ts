import type { Program } from "../schema/program";
import type { EffectiveProfile, PeerFit } from "./types";

// Classmates are often the main reason to enroll: the card compares the user's experience with
// the program's cohort. It doesn't score; seniority counts once, as the senior peers rating. A
// declined experience figure gives no comparison.
export function peerFit(
  profile: Pick<EffectiveProfile, "yearsExperience">,
  program: Pick<Program, "cohortMedianExperienceYears">,
): PeerFit {
  const cohort = program.cohortMedianExperienceYears;
  if (cohort === null) {
    return { text: "The school doesn't publish its classmates' experience." };
  }
  const you = profile.yearsExperience;
  if (you === null) {
    return { text: `Most classmates have about ${cohort} years of experience.` };
  }
  return { text: `Most classmates have about ${cohort} years of experience; you have ${you}.` };
}
