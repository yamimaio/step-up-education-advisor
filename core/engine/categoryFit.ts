import type { Category, Need } from "../schema/enums";
import type { Program } from "../schema/program";
import {
  CATEGORY_ORDER,
  DEGREE_ADJUST,
  DEGREE_ADJUSTED_TYPES,
  GROW_IN_ROLE_BONUS,
  GROW_IN_ROLE_TYPES,
  NEED_WEIGHTS,
  REQUIRED_RULES_OUT,
  TYPE_RATINGS,
} from "./constants";
import type { CategoryResult, EffectiveProfile, ProgramEvaluation } from "./types";

type Evaluated = Pick<ProgramEvaluation, "id" | "status">;

// Step 1: pick the type of program before any specific program.
export function categoryFit(
  profile: EffectiveProfile,
  programs: Pick<Program, "id" | "category">[],
  evaluations: Evaluated[],
): CategoryResult {
  const scores = {} as Record<Category, number | "out">;
  const reasons = {} as Record<Category, string[]>;
  const statusById = new Map(evaluations.map((e) => [e.id, e.status]));

  for (const category of CATEGORY_ORDER) {
    const why: string[] = [];
    reasons[category] = why;

    const subtotal = profile.needs.reduce(
      (sum, need, i) => sum + (NEED_WEIGHTS[i] ?? 0) * TYPE_RATINGS[category][need],
      0,
    );
    why.push(`Needs subtotal ${subtotal}.`);

    const records = programs.filter((p) => p.category === category);
    const reachable = records.some((p) => statusById.get(p.id) !== "fail");

    if (profile.degreeRequired === "required" && REQUIRED_RULES_OUT.includes(category)) {
      why.push("Out: you need a degree and this type does not award one.");
      scores[category] = "out";
      continue;
    }
    // D6: a type with no records is never ruled out here.
    if (records.length > 0 && !reachable) {
      why.push("Out: no program of this type is within your limits.");
      scores[category] = "out";
      continue;
    }

    let score = subtotal;
    const degree = profile.degreeRequired;
    if (
      (degree === "no" || degree === "unsure" || degree === "preferred") &&
      DEGREE_ADJUSTED_TYPES.includes(category)
    ) {
      score += DEGREE_ADJUST[degree];
      why.push(`Degree ${degree === "no" ? "not needed" : degree}: ${DEGREE_ADJUST[degree]}.`);
    }
    if (profile.careerGoal.kind === "grow_in_role" && GROW_IN_ROLE_TYPES.includes(category)) {
      score += GROW_IN_ROLE_BONUS;
      why.push(`Growing in your current role: +${GROW_IN_ROLE_BONUS}.`);
    }
    if (records.length === 0) why.push("No verified programs of this type yet.");
    scores[category] = score;
  }

  const ranked = CATEGORY_ORDER.flatMap((c) => {
    const s = scores[c];
    return s === "out" ? [] : [{ category: c, score: s }];
  }).sort((a, b) => b.score - a.score); // stable: ties keep matrix order

  const first = ranked[0];
  const second = ranked[1];
  let winner = first?.category ?? null;
  let runnerUp = second?.category ?? null;
  let tie: [Category, Category] | undefined;
  if (first && second && first.score === second.score) {
    const pair: [Category, Category] = [first.category, second.category];
    if (profile.tieBreaker && pair.includes(profile.tieBreaker)) {
      winner = profile.tieBreaker;
      runnerUp = pair.find((c) => c !== profile.tieBreaker) ?? null;
    } else {
      tie = pair;
    }
  }

  return {
    scores,
    reasons,
    winner,
    runnerUp,
    ...(tie ? { tie } : {}),
    decidingNeeds: decidingNeeds(profile.needs, winner, runnerUp),
  };
}

// The two needs where weight × (winner rating − runner-up rating) is largest; ties go to the
// higher-ranked need.
function decidingNeeds(needs: Need[], winner: Category | null, runnerUp: Category | null): Need[] {
  if (!winner) return [];
  return needs
    .map((need, i) => ({
      need,
      i,
      gap:
        (NEED_WEIGHTS[i] ?? 0) *
        (TYPE_RATINGS[winner][need] - (runnerUp ? TYPE_RATINGS[runnerUp][need] : 0)),
    }))
    .sort((a, b) => b.gap - a.gap || a.i - b.i)
    .slice(0, 2)
    .map((x) => x.need);
}
