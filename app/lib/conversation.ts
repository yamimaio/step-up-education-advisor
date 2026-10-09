import { WRAP_UP_NOTE } from "@core/advisor/wrapUp";
import { blocksOf, type MessageParam } from "./chatTypes";

// What the user sees of the history: the user's words, the chips they tapped, their answer to
// the card and the advisor's text. Thinking, tool calls and server-tool results stay hidden.

export type Turn =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "chips"; question: string; chosen: string[]; typed?: string }
  | { kind: "confirm"; confirmed: true }
  | { kind: "confirm"; confirmed: false; corrections: string };

type ToolCall = { name: string; input: Record<string, unknown> };

function parse(content: unknown): Record<string, unknown> | null {
  if (typeof content !== "string") return null;
  try {
    const value: unknown = JSON.parse(content);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// A chip answer holds labels as the page sent them, or { label, value } once the server rewrote it.
function labelsOf(chosen: unknown): string[] {
  if (!Array.isArray(chosen)) return [];
  return chosen.flatMap((c) =>
    typeof c === "string"
      ? [c]
      : c && typeof c === "object" && typeof (c as { label?: unknown }).label === "string"
        ? [(c as { label: string }).label]
        : [],
  );
}

// An assistant message whose tool calls the server all refused with is_error: the model's own
// text there is never shown, the same rule as the server's `text` (docs/chat-api.md).
function rejectedTurns(history: MessageParam[]): Set<MessageParam> {
  const refused = new Set(
    history.flatMap((m) =>
      blocksOf(m).flatMap((b) =>
        b.type === "tool_result" && b.is_error === true && typeof b.tool_use_id === "string"
          ? [b.tool_use_id]
          : [],
      ),
    ),
  );
  return new Set(
    history.filter((m) => {
      if (m.role !== "assistant") return false;
      const ids = blocksOf(m).flatMap((b) =>
        b.type === "tool_use" && typeof b.id === "string" ? [b.id] : [],
      );
      return ids.length > 0 && ids.every((id) => refused.has(id));
    }),
  );
}

export function toTurns(history: MessageParam[]): Turn[] {
  const calls = new Map<string, ToolCall>();
  const turns: Turn[] = [];
  const rejected = rejectedTurns(history);
  for (const message of history) {
    for (const block of blocksOf(message)) {
      if (block.type === "text" && typeof block.text === "string") {
        // The server's wrap-up note near the message cap (docs/chat-api.md, "Message cap"): it
        // stays in the history, which is append-only, but is never shown. Matched by its whole
        // text, so a user's own words are never hidden.
        const note = message.role === "user" && block.text === WRAP_UP_NOTE;
        const hidden = note || rejected.has(message);
        if (!hidden && block.text.trim()) turns.push({ kind: message.role, text: block.text });
      } else if (block.type === "tool_use" && typeof block.id === "string") {
        calls.set(block.id, {
          name: String(block.name),
          input: (block.input ?? {}) as Record<string, unknown>,
        });
      } else if (block.type === "tool_result" && typeof block.tool_use_id === "string") {
        const call = calls.get(block.tool_use_id);
        const answer = parse(block.content);
        if (!call || !answer || block.is_error) continue;
        if (call.name === "ask_choice") {
          const typed = typeof answer.typed === "string" ? answer.typed : undefined;
          turns.push({
            kind: "chips",
            question: String(call.input.question ?? ""),
            chosen: labelsOf(answer.chosen),
            ...(typed ? { typed } : {}),
          });
        } else if (call.name === "propose_direction") {
          turns.push(
            answer.confirmed === true
              ? { kind: "confirm", confirmed: true }
              : {
                  kind: "confirm",
                  confirmed: false,
                  corrections: String(answer.corrections ?? ""),
                },
          );
        }
      }
    }
  }
  return turns;
}

// What a chip or card answer reads like in the chat.
export function turnText(turn: Turn): string {
  switch (turn.kind) {
    case "user":
    case "assistant":
      return turn.text;
    case "chips":
      return turn.typed ?? turn.chosen.join(", ");
    case "confirm":
      return turn.confirmed ? "Looks right" : `Change something: ${turn.corrections}`;
  }
}
