import { describe, expect, it } from "vitest";
import { checkContradictions } from "./contradictions";
import { fixtureDataset } from "../../tests/fixtures/dataset";
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
