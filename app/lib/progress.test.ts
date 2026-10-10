import { describe, expect, it } from "vitest";
import { recommendCategory } from "@core/engine/direction";
import { toEngineDirection } from "@core/advisor/tools";
import { personaADirection } from "../../tests/fixtures/directions";
import { answered, ask } from "../../tests/fixtures/pageHistory";
import type { MessageParam } from "./chatTypes";
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

  it("moves to needs once the goal is answered, tapped or typed", () => {
    const tapped = answered("careerGoalKind", ["Step up to a bigger leadership role"]);
    expect(states({ ...none, history: tapped })).toEqual(["done", "current", "todo", "todo"]);
    const typed = answered("careerGoalKind", [], "Something else entirely");
    expect(states({ ...none, history: typed })).toEqual(["done", "current", "todo", "todo"]);
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
});
