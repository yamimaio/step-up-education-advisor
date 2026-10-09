import { describe, expect, it } from "vitest";
import { SCENARIO_WEIGHTS } from "./constants";
import { evaluate } from "./evaluate";
import { scenarioScores } from "./scenarios";
import { fixture, fixtureDataset } from "../../tests/fixtures/dataset";
import { makeProfile } from "../../tests/fixtures/profiles";

const today = new Date("2026-10-08T00:00:00Z");

describe("Scenario weights", () => {
  it.each(Object.entries(SCENARIO_WEIGHTS))("the %s row sums to 1", (_name, row) => {
    expect(Object.values(row).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
});

describe("Scenario score is the weighted sum plus 0.5 for the winning category plus peer fit", () => {
  const program = {
    category: "executive" as const,
    ratings: { network: 4, depth: 3, practicality: 4, costValue: 3 },
  };

  it("matches a hand-computed network score", () => {
    // 4x0.40 + 3x0.10 + 4x0.15 + 3x0.10 + 4.5x0.25 = 3.925; +0.5 category; +0.5 peer
    const s = scenarioScores(program, 4.5, { points: 0.5, text: "" }, "executive");
    expect(s.network).toBeCloseTo(4.925, 10);
  });

  it("gives no bonus to another category or when there is no winner", () => {
    const peer = { points: 0, text: "" };
    expect(scenarioScores(program, 4.5, peer, "emba").network).toBeCloseTo(3.925, 10);
    expect(scenarioScores(program, 4.5, peer, null).network).toBeCloseTo(3.925, 10);
  });
});

describe("Shortlists: passes first, near misses only fill empty slots", () => {
  const profile = makeProfile({ tuitionBudgetUsd: 80000 });
  const strong = { network: 5, depth: 5, practicality: 5, costValue: 5 };
  const weak = { network: 1, depth: 1, practicality: 1, costValue: 1 };

  it("keeps a better-scoring near miss behind three passes, in a deterministic order", () => {
    const programs = [
      fixture("fake-executive", { id: "fake-p3", ratings: weak }),
      fixture("fake-executive", { id: "fake-p1", ratings: weak }),
      fixture("fake-executive", { id: "fake-p2", ratings: weak }),
      fixture("fake-executive", { id: "fake-near", tuitionUsd: 90000, ratings: strong }),
    ];
    const result = evaluate(profile, programs, today);
    expect(result.programs.find((p) => p.id === "fake-near")?.status).toBe("near_miss");
    expect(result.scenarios.network).toEqual(["fake-p1", "fake-p2", "fake-p3"]);
  });

  it("uses a near miss to fill an empty slot", () => {
    const programs = [
      fixture("fake-executive", { id: "fake-p1" }),
      fixture("fake-executive", { id: "fake-near", tuitionUsd: 90000 }),
    ];
    const result = evaluate(profile, programs, today);
    expect(result.scenarios.depth).toEqual(["fake-p1", "fake-near"]);
  });

  it("leaves out failures and programs of a ruled-out type", () => {
    const result = evaluate(makeProfile(), fixtureDataset(), today);
    expect(result.scenarios.network).not.toContain("fake-emba");
    expect(result.scenarios.network).not.toContain("fake-mba");
    expect(result.scenarios.network[0]).toBe("fake-executive");
  });

  it("leaves out a passing program whose type the degree rule ruled out", () => {
    const result = evaluate(makeProfile({ degreeRequired: "required" }), fixtureDataset(), today);
    expect(result.scenarios.network).not.toContain("fake-executive");
  });
});

describe("Scenario ordering is stable", () => {
  it("breaks ties by code unit, not by locale", () => {
    const programs = [
      fixture("fake-executive", { id: "fake-h" }),
      fixture("fake-executive", { id: "fake-ch" }),
    ];
    const result = evaluate(makeProfile(), programs, today);
    expect(result.scenarios.network).toEqual(["fake-ch", "fake-h"]);
  });

  it("rounds float noise so equal scores still tie on id", () => {
    const a = { network: 2, depth: 2, practicality: 4, costValue: 4 };
    const b = { network: 2, depth: 4, practicality: 4, costValue: 2 };
    const peer = { points: 0, text: "" };
    const sa = scenarioScores({ category: "executive", ratings: a }, 3, peer, null);
    const sb = scenarioScores({ category: "executive", ratings: b }, 3, peer, null);
    expect(sa.network).toBe(sb.network);
  });
});
