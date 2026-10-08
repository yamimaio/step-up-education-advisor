import type { Program } from "../schema/program";
import { HOURS_NEAR_PCT, HOURS_PASS_PCT, NEAR_MISS_PCT } from "./constants";
import { sameMetro } from "./metro";
import type { Check, CheckId, CheckStatus, EffectiveProfile, TravelEstimate } from "./types";

// Pass at or under the limit; near miss when over by NEAR_MISS_PCT or less; otherwise fail.
// A limit of 0 has no near miss (DQ10). Integer arithmetic keeps exactly 15% on the right side.
export function overshoot(value: number, limit: number, pct: number = NEAR_MISS_PCT): CheckStatus {
  if (value <= limit) return "pass";
  if (limit === 0) return "fail";
  return value * 100 <= limit * (100 + pct) ? "near_miss" : "fail";
}

const NOT_PUBLISHED = "not published";

// The unknown-value rule: the program doesn't publish the figure. A near miss if the user set
// a limit, a pass if not. Either way the card says "not published" and confidence drops.
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
      status: limit === null ? "pass" : "near_miss",
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
    program.courseCount !== null
  ) {
    const total = program.tuitionPerCourseUsd * program.courseCount;
    note = `about $${total.toLocaleString("en-US")} at ${program.courseCount} courses (estimate)`;
  }
  return limitCheck("tuition", program.tuitionUsd, profile.tuitionBudgetUsd, "USD", note);
}

export function checkTravelBudget(travel: TravelEstimate, profile: EffectiveProfile): Check {
  const check = limitCheck("travelBudget", travel.totalUsd, profile.travelBudgetUsd, "USD");
  if (check.unknown) check.note = travel.notes.join(" ") || check.note;
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
  if (!user || hours.min <= user.max) return { ...check, status: "pass" };
  const status =
    hours.min * 100 <= user.max * (100 + HOURS_PASS_PCT)
      ? "pass"
      : overshoot(hours.min, user.max, HOURS_NEAR_PCT);
  const more = Math.round(hours.min - user.max);
  const unit = more === 1 ? "hour" : "hours";
  return {
    ...check,
    status,
    note: `about ${more} ${unit} a week more than you planned`,
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

// A full-time in-person program needs the home metro or relocation. Evenings or daily
// attendance outside the metro does too. Everything else is left to the travel checks.
export function checkLocation(program: Program, profile: EffectiveProfile): Check {
  const local = sameMetro(profile.homeCity, program);
  const fullTimeInPerson = program.format === "in_person" && !program.workCompatible;
  const commuting =
    program.attendance === "recurring_evenings" || program.attendance === "recurring_daily";
  const needsLocal = program.format !== "online" && (fullTimeInPerson || commuting);
  const ok = !needsLocal || local || profile.relocate;
  const check: Check = {
    id: "location",
    status: ok ? "pass" : "fail",
    value: program.city,
    limit: profile.homeCity,
    unit: "",
    unknown: false,
  };
  if (needsLocal && !local && profile.relocate) check.note = "requires relocating";
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
