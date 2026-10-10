import { describe, expect, it } from "vitest";
import { toEngineDirection, type Direction } from "@core/advisor/tools";
import { recommendCategory } from "@core/engine/direction";
import { personaADirection } from "../../tests/fixtures/directions";
import { verdictView } from "./verdict";

const viewFor = (direction: Direction) =>
  verdictView({ direction, result: recommendCategory(toEngineDirection(direction), []) });

describe("verdictView rows", () => {
  it("lists the winner first when the user broke a tie with the type listed before it", () => {
    // Degree declined: no adjustment, so the EMBA and the executive program both score 28, and
    // the EMBA comes first in matrix order.
    const declined: Direction = {
      ...personaADirection,
      degreeRequired: null,
      declined: ["degreeRequired"],
    };
    const tied = recommendCategory(toEngineDirection(declined), []).category;
    expect(tied.tie).toEqual(["emba", "executive"]);
    expect(tied.scores.emba).toBe(tied.scores.executive);

    const v = viewFor({ ...declined, tieBreaker: "executive" });
    expect(v.winner).toBe("Executive program");
    expect(v.runnerUp).toBe("Executive MBA");
    expect(v.rows.slice(0, 2).map((r) => r.category)).toEqual(["executive", "emba"]);
  });

  it("puts the rest best fit first and ruled-out types last", () => {
    const v = viewFor({ ...personaADirection, degreeRequired: "required" });
    const outs = v.rows.map((r) => r.out);
    expect(outs.indexOf(true)).toBeGreaterThan(outs.lastIndexOf(false));
    const result = recommendCategory(
      toEngineDirection({ ...personaADirection, degreeRequired: "required" }),
      [],
    ).category;
    const scores = v.rows.filter((r) => !r.out).map((r) => result.scores[r.category] as number);
    expect(v.rows[0]?.category).toBe(result.winner);
    expect(scores.slice(2)).toEqual([...scores.slice(2)].sort((a, b) => b - a));
  });

  it("has no deciding needs for persona A, where the needs don't separate the top two", () => {
    expect(viewFor(personaADirection).decidingNeeds).toEqual([]);
  });
});
