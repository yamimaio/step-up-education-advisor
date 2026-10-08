import { describe, expect, it } from "vitest";
import { applyDeclinedDefaults } from "./normalize";
import { makeProfile } from "../../tests/fixtures/profiles";

describe("Declined fields get neutral defaults and appear in profileGaps", () => {
  it("turns a declined tuition budget into no limit and lists the gap", () => {
    const { profile, profileGaps } = applyDeclinedDefaults(
      makeProfile({ tuitionBudgetUsd: 5, declined: ["tuitionBudgetUsd"] }),
    );
    expect(profile.tuitionBudgetUsd).toBeNull();
    expect(profileGaps).toContain("tuitionBudgetUsd");
  });

  it("defaults the other declined fields", () => {
    const { profile } = applyDeclinedDefaults(
      makeProfile({
        peerPreference: "same_level",
        travelComfort: "burden",
        airfareRange: "over_1500",
        degreeRequired: "required",
        homeCity: "Boston",
        declined: [
          "peerPreference",
          "travelComfort",
          "airfareRange",
          "degreeRequired",
          "homeCity",
          "maxOnsiteDays",
          "hoursPerWeek",
        ],
      }),
    );
    expect(profile).toMatchObject({
      peerPreference: "doesnt_matter",
      travelComfort: "fine",
      airfareRange: "unknown",
      degreeRequired: null,
      homeCity: null,
      maxOnsiteDays: null,
      hoursPerWeek: null,
    });
  });

  it("lists an unknown airfare range as a gap even when it was answered", () => {
    expect(applyDeclinedDefaults(makeProfile({ airfareRange: "unknown" })).profileGaps).toEqual([
      "airfareRange",
    ]);
    expect(applyDeclinedDefaults(makeProfile({ airfareRange: "500_1000" })).profileGaps).toEqual(
      [],
    );
  });
});
