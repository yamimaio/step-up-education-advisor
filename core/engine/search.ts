import type { Profile } from "../schema/profile";
import type { Program } from "../schema/program";
import { failedChecks, rankCategories } from "./categoryFit";
import { checkConstraints } from "./constraints";
import { confidence } from "./confidence";
import { locationFit } from "./locationFit";
import { applyDeclinedDefaults } from "./normalize";
import { noProgramForSearch } from "./noProgram";
import { peerFit } from "./peerFit";
import { programScore, rankPrograms, totalCost } from "./ranking";
import { travelEstimate } from "./travel";
import type { CategoryAccess, CategoryResult, ProgramEvaluation, SearchResult } from "./types";

// Stage 2, "show me programs": every program against all of the user's limits, scored by the
// user's needs and ranked. `category` is the verdict the user confirmed in stage 1
// (recommendCategory); it is an input, never recomputed here, so a budget or a location can't
// change it. The server runs this at propose_search. Pure and deterministic; `today` is passed in.
export function evaluatePrograms(
  profile: Profile,
  category: CategoryResult,
  programs: Program[],
  today: Date,
): SearchResult {
  const { profile: p, profileGaps } = applyDeclinedDefaults(profile);
  const evaluations: ProgramEvaluation[] = programs.map((program) => {
    const travel = travelEstimate(program, p);
    const { checks, status } = checkConstraints(program, p, travel);
    return {
      id: program.id,
      category: program.category,
      checks,
      status,
      peerFit: peerFit(p, program),
      locationFit: locationFit(p, program),
      travelEstimate: travel,
      totalCostUsd: totalCost(program, travel),
      confidence: confidence(program, checks, today, p.needs),
      score: programScore(program, p, travel),
    };
  });
  const access = categoryAccess(category, evaluations);
  return {
    programs: evaluations,
    ranking: rankPrograms(evaluations, category, access),
    noProgram: noProgramForSearch(category, evaluations),
    access,
    profileGaps,
  };
}

// Whether the confirmed category has a program within the user's limits. When it doesn't, the
// verdict stands and the card says why, naming the best-scoring category that has one.
export function categoryAccess(
  category: Pick<CategoryResult, "winner" | "scores">,
  evaluations: Pick<ProgramEvaluation, "category" | "status" | "checks">[],
): CategoryAccess {
  const { winner } = category;
  if (winner === null) {
    return { category: null, status: "no_winner", blockedBy: [], alternative: null };
  }
  const within = (c: string) => evaluations.some((e) => e.category === c && e.status !== "fail");
  if (within(winner)) {
    return { category: winner, status: "available", blockedBy: [], alternative: null };
  }
  const alternative =
    rankCategories(category.scores).find((c) => c !== winner && within(c)) ?? null;
  const own = evaluations.filter((e) => e.category === winner);
  if (own.length === 0) {
    return { category: winner, status: "no_programs", blockedBy: [], alternative };
  }
  return {
    category: winner,
    status: "none_within_limits",
    blockedBy: failedChecks(own.map((e) => e.checks)),
    alternative,
  };
}
