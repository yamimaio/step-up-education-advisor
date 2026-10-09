import { describe, expect, it } from "vitest";
import { applyDeclinedDefaults } from "./normalize";
import {
  CAMBRIDGE_MA,
  NO_HOME,
  NO_HOME_DECLINED,
  makeProfile,
} from "../../tests/fixtures/profiles";

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

describe("A declined home location", () => {
  it("leaves no coordinates and no city for the engine to use", () => {
    const { profile, profileGaps } = applyDeclinedDefaults(
      makeProfile({ ...NO_HOME, declined: NO_HOME_DECLINED }),
    );
    expect(profile).toMatchObject({ homeCity: null, homeLat: null, homeLon: null });
    expect(profileGaps).toEqual([...NO_HOME_DECLINED, "airfareRange"]);
  });

  it("keeps the coordinates when only the city is declined, and drops both when one is", () => {
    const city = applyDeclinedDefaults(makeProfile({ ...CAMBRIDGE_MA, declined: ["homeCity"] }));
    expect(city.profile).toMatchObject({ homeCity: null, homeLat: 42.3736, homeLon: -71.1097 });
    const lon = applyDeclinedDefaults(makeProfile({ ...CAMBRIDGE_MA, declined: ["homeLon"] }));
    expect(lon.profile).toMatchObject({ homeLat: null, homeLon: null });
  });

  it("passes the user's coordinates through untouched when nothing is declined", () => {
    const { profile } = applyDeclinedDefaults(makeProfile(CAMBRIDGE_MA));
    expect(profile).toMatchObject({ homeCity: "Cambridge", homeLat: 42.3736, homeLon: -71.1097 });
  });
});

describe("A declined goal clarity or location values", () => {
  it("is neutral: a clear goal, and no location values", () => {
    const { profile } = applyDeclinedDefaults(
      makeProfile({
        goalClarity: "unclear",
        locationValues: ["immersion", "network_density"],
        declined: ["goalClarity", "locationValues"],
      }),
    );
    expect(profile).toMatchObject({ goalClarity: "clear", locationValues: [] });
  });

  it("keeps the answers when they were given", () => {
    const { profile } = applyDeclinedDefaults(
      makeProfile({ goalClarity: "unclear", locationValues: ["immersion"] }),
    );
    expect(profile).toMatchObject({ goalClarity: "unclear", locationValues: ["immersion"] });
  });
});

describe("Declined fields outside the limits", () => {
  it("neutralises keepWorking, relocate and yearsExperience", () => {
    const { profile } = applyDeclinedDefaults(
      makeProfile({
        keepWorking: true,
        relocate: false,
        yearsExperience: 0,
        declined: ["keepWorking", "relocate", "yearsExperience"],
      }),
    );
    expect(profile).toMatchObject({ keepWorking: false, relocate: null, yearsExperience: null });
  });

  it("lists each gap once and ignores names that are not profile fields", () => {
    const { profileGaps } = applyDeclinedDefaults(
      makeProfile({ declined: ["homeCity", "homeCity", "tuitionBudget"] }),
    );
    expect(profileGaps).toEqual(["homeCity", "airfareRange"]);
  });
});

describe("A declined career goal", () => {
  it("is the neutral 'step up', so grow-in-role adds no bonus", () => {
    const { profile } = applyDeclinedDefaults(
      makeProfile({
        careerGoal: { kind: "grow_in_role", description: "placeholder" },
        declined: ["careerGoal"],
      }),
    );
    expect(profile.careerGoal.kind).toBe("step_up");
    const kept = applyDeclinedDefaults(
      makeProfile({ careerGoal: { kind: "grow_in_role", description: "Lead better" } }),
    ).profile;
    expect(kept.careerGoal.kind).toBe("grow_in_role");
  });
});
