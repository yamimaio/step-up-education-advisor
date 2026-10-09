import type { Program } from "../schema/program";
import { HOURS_NEAR_PCT, HOURS_PASS_PCT, NEAR_MISS_PCT } from "./constants";
import { needsLocalPresence, withinCommute } from "./distance";
import type {
  Check,
  CheckId,
  CheckStatus,
  EffectiveDirection,
  EffectiveProfile,
  TravelEstimate,
} from "./types";

// Compare after rounding to six decimals, so 8.05 against 7 is exactly 15% over and a float
// product like 5000.000000000001 equals 5000.
const SCALE = 1_000_000;
const scaled = (n: number) => Math.round(n * SCALE);

// Pass at or under the limit; near miss when over by NEAR_MISS_PCT or less; otherwise fail.
// A limit of 0 has no near miss (DQ10). Integer arithmetic keeps exactly 15% on the right side.
export function overshoot(value: number, limit: number, pct: number = NEAR_MISS_PCT): CheckStatus {
  const v = scaled(value);
  const l = scaled(limit);
  if (v <= l) return "pass";
  if (l === 0) return "fail";
  return v * 100 <= l * (100 + pct) ? "near_miss" : "fail";
}

const NOT_PUBLISHED = "not published";

// The unknown-value rule: the program doesn't publish the figure. A near miss if the user set
// a limit, a pass if not. Either way the card says "not published" and confidence drops.
// A limit of 0 is the exception (DQ10): any published figure above 0 would fail it, and an
// unpublished figure here belongs to a program with time to spend, so it fails.
function limitCheck(
  id: CheckId,
  value: number | null,
  limit: number | null,
  unit: string,
  note?: string,
): Check {
  if (value === null) {
    return {
      id,
      status: limit === null ? "pass" : limit === 0 ? "fail" : "near_miss",
      value: null,
      limit,
      unit,
      unknown: true,
      note: note ? `${NOT_PUBLISHED}; ${note}` : NOT_PUBLISHED,
    };
  }
  const status = limit === null ? "pass" : overshoot(value, limit);
  return { id, status, value, limit, unit, unknown: false, ...(note ? { note } : {}) };
}

// The published total, or per-course price × course count when only that is published (an
// estimate). Null when neither is known.
export function tuitionTotal(
  program: Pick<Program, "tuitionUsd" | "tuitionPerCourseUsd" | "courseCount">,
): { usd: number; estimated: boolean } | null {
  if (program.tuitionUsd !== null) return { usd: program.tuitionUsd, estimated: false };
  if (
    program.tuitionPerCourseUsd !== null &&
    program.courseCount !== null &&
    program.courseCount > 0
  ) {
    return { usd: program.tuitionPerCourseUsd * program.courseCount, estimated: true };
  }
  return null;
}

export function checkTuition(program: Program, profile: EffectiveProfile): Check {
  let note: string | undefined;
  const total = tuitionTotal(program);
  if (total?.estimated && program.courseCount !== null) {
    const courses = program.courseCount === 1 ? "course" : "courses";
    note = `about $${total.usd.toLocaleString("en-US")} at ${program.courseCount} ${courses} (estimate)`;
  }
  return limitCheck("tuition", program.tuitionUsd, profile.tuitionBudgetUsd, "USD", note);
}

export function checkTravelBudget(travel: TravelEstimate, profile: EffectiveProfile): Check {
  const limit = profile.travelBudgetUsd;
  const check = limitCheck("travelBudget", travel.totalUsd, limit, "USD");
  if (check.unknown) check.note = travel.notes.join(" ") || check.note;
  // With airfare unknown the total covers lodging only: it can fail the budget on its own, but
  // it can never be shown to pass, so a pass becomes a near miss (a fail at a limit of 0). The gap
  // is the user's (airfare is in profileGaps), not the program's, so `unknown` stays false and
  // confidence is untouched.
  if (travel.lodgingOnly && limit !== null) {
    // The note goes on whatever the status: the total is an underestimate either way.
    const status = check.status === "pass" ? (limit === 0 ? "fail" : "near_miss") : check.status;
    return { ...check, status, unknown: false, note: travel.notes.join(" ") };
  }
  return check;
}

// A program that needs the student near campus has no time away: the student commutes or
// relocates (travel.ts counts no trips for it), and the location check decides. The time-away
// limits don't apply to it, so they pass with a note and never count as unpublished.
function fromHome(id: CheckId, value: number | null, limit: number | null, unit: string): Check {
  return {
    id,
    status: "pass",
    value,
    limit,
    unit,
    unknown: false,
    note: "no time away: you'd attend from near campus",
  };
}

export function checkOnsiteDays(program: Program, profile: EffectiveProfile): Check {
  const args = [
    "onsiteDays",
    program.onsiteDaysPerYear,
    profile.maxOnsiteDays,
    "days a year",
  ] as const;
  return needsLocalPresence(program) ? fromHome(...args) : limitCheck(...args);
}

export function checkLongestStretch(program: Program, profile: EffectiveProfile): Check {
  const args = [
    "longestStretch",
    program.longestStretchDays,
    profile.maxStretchDays,
    "days",
  ] as const;
  return needsLocalPresence(program) ? fromHome(...args) : limitCheck(...args);
}

// The fastest published pace; null falls back to the slowest, and both null is unknown.
export function checkLength(
  program: Program,
  profile: Pick<EffectiveDirection, "maxProgramMonths">,
): Check {
  return limitCheck(
    "length",
    program.durationMonths ?? program.durationMaxMonths,
    profile.maxProgramMonths,
    "months",
  );
}

// Both sides are estimates, so hours are looser: a program that needs no more than the user's
// top passes, up to 25% above passes with a note, up to 50% above is a near miss.
export function checkHours(
  program: Program,
  profile: Pick<EffectiveDirection, "hoursPerWeek">,
): Check {
  const user = profile.hoursPerWeek;
  const hours = program.hoursPerWeek;
  if (hours === null) return limitCheck("hours", null, user ? user.max : null, "hours a week");
  const value = hours.min === hours.max ? hours.min : `${hours.min}-${hours.max}`;
  const limit = user ? (user.min === user.max ? user.max : `${user.min}-${user.max}`) : null;
  const check = { id: "hours" as const, value, limit, unit: "hours a week", unknown: false };
  if (!user || scaled(hours.min) <= scaled(user.max)) return { ...check, status: "pass" };
  const status =
    scaled(hours.min) * 100 <= scaled(user.max) * (100 + HOURS_PASS_PCT)
      ? "pass"
      : overshoot(hours.min, user.max, HOURS_NEAR_PCT);
  const more = Math.round(hours.min - user.max);
  if (more < 1) return { ...check, status };
  return {
    ...check,
    status,
    note: `about ${more} ${more === 1 ? "hour" : "hours"} a week more than you planned`,
  };
}

export function checkWorkCompatible(
  program: Program,
  profile: Pick<EffectiveDirection, "keepWorking">,
): Check {
  const ok = !profile.keepWorking || program.workCompatible;
  return {
    id: "workCompatible",
    status: ok ? "pass" : "fail",
    value: program.workCompatible ? "yes" : "no",
    limit: profile.keepWorking ? "must keep working" : "not required",
    unit: "",
    unknown: false,
  };
}

// A program that needs the student near campus passes within commuting distance or for a user who
// would relocate (or didn't say; the card notes the move). Only a user who won't relocate makes
// the distance decide: farther fails, and a missing coordinate on either side is a near miss,
// never a silent pass.
export function checkLocation(program: Program, profile: EffectiveProfile): Check {
  const near = withinCommute(profile, program);
  const needsLocal = needsLocalPresence(program);
  const mustBeNear = needsLocal && profile.relocate === false;
  const status: CheckStatus =
    !mustBeNear || near === true ? "pass" : near === false ? "fail" : "near_miss";
  const check: Check = {
    id: "location",
    status,
    value: program.city,
    limit: profile.homeCity,
    unit: "",
    // Only a program's missing coordinates are a data gap; a missing home is the user's gap.
    unknown:
      mustBeNear && near === null && (program.campusLat === null || program.campusLon === null),
  };
  if (needsLocal && near !== true) {
    if (status === "fail") check.note = "requires living near campus";
    else if (status === "near_miss")
      check.note = "can't tell if the campus is within commuting distance";
    else if (profile.relocate === true && near === false) check.note = "requires relocating";
    else check.note = "may require relocating";
  }
  return check;
}

const RANK: Record<CheckStatus, number> = { pass: 0, near_miss: 1, fail: 2 };

// A program's status is its worst check.
const worst = (checks: Check[]): CheckStatus =>
  checks.reduce<CheckStatus>((w, c) => (RANK[c.status] > RANK[w] ? c.status : w), "pass");

// Stage 1: the checks that can remove a whole category (length, hours, keep working). Budget,
// travel and location are stage 2's, so they never change the verdict.
export const DIRECTION_CHECKS = ["length", "hours", "workCompatible"] as const;

export function checkDirection(
  program: Program,
  profile: EffectiveDirection,
): { checks: Check[]; status: CheckStatus } {
  const checks = [
    checkLength(program, profile),
    checkHours(program, profile),
    checkWorkCompatible(program, profile),
  ];
  return { checks, status: worst(checks) };
}

// Stage 2: all eight checks.
export function checkConstraints(
  program: Program,
  profile: EffectiveProfile,
  travel: TravelEstimate,
): { checks: Check[]; status: CheckStatus } {
  const checks = [
    checkTuition(program, profile),
    checkTravelBudget(travel, profile),
    checkOnsiteDays(program, profile),
    checkLongestStretch(program, profile),
    checkLength(program, profile),
    checkHours(program, profile),
    checkWorkCompatible(program, profile),
    checkLocation(program, profile),
  ];
  return { checks, status: worst(checks) };
}
