import type { Direction } from "@core/advisor/tools";
import type { DirectionResult } from "@core/engine/types";

// The /api/chat contract, Stage 1 (docs/chat-api.md). The page can't import the Anthropic SDK
// or server/, so messages are typed loosely here: the page passes every block back unchanged
// (thinking blocks included) and only reads the text, tool_use and tool_result blocks.

export type Block = { type: string; [key: string]: unknown };

export type MessageParam = {
  role: "user" | "assistant";
  content: string | Block[];
};

export type ChatRequest = { messages: MessageParam[] };

// Chip labels only; the server resolves the values through CHIPS[field].
export type ChipAnswer = { chosen: string[]; typed?: string };

export type ConfirmAnswer = { confirmed: true } | { confirmed: false; corrections: string };

export type PendingChips = {
  toolUseId: string;
  field: string;
  question: string;
  options: { label: string; value: unknown }[];
  pick: number;
};

export type PendingConfirm = { toolUseId: string; direction: Direction };

export type NoticeKind = "retryable" | "auth_or_credit" | "refusal" | "unknown" | "empty_input";

export type Notice = { kind: NoticeKind; message: string };

export type ChatResponse = {
  replaceLastUserMessage: MessageParam | null;
  messages: MessageParam[];
  text: string;
  chips: PendingChips | null;
  confirm: PendingConfirm | null;
  direction: DirectionResult | null;
  counter: { remaining: number } | null;
  notice: Notice | null;
};

export function textMessage(text: string): MessageParam {
  return { role: "user", content: [{ type: "text", text }] };
}

export function toolResultMessage(
  toolUseId: string,
  answer: ChipAnswer | ConfirmAnswer,
): MessageParam {
  return {
    role: "user",
    content: [{ type: "tool_result", tool_use_id: toolUseId, content: JSON.stringify(answer) }],
  };
}

export function blocksOf(message: MessageParam): Block[] {
  return typeof message.content === "string"
    ? [{ type: "text", text: message.content }]
    : message.content;
}
