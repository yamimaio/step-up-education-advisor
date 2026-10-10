import type { Category } from "@core/schema/enums";
import type { Verdict } from "./chatState";
import { CATEGORY_LABELS, DIRECTION_FIELD_LABELS, chipLabel } from "./labels";

// The verdict in display form, from the engine's DirectionResult and the confirmed card only.
// Shared by the verdict block and the transcript.

// No scores: they rank the types, but the user decides on the reasons (issue #130).
export type VerdictRow = { category: Category; name: string; out: boolean; reasons: string[] };

export type VerdictView = {
  // "not yet": the engine's stage 1 trigger, explained in plain words.
  notYet: string | null;
  winner: string | null;
  runnerUp: string | null;
  // Two types tied and the user hasn't picked one.
  tie: [string, string] | null;
  decidingNeeds: string[];
  tensions: string[];
  // Every type, with the engine's reasons in words: the winner, the runner-up, then the rest best
  // fit first, ruled-out types last. With no scores shown, this order is the ranking the user sees.
  rows: VerdictRow[];
  notAnswered: string[];
};

const NOT_YET: Record<string, string> = {
  goal_unclear:
    "Not yet. Your goal isn't clear enough to pick a type of program. Getting clear on what you want next is the step before any program.",
  no_type_fits:
    "Not yet. No type of program fits your answers well enough. A program now would cost time and money without closing the gap you named.",
};
const NOT_YET_DEFAULT = "Not yet. A program isn't the right next step for you right now.";

// Ruled-out types sort below any score (scores can go negative after the degree adjustment).
const rank = (s: number | "out") => (s === "out" ? Number.MIN_SAFE_INTEGER : s);

export function verdictView({ direction, result }: Verdict): VerdictView {
  const { category, noProgram, profileGaps } = result;
  // A tie the user broke leaves the winner and runner-up on the same score, so name them first.
  const lead = (c: Category) => (c === category.winner ? 0 : c === category.runnerUp ? 1 : 2);
  const rows = (Object.keys(category.scores) as Category[])
    .map((c) => ({ c, s: category.scores[c] }))
    .sort((a, b) => lead(a.c) - lead(b.c) || rank(b.s) - rank(a.s))
    .map(({ c, s }) => ({
      category: c,
      name: CATEGORY_LABELS[c],
      out: s === "out",
      reasons: category.reasons[c] ?? [],
    }));
  const name = (c: Category | null) => (c ? CATEGORY_LABELS[c] : null);
  // "Not yet" replaces the pick: the engine still ranks the types (the comparison shows them),
  // but the verdict names no winner, runner-up, tie or deciding needs.
  const notYet = noProgram.triggered;
  return {
    notYet: notYet ? (NOT_YET[noProgram.trigger ?? ""] ?? NOT_YET_DEFAULT) : null,
    winner: notYet ? null : name(category.winner),
    runnerUp: notYet ? null : name(category.runnerUp),
    tie:
      !notYet && category.tie
        ? [CATEGORY_LABELS[category.tie[0]], CATEGORY_LABELS[category.tie[1]]]
        : null,
    decidingNeeds: notYet ? [] : category.decidingNeeds.map((n) => chipLabel("needs", n)),
    tensions: direction.resolvedTensions.map((t) => t.chosen),
    rows,
    notAnswered: profileGaps.map((f) => DIRECTION_FIELD_LABELS[f] ?? f),
  };
}
