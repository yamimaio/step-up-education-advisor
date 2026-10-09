import { describe, expect, it } from "vitest";
import { recommendCategory } from "./direction";
import { fixtureDataset } from "../../tests/fixtures/dataset";
import {
  NO_HOME,
  NO_HOME_DECLINED,
  makeProfile,
  workedExampleProfile,
} from "../../tests/fixtures/profiles";
import type { DirectionProfile } from "../schema/profile";
import { DirectionProfileSchema } from "../schema/profile";

const programs = fixtureDataset();

// Only what stage 1 asks: no budget, travel or location anywhere.
const stageOne: DirectionProfile = {
  careerGoal: workedExampleProfile.careerGoal,
  goalClarity: "clear",
  needs: ["senior_network", "leadership_skills", "deep_expertise"],
  degreeRequired: "no",
  maxProgramMonths: 12,
  hoursPerWeek: { min: 5, max: 10 },
  keepWorking: true,
  declined: [],
};

describe("Stage 1 takes only the answers that decide the category", () => {
  it("reproduces the worked example from the stage-1 answers alone", () => {
    expect(DirectionProfileSchema.parse(stageOne)).toEqual(stageOne);
    const { category, noProgram } = recommendCategory(stageOne, programs);
    expect(category.scores).toEqual({
      executive: 28,
      emba: "out",
      mba: "out",
      specialized_masters: 8,
      certificate: 12,
      short_course: 12,
    });
    expect(category.winner).toBe("executive");
    expect(category.reasons.emba.join(" ")).toContain("program length");
    expect(noProgram).toEqual({ triggered: false });
  });

  it("gives the same verdict whatever the budget, travel or location", () => {
    const base = recommendCategory(workedExampleProfile, programs);
    const broke = makeProfile({
      tuitionBudgetUsd: 1,
      travelBudgetUsd: 0,
      maxOnsiteDays: 0,
      maxStretchDays: 0,
      relocate: false,
      ...NO_HOME,
      declined: NO_HOME_DECLINED,
    });
    expect(recommendCategory(broke, programs).category).toEqual(base.category);
  });

  it("has no budget, travel or location field to read", () => {
    // @ts-expect-error: stage 1 has no tuition budget.
    const budget: DirectionProfile["tuitionBudgetUsd"] = 0;
    // @ts-expect-error: stage 1 has no home location.
    const home: DirectionProfile["homeLat"] = 0;
    expect([budget, home]).toEqual([0, 0]);
    expect(Object.keys(DirectionProfileSchema.shape)).not.toContain("tuitionBudgetUsd");
  });

  it("rules a type out on length, hours or keeping a job", () => {
    const hours = recommendCategory({ ...stageOne, hoursPerWeek: { min: 1, max: 2 } }, programs);
    expect(hours.category.scores.executive).toBe("out");
    expect(hours.category.reasons.executive.join(" ")).toContain("hours a week");
    const fullTime = recommendCategory(
      { ...stageOne, maxProgramMonths: 36, hoursPerWeek: { min: 40, max: 60 } },
      programs,
    );
    expect(fullTime.category.reasons.mba.join(" ")).toContain("work compatibility");
  });

  it("returns stage 1's not-yet triggers only", () => {
    expect(recommendCategory({ ...stageOne, goalClarity: "unclear" }, programs).noProgram).toEqual({
      triggered: true,
      trigger: "goal_unclear",
    });
    const noType = { ...stageOne, degreeRequired: "required" as const, maxProgramMonths: 3 };
    expect(recommendCategory(noType, programs).noProgram).toEqual({
      triggered: true,
      trigger: "no_type_fits",
    });
  });

  it("lists only declined stage-1 fields as gaps, and applies the same defaults as stage 2", () => {
    const result = recommendCategory(
      { ...stageOne, maxProgramMonths: 1, declined: ["maxProgramMonths", "tuitionBudgetUsd"] },
      programs,
    );
    expect(result.profileGaps).toEqual(["maxProgramMonths"]);
    // A declined length is no limit, so the EMBA and the MBA are no longer out on it.
    expect(result.category.scores.emba).not.toBe("out");
  });

  it("is deterministic", () => {
    expect(recommendCategory(stageOne, programs)).toEqual(recommendCategory(stageOne, programs));
  });
});

describe("Declined needs give no verdict", () => {
  const declined = (needs: DirectionProfile["needs"]) =>
    recommendCategory({ ...stageOne, needs, declined: ["needs"] }, programs);

  it("has no winner or deciding needs, says 'not yet' and lists the gap", () => {
    const { category, noProgram, profileGaps } = declined([
      "senior_network",
      "leadership_skills",
      "deep_expertise",
    ]);
    expect(category).toMatchObject({ winner: null, runnerUp: null, decidingNeeds: [] });
    expect(category.tie).toBeUndefined();
    expect(category.reasons.executive.join(" ")).toMatch(/No ranked needs/);
    expect(noProgram).toEqual({ triggered: true, trigger: "goal_unclear" });
    expect(profileGaps).toEqual(["needs"]);
  });

  it("doesn't depend on the placeholder needs", () => {
    expect(declined(["graduate_degree", "deep_expertise", "new_industry_or_city"])).toEqual(
      declined(["senior_network", "leadership_skills", "deep_expertise"]),
    );
  });
});
