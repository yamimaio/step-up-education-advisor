import { describe, expect, it } from "vitest";
import { peerFit } from "./peerFit";

const you = (
  peerPreference: "more_senior" | "same_level" | "doesnt_matter",
  yearsExperience = 16,
) => ({
  peerPreference,
  yearsExperience,
});

describe("Peer fit", () => {
  it("costs a point and says why when the cohort is junior to a more_senior user (S8-7)", () => {
    const result = peerFit(you("more_senior"), { cohortMedianExperienceYears: 5 });
    expect(result.points).toBe(-1);
    expect(result.text).toBe("Most classmates have about 5 years of experience; you have 16.");
  });

  it("adds half a point when the cohort is at or above the user", () => {
    expect(peerFit(you("more_senior"), { cohortMedianExperienceYears: 16 }).points).toBe(0.5);
    expect(peerFit(you("more_senior"), { cohortMedianExperienceYears: 20 }).points).toBe(0.5);
  });

  it("penalises a gap over 5 years either way for same_level", () => {
    expect(peerFit(you("same_level"), { cohortMedianExperienceYears: 10 }).points).toBe(-1);
    expect(peerFit(you("same_level"), { cohortMedianExperienceYears: 22 }).points).toBe(-1);
    expect(peerFit(you("same_level"), { cohortMedianExperienceYears: 11 }).points).toBe(0);
  });

  it("scores 0 when it doesn't matter or the cohort isn't published", () => {
    expect(peerFit(you("doesnt_matter"), { cohortMedianExperienceYears: 1 }).points).toBe(0);
    expect(peerFit(you("more_senior"), { cohortMedianExperienceYears: null }).points).toBe(0);
  });
});

describe("A declined experience figure", () => {
  it("gives no points and no comparison", () => {
    const r = peerFit(
      { yearsExperience: null, peerPreference: "more_senior" },
      { cohortMedianExperienceYears: 14 },
    );
    expect(r.points).toBe(0);
    expect(r.text).toBe("Most classmates have about 14 years of experience.");
  });
});
