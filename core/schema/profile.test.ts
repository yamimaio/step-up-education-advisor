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

  it("accepts nested objects set piecemeal", () => {
    expect(PartialProfileSchema.safeParse({ degree: { level: "master" } }).success).toBe(true);
    expect(PartialProfileSchema.safeParse({ careerGoal: { kind: "step_up" } }).success).toBe(true);
    expect(PartialProfileSchema.safeParse({ resolvedTensions: [{ rule: "R1" }] }).success).toBe(
      true,
    );
    expect(PartialProfileSchema.safeParse({ degree: { level: "phd" } }).success).toBe(false);
  });

  it("still rejects bad values and a fourth need", () => {
    expect(PartialProfileSchema.safeParse({ travelComfort: "love" }).success).toBe(false);
    const needs = ["leadership_skills", "senior_network", "deep_expertise", "graduate_degree"];
    expect(PartialProfileSchema.safeParse({ needs }).success).toBe(false);
  });
});

describe("home location", () => {
  const home = {
    homeCity: "Boston",
    homeRegion: "MA",
    homeCountry: "US",
    homeLat: 42.3601,
    homeLon: -71.0589,
  };

  it("accepts city, region and country, and a null region", () => {
    expect(ProfileSchema.safeParse({ ...personaAProfile, ...home }).success).toBe(true);
    expect(ProfileSchema.safeParse({ ...personaAProfile, homeRegion: null }).success).toBe(true);
  });

  it.each([
    ["an empty city", { homeCity: "" }],
    ["a lowercase country", { homeCountry: "us" }],
    ["a three-letter country", { homeCountry: "USA" }],
    ["a city of only spaces", { homeCity: "   " }],
    ["a region of only spaces", { homeRegion: " " }],
    ["an empty region", { homeRegion: "" }],
    ["a missing region", { homeRegion: undefined }],
    ["a missing country", { homeCountry: undefined }],
    ["a latitude above 90", { homeLat: 91 }],
    ["a longitude below -180", { homeLon: -181 }],
    ["a missing latitude", { homeLat: undefined }],
    ["a missing longitude", { homeLon: undefined }],
    ["a text latitude", { homeLat: "42.36" }],
    ["a null latitude that was not declined", { homeLat: null }],
  ])("rejects %s", (_name, override) => {
    expect(ProfileSchema.safeParse({ ...personaAProfile, ...home, ...override }).success).toBe(
      false,
    );
  });

  it("accepts declined city, region and country with placeholders", () => {
    const profile = {
      ...personaAProfile,
      homeCity: "",
      homeRegion: null,
      homeCountry: "",
      homeLat: null,
      homeLon: null,
      declined: ["homeCity", "homeRegion", "homeCountry", "homeLat", "homeLon"],
    };
    expect(ProfileSchema.safeParse(profile).success).toBe(true);
    expect(ProfileSchema.safeParse({ ...profile, declined: [] }).success).toBe(false);
  });

  it("requires the exact placeholder when declined, and declined when a placeholder", () => {
    const base = { ...personaAProfile, ...home };
    const bad = [
      { homeCountry: "United States", declined: ["homeCountry"] },
      { homeRegion: "MA", declined: ["homeRegion"] },
      { homeCity: "", declined: [] },
      { homeLat: 0, declined: ["homeLat"] },
    ];
    for (const b of bad) expect(ProfileSchema.safeParse({ ...base, ...b }).success).toBe(false);
  });

  it("applies the declined placeholder rules to the partial profile too", () => {
    expect(
      PartialProfileSchema.safeParse({ homeCountry: "", declined: ["homeCountry"] }).success,
    ).toBe(true);
    expect(PartialProfileSchema.safeParse({ homeCountry: "" }).success).toBe(false);
    expect(
      PartialProfileSchema.safeParse({ homeCountry: "US", declined: ["homeCountry"] }).success,
    ).toBe(false);
  });

  it("trims the city", () => {
    const r = ProfileSchema.parse({ ...personaAProfile, homeCity: "Boston " });
    expect(r.homeCity).toBe("Boston");
  });

  it("accepts the partial profile with any of the three, and declined naming them", () => {
    expect(PartialProfileSchema.safeParse({}).success).toBe(true);
    expect(PartialProfileSchema.safeParse({ homeCity: "Boston" }).success).toBe(true);
    expect(PartialProfileSchema.safeParse({ homeLat: 42.36, homeLon: -71.06 }).success).toBe(true);
    expect(PartialProfileSchema.safeParse({ homeLat: 95 }).success).toBe(false);
    expect(
      PartialProfileSchema.safeParse({ ...home, homeRegion: null, declined: ["homeRegion"] })
        .success,
    ).toBe(true);
    expect(PartialProfileSchema.safeParse({ homeCountry: "usa" }).success).toBe(false);
  });
});
