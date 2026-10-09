import type { Category } from "../schema/enums";
import type { Program } from "../schema/program";
import { CATEGORY_BONUS, SCENARIO_WEIGHTS } from "./constants";
import type { PeerFit, ProgramEvaluation, Scenario } from "./types";

// Scores are rounded so float noise (2.75 vs 2.7500000000000004) can not defeat the id tie-break.
const round = (n: number) => Math.round(n * 1e9) / 1e9;

export const SCENARIOS = ["network", "depth", "practicality"] as const satisfies Scenario[];

// Weighted sum of the ratings and location fit, +0.5 for the winning category, plus peer fit.
export function scenarioScores(
  program: Pick<Program, "ratings" | "category">,
  locationFit: number,
  peer: PeerFit,
  winner: Category | null,
): Record<Scenario, number> {
  const bonus = winner !== null && program.category === winner ? CATEGORY_BONUS : 0;
  const out = {} as Record<Scenario, number>;
  for (const s of SCENARIOS) {
    const w = SCENARIO_WEIGHTS[s];
    out[s] = round(
      program.ratings.network * w.network +
        program.ratings.depth * w.depth +
        program.ratings.practicality * w.practicality +
        program.ratings.costValue * w.costValue +
        locationFit * w.locationFit +
        bonus +
        peer.points,
    );
  }
  return out;
}

// Top 3 per scenario. Programs that pass come first; near misses only fill empty slots (the
// card labels them from the program's status). Programs of a ruled-out type are left out.
// Ties are broken by id so the order is deterministic.
export function shortlists(
  evaluations: ProgramEvaluation[],
  scores: Record<Category, number | "out">,
): Record<Scenario, string[]> {
  const eligible = evaluations.filter((e) => e.status !== "fail" && scores[e.category] !== "out");
  const out = {} as Record<Scenario, string[]>;
  for (const s of SCENARIOS) {
    const byScore = (a: ProgramEvaluation, b: ProgramEvaluation) =>
      b.scenarioScores[s] - a.scenarioScores[s] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const passing = eligible.filter((e) => e.status === "pass").sort(byScore);
    const near = eligible.filter((e) => e.status === "near_miss").sort(byScore);
    out[s] = [...passing, ...near].slice(0, 3).map((e) => e.id);
  }
  return out;
}
