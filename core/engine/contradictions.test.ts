import { describe, expect, it } from "vitest";
import { checkContradictions } from "./contradictions";
import { fixture, fixtureDataset } from "../../tests/fixtures/dataset";
import { workedExampleProfile } from "../../tests/fixtures/profiles";
import type { PartialProfile } from "../schema/profile";

const programs = fixtureDataset();
const ids = (p: PartialProfile) => checkContradictions(p, programs).map((c) => c.id);

describe("The six contradiction rules (S8-8)", () => {
  it("R1: a senior network first, but fewer than 10 on-site days", () => {
    expect(ids({ needs: ["senior_network"], maxOnsiteDays: 5 })).toEqual(["R1"]);
  });

  it("R2: a degree is required, but no degree program fits the budget", () => {
    expect(ids({ degreeRequired: "required", tuitionBudgetUsd: 1000 })).toEqual(["R2"]);
    expect(ids({ degreeRequired: "required", tuitionBudgetUsd: 200000 })).toEqual([]);
    expect(ids({ degreeRequired: "required", tuitionBudgetUsd: null })).toEqual([]);
  });

  it("R3: a new city or industry, no relocating and no on-site days", () => {
    expect(ids({ needs: ["new_industry_or_city"], relocate: false, maxOnsiteDays: 0 })).toEqual([
      "R3",
    ]);
  });

  it("R4: deep expertise, but under 5 hours a week", () => {
    expect(
      ids({ needs: ["leadership_skills", "deep_expertise"], hoursPerWeek: { min: 1, max: 4 } }),
    ).toEqual(["R4"]);
  });

  it("R5: travel is a burden, but network or immersion is what they want", () => {
    expect(ids({ travelComfort: "burden", needs: ["senior_network"] })).toEqual(["R5"]);
    expect(ids({ travelComfort: "burden", locationValues: ["immersion"] })).toEqual(["R5"]);
  });

  it("R6: deep expertise first, but away for a week at most", () => {
    expect(ids({ needs: ["deep_expertise"], maxStretchDays: 7 })).toEqual(["R6"]);
  });

  it("is quiet on a clean profile and on an empty partial", () => {
    expect(ids(workedExampleProfile)).toEqual([]);
    expect(ids({})).toEqual([]);
  });

  it("marks a rule already in resolvedTensions as resolved", () => {
    const result = checkContradictions(
      {
        needs: ["senior_network"],
        maxOnsiteDays: 5,
        resolvedTensions: [{ rule: "R1", chosen: "x" }],
      },
      programs,
    );
    expect(result).toMatchObject([{ id: "R1", resolved: true }]);
    expect(result[0]?.text.length).toBeGreaterThan(0);
  });
});

describe("Declined fields never fire a rule", () => {
  it("ignores the placeholder a declined field carries", () => {
    expect(
      ids({ needs: ["senior_network"], maxOnsiteDays: 0, declined: ["maxOnsiteDays"] }),
    ).toEqual([]);
    expect(
      ids({ degreeRequired: "required", tuitionBudgetUsd: 5, declined: ["tuitionBudgetUsd"] }),
    ).toEqual([]);
  });

  it("still fires when a different field was declined", () => {
    expect(ids({ needs: ["senior_network"], maxOnsiteDays: 0, declined: ["homeCity"] })).toEqual([
      "R1",
    ]);
  });
});

describe("R4 fires at the lowest hours chip", () => {
  it("fires at 0 to 5 hours and not at 5 to 10", () => {
    const needs = ["deep_expertise" as const];
    expect(ids({ needs, hoursPerWeek: { min: 0, max: 5 } })).toEqual(["R4"]);
    expect(ids({ needs, hoursPerWeek: { min: 5, max: 10 } })).toEqual([]);
  });
});

describe("R2 needs a known degree price", () => {
  it("stays quiet on an empty dataset", () => {
    expect(
      checkContradictions({ degreeRequired: "required", tuitionBudgetUsd: 200000 }, []),
    ).toEqual([]);
  });

  it("ignores a degree program with no known price", () => {
    const unpriced = [fixture("fake-mba", { tuitionUsd: null })];
    expect(
      checkContradictions({ degreeRequired: "required", tuitionBudgetUsd: 200000 }, unpriced),
    ).toEqual([]);
    const both = [...unpriced, fixture("fake-emba")];
    expect(
      checkContradictions({ degreeRequired: "required", tuitionBudgetUsd: 100000 }, both).map(
        (c) => c.id,
      ),
    ).toEqual(["R2"]);
  });
});

describe("R2 counts a degree program priced per course", () => {
  // fake-specialized-masters: no total, 10 courses at $5,000, so about $50,000.
  const masters = [fixture("fake-specialized-masters")];

  it("does not fire when the per-course estimate is within the budget", () => {
    expect(
      checkContradictions({ degreeRequired: "required", tuitionBudgetUsd: 60000 }, masters),
    ).toEqual([]);
  });

  it("fires when the estimate is over the budget", () => {
    const found = checkContradictions(
      { degreeRequired: "required", tuitionBudgetUsd: 40000 },
      masters,
    );
    expect(found.map((c) => c.id)).toEqual(["R2"]);
  });
});
