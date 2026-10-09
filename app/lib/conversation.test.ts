import { describe, expect, it } from "vitest";
import { chatReducer, initialChatState, type ChatState } from "./chatState";
import { toolResultMessage, type ChatResponse, type MessageParam } from "./chatTypes";
import { WRAP_UP_PREFIX, toTurns } from "./conversation";
import { buildTranscript } from "./transcript";

// The server's wrap-up note at turn 35 (docs/chat-api.md, "Message cap").
const note = {
  type: "text",
  text: `${WRAP_UP_PREFIX} The conversation is close to its message limit. Wrap up.`,
};

const ask: MessageParam = {
  role: "assistant",
  content: [
    { type: "text", text: "How long?" },
    {
      type: "tool_use",
      id: "t1",
      name: "ask_choice",
      input: { field: "maxProgramMonths", question: "The longest program you'd take on now" },
    },
  ],
};

const tapWithNote: MessageParam = {
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: "t1",
      content: JSON.stringify({ chosen: [{ label: "Up to a year", value: 12 }] }),
    },
    note,
  ],
};

describe("toTurns and the wrap-up note", () => {
  it("shows only the chip turn of a tool result carrying the note", () => {
    expect(toTurns([ask, tapWithNote]).slice(1)).toEqual([
      {
        kind: "chips",
        question: "The longest program you'd take on now",
        chosen: ["Up to a year"],
      },
    ]);
  });

  it("shows only the typed text of a message carrying the note", () => {
    const typed: MessageParam = {
      role: "user",
      content: [{ type: "text", text: "A year at most" }, note],
    };
    expect(toTurns([typed])).toEqual([{ kind: "user", text: "A year at most" }]);
  });

  it("keeps the note in the history after the rewrite, but not in the transcript", () => {
    const waiting: ChatState = { ...initialChatState, history: [ask] };
    const sent = chatReducer(waiting, {
      type: "send",
      message: toolResultMessage("t1", { chosen: ["Up to a year"] }),
    });
    const response: ChatResponse = {
      replaceLastUserMessage: tapWithNote,
      messages: [{ role: "assistant", content: "Thanks." }],
      text: "Thanks.",
      chips: null,
      confirm: null,
      direction: null,
      counter: { remaining: 5 },
      notice: null,
    };
    const next = chatReducer(sent, { type: "response", response });
    expect(next.history[1]).toEqual(tapWithNote);
    const md = buildTranscript({
      history: next.history,
      verdict: null,
      fallbackText: null,
      date: new Date(),
    });
    expect(md).toContain("Up to a year");
    expect(md).not.toContain(WRAP_UP_PREFIX);
  });
});
