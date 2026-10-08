import { verifiedOn } from "../schema/derived";
import type { Program } from "../schema/program";
import { CONFIDENCE_WINDOW_DAYS } from "./constants";
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

  const costOk = program.tuitionUsd !== null && officialFor(program, ["tuitionUsd"]);
  if (!costOk) reasons.push("Tuition is not published on an official page.");

  const onsiteOk = program.onsiteDaysPerYear !== null && officialFor(program, ONSITE_FIELDS);
  if (!onsiteOk) reasons.push("On-site time is not published on an official page.");

  const unknowns = checks.filter((c) => c.unknown);
  if (unknowns.length > 0) {
    reasons.push(`Not published: ${unknowns.map((c) => c.id).join(", ")}.`);
  }

  const missing = [fresh, costOk, onsiteOk, unknowns.length === 0].filter((ok) => !ok).length;
  let level: ConfidenceResult["level"] = missing === 0 ? "high" : missing === 1 ? "medium" : "low";
  if (!verified) level = "low";
  return { level, reasons };
}
