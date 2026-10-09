import { describe, expect, it } from "vitest";
import { peerFit } from "./peerFit";

describe("Peer fit is a card line, not a score", () => {
  it("compares the cohort with the user (S8-7)", () => {
    const result = peerFit({ yearsExperience: 16 }, { cohortMedianExperienceYears: 5 });
    expect(result).toEqual({
      text: "Most classmates have about 5 years of experience; you have 16.",
    });
  });

  it("says when the cohort isn't published", () => {
    expect(peerFit({ yearsExperience: 16 }, { cohortMedianExperienceYears: null }).text).toBe(
      "The school doesn't publish its classmates' experience.",
    );
  });
});

describe("A declined experience figure", () => {
  it("gives no comparison", () => {
    const r = peerFit({ yearsExperience: null }, { cohortMedianExperienceYears: 14 });
    expect(r.text).toBe("Most classmates have about 14 years of experience.");
  });
});
