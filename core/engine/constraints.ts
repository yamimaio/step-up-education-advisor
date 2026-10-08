import type { Program } from "../schema/program";
import { HOURS_NEAR_PCT, HOURS_PASS_PCT, NEAR_MISS_PCT } from "./constants";
import { needsLocalPresence, sameMetro } from "./metro";
import type { Check, CheckId, CheckStatus, EffectiveProfile, TravelEstimate } from "./types";

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

export function checkTuition(program: Program, profile: EffectiveProfile): Check {
  let note: string | undefined;
  if (
    program.tuitionUsd === null &&
    program.tuitionPerCourseUsd !== null &&
    program.courseCount !== null &&
    program.courseCount > 0
  ) {
    const total = program.tuitionPerCourseUsd * program.courseCount;
    const courses = program.courseCount === 1 ? "course" : "courses";
    note = `about $${total.toLocaleString("en-US")} at ${program.courseCount} ${courses} (estimate)`;
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
  if (travel.lodgingOnly && limit !== null && check.status === "pass") {
    return {
      ...check,
      status: limit === 0 ? "fail" : "near_miss",
      unknown: false,
      note: travel.notes.join(" "),
    };
  }
  return check;
}

export function checkOnsiteDays(program: Program, profile: EffectiveProfile): Check {
  return limitCheck("onsiteDays", program.onsiteDaysPerYear, profile.maxOnsiteDays, "days a year");
}

export function checkLongestStretch(program: Program, profile: EffectiveProfile): Check {
  return limitCheck("longestStretch", program.longestStretchDays, profile.maxStretchDays, "days");
}

// The fastest published pace; null falls back to the slowest, and both null is unknown.
export function checkLength(program: Program, profile: EffectiveProfile): Check {
  return limitCheck(
    "length",
    program.durationMonths ?? program.durationMaxMonths,
    profile.maxProgramMonths,
    "months",
  );
}

// Both sides are estimates, so hours are looser: a program that needs no more than the user's
// top passes, up to 25% above passes with a note, up to 50% above is a near miss.
export function checkHours(program: Program, profile: EffectiveProfile): Check {
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

export function checkWorkCompatible(program: Program, profile: EffectiveProfile): Check {
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

// Programs that need the home metro pass for a local user or one who would relocate. A user
// who declined the relocation question is not ruled out; the card says it may need a move.
export function checkLocation(program: Program, profile: EffectiveProfile): Check {
  const local = sameMetro(profile.homeCity, program);
  const needsLocal = needsLocalPresence(program);
  const ok = !needsLocal || local || profile.relocate !== false;
  const check: Check = {
    id: "location",
    status: ok ? "pass" : "fail",
    value: program.city,
    limit: profile.homeCity,
    unit: "",
    unknown: false,
  };
  if (needsLocal && !local && profile.relocate === true) check.note = "requires relocating";
  if (needsLocal && !local && profile.relocate === null) check.note = "may require relocating";
  if (needsLocal && !ok) check.note = "requires living near campus";
  return check;
}

const RANK: Record<CheckStatus, number> = { pass: 0, near_miss: 1, fail: 2 };

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
  const status = checks.reduce<CheckStatus>(
    (worst, c) => (RANK[c.status] > RANK[worst] ? c.status : worst),
    "pass",
  );
  return { checks, status };
}
