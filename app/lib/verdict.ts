import type { Category } from "@core/schema/enums";
import type { Verdict } from "./chatState";
import { CATEGORY_LABELS, DIRECTION_FIELD_LABELS, chipLabel } from "./labels";

// The verdict in display form, from the engine's DirectionResult and the confirmed card only.
// Shared by the verdict block and the transcript.

export type VerdictRow = { category: Category; name: string; score: string; reasons: string[] };

export type VerdictView = {
  // "not yet": the engine's stage 1 trigger, explained in plain words.
  notYet: string | null;
  winner: string | null;
  runnerUp: string | null;
  // Two types tied and the user hasn't picked one.
  tie: [string, string] | null;
  decidingNeeds: string[];
  tensions: string[];
  // Every type, best score first and ruled-out types last, with the engine's reasons.
  rows: VerdictRow[];
  notAnswered: string[];
};

const NOT_YET: Record<string, string> = {
  goal_unclear:
    "Not yet. Your goal isn't clear enough to pick a type of program. Getting clear on what you want next is the step before any program.",
  no_type_fits:
    "Not yet. No type of program fits your answers well enough. A program now would cost time and money without closing the gap you named.",
};

// Ruled-out types sort below any score (scores can go negative after the degree adjustment).
const rank = (s: number | "out") => (s === "out" ? Number.MIN_SAFE_INTEGER : s);

export function verdictView({ direction, result }: Verdict): VerdictView {
  const { category, noProgram, profileGaps } = result;
  const rows = (Object.keys(category.scores) as Category[])
    .map((c) => ({ c, s: category.scores[c] }))
    .sort((a, b) => rank(b.s) - rank(a.s))
    .map(({ c, s }) => ({
      category: c,
      name: CATEGORY_LABELS[c],
      score: s === "out" ? "Ruled out" : String(s),
      reasons: category.reasons[c] ?? [],
    }));
  const name = (c: Category | null) => (c ? CATEGORY_LABELS[c] : null);
  return {
    notYet: noProgram.triggered && noProgram.trigger ? (NOT_YET[noProgram.trigger] ?? null) : null,
    winner: name(category.winner),
    runnerUp: name(category.runnerUp),
    tie: category.tie ? [CATEGORY_LABELS[category.tie[0]], CATEGORY_LABELS[category.tie[1]]] : null,
    decidingNeeds: category.decidingNeeds.map((n) => chipLabel("needs", n)),
    tensions: direction.resolvedTensions.map((t) => t.chosen),
    rows,
    notAnswered: profileGaps.map((f) => DIRECTION_FIELD_LABELS[f] ?? f),
  };
}
