import { NO_PROGRAM_THRESHOLD } from "./constants";
import type { CategoryResult, EffectiveProfile, NoProgramResult, ProgramEvaluation } from "./types";

// Step 2: "No program yet". Precedence when several fire: goal unclear, nothing passes,
// no type fits.
export function noProgram(
  profile: EffectiveProfile,
  category: CategoryResult,
  evaluations: Pick<ProgramEvaluation, "status">[],
): NoProgramResult {
  if (profile.goalClarity === "unclear") return { triggered: true, trigger: "goal_unclear" };
  if (!evaluations.some((e) => e.status !== "fail")) {
    return { triggered: true, trigger: "nothing_passes" };
  }
  const best = Math.max(
    -Infinity,
    ...Object.values(category.scores).filter((s): s is number => s !== "out"),
  );
  if (best < NO_PROGRAM_THRESHOLD) return { triggered: true, trigger: "no_type_fits" };
  return { triggered: false };
}
