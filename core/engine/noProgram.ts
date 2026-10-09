import { NO_PROGRAM_THRESHOLD } from "./constants";
import type {
  CategoryResult,
  EffectiveDirection,
  NoProgramResult,
  ProgramEvaluation,
} from "./types";

// Stage 1's "No program yet": the goal is unclear, or no type fits (every type is out, or the
// best score is under NO_PROGRAM_THRESHOLD). Goal first. A declined "what is missing" leaves no
// needs, the gap half of the goal, so it counts as an unclear goal: any spend is premature.
export function noProgramForDirection(
  profile: Pick<EffectiveDirection, "goalClarity" | "needs">,
  category: Pick<CategoryResult, "scores">,
): NoProgramResult {
  if (profile.goalClarity === "unclear" || profile.needs.length === 0) {
    return { triggered: true, trigger: "goal_unclear" };
  }
  const best = Math.max(
    -Infinity,
    ...Object.values(category.scores).filter((s): s is number => s !== "out"),
  );
  if (best < NO_PROGRAM_THRESHOLD) return { triggered: true, trigger: "no_type_fits" };
  return { triggered: false };
}

// Stage 2's: no program is within all the limits, counting only types that aren't out (a
// program of a ruled-out type is not a way forward). An empty dataset counts as nothing passing.
export function noProgramForSearch(
  category: Pick<CategoryResult, "scores">,
  evaluations: Pick<ProgramEvaluation, "status" | "category">[],
): NoProgramResult {
  const way = evaluations.some((e) => e.status !== "fail" && category.scores[e.category] !== "out");
  return way ? { triggered: false } : { triggered: true, trigger: "nothing_passes" };
}
