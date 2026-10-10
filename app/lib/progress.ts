import type { ChatState } from "./chatState";
import { toTurns } from "./conversation";

// The progress line above the chat: Your goal · Your needs · Your situation · Verdict, read from
// the history and what is on screen. The first step not done is the current one; once the verdict
// shows, every step is done and none is current.

export type StepState = "done" | "current" | "todo";
export type ProgressStep = { label: string; state: StepState };

export const PROGRESS_LABELS = ["Your goal", "Your needs", "Your situation", "Verdict"] as const;

export function progressSteps(
  state: Pick<ChatState, "history" | "confirm" | "verdict">,
): ProgressStep[] {
  const turns = toTurns(state.history);
  const answered = (field: string) => turns.some((t) => t.kind === "chips" && t.field === field);
  // The card has appeared: it is pending, or the user answered one, or confirmed it.
  const card =
    state.confirm !== null || state.verdict !== null || turns.some((t) => t.kind === "confirm");
  const done = [
    card || answered("careerGoalKind"),
    card || answered("needs"),
    card,
    state.verdict !== null,
  ];
  const current = done.indexOf(false);
  return PROGRESS_LABELS.map((label, i) => ({
    label,
    state: done[i] ? "done" : i === current ? "current" : "todo",
  }));
}
