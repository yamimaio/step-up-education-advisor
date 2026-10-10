import type Anthropic from "@anthropic-ai/sdk";
import { CHIPS, type ChipField } from "../core/advisor/chips";
import { isStage1Tool, pauses } from "./tools";

// Read-only helpers over the conversation history the page posts (docs/chat-api.md). The history
// is client-held, so everything here reads it defensively: a value written next to a chip label
// is never trusted, only the label looked up in CHIPS.

export type Message = Anthropic.MessageParam;
type Block = Anthropic.ContentBlockParam;

export function blocksOf(message: Message): Block[] {
  return typeof message.content === "string"
    ? [{ type: "text", text: message.content }]
    : message.content;
}

export function toolUsesOf(message: Message): Anthropic.ToolUseBlockParam[] {
  return message.role === "assistant"
    ? blocksOf(message).filter((b): b is Anthropic.ToolUseBlockParam => b.type === "tool_use")
    : [];
}

export function toolResultsOf(message: Message): Anthropic.ToolResultBlockParam[] {
  return message.role === "user"
    ? blocksOf(message).filter((b): b is Anthropic.ToolResultBlockParam => b.type === "tool_result")
    : [];
}

export function parseJson(content: Anthropic.ToolResultBlockParam["content"]): unknown {
  if (typeof content !== "string") return undefined;
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

const isPausing = (name: string) => isStage1Tool(name) && pauses(name);

// Every tool call in the history with its answer, if any. The answer is the first tool_result
// for that id; the API refuses a history with two.
export type ToolCall = {
  use: Anthropic.ToolUseBlockParam;
  result: Anthropic.ToolResultBlockParam | undefined;
};

export function toolCalls(history: Message[]): ToolCall[] {
  const results = new Map<string, Anthropic.ToolResultBlockParam>();
  for (const message of history) {
    for (const r of toolResultsOf(message)) {
      if (!results.has(r.tool_use_id)) results.set(r.tool_use_id, r);
    }
  }
  return history.flatMap((m) => toolUsesOf(m).map((use) => ({ use, result: results.get(use.id) })));
}

// The pausing tool the posted message must answer: the one call in the last assistant message,
// when it is ask_choice or propose_direction and nothing earlier answered it. `several` is set
// when that message holds more than one unanswered call, which the server never leaves behind.
export function pendingTool(
  history: Message[],
): { use: Anthropic.ToolUseBlockParam; several: boolean } | null {
  const before = history.slice(0, -1);
  const lastAssistant = [...before].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return null;
  const answered = new Set(before.flatMap(toolResultsOf).map((r) => r.tool_use_id));
  const open = toolUsesOf(lastAssistant).filter((u) => !answered.has(u.id));
  const [first] = open;
  if (!first) return null;
  if (open.length > 1 || !isPausing(first.name)) return { use: first, several: true };
  return { use: first, several: false };
}

// The chip labels in a chip answer: a label-only answer from the page, or the server's rewrite
// ({ label, value } objects) earlier in the history. Values are ignored.
export function chosenLabels(answer: unknown): string[] | null {
  if (typeof answer !== "object" || answer === null) return null;
  const chosen = (answer as { chosen?: unknown }).chosen;
  if (!Array.isArray(chosen)) return null;
  const labels = chosen.map((c) =>
    typeof c === "string"
      ? c
      : typeof c === "object" && c !== null
        ? (c as { label?: unknown }).label
        : null,
  );
  return labels.every((l): l is string => typeof l === "string") ? labels : null;
}

export function chipValue(field: ChipField, label: string): { found: boolean; value: unknown } {
  const chips: readonly { label: string; value: unknown }[] = CHIPS[field];
  const chip = chips.find((c) => c.label === label);
  return chip ? { found: true, value: chip.value } : { found: false, value: undefined };
}

// The values of the latest tap per chip field, read by label through CHIPS. A typed answer, an
// error result or an unknown label is not a tap. Multi-select taps keep their order.
export function latestTaps(history: Message[]): Map<string, unknown> {
  const taps = new Map<string, unknown>();
  for (const { use, result } of toolCalls(history)) {
    if (use.name !== "ask_choice" || !result || result.is_error) continue;
    const field = (use.input as { field?: unknown } | null)?.field;
    if (typeof field !== "string" || !(field in CHIPS)) continue;
    const labels = chosenLabels(parseJson(result.content));
    if (!labels || labels.length === 0) continue;
    const values = labels.map((l) => chipValue(field as ChipField, l));
    if (values.some((v) => !v.found)) continue;
    const many = field === "needs";
    taps.set(field, many ? values.map((v) => v.value) : values[0]!.value);
  }
  return taps;
}

export function calledBefore(history: Message[], name: string): boolean {
  return toolCalls(history).some(
    ({ use, result }) => use.name === name && result && !result.is_error,
  );
}

// True when a propose_direction card was confirmed earlier in the history.
export function hasConfirmedDirection(history: Message[]): boolean {
  return toolCalls(history).some(({ use, result }) => {
    if (use.name !== "propose_direction" || !result || result.is_error) return false;
    const answer = parseJson(result.content);
    return (
      typeof answer === "object" &&
      answer !== null &&
      (answer as { confirmed?: unknown }).confirmed === true
    );
  });
}

// User turns, which the message cap counts (DQ4): typed messages, chip taps and confirms. The
// server's own rounds (check_contradictions results, is_error answers) are not turns.
export function userTurns(history: Message[]): number {
  const pausingIds = new Set(
    history
      .flatMap(toolUsesOf)
      .filter((u) => isPausing(u.name))
      .map((u) => u.id),
  );
  return history.filter(
    (m) =>
      m.role === "user" &&
      blocksOf(m).some(
        (b) =>
          b.type === "text" ||
          (b.type === "tool_result" && !b.is_error && pausingIds.has(b.tool_use_id)),
      ),
  ).length;
}
