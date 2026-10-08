import { describe, expect, it } from "vitest";
import { applyDeclinedDefaults } from "./normalize";
import {
  checkConstraints,
  checkHours,
  checkLength,
  checkLocation,
  checkOnsiteDays,
  checkTravelBudget,
  checkTuition,
  checkWorkCompatible,
  overshoot,
} from "./constraints";
import { travelEstimate } from "./travel";
import { fixture } from "../../tests/fixtures/dataset";
import { makeProfile } from "../../tests/fixtures/profiles";
import type { Profile } from "../schema/profile";

const eff = (o: Partial<Profile> = {}) => applyDeclinedDefaults(makeProfile(o)).profile;

describe("Near miss is 15% or less over the limit", () => {
  it("names a 14% near miss and fails 16% (S8-4)", () => {
    const profile = eff({ tuitionBudgetUsd: 100000 });
    const near = checkTuition(fixture("fake-executive", { tuitionUsd: 114000 }), profile);
    expect(near).toMatchObject({
      id: "tuition",
      status: "near_miss",
      value: 114000,
      limit: 100000,
    });
    expect(checkTuition(fixture("fake-executive", { tuitionUsd: 116000 }), profile).status).toBe(
      "fail",
    );
  });

  it("treats exactly 15% as a near miss and 15.01% as a fail", () => {
    expect(overshoot(115000, 100000)).toBe("near_miss");
    expect(overshoot(115010, 100000)).toBe("fail");
    expect(overshoot(100000, 100000)).toBe("pass");
  });

  it("has no near miss when the limit is 0 (DQ10)", () => {
    expect(overshoot(1, 0)).toBe("fail");
    expect(overshoot(0, 0)).toBe("pass");
    const profile = eff({ maxOnsiteDays: 0 });
    expect(
      checkOnsiteDays(fixture("fake-executive", { onsiteDaysPerYear: 1 }), profile).status,
    ).toBe("fail");
  });
});

describe("Unknown values follow the unknown-value rule (S8-5)", () => {
  const unpublished = fixture("fake-executive", { tuitionUsd: null });

  it("is a near miss shown as not published when a budget is set", () => {
    expect(checkTuition(unpublished, eff({ tuitionBudgetUsd: 80000 }))).toMatchObject({
      status: "near_miss",
      unknown: true,
      note: "not published",
    });
  });

  it("passes, still not published, when no limit is set", () => {
    expect(checkTuition(unpublished, eff({ declined: ["tuitionBudgetUsd"] }))).toMatchObject({
      status: "pass",
      unknown: true,
    });
  });

  it("puts an estimate from per-course tuition in the note, never deciding the result", () => {
    const check = checkTuition(fixture("fake-specialized-masters"), eff({ tuitionBudgetUsd: 1 }));
    expect(check.status).toBe("near_miss");
    expect(check.note).toBe("not published; about $50,000 at 10 courses (estimate)");
  });
});

describe("Length is checked against the fastest published pace", () => {
  it("fails 24 months against 12", () => {
    expect(checkLength(fixture("fake-emba"), eff()).status).toBe("fail");
  });

  it("falls back to the slowest pace, then to unknown", () => {
    const slow = fixture("fake-executive", { durationMonths: null, durationMaxMonths: 18 });
    expect(checkLength(slow, eff()).value).toBe(18);
    const none = fixture("fake-executive", { durationMonths: null, durationMaxMonths: null });
    expect(checkLength(none, eff())).toMatchObject({ status: "near_miss", unknown: true });
  });
});

describe("Hours are looser than other limits", () => {
  const program = (min: number, max = min) =>
    fixture("fake-executive", { hoursPerWeek: { min, max } });
  const user = eff({ hoursPerWeek: { min: 5, max: 10 } });

  it("passes when the ranges overlap", () => {
    expect(checkHours(program(8, 12), user)).toMatchObject({ status: "pass" });
  });

  it("passes 12 against 5 to 10 with a note", () => {
    const check = checkHours(program(12), user);
    expect(check.status).toBe("pass");
    expect(check.note).toBe("about 2 hours a week more than you planned");
  });

  it("makes 15 against 10 a near miss and 16 a fail", () => {
    const ten = eff({ hoursPerWeek: { min: 10, max: 10 } });
    expect(checkHours(program(15), ten).status).toBe("near_miss");
    expect(checkHours(program(16), ten).status).toBe("fail");
  });

  it("is unknown when the school doesn't publish hours", () => {
    const none = fixture("fake-executive", { hoursPerWeek: null });
    expect(checkHours(none, user)).toMatchObject({ status: "near_miss", unknown: true });
  });
});

describe("Travel cost is checked against the travel budget when one is set", () => {
  const program = fixture("fake-executive");
  const profile = (travelBudgetUsd: number | null, o: Partial<Profile> = {}) =>
    eff({ homeCity: "Buenos Aires", airfareRange: "1000_1500", travelBudgetUsd, ...o });

  it("passes, near-misses and fails around 9,225", () => {
    const status = (budget: number) => {
      const p = profile(budget);
      return checkTravelBudget(travelEstimate(program, p), p).status;
    };
    expect(status(10000)).toBe("pass");
    expect(status(9000)).toBe("near_miss");
    expect(status(7000)).toBe("fail");
  });

  it("passes with no budget", () => {
    const p = profile(null);
    expect(checkTravelBudget(travelEstimate(program, p), p).status).toBe("pass");
  });

  it("follows the unknown-value rule when the estimate is unknown", () => {
    const noLodging = fixture("fake-executive", { lodgingPerNightUsd: null });
    const p = profile(10000);
    expect(checkTravelBudget(travelEstimate(noLodging, p), p)).toMatchObject({
      status: "near_miss",
      unknown: true,
    });
  });
});

describe("On-site days with an unknown figure", () => {
  it("is a near miss while the user's limit is always set", () => {
    const none = fixture("fake-executive", { onsiteDaysPerYear: null });
    expect(checkOnsiteDays(none, eff())).toMatchObject({ status: "near_miss", unknown: true });
  });
});

describe("Work-compatible when the user keeps working", () => {
  it("passes and fails, never a near miss", () => {
    const fullTime = fixture("fake-mba");
    expect(checkWorkCompatible(fullTime, eff({ keepWorking: true })).status).toBe("fail");
    expect(checkWorkCompatible(fullTime, eff({ keepWorking: false })).status).toBe("pass");
    expect(checkWorkCompatible(fixture(), eff({ keepWorking: true })).status).toBe("pass");
  });
});

describe("Location needs the home metro only for full-time in-person and commuting programs", () => {
  it("fails a full-time in-person program unless local or relocating", () => {
    const mba = fixture("fake-mba");
    expect(checkLocation(mba, eff({ homeCity: "Buenos Aires" })).status).toBe("fail");
    expect(checkLocation(mba, eff({ homeCity: "Cambridge, MA" })).status).toBe("pass");
    expect(checkLocation(mba, eff({ homeCity: "Buenos Aires", relocate: true })).status).toBe(
      "pass",
    );
  });

  it("fails evening attendance outside the metro", () => {
    const masters = fixture("fake-specialized-masters");
    expect(checkLocation(masters, eff({ homeCity: "Buenos Aires" })).status).toBe("fail");
    expect(checkLocation(masters, eff({ homeCity: "Boston" })).status).toBe("pass");
  });

  it("leaves blended, weekend and online programs to the travel checks", () => {
    const away = eff({ homeCity: "Buenos Aires" });
    expect(checkLocation(fixture("fake-executive"), away).status).toBe("pass");
    expect(checkLocation(fixture("fake-emba"), away).status).toBe("pass");
    expect(checkLocation(fixture("fake-certificate"), away).status).toBe("pass");
  });

  it("fails a declined home city for programs that need you local", () => {
    expect(checkLocation(fixture("fake-mba"), eff({ declined: ["homeCity"] })).status).toBe("fail");
  });
});

describe("A program's status is its worst check", () => {
  it("is fail when any check fails, near miss when the worst is a near miss", () => {
    const p = eff();
    const run = (id: string) => {
      const program = fixture(id);
      return checkConstraints(program, p, travelEstimate(program, p));
    };
    expect(run("fake-executive").status).toBe("pass");
    expect(run("fake-specialized-masters").status).toBe("near_miss");
    expect(run("fake-emba")).toMatchObject({ status: "fail" });
    expect(run("fake-emba").checks).toHaveLength(8);
  });
});

describe("An unpublished figure against a limit of 0 fails (DQ10)", () => {
  it("fails on-site days and stretch when the user allows none", () => {
    const profile = eff({ maxOnsiteDays: 0, maxStretchDays: 0 });
    const program = fixture("fake-executive", {
      onsiteDaysPerYear: null,
      longestStretchDays: null,
    });
    const { checks } = checkConstraints(program, profile, travelEstimate(program, profile));
    const get = (id: string) => checks.find((c) => c.id === id);
    expect(get("onsiteDays")).toMatchObject({ status: "fail", unknown: true });
    expect(get("longestStretch")).toMatchObject({ status: "fail", unknown: true });
  });

  it("is still a near miss against a limit above 0", () => {
    const program = fixture("fake-executive", { onsiteDaysPerYear: null });
    expect(checkOnsiteDays(program, eff({ maxOnsiteDays: 5 }))).toMatchObject({
      status: "near_miss",
      unknown: true,
    });
  });
});

describe("The travel budget with airfare unknown", () => {
  const away = { homeCity: "Buenos Aires" };

  it("never passes on a lodging-only total", () => {
    const profile = eff({ ...away, airfareRange: "unknown", travelBudgetUsd: 2000 });
    const emba = fixture("fake-emba");
    const check = checkTravelBudget(travelEstimate(emba, profile), profile);
    expect(check).toMatchObject({ status: "near_miss", unknown: true });
    expect(check.note).toMatch(/Airfare unknown/);
  });

  it("fails at a budget of 0, and still fails when lodging alone is over", () => {
    const zero = eff({ ...away, airfareRange: "unknown", travelBudgetUsd: 0 });
    const emba = fixture("fake-emba");
    expect(checkTravelBudget(travelEstimate(emba, zero), zero).status).toBe("fail");
    const low = eff({ ...away, airfareRange: "unknown", travelBudgetUsd: 1000 });
    const exec = fixture("fake-executive");
    expect(checkTravelBudget(travelEstimate(exec, low), low).status).toBe("fail");
  });

  it("is unchanged with no travel budget", () => {
    const profile = eff({ ...away, airfareRange: "unknown", travelBudgetUsd: null });
    const emba = fixture("fake-emba");
    expect(checkTravelBudget(travelEstimate(emba, profile), profile).unknown).toBe(false);
  });
});

describe("Boundary arithmetic ignores float noise", () => {
  it("treats exactly 15% over as a near miss for non-integers", () => {
    expect(overshoot(8.05, 7)).toBe("near_miss");
    expect(overshoot(16.1, 14)).toBe("near_miss");
    expect(overshoot(8.06, 7)).toBe("fail");
  });

  it("passes a float product equal to the limit", () => {
    expect(overshoot(5000.000000000001, 5000)).toBe("pass");
  });
});

describe("Card notes read correctly", () => {
  it("skips the hours note when the gap rounds to zero", () => {
    const program = fixture("fake-executive", { hoursPerWeek: { min: 10.4, max: 12 } });
    const check = checkHours(program, eff({ hoursPerWeek: { min: 5, max: 10 } }));
    expect(check.status).toBe("pass");
    expect(check.note).toBeUndefined();
  });

  it("says '1 course' and skips the note for 0 courses", () => {
    const base = { tuitionUsd: null, tuitionPerCourseUsd: 8100 };
    const one = fixture("fake-certificate", { ...base, courseCount: 1 });
    expect(checkTuition(one, eff()).note).toMatch(/at 1 course \(estimate\)/);
    const none = fixture("fake-certificate", { ...base, courseCount: 0 });
    expect(checkTuition(none, eff()).note).toBe("not published");
  });
});

describe("A declined relocation answer is not a rule-out", () => {
  it("passes a full-time program elsewhere, with a note", () => {
    const profile = eff({ homeCity: "Buenos Aires", relocate: true, declined: ["relocate"] });
    expect(profile.relocate).toBeNull();
    expect(checkLocation(fixture("fake-mba"), profile)).toMatchObject({
      status: "pass",
      note: "may require relocating",
    });
  });
});
