import { verifiedOn } from "../schema/derived";
import type { Program } from "../schema/program";
import { CHECK_LABELS, CONFIDENCE_WINDOW_DAYS } from "./constants";
import { needsLocalPresence } from "./distance";
import type { Check, ConfidenceResult } from "./types";

const ONSITE_FIELDS = [
  "onsiteDaysPerYear",
  "residencyCount",
  "longestStretchDays",
  "onsiteNote",
  "attendance",
  "format",
];

const officialFor = (program: Program, fields: string[]) =>
  program.sources.some((s) => s.kind === "official_page" && fields.includes(s.field));

const DAY_MS = 86_400_000;

// Confidence describes the data, not the fit. Four conditions; all met is high, one missing
// is medium, two or more is low. A draft record is capped at low (D7).
export function confidence(program: Program, checks: Check[], today: Date): ConfidenceResult {
  const reasons: string[] = [];

  const verified = program.verification.status === "verified";
  const oldest = verifiedOn(program);
  const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const ageDays = oldest ? (todayMs - Date.parse(`${oldest}T00:00:00Z`)) / DAY_MS : null;
  if (!verified) reasons.push("Draft record, not yet verified.");
  else if (ageDays === null || ageDays > CONFIDENCE_WINDOW_DAYS) {
    reasons.push(`Facts last checked more than ${CONFIDENCE_WINDOW_DAYS} days ago.`);
  }
  const fresh = verified && ageDays !== null && ageDays <= CONFIDENCE_WINDOW_DAYS;

  // A price published per course counts, with an official source on the field that holds it.
  const costOk =
    (program.tuitionUsd !== null && officialFor(program, ["tuitionUsd"])) ||
    (program.tuitionUsd === null &&
      program.tuitionPerCourseUsd !== null &&
      program.courseCount !== null &&
      program.courseCount > 0 &&
      officialFor(program, ["tuitionPerCourseUsd"]));
  if (!costOk) reasons.push("Tuition is not published on an official page.");

  // A program that needs the student near campus publishes a schedule ("weekday evenings")
  // rather than a day count, so an official source on any schedule field (the same fields as
  // for other programs, `format` included) is its on-site evidence. A missing count still shows
  // as an unknown on-site days check, so it lowers confidence once, not twice.
  const onsiteOk =
    (program.onsiteDaysPerYear !== null || needsLocalPresence(program)) &&
    officialFor(program, ONSITE_FIELDS);
  if (!onsiteOk) reasons.push("On-site time is not published on an official page.");

  const unknowns = checks.filter((c) => c.unknown);
  if (unknowns.length > 0) {
    reasons.push(`Not published: ${unknowns.map((c) => CHECK_LABELS[c.id]).join(", ")}.`);
  }

  const missing = [fresh, costOk, onsiteOk, unknowns.length === 0].filter((ok) => !ok).length;
  let level: ConfidenceResult["level"] = missing === 0 ? "high" : missing === 1 ? "medium" : "low";
  if (!verified) level = "low";
  return { level, reasons };
}
