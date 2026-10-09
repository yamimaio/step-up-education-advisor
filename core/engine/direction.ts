import type { DirectionProfile } from "../schema/profile";
import type { Program } from "../schema/program";
import { categoryFit } from "./categoryFit";
import { checkDirection } from "./constraints";
import { noProgramForDirection } from "./noProgram";
import { applyDirectionDefaults } from "./normalize";
import type { DirectionResult } from "./types";

// Stage 1, "what kind of step fits me?": the category verdict from the answers that decide it
// (goal, needs, degree, length, hours, keeping a job). The input type has no budget, travel or
// location, so none of them can change the verdict. The server runs this at propose_direction.
export function recommendCategory(profile: DirectionProfile, programs: Program[]): DirectionResult {
  const { profile: p, profileGaps } = applyDirectionDefaults(profile);
  const evaluations = programs.map((program) => ({
    id: program.id,
    ...checkDirection(program, p),
  }));
  const category = categoryFit(p, programs, evaluations);
  return { category, noProgram: noProgramForDirection(p, category), profileGaps };
}
