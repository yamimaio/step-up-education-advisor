import { STAGE_1_CHIP_FIELDS } from "@core/advisor/tools";
import type { ChatState } from "./chatState";
import { chipAnswerText, toTurns, type ChipsTurn } from "./conversation";
import { CHIP_FIELD_LABELS, directionLines, type CardLine } from "./labels";

// The read-only "What I've understood" panel. While a card is pending or the verdict shows, it
// reads the card's own lines; otherwise each Stage 1 chip field shows its latest answer, or
// "Not yet". Chip labels and the user's typed words only, never model text.

export const NOT_YET = "Not yet";

export function understoodLines(
  state: Pick<ChatState, "history" | "confirm" | "verdict">,
): CardLine[] {
  const direction = state.confirm?.direction ?? state.verdict?.direction;
  if (direction) return directionLines(direction);

  const latest = new Map<string, ChipsTurn>();
  for (const turn of toTurns(state.history))
    if (turn.kind === "chips") latest.set(turn.field, turn);
  return STAGE_1_CHIP_FIELDS.map((field) => {
    const turn = latest.get(field);
    return { label: CHIP_FIELD_LABELS[field]!, value: turn ? chipAnswerText(turn) : NOT_YET };
  });
}
