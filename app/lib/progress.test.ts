import { describe, expect, it } from "vitest";
import { recommendCategory } from "@core/engine/direction";
import { toEngineDirection } from "@core/advisor/tools";
import { personaADirection } from "../../tests/fixtures/directions";
import { personaAProfile } from "../../tests/fixtures/profiles";
import { answered, ask, tap } from "../../tests/fixtures/pageHistory";
import { toolResultMessage, type MessageParam } from "./chatTypes";
import { progressSteps, type StepState } from "./progress";

const none = { history: [] as MessageParam[], confirm: null, verdict: null };
const states = (s: Parameters<typeof progressSteps>[0]): StepState[] =>
  progressSteps(s).map((step) => step.state);
const card = { toolUseId: "p1", direction: personaADirection };
const verdict = {
  direction: personaADirection,
  result: recommendCategory(toEngineDirection(personaADirection), []),
};

describe("progressSteps", () => {
  it("names the four steps in order", () => {
    expect(progressSteps(none).map((s) => s.label)).toEqual([
      "Your goal",
      "Your needs",
      "Your situation",
      "Verdict",
    ]);
  });

  it("starts on the goal", () => {
    expect(states(none)).toEqual(["current", "todo", "todo", "todo"]);
  });

  it("is still on the goal while its chips are only asked", () => {
    expect(states({ ...none, history: [ask("careerGoalKind", "Which is closer?")] })).toEqual([
      "current",
      "todo",
      "todo",
      "todo",
    ]);
  });

  it("moves to needs once the goal chips are tapped", () => {
    const tapped = answered("careerGoalKind", ["Step up to a bigger leadership role"]);
    expect(states({ ...none, history: tapped })).toEqual(["done", "current", "todo", "todo"]);
  });

  it("doesn't count a typed reply to chips: the advisor asks the field again", () => {
    const typed = answered("careerGoalKind", [], "What's the difference between these two?");
    expect(states({ ...none, history: typed })).toEqual(["current", "todo", "todo", "todo"]);
    const askedAgain = [...typed, ask("careerGoalKind", "Which is closer?", "again")];
    expect(states({ ...none, history: askedAgain })).toEqual(["current", "todo", "todo", "todo"]);
    const thenTapped = [...askedAgain, tap("again", ["Lead better in my current role"])];
    expect(states({ ...none, history: thenTapped })).toEqual(["done", "current", "todo", "todo"]);
  });

  it("follows the advisor past a field the user declined in words", () => {
    // Needs declined by typing: the advisor moves on, so the situation is current and needs stay
    // unchecked.
    const history = [
      ...answered("careerGoalKind", ["Step up to a bigger leadership role"]),
      ...answered("needs", [], "I'd rather not rank them"),
      ask("peerPreference", "Who do you want as classmates?"),
    ];
    expect(states({ ...none, history })).toEqual(["done", "todo", "current", "todo"]);
  });

  it("ignores an ask the server refused and a field outside Stage 1", () => {
    const refused: MessageParam = {
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "bad", content: "no", is_error: true }],
    };
    const history = [
      ask("peerPreference", "Classmates?", "bad"),
      refused,
      ask("travelComfort", "?"),
    ];
    expect(states({ ...none, history })).toEqual(["current", "todo", "todo", "todo"]);
  });

  it("moves to the situation once needs are answered, and stays there until the card", () => {
    const history = [
      ...answered("careerGoalKind", ["Step up to a bigger leadership role"]),
      ...answered("needs", ["A senior network", "Leadership skills", "Deep expertise in a field"]),
      ...answered("peerPreference", ["More senior leaders"]),
      ...answered("maxProgramMonths", ["Up to a year"]),
    ];
    expect(states({ ...none, history })).toEqual(["done", "done", "current", "todo"]);
  });

  it("marks goal, needs and situation done once the card appears, even if a field was skipped", () => {
    const history = answered("needs", [
      "A senior network",
      "Leadership skills",
      "A graduate degree",
    ]);
    expect(states({ history, confirm: card, verdict: null })).toEqual([
      "done",
      "done",
      "done",
      "current",
    ]);
  });

  it("keeps the situation done after a correction takes the card away", () => {
    const history: MessageParam[] = [
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "p1", name: "propose_direction", input: {} }],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "p1",
            content: JSON.stringify({ confirmed: false, corrections: "Two years is fine" }),
          },
        ],
      },
    ];
    expect(states({ ...none, history })).toEqual(["done", "done", "done", "current"]);
  });

  it("doesn't count a card the server refused", () => {
    const history: MessageParam[] = [
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "p1", name: "propose_direction", input: {} }],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "p1", content: "no", is_error: true }],
      },
    ];
    expect(states({ ...none, history })).toEqual(["current", "todo", "todo", "todo"]);
  });

  it("marks every step done, none current, at the verdict", () => {
    expect(states({ history: [], confirm: null, verdict })).toEqual([
      "done",
      "done",
      "done",
      "done",
    ]);
  });

  it("stays all done in stage 2, with the search card pending or corrected", () => {
    const search = { toolUseId: "s1", profile: personaAProfile };
    expect(states({ history: [], confirm: search, verdict })).toEqual([
      "done",
      "done",
      "done",
      "done",
    ]);
    const corrected: MessageParam[] = [
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "s1", name: "propose_search", input: {} }],
      },
      toolResultMessage("s1", { confirmed: false, corrections: "My budget is $30k" }),
    ];
    expect(states({ history: corrected, confirm: null, verdict })).toEqual([
      "done",
      "done",
      "done",
      "done",
    ]);
  });

  it("doesn't take a search card for the stage 1 card", () => {
    const search = { toolUseId: "s1", profile: personaAProfile };
    expect(states({ history: [], confirm: search, verdict: null })).toEqual([
      "current",
      "todo",
      "todo",
      "todo",
    ]);
  });
});
