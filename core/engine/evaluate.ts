import type { Profile } from "../schema/profile";
import type { Program } from "../schema/program";
import { categoryFit } from "./categoryFit";
import { checkConstraints } from "./constraints";
import { confidence } from "./confidence";
import { locationFit } from "./locationFit";
import { applyDeclinedDefaults } from "./normalize";
import { noProgram } from "./noProgram";
import { peerFit } from "./peerFit";
import { scenarioScores, shortlists } from "./scenarios";
import { travelEstimate } from "./travel";
import type { EngineResult, ProgramEvaluation } from "./types";

// The whole engine: a confirmed profile and the dataset in, one result out. Pure and
// deterministic; `today` is passed in.
export function evaluate(profile: Profile, programs: Program[], today: Date): EngineResult {
  const { profile: p, profileGaps } = applyDeclinedDefaults(profile);

  // 1-2. Travel and constraints, per program.
  const first = programs.map((program) => {
    const travel = travelEstimate(program, p);
    return { program, travel, ...checkConstraints(program, p, travel) };
  });

  // 3-4. Category fit needs the constraint results; then the no-program rule.
  const category = categoryFit(
    p,
    programs,
    first.map((f) => ({ id: f.program.id, status: f.status, checks: f.checks })),
  );
  const noProgramResult = noProgram(
    p,
    category,
    first.map((f) => ({ category: f.program.category, status: f.status })),
  );

  // 5. Peer fit, location fit, confidence and scenario scores. With a tie there is no winner
  // yet, so no category bonus.
  const bonusWinner = category.winner;
  const evaluations: ProgramEvaluation[] = first.map(({ program, travel, checks, status }) => {
    const peer = peerFit(p, program);
    const loc = locationFit(p, program);
    return {
      id: program.id,
      category: program.category,
      checks,
      status,
      peerFit: peer,
      locationFit: loc,
      travelEstimate: travel,
      confidence: confidence(program, checks, today),
      scenarioScores: scenarioScores(program, loc, peer, bonusWinner),
    };
  });

  // 6-7. Shortlists and gaps.
  return {
    category,
    noProgram: noProgramResult,
    programs: evaluations,
    scenarios: shortlists(evaluations, category.scores),
    profileGaps,
  };
}
