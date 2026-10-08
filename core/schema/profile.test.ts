import { describe, expect, it } from "vitest";
import { personaAProfile } from "../../tests/fixtures/profiles";
import { PartialProfileSchema, ProfileSchema } from "./profile";

describe("ProfileSchema", () => {
  it("accepts persona A", () => {
    expect(ProfileSchema.safeParse(personaAProfile).success).toBe(true);
  });

  it.each([
    ["two needs", ["leadership_skills", "senior_network"]],
    ["four needs", ["leadership_skills", "senior_network", "deep_expertise", "graduate_degree"]],
    ["a repeated need", ["leadership_skills", "leadership_skills", "deep_expertise"]],
  ])("rejects %s", (_name, needs) => {
    expect(ProfileSchema.safeParse({ ...personaAProfile, needs }).success).toBe(false);
  });

  it("rejects three location values", () => {
    const locationValues = ["network_density", "industry_hub", "immersion"];
    expect(ProfileSchema.safeParse({ ...personaAProfile, locationValues }).success).toBe(false);
  });

  it("rejects an hours range with min above max", () => {
    const hoursPerWeek = { min: 10, max: 5 };
    expect(ProfileSchema.safeParse({ ...personaAProfile, hoursPerWeek }).success).toBe(false);
  });

  it("allows a null budget (no limit) and an optional tie-breaker", () => {
    const profile = { ...personaAProfile, tuitionBudgetUsd: null, tieBreaker: "emba" };
    expect(ProfileSchema.safeParse(profile).success).toBe(true);
  });
});

describe("PartialProfileSchema", () => {
  it("accepts an interview in progress, including fewer than three needs", () => {
    expect(PartialProfileSchema.safeParse({}).success).toBe(true);
    expect(PartialProfileSchema.safeParse({ needs: ["senior_network"] }).success).toBe(true);
  });

  it("still rejects bad values and a fourth need", () => {
    expect(PartialProfileSchema.safeParse({ travelComfort: "love" }).success).toBe(false);
    const needs = ["leadership_skills", "senior_network", "deep_expertise", "graduate_degree"];
    expect(PartialProfileSchema.safeParse({ needs }).success).toBe(false);
  });
});
