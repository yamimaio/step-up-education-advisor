import type { Program } from "../schema/program";
import { LOCATION_FIT } from "./constants";
import type { EffectiveProfile } from "./types";

// Location fit (D9): 1 to 5, computed per user.
export function locationFit(
  profile: Pick<EffectiveProfile, "locationValues" | "travelComfort">,
  program: Pick<Program, "locationOffers" | "format">,
): number {
  let score = LOCATION_FIT.base;
  score +=
    profile.locationValues.filter((v) => program.locationOffers.includes(v)).length *
    LOCATION_FIT.perMatchedValue;
  if (program.format !== "online") {
    if (profile.travelComfort === "appeal") score += LOCATION_FIT.appealBonus;
    if (profile.travelComfort === "burden") score += LOCATION_FIT.burdenPenalty;
  }
  return Math.min(LOCATION_FIT.max, Math.max(LOCATION_FIT.min, score));
}
