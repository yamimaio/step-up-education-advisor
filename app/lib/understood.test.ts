import { describe, expect, it } from "vitest";
import { recommendCategory } from "@core/engine/direction";
import { toEngineDirection } from "@core/advisor/tools";
import { personaADirection } from "../../tests/fixtures/directions";
import { answered, ask, tap } from "../../tests/fixtures/pageHistory";
import type { MessageParam } from "./chatTypes";
import { directionLines } from "./labels";
import { NOT_YET, understoodLines } from "./understood";

const none = { history: [] as MessageParam[], confirm: null, verdict: null };

describe("understoodLines", () => {
  it("lists every Stage 1 field as Not yet before any answer", () => {
    expect(understoodLines(none)).toEqual([
      { label: "Your goal", value: NOT_YET },
      { label: "What's missing", value: NOT_YET },
      { label: "Classmates", value: NOT_YET },
      { label: "Longest program", value: NOT_YET },
      { label: "Hours a week", value: NOT_YET },
      { label: "Keep working", value: NOT_YET },
      { label: "Degree", value: NOT_YET },
    ]);
  });

  it("fills a field from its chip labels, needs numbered in order", () => {
    const history = [
      ...answered("careerGoalKind", ["Step up to a bigger leadership role"]),
      ...answered("needs", ["A senior network", "Leadership skills", "Deep expertise in a field"]),
      ...answered("hoursPerWeek", ["5 to 10"]),
    ];
    const lines = understoodLines({ ...none, history });
    expect(lines[0]).toEqual({ label: "Your goal", value: "Step up to a bigger leadership role" });
    expect(lines[1]).toEqual({
      label: "What's missing",
      value: "1. A senior network, 2. Leadership skills, 3. Deep expertise in a field",
    });
    expect(lines[4]).toEqual({ label: "Hours a week", value: "5 to 10" });
    expect(lines[2]).toEqual({ label: "Classmates", value: NOT_YET });
  });

  it("reads the label of a chip the server rewrote to { label, value }", () => {
    const history = [
      ask("maxProgramMonths", "How long?", "t1"),
      tap("t1", [{ label: "Up to a year", value: 12 }]),
    ];
    expect(understoodLines({ ...none, history })[3]).toEqual({
      label: "Longest program",
      value: "Up to a year",
    });
  });

  it("shows the latest answer when a field is asked again, typed words included", () => {
    const history = [
      ask("maxProgramMonths", "How long?", "t1"),
      tap("t1", [], "Depends on the program"),
      ask("maxProgramMonths", "How long?", "t2"),
      tap("t2", ["Up to 2 years"]),
    ];
    expect(understoodLines({ ...none, history })[3]!.value).toBe("Up to 2 years");
    const typedLast = history.slice(0, 2);
    expect(understoodLines({ ...none, history: typedLast })[3]!.value).toBe(
      "Depends on the program",
    );
  });

  it("ignores the question text and a field outside Stage 1", () => {
    const history = answered("travelComfort", ["Fine"]);
    const values = understoodLines({ ...none, history }).map((l) => l.value);
    expect(values.every((v) => v === NOT_YET)).toBe(true);
  });

  it("reads the card's lines while the card is pending, goal description included", () => {
    const history = answered("maxProgramMonths", ["Up to 6 months"]);
    const lines = understoodLines({
      history,
      confirm: { toolUseId: "p1", direction: personaADirection },
      verdict: null,
    });
    expect(lines).toEqual(directionLines(personaADirection));
    expect(lines[0]!.value).toContain('"Move into an executive role"');
  });

  it("reads the confirmed card's lines at the verdict", () => {
    const verdict = {
      direction: personaADirection,
      result: recommendCategory(toEngineDirection(personaADirection), []),
    };
    expect(understoodLines({ ...none, verdict })).toEqual(directionLines(personaADirection));
  });
});
