import type { Profile } from "../schema/profile";
import type { Program } from "../schema/program";
import { recommendCategory } from "./direction";
import { evaluatePrograms } from "./search";
import type { EngineResult } from "./types";

// Both stages in order, for one-call use (tests, the worked example, scripts). The server calls
// the two stages separately, passing the category the user confirmed into stage 2.
export function evaluate(profile: Profile, programs: Program[], today: Date): EngineResult {
  const direction = recommendCategory(profile, programs);
  const search = evaluatePrograms(profile, direction.category, programs, today);
  return {
    category: direction.category,
    // Stage 1's "not yet" comes first: if the direction fails, programs don't matter.
    noProgram: direction.noProgram.triggered ? direction.noProgram : search.noProgram,
    programs: search.programs,
    scenarios: search.scenarios,
    access: search.access,
    profileGaps: search.profileGaps,
  };
}
