import { describe, expect, it } from "vitest";
import { chatReducer, initialChatState, type ChatState } from "./chatState";
import { toolResultMessage, type ChatResponse, type MessageParam } from "./chatTypes";
import { STAGE_1_CHIP_FIELDS, STAGE_2_CHIP_FIELDS } from "@core/advisor/tools";
import { WRAP_UP_NOTE } from "@core/advisor/wrapUp";
import { answerLine, toTurns } from "./conversation";
import { buildTranscript } from "./transcript";

// The server's wrap-up note at turn 35 (docs/chat-api.md, "Message cap").
const note = { type: "text", text: WRAP_UP_NOTE };

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
        field: "maxProgramMonths",
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
      programs: null,
      counter: { remaining: 5 },
      notice: null,
    };
    const next = chatReducer(sent, { type: "response", response });
    expect(next.history[1]).toEqual(tapWithNote);
    const md = buildTranscript({
      history: next.history,
      verdict: null,
      results: null,
      fallbackText: null,
      date: new Date(),
    });
    expect(md).toContain("Up to a year");
    expect(md).not.toContain(WRAP_UP_NOTE);
  });

  it("still shows a user's own text that starts like the note", () => {
    const typed = "[Step Up note] I prefer evenings";
    const history: MessageParam[] = [{ role: "user", content: [{ type: "text", text: typed }] }];
    expect(toTurns(history)).toEqual([{ kind: "user", text: typed }]);
    const md = buildTranscript({
      history,
      verdict: null,
      results: null,
      fallbackText: null,
      date: new Date(),
    });
    expect(md).toContain(typed);
  });
});

describe("toTurns and turns the server rejected", () => {
  const rejected: MessageParam = {
    role: "assistant",
    content: [
      { type: "text", text: "Here's what I understood." },
      { type: "tool_use", id: "p1", name: "propose_direction", input: {} },
    ],
  };
  const refusal: MessageParam = {
    role: "user",
    content: [{ type: "tool_result", tool_use_id: "p1", content: "not tapped", is_error: true }],
  };
  const retry: MessageParam = {
    role: "assistant",
    content: [
      { type: "text", text: "Quick one first: how many hours a week?" },
      {
        type: "tool_use",
        id: "a2",
        name: "ask_choice",
        input: { field: "hoursPerWeek", question: "Hours a week" },
      },
    ],
  };

  it("hides the text of a turn whose tool call got is_error, and shows the next one", () => {
    const history = [{ role: "user" as const, content: "hi" }, rejected, refusal, retry];
    expect(toTurns(history)).toEqual([
      { kind: "user", text: "hi" },
      { kind: "assistant", text: "Quick one first: how many hours a week?" },
    ]);
    const md = buildTranscript({
      history,
      verdict: null,
      results: null,
      fallbackText: null,
      date: new Date(),
    });
    expect(md).not.toContain("Here's what I understood.");
  });

  it("still shows a turn whose tool call succeeded", () => {
    const ok: MessageParam = {
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "p1", content: '{"confirmed":true}' }],
    };
    expect(toTurns([{ role: "user", content: "hi" }, rejected, ok])[1]).toEqual({
      kind: "assistant",
      text: "Here's what I understood.",
    });
  });
});

describe("answerLine", () => {
  const chips = (field: string, chosen: string[]) => ({
    kind: "chips" as const,
    field,
    question: "Which one, would you say?",
    chosen,
  });

  it("labels a chip answer with the field's fixed label", () => {
    expect(answerLine(chips("maxProgramMonths", ["Up to a year"]))).toEqual({
      label: "Longest program",
      value: "Up to a year",
    });
    expect(answerLine(chips("careerGoalKind", ["Lead better in my current role"])).label).toBe(
      "Your goal",
    );
  });

  it("labels a stage 2 answer with the search card's field name, not the question", () => {
    expect(answerLine(chips("paymentPlan", ["Installments"])).label).toBe("How you'd pay");
    expect(answerLine(chips("travelComfort", ["Fine"])).label).toBe("Traveling for it");
    expect(answerLine(chips("degreeLevel", ["Master's"])).label).toBe("Highest degree");
  });

  it("labels every stage 1 and stage 2 chip field", () => {
    for (const field of [...STAGE_1_CHIP_FIELDS, ...STAGE_2_CHIP_FIELDS]) {
      expect(answerLine(chips(field, ["x"])).label).not.toBe("Which one, would you say");
    }
  });

  it("numbers the picks of a multi-pick in the order tapped", () => {
    expect(
      answerLine(chips("needs", ["A senior network", "Leadership skills", "Deep expertise"])),
    ).toEqual({
      label: "What's missing",
      value: "1. A senior network, 2. Leadership skills, 3. Deep expertise",
    });
    expect(answerLine(chips("locationValues", ["Immersion", "Network density"]))).toEqual({
      label: "A location should give you",
      value: "1. Immersion, 2. Network density",
    });
  });

  it("falls back to the asked question for a field with no label", () => {
    expect(answerLine(chips("somethingNew", ["Fine"])).label).toBe("Which one, would you say");
    expect(answerLine(chips("toString", ["Fine"])).label).toBe("Which one, would you say");
  });
});

describe("toTurns and the two cards", () => {
  const card = (id: string, name: string): MessageParam => ({
    role: "assistant",
    content: [{ type: "tool_use", id, name, input: {} }],
  });
  const answer = (id: string, body: unknown): MessageParam => ({
    role: "user",
    content: [{ type: "tool_result", tool_use_id: id, content: JSON.stringify(body) }],
  });

  it("tags each card's answer with its stage", () => {
    const history = [
      { role: "user" as const, content: "hi" },
      card("d1", "propose_direction"),
      answer("d1", { confirmed: true, result: {} }),
      card("s1", "propose_search"),
      answer("s1", { confirmed: false, corrections: "My budget is $30k" }),
      card("s2", "propose_search"),
      answer("s2", { confirmed: true, result: {} }),
    ];
    expect(toTurns(history).slice(1)).toEqual([
      { kind: "confirm", stage: 1, toolUseId: "d1", confirmed: true },
      {
        kind: "confirm",
        stage: 2,
        toolUseId: "s1",
        confirmed: false,
        corrections: "My budget is $30k",
      },
      { kind: "confirm", stage: 2, toolUseId: "s2", confirmed: true },
    ]);
  });
});
