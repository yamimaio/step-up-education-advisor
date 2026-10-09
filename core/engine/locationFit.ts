import type { Program } from "../schema/program";
import { LOCATION_FIT } from "./constants";
import type { EffectiveProfile } from "./types";

// Location fit (D9): 1 to 5, computed per user from the location values only. Travel comfort
// scores separately, as travel fit (docs/need-based-ranking.md, section 3a).
export function locationFit(
  profile: Pick<EffectiveProfile, "locationValues">,
  program: Pick<Program, "locationOffers">,
): number {
  const score =
    LOCATION_FIT.base +
    profile.locationValues.filter((v) => program.locationOffers.includes(v)).length *
      LOCATION_FIT.perMatchedValue;
  return Math.min(LOCATION_FIT.max, Math.max(LOCATION_FIT.min, score));
}
