import type { Category, Need } from "../schema/enums";
import type { Program } from "../schema/program";
import {
  CATEGORY_ORDER,
  CHECK_LABELS,
  DEGREE_ADJUST,
  DEGREE_WORDS,
  DEGREE_ADJUSTED_TYPES,
  GROW_IN_ROLE_BONUS,
  GROW_IN_ROLE_TYPES,
  GROW_IN_ROLE_WORDS,
  NEED_WEIGHTS,
  NEED_WORDS,
  NO_DEGREE_WORDS,
  RATING_WORDS,
  RATING_MIN,
  REQUIRED_RULES_OUT,
  TYPE_RATINGS,
} from "./constants";
import type {
  Check,
  CheckId,
  CategoryResult,
  EffectiveDirection,
  ProgramEvaluation,
} from "./types";

type Evaluated = Pick<ProgramEvaluation, "id" | "status"> & { checks?: Check[] };

// Types that aren't out, best score first; equal scores keep matrix order.
export function rankCategories(scores: Record<Category, number | "out">): Category[] {
  return CATEGORY_ORDER.flatMap((c) => {
    const s = scores[c];
    return s === "out" ? [] : [{ category: c, score: s }];
  })
    .sort((a, b) => b.score - a.score) // stable: ties keep matrix order
    .map((x) => x.category);
}

// The checks that failed across a set of programs, most common first (ties in check order).
export function failedChecks(checkLists: Check[][]): CheckId[] {
  const failed = new Map<CheckId, number>();
  for (const checks of checkLists) {
    for (const c of checks) {
      if (c.status === "fail") failed.set(c.id, (failed.get(c.id) ?? 0) + 1);
    }
  }
  const order = Object.keys(CHECK_LABELS);
  return [...failed.entries()]
    .sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([id]) => id);
}

// How a type serves the user's ranked needs, in words and in their order: "Strong for a senior
// network and leadership skills." then "Some help with deep expertise in a field." (issue #130).
// A type that awards no degree says so rather than "Little help with a graduate degree.".
export function needsInWords(category: Category, needs: Need[]): string[] {
  const groups = new Map<string, string[]>();
  for (const need of needs) {
    if (need === "graduate_degree" && REQUIRED_RULES_OUT.includes(category)) {
      groups.set(NO_DEGREE_WORDS, []);
      continue;
    }
    const word = RATING_WORDS[TYPE_RATINGS[category][need]];
    groups.set(word, [...(groups.get(word) ?? []), NEED_WORDS[need]]);
  }
  const and = (items: string[]) =>
    items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
  return [...groups].map(([word, items]) => (items.length ? `${word} ${and(items)}.` : word));
}

// Stage 1: pick the type of program before any specific program. `evaluations` hold each
// program's stage-1 checks (checkDirection), so a type is ruled out only by length, hours or
// keeping a job, never by budget, travel or location.
export function categoryFit(
  profile: EffectiveDirection,
  programs: Pick<Program, "id" | "category">[],
  evaluations: Evaluated[],
): CategoryResult {
  const scores = {} as Record<Category, number | "out">;
  const reasons = {} as Record<Category, string[]>;
  const byId = new Map(evaluations.map((e) => [e.id, e]));
  const statusById = new Map(evaluations.map((e) => [e.id, e.status]));

  for (const category of CATEGORY_ORDER) {
    const why: string[] = [];
    reasons[category] = why;

    const subtotal = profile.needs.reduce(
      (sum, need, i) => sum + (NEED_WEIGHTS[i] ?? 0) * TYPE_RATINGS[category][need],
      0,
    );
    const needWords =
      profile.needs.length > 0
        ? needsInWords(category, profile.needs)
        : ["No ranked needs: you chose not to say."];

    const records = programs.filter((p) => p.category === category);
    const reachable = records.some((p) => statusById.get(p.id) !== "fail");

    // A ruled-out type's reasons start with "Out:" (advisor.md, "Deliver the verdict").
    if (profile.degreeRequired === "required" && REQUIRED_RULES_OUT.includes(category)) {
      why.push("Out: you need a degree and this type does not award one.", ...needWords);
      scores[category] = "out";
      continue;
    }
    // D6: a type with no records is never ruled out here.
    if (records.length > 0 && !reachable) {
      // Name what rules the type out: the failed checks, most common first.
      const names = failedChecks(records.map((p) => byId.get(p.id)?.checks ?? [])).map(
        (id) => CHECK_LABELS[id],
      );
      why.push(
        `Out: no program of this type is within your limits${names.length ? ` (${names.join(", ")})` : ""}.`,
        ...needWords,
      );
      scores[category] = "out";
      continue;
    }
    why.push(...needWords);

    let score = subtotal;
    const degree = profile.degreeRequired;
    if (
      (degree === "no" || degree === "unsure" || degree === "preferred") &&
      DEGREE_ADJUSTED_TYPES.includes(category)
    ) {
      score += DEGREE_ADJUST[degree];
      why.push(DEGREE_WORDS[degree]);
    }
    if (profile.careerGoal.kind === "grow_in_role" && GROW_IN_ROLE_TYPES.includes(category)) {
      score += GROW_IN_ROLE_BONUS;
      why.push(GROW_IN_ROLE_WORDS);
    }
    if (records.length === 0) why.push("No verified programs of this type yet.");
    scores[category] = score;
  }

  const ranked = rankCategories(scores).map((c) => ({ category: c, score: scores[c] as number }));

  // With no needs (declined) the scores are adjustments only, so no type wins.
  const hasNeeds = profile.needs.length > 0;
  const first = hasNeeds ? ranked[0] : undefined;
  const second = hasNeeds ? ranked[1] : undefined;
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
      // A tie the formula can't break has no winner until the user chooses.
      winner = null;
      runnerUp = null;
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

// Up to two needs where weight × (winner rating − runner-up rating) is largest; ties go to the
// higher-ranked need. With no runner-up the baseline is the lowest rating. A need the runner-up
// serves as well (gap 0) didn't decide it, so it is left out: with equal needs the list is empty
// and the degree or grow-in-role reason is what separates them.
function decidingNeeds(needs: Need[], winner: Category | null, runnerUp: Category | null): Need[] {
  if (!winner) return [];
  return needs
    .map((need, i) => ({
      need,
      i,
      gap:
        (NEED_WEIGHTS[i] ?? 0) *
        (TYPE_RATINGS[winner][need] - (runnerUp ? TYPE_RATINGS[runnerUp][need] : RATING_MIN)),
    }))
    .filter((x) => x.gap > 0)
    .sort((a, b) => b.gap - a.gap || a.i - b.i)
    .slice(0, 2)
    .map((x) => x.need);
}
