import type { DirectionResult } from "../core/engine/types";
import type { Category, Need } from "../core/schema/enums";

// What the user reads when the model can't answer (docs/chat-api.md, "After a notice"). The
// verdict explanation is a template over the engine's result only, so a confirmed card still
// gets its verdict with the model down (DQ3). Labels are plain words, never model text.

export type NoticeKind =
  "retryable" | "auth_or_credit" | "refusal" | "unknown" | "empty_input" | "limit";

export const NOTICE_MESSAGES: Record<NoticeKind, string> = {
  retryable: "The advisor is busy right now. Your answers are safe; try again in a moment.",
  auth_or_credit:
    "The advisor isn't available right now, so the conversation can't continue. Any verdict already shown still stands, and you can download the transcript.",
  refusal: "The advisor couldn't answer that. Try saying it another way, or pick an option again.",
  unknown: "Something went wrong on our side. Your answers are safe; try again.",
  empty_input: "Type an answer first, or tap one of the options.",
  limit:
    "This conversation has reached its message limit. Your verdict and the transcript download still work.",
};

const CATEGORY: Record<Category, string> = {
  mba: "a full-time MBA",
  emba: "an executive MBA",
  specialized_masters: "a specialized master's",
  executive: "an executive program",
  certificate: "a graduate certificate",
  short_course: "a short course",
};

const NEED: Record<Need, string> = {
  leadership_skills: "leadership skills",
  deep_expertise: "deep expertise in a field",
  graduate_degree: "a graduate degree",
  senior_network: "a senior network",
  new_industry_or_city: "access to a new industry or city",
};

const CLOSING = "Want to see programs that fit?";

const list = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

export function fallbackExplanation(result: DirectionResult): string {
  const { category, noProgram, profileGaps } = result;
  const lines: string[] = [];
  if (noProgram.triggered) {
    lines.push(
      noProgram.trigger === "goal_unclear"
        ? "My verdict: no program yet. The goal, or what you want the step to give you, isn't clear enough to choose a program for."
        : "My verdict: no program yet. None of the types of program fits what you need well enough.",
    );
  } else if (category.winner) {
    lines.push(`My verdict: ${CATEGORY[category.winner]}.`);
    if (category.decidingNeeds.length) {
      lines.push(`It fits best on ${list(category.decidingNeeds.map((n) => NEED[n]))}.`);
    }
    if (category.runnerUp) lines.push(`The runner-up is ${CATEGORY[category.runnerUp]}.`);
  } else if (category.tie) {
    lines.push(`It's a tie between ${CATEGORY[category.tie[0]]} and ${CATEGORY[category.tie[1]]}.`);
  }
  const out = (Object.keys(category.scores) as Category[]).filter(
    (c) => category.scores[c] === "out",
  );
  for (const c of out) {
    // Only the reason that rules it out, not how it fits the needs: "(you need a degree and …)".
    const reasons = category.reasons[c]
      .filter((r) => r.startsWith("Out: "))
      .map((r) => r.slice("Out: ".length).replace(/\.$/, ""));
    lines.push(`Ruled out: ${CATEGORY[c]}${reasons.length ? ` (${reasons.join("; ")})` : ""}.`);
  }
  if (profileGaps.length) {
    lines.push(
      `Answers you chose not to give, so the verdict leaves them out: ${list(profileGaps)}.`,
    );
  }
  lines.push(
    "The advisor can't add its explanation right now; the verdict above comes from the scoring engine.",
  );
  lines.push(CLOSING);
  return lines.join("\n\n");
}
