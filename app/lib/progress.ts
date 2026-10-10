import type { ChatState } from "./chatState";
import { blocksOf, type MessageParam } from "./chatTypes";
import { toTurns } from "./conversation";
import { CHIP_FIELD_LABELS } from "./labels";

// The progress line above the chat: Your goal · Your needs · Your situation · Verdict, read from
// the history and what is on screen. A step is done when its chips were tapped (a typed reply
// doesn't count: the advisor asks the field again, advisor.md), and goal, needs and situation are
// all done once a card has appeared. The current step is the one the advisor last asked about,
// or the next one not done after it; once the card appears it is the verdict, and once the
// verdict shows, no step is current.

export type StepState = "done" | "current" | "todo";
export type ProgressStep = { label: string; state: StepState };

export const PROGRESS_LABELS = ["Your goal", "Your needs", "Your situation", "Verdict"] as const;

// Which step a Stage 1 chip field belongs to; any other field belongs to none.
function stepOf(field: string): number | null {
  if (field === "careerGoalKind") return 0;
  if (field === "needs") return 1;
  return Object.hasOwn(CHIP_FIELD_LABELS, field) ? 2 : null;
}

// The fields of the ask_choice calls the user was shown, in order: calls the server refused with
// is_error never reached the page.
function askedFields(history: MessageParam[]): string[] {
  const blocks = history.flatMap(blocksOf);
  const refused = new Set(
    blocks.flatMap((b) => (b.type === "tool_result" && b.is_error === true ? [b.tool_use_id] : [])),
  );
  return blocks.flatMap((b) =>
    b.type === "tool_use" && b.name === "ask_choice" && !refused.has(b.id)
      ? [String((b.input as { field?: unknown } | undefined)?.field ?? "")]
      : [],
  );
}

export function progressSteps(
  state: Pick<ChatState, "history" | "confirm" | "verdict">,
): ProgressStep[] {
  const turns = toTurns(state.history);
  const tapped = (field: string) =>
    turns.some((t) => t.kind === "chips" && t.field === field && t.typed === undefined);
  // The card has appeared: it is pending, or the user answered one, or confirmed it.
  const card =
    state.confirm !== null || state.verdict !== null || turns.some((t) => t.kind === "confirm");
  const done = [
    card || tapped("careerGoalKind"),
    card || tapped("needs"),
    card,
    state.verdict !== null,
  ];

  let current: number | null;
  if (state.verdict) current = null;
  else if (card) current = 3;
  else {
    const asked = askedFields(state.history).flatMap((f) => stepOf(f) ?? []);
    const from = asked.at(-1) ?? 0;
    current = done.findIndex((d, i) => i >= from && !d);
  }
  return PROGRESS_LABELS.map((label, i) => ({
    label,
    state: done[i] ? "done" : i === current ? "current" : "todo",
  }));
}
