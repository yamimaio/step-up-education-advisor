import { NO_PROGRAM_THRESHOLD } from "./constants";
import type { CategoryResult, EffectiveProfile, NoProgramResult, ProgramEvaluation } from "./types";

// Step 2: "No program yet". Precedence when several fire: goal unclear, nothing passes,
// no type fits. Programs of a ruled-out type don't count as something that passes.
export function noProgram(
  profile: EffectiveProfile,
  category: CategoryResult,
  evaluations: Pick<ProgramEvaluation, "status" | "category">[],
): NoProgramResult {
  if (profile.goalClarity === "unclear") return { triggered: true, trigger: "goal_unclear" };
  const passing = evaluations.filter((e) => e.status !== "fail");
  if (passing.length === 0) return { triggered: true, trigger: "nothing_passes" };
  // Programs are within the limits, but every one belongs to a ruled-out type.
  if (passing.every((e) => category.scores[e.category] === "out")) {
    return { triggered: true, trigger: "no_type_fits" };
  }
  const best = Math.max(
    -Infinity,
    ...Object.values(category.scores).filter((s): s is number => s !== "out"),
  );
  if (best < NO_PROGRAM_THRESHOLD) return { triggered: true, trigger: "no_type_fits" };
  return { triggered: false };
}
