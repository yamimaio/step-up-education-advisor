import type { ChatState } from "./chatState";
import { chipAnswerText, toTurns, type ChipsTurn } from "./conversation";
import { CHIP_FIELD_LABELS, directionLines, type CardLine } from "./labels";

// The read-only "What I've understood" panel. Before the first card, each Stage 1 chip field
// shows its latest tap, or "Not yet": a typed reply doesn't count, since the advisor asks the
// field again (advisor.md). Once a card has shown, the panel reads the card's own lines: the
// pending card, the confirmed one at the verdict, or the last one while "Looks right" is sending
// or has failed. After "Change something" it keeps the last card's lines, with taps made since
// in place of the card's values, and the user's correction as the note. Chip labels, the card's
// lines and the user's own words only, never model text.

export const NOT_YET = "Not yet";

// The Stage 1 chip fields in panel order. CHIP_FIELD_LABELS lists every one (its `satisfies`
// checks that), so the page doesn't import core's field list and the zod that comes with it.
const FIELDS = Object.keys(CHIP_FIELD_LABELS);

export type Understood = { lines: CardLine[]; note: string | null };

const tapped = (turn: ChipsTurn) => turn.typed === undefined;

export function understood(
  state: Pick<ChatState, "history" | "confirm" | "verdict" | "lastCard">,
): Understood {
  // The stage 1 card; the search card (stage 2) comes after the verdict, which the next line reads.
  if (state.confirm && "direction" in state.confirm) {
    return { lines: directionLines(state.confirm.direction), note: null };
  }
  if (state.verdict) return { lines: directionLines(state.verdict.direction), note: null };

  const turns = toTurns(state.history);
  const answeredAt = turns.findLastIndex((t) => t.kind === "confirm" && t.stage === 1);
  const answer = turns[answeredAt];
  if (state.lastCard && answer?.kind === "confirm") {
    const lines = directionLines(state.lastCard);
    if (answer.confirmed) return { lines, note: null };
    for (const turn of turns.slice(answeredAt + 1)) {
      if (turn.kind !== "chips" || !tapped(turn)) continue;
      if (!Object.hasOwn(CHIP_FIELD_LABELS, turn.field)) continue;
      const line = lines.find((l) => l.label === CHIP_FIELD_LABELS[turn.field]);
      if (line) line.value = chipAnswerText(turn);
    }
    return { lines, note: answer.corrections };
  }

  const latest = new Map<string, ChipsTurn>();
  for (const turn of turns) if (turn.kind === "chips" && tapped(turn)) latest.set(turn.field, turn);
  return {
    lines: FIELDS.map((field) => {
      const turn = latest.get(field);
      return { label: CHIP_FIELD_LABELS[field]!, value: turn ? chipAnswerText(turn) : NOT_YET };
    }),
    note: null,
  };
}
