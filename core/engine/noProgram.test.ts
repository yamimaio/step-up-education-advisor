import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import { fixtureDataset } from "../../tests/fixtures/dataset";
import { makeProfile } from "../../tests/fixtures/profiles";

const today = new Date("2026-10-08T00:00:00Z");
const run = (o: Parameters<typeof makeProfile>[0], programs = fixtureDataset()) =>
  evaluate(makeProfile(o), programs, today).noProgram;

describe("Each no-program trigger fires on its own example (S8-6)", () => {
  it("no type fits: a degree is required but the user allows only 3 months", () => {
    expect(run({ degreeRequired: "required", maxProgramMonths: 3 })).toEqual({
      triggered: true,
      trigger: "no_type_fits",
    });
  });

  it("nothing passes: $3,000, 2 hours a week and no on-site days", () => {
    expect(
      run({ tuitionBudgetUsd: 3000, hoursPerWeek: { min: 1, max: 2 }, maxOnsiteDays: 0 }),
    ).toEqual({ triggered: true, trigger: "nothing_passes" });
  });

  it("goal unclear", () => {
    expect(run({ goalClarity: "unclear" })).toEqual({ triggered: true, trigger: "goal_unclear" });
  });

  it("is not triggered for the worked example", () => {
    expect(run({})).toEqual({ triggered: false });
  });

  it("puts goal_unclear before nothing_passes, and counts an empty dataset as nothing_passes", () => {
    expect(run({ goalClarity: "unclear", tuitionBudgetUsd: 1 }).trigger).toBe("goal_unclear");
    expect(run({}, []).trigger).toBe("nothing_passes");
  });

  it("does not fire no_type_fits for a new city as the only need, because a degree MBA scores above 4", () => {
    const result = run({
      needs: ["new_industry_or_city", "senior_network", "graduate_degree"],
      maxProgramMonths: 36,
      maxOnsiteDays: 300,
      maxStretchDays: 300,
      hoursPerWeek: { min: 40, max: 60 },
      homeCity: "Boston",
    });
    expect(result.triggered).toBe(false);
  });
});
