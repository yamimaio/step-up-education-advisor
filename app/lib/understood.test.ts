import { describe, expect, it } from "vitest";
import { recommendCategory } from "@core/engine/direction";
import { toEngineDirection } from "@core/advisor/tools";
import { personaADirection } from "../../tests/fixtures/directions";
import { personaAProfile } from "../../tests/fixtures/profiles";
import { answered, ask, tap } from "../../tests/fixtures/pageHistory";
import { chatReducer, initialChatState, type ChatState } from "./chatState";
import { toolResultMessage, type ChatResponse, type MessageParam } from "./chatTypes";
import { directionLines } from "./labels";
import { NOT_YET, understood } from "./understood";

const none = { history: [] as MessageParam[], confirm: null, verdict: null, lastCard: null };
const lines = (s: Parameters<typeof understood>[0]) => understood(s).lines;
const cardLines = directionLines(personaADirection);

const respond = (state: ChatState, r: Partial<ChatResponse>): ChatState =>
  chatReducer(state, {
    type: "response",
    response: {
      replaceLastUserMessage: null,
      messages: [],
      text: "",
      chips: null,
      confirm: null,
      direction: null,
      programs: null,
      counter: null,
      notice: null,
      ...r,
    },
  });

// The page with persona A's card pending, as the reducer holds it.
function withCard(): ChatState {
  const proposal: MessageParam = {
    role: "assistant",
    content: [
      { type: "text", text: "Here's what I understood." },
      {
        type: "tool_use",
        id: "p1",
        name: "propose_direction",
        input: { direction: personaADirection },
      },
    ],
  };
  return respond(initialChatState, {
    messages: [proposal],
    confirm: { toolUseId: "p1", direction: personaADirection },
  });
}

describe("understood", () => {
  it("lists every Stage 1 field as Not yet before any answer", () => {
    expect(understood(none)).toEqual({
      lines: [
        { label: "Your goal", value: NOT_YET },
        { label: "What's missing", value: NOT_YET },
        { label: "Classmates", value: NOT_YET },
        { label: "Longest program", value: NOT_YET },
        { label: "Hours a week", value: NOT_YET },
        { label: "Keep working", value: NOT_YET },
        { label: "Degree", value: NOT_YET },
      ],
      note: null,
    });
  });

  it("fills a field from its chip labels, needs numbered in order", () => {
    const history = [
      ...answered("careerGoalKind", ["Step up to a bigger leadership role"]),
      ...answered("needs", ["A senior network", "Leadership skills", "Deep expertise in a field"]),
      ...answered("hoursPerWeek", ["5 to 10"]),
    ];
    const l = lines({ ...none, history });
    expect(l[0]).toEqual({ label: "Your goal", value: "Step up to a bigger leadership role" });
    expect(l[1]).toEqual({
      label: "What's missing",
      value: "1. A senior network, 2. Leadership skills, 3. Deep expertise in a field",
    });
    expect(l[4]).toEqual({ label: "Hours a week", value: "5 to 10" });
    expect(l[2]).toEqual({ label: "Classmates", value: NOT_YET });
  });

  it("reads the label of a chip the server rewrote to { label, value }", () => {
    const history = [
      ask("maxProgramMonths", "How long?", "t1"),
      tap("t1", [{ label: "Up to a year", value: 12 }]),
    ];
    expect(lines({ ...none, history })[3]).toEqual({
      label: "Longest program",
      value: "Up to a year",
    });
  });

  it("doesn't count a typed reply to chips, which the advisor asks again", () => {
    const typed = answered("careerGoalKind", [], "What's the difference between these two?");
    expect(lines({ ...none, history: typed })[0]!.value).toBe(NOT_YET);
    const history = [
      ask("maxProgramMonths", "How long?", "t1"),
      tap("t1", ["Up to 2 years"]),
      ask("maxProgramMonths", "How long?", "t2"),
      tap("t2", [], "Depends on the program"),
    ];
    // The typed reply leaves the last tap in place.
    expect(lines({ ...none, history })[3]!.value).toBe("Up to 2 years");
  });

  it("ignores the question text and a field outside Stage 1", () => {
    const history = answered("travelComfort", ["Fine"]);
    expect(lines({ ...none, history }).every((l) => l.value === NOT_YET)).toBe(true);
  });

  it("reads the card's lines while the card is pending, goal description included", () => {
    const state = withCard();
    expect(understood(state)).toEqual({ lines: cardLines, note: null });
    expect(lines(state)[0]!.value).toContain('"Move into an executive role"');
  });

  it("keeps the confirmed card's lines while Looks right is sending, and after it fails", () => {
    const sending = chatReducer(withCard(), {
      type: "send",
      message: toolResultMessage("p1", { confirmed: true }),
    });
    expect(sending.confirm).toBeNull();
    expect(understood(sending)).toEqual({ lines: cardLines, note: null });
    const failed = chatReducer(sending, { type: "failure", retry: true, message: "Try again." });
    expect(failed.verdict).toBeNull();
    expect(understood(failed)).toEqual({ lines: cardLines, note: null });
  });

  it("reads the confirmed card's lines at the verdict", () => {
    const verdict = {
      direction: personaADirection,
      result: recommendCategory(toEngineDirection(personaADirection), []),
    };
    expect(understood({ ...none, verdict })).toEqual({ lines: cardLines, note: null });
  });

  it("after Change something, keeps the card's lines with the correction as the note", () => {
    const corrections = "Actually 15 to 20, not 5 to 10";
    const sent = chatReducer(withCard(), {
      type: "send",
      message: toolResultMessage("p1", { confirmed: false, corrections }),
      correction: corrections,
    });
    expect(understood(sent)).toEqual({ lines: cardLines, note: corrections });

    // The advisor asks the field again; the new tap replaces the card's value.
    const asked = respond(sent, {
      messages: [ask("hoursPerWeek", "Hours a week you could give it", "h2")],
      chips: {
        toolUseId: "h2",
        field: "hoursPerWeek",
        question: "Hours a week you could give it",
        options: [],
        pick: 1,
      },
    });
    expect(lines(asked).find((l) => l.label === "Hours a week")!.value).toBe("5 to 10");
    const retapped = chatReducer(asked, { type: "send", message: tap("h2", ["15 to 20"]) });
    const view = understood(retapped);
    expect(view.note).toBe(corrections);
    expect(view.lines.find((l) => l.label === "Hours a week")!.value).toBe("15 to 20");
    expect(view.lines.find((l) => l.label === "How clear the goal is")!.value).toBe("Clear");

    // The next card replaces both.
    const next = respond(retapped, {
      confirm: { toolUseId: "p2", direction: personaADirection },
    });
    expect(understood(next).note).toBeNull();
  });

  it("keeps the confirmed card's lines in stage 2, whatever the search card does", () => {
    const verdict = {
      direction: personaADirection,
      result: recommendCategory(toEngineDirection(personaADirection), []),
    };
    const search = { toolUseId: "s1", profile: personaAProfile };
    expect(understood({ ...none, confirm: search, verdict })).toEqual({
      lines: cardLines,
      note: null,
    });
    const history = [
      {
        role: "assistant" as const,
        content: [{ type: "tool_use", id: "s1", name: "propose_search", input: {} }],
      },
      toolResultMessage("s1", { confirmed: false, corrections: "My budget is $30k" }),
    ];
    expect(understood({ ...none, history, verdict })).toEqual({ lines: cardLines, note: null });
  });

  it("keeps the stage 1 card as lastCard when a search card arrives", () => {
    const next = respond(withCard(), { confirm: { toolUseId: "s1", profile: personaAProfile } });
    expect(next.lastCard).toEqual(personaADirection);
  });
});
