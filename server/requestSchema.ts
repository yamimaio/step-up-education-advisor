import { z } from "zod";
import { blocksOf, type Message } from "./history";
import { MAX_MESSAGES, MAX_TEXT_CHARS } from "./limits";

// The /api/chat request body (docs/chat-api.md, "Request"). The history is client-held, so the
// schema keeps it to what the page can legitimately send: user messages hold text and tool
// results only (no images, documents or cache markers); assistant messages hold the block types
// the server returned, passed through unchanged (thinking signatures are checked by the API).

// Server-written tool results (a verdict, check_contradictions tensions) are longer than any
// user text; this still bounds them.
const MAX_TOOL_RESULT_CHARS = 20_000;
const MAX_ASSISTANT_TEXT_CHARS = 100_000;

const UserText = z.strictObject({
  type: z.literal("text"),
  text: z.string().max(MAX_TEXT_CHARS),
});

const ToolResult = z.strictObject({
  type: z.literal("tool_result"),
  tool_use_id: z.string().min(1).max(200),
  content: z.string().max(MAX_TOOL_RESULT_CHARS),
  is_error: z.boolean().optional(),
});

const UserMessage = z.strictObject({
  role: z.literal("user"),
  content: z.union([
    z.string().max(MAX_TEXT_CHARS),
    z.array(z.discriminatedUnion("type", [UserText, ToolResult])).min(1),
  ]),
});

const AssistantBlock = z.looseObject({
  type: z.enum(["text", "thinking", "redacted_thinking", "tool_use"]),
});

const AssistantMessage = z.strictObject({
  role: z.literal("assistant"),
  content: z.union([z.string().max(MAX_ASSISTANT_TEXT_CHARS), z.array(AssistantBlock).min(1)]),
});

export const ChatRequestSchema = z.strictObject({
  messages: z
    .array(z.discriminatedUnion("role", [UserMessage, AssistantMessage]))
    .min(1)
    .max(MAX_MESSAGES)
    .refine((m) => m[0]?.role === "user", "the history starts with the user")
    .refine((m) => m.at(-1)?.role === "user", "the last message is the user's"),
});

export function parseChatRequest(body: unknown): Message[] | null {
  const parsed = ChatRequestSchema.safeParse(body);
  return parsed.success ? (parsed.data.messages as Message[]) : null;
}

// A typed message with nothing but whitespace: the nudge, without a model call.
export function isEmptyInput(last: Message): boolean {
  const blocks = blocksOf(last);
  return blocks.every((b) => b.type === "text" && !b.text.trim());
}
