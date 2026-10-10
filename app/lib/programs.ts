import { loadPrograms } from "@core/data/load";
import { CHECK_LABELS } from "@core/engine/constants";
import type {
  Check,
  CheckStatus,
  ProgramEvaluation,
  RankedProgram,
  SearchResult,
  TravelEstimate,
} from "@core/engine/types";
import { verifiedOn } from "@core/schema/derived";
import type { PaymentOption } from "@core/schema/enums";
import type { Profile } from "@core/schema/profile";
import type { Program } from "@core/schema/program";
import type { Results } from "./chatState";
import {
  CATEGORY_LABELS,
  FORMAT_LABELS,
  PAYMENT_LABELS,
  chipLabel,
  fieldNames,
  usd,
} from "./labels";

// The program cards in display form. Facts come from the program records (loadPrograms(),
// imported on the client, DQ13), and checks, ranks, scores and confidence from the engine's
// SearchResult. Nothing here comes from model text (CLAUDE.md rule 7). Shared by the cards and
// the transcript.

export const NOT_PUBLISHED = "not published";
export const DRAFT_LABEL = "Draft, not yet verified";

// Parsed once: the records never change while the page is open.
let records: Program[] | null = null;
export function programRecords(): Program[] {
  return (records ??= loadPrograms());
}

export type Fact = { label: string; value: string };
export type CheckLine = { label: string; status: CheckStatus; statusText: string; detail: string };
export type SourceLine = { label: string; url: string | null; checkedOn: string };

export type ProgramView = {
  id: string;
  name: string;
  institution: string;
  // The engine's why line ("Ranked first for …").
  why: string;
  draft: boolean;
  facts: Fact[];
  checks: CheckLine[];
  // How the program serves each of the user's needs, and the format and travel fit lines.
  fit: string[];
  confidence: { level: string; reasons: string[] };
  sources: SourceLine[];
  // The oldest checked-on date among the sources (verifiedOn), or null with no sources.
  checkedOn: string | null;
};

export type ResultsView = {
  // The confirmed category's name, or null after an unresolved tie.
  category: string | null;
  // "Not yet" when no program anywhere is within the limits (nothing_passes).
  notYet: string | null;
  // Why the confirmed category has nothing to show, and where to look instead.
  access: string | null;
  ranked: ProgramView[];
  alsoWorthALook: ProgramView[];
  notAnswered: string[];
};

const STATUS_TEXT: Record<CheckStatus, string> = {
  pass: "Fits",
  near_miss: "Near miss",
  fail: "Doesn't fit",
};

const CONFIDENCE_TEXT = { high: "High", medium: "Medium", low: "Low" } as const;

// The payment option that serves the way the user said they'd pay. Savings, a mix or no
// preference need no match (implementation plan section 3).
const PLAN_OPTION: Partial<Record<Profile["paymentPlan"], PaymentOption>> = {
  installments: "installments",
  employer: "employer_sponsorship",
  loans: "loans",
};

// Record field names as the source list shows them.
const SOURCE_FIELD_LABELS: Record<string, string> = {
  tuitionUsd: "tuition",
  tuitionPerCourseUsd: "price per course",
  tuitionIncludes: "what tuition includes",
  paymentOptions: "payment options",
  durationMonths: "length",
  durationMaxMonths: "longest length",
  onsiteDaysPerYear: "on-site days",
  onsiteNote: "schedule",
  longestStretchDays: "longest stretch",
  hoursPerWeek: "hours a week",
  campusAddress: "campus address",
  cohortMedianExperienceYears: "class experience",
  cohortExperienceBasis: "class experience",
  cohortSeniority: "classmates",
  lodgingPerNightUsd: "lodging rate",
  ratingNotes: "rating evidence",
  minExperienceYears: "experience required",
};

// "courseCount" → "course count".
const words = (field: string) =>
  SOURCE_FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").toLowerCase();

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function lengthText(p: Program): string {
  if (p.durationMonths === null) return NOT_PUBLISHED;
  if (p.durationMaxMonths !== null && p.durationMaxMonths !== p.durationMonths) {
    return `${p.durationMonths} to ${p.durationMaxMonths} months`;
  }
  return plural(p.durationMonths, "month");
}

function placeText(p: Program): string {
  if (p.format === "online") return "Online";
  return [p.city, p.state, p.country].filter((part) => part).join(", ") || NOT_PUBLISHED;
}

function tuitionText(p: Program): string {
  const note = p.figureNotes.tuitionUsd ? ` (${p.figureNotes.tuitionUsd})` : "";
  if (p.tuitionUsd !== null) return `${usd(p.tuitionUsd)}${note}`;
  if (p.tuitionPerCourseUsd !== null) {
    const each = `${usd(p.tuitionPerCourseUsd)} a course`;
    return p.courseCount !== null && p.courseCount > 0
      ? `${each}, about ${usd(p.tuitionPerCourseUsd * p.courseCount)} for ${plural(p.courseCount, "course")} (estimate)`
      : `${each}; total ${NOT_PUBLISHED}`;
  }
  return NOT_PUBLISHED;
}

function travelText(t: TravelEstimate): string {
  const notes = t.notes.length ? ` ${t.notes.join(" ")}` : "";
  if (t.kind === "none") return `No trips needed.${notes}`;
  const trips =
    t.trips !== null
      ? ` for ${plural(t.trips, "trip")}${t.tripsEstimated ? " (estimated)" : ""}`
      : "";
  if (t.kind === "unknown" || t.totalUsd === null) return `${NOT_PUBLISHED}.${notes}`;
  const part = t.lodgingOnly ? " (lodging only; airfare not included)" : "";
  return `About ${usd(t.totalUsd)}${trips}${part}.${notes}`;
}

function onsiteFacts(p: Program): Fact[] {
  if (p.format === "online") return [{ label: "On site", value: "None (online)" }];
  const or = <T>(v: T | null, show: (v: T) => string) => (v === null ? NOT_PUBLISHED : show(v));
  return [
    { label: "On site", value: or(p.onsiteDaysPerYear, (n) => `${plural(n, "day")} a year`) },
    { label: "Schedule", value: p.onsiteNote ?? NOT_PUBLISHED },
    { label: "Longest stretch away", value: or(p.longestStretchDays, (n) => plural(n, "day")) },
  ];
}

function facts(p: Program, e: ProgramEvaluation, profile: Profile): Fact[] {
  const or = <T>(v: T | null, show: (v: T) => string) => (v === null ? NOT_PUBLISHED : show(v));
  const out: Fact[] = [
    { label: "Credential", value: p.credential },
    { label: "Credits", value: p.credits ?? NOT_PUBLISHED },
    {
      label: "Accreditation",
      value: or(p.accreditation, (a) => (a.length ? a.join(", ") : "None")),
    },
    { label: "Format", value: FORMAT_LABELS[p.format] },
    { label: "Length", value: lengthText(p) },
    {
      label: "Hours a week",
      value: or(p.hoursPerWeek, (h) =>
        h.min === h.max ? plural(h.min, "hour") : `${h.min} to ${h.max} hours`,
      ),
    },
    ...onsiteFacts(p),
    { label: "Where", value: placeText(p) },
  ];
  if (profile.locationValues.length > 0 && p.format !== "online") {
    const gives = p.locationOffers.filter((v) => profile.locationValues.includes(v));
    out.push({
      label: "What the location gives you",
      value: gives.length
        ? gives.map((v) => chipLabel("locationValues", v)).join(", ")
        : "None of what you asked for",
    });
  }
  out.push(
    { label: "Tuition", value: tuitionText(p) },
    { label: "Tuition includes", value: p.tuitionIncludes ?? NOT_PUBLISHED },
    {
      label: "Payment options",
      value: or(p.paymentOptions, (o) => o.map((x) => PAYMENT_LABELS[x]).join(", ")),
    },
  );
  const wanted = PLAN_OPTION[profile.paymentPlan];
  if (wanted && !profile.declined.includes("paymentPlan")) {
    const offered = p.paymentOptions?.includes(wanted);
    out.push({
      label: "How you'd pay",
      value: `${PAYMENT_LABELS[wanted]}: ${offered ? "offered" : NOT_PUBLISHED}`,
    });
  }
  out.push(
    { label: "Travel and lodging", value: travelText(e.travelEstimate) },
    {
      label: "Tuition plus travel",
      value:
        e.totalCostUsd === null
          ? `can't be added up: a figure is ${NOT_PUBLISHED}`
          : `${usd(e.totalCostUsd)}${e.travelEstimate.lodgingOnly ? " before airfare" : ""}`,
    },
    { label: "Classmates", value: e.peerFit.text },
    { label: "Who's in the class", value: p.cohortSeniority ?? NOT_PUBLISHED },
    { label: "Experience required", value: or(p.minExperienceYears, (n) => plural(n, "year")) },
  );
  return out;
}

function checkLine(c: Check): CheckLine {
  const show = (v: number | string) =>
    c.unit === "USD" && typeof v === "number" ? usd(v) : c.unit ? `${v} ${c.unit}` : String(v);
  const parts: string[] = [];
  let note = c.note;
  if (c.id === "workCompatible") {
    parts.push(c.value === "yes" ? "can be done while working" : "means you'd stop working");
  } else if (c.id === "location") {
    parts.push(c.value === null ? "Online" : String(c.value));
  } else {
    if (c.value !== null) parts.push(show(c.value));
    else if (c.unknown) {
      // The engine's note for an unpublished figure starts with "not published": it goes first.
      parts.push(note ?? NOT_PUBLISHED);
      note = undefined;
    }
    if (c.limit !== null) parts.push(`your limit ${show(c.limit)}`);
  }
  if (note) parts.push(note);
  const label = CHECK_LABELS[c.id];
  return {
    label: label.charAt(0).toUpperCase() + label.slice(1),
    status: c.status,
    statusText: STATUS_TEXT[c.status],
    detail: parts.join("; "),
  };
}

function fitLines(e: ProgramEvaluation): string[] {
  const needs = e.score.needs.map((n) => {
    const thin = n.lowEvidence ? " (rated on thin evidence)" : "";
    return `${chipLabel("needs", n.need)}: ${n.rating} of 5. ${n.note}${thin}`;
  });
  const extra = [e.score.format.text, e.score.travel.text].filter((t): t is string => !!t);
  return [...needs, ...extra];
}

// One line per page: the facts it backs and the oldest date it was checked. A fact the school
// gave directly has no page and gets a line of its own.
function sourceLines(p: Program): SourceLine[] {
  const byUrl = new Map<string, { fields: string[]; checkedOn: string }>();
  const out: SourceLine[] = [];
  for (const s of p.sources) {
    if (!s.url) {
      out.push({ label: `${words(s.field)} (from the school)`, url: null, checkedOn: s.checkedOn });
      continue;
    }
    const seen = byUrl.get(s.url);
    const field = words(s.field);
    if (!seen) byUrl.set(s.url, { fields: [field], checkedOn: s.checkedOn });
    else {
      if (!seen.fields.includes(field)) seen.fields.push(field);
      if (s.checkedOn < seen.checkedOn) seen.checkedOn = s.checkedOn;
    }
  }
  const pages = [...byUrl].map(([url, s]) => {
    const label = s.fields.join(", ");
    return { label: label.charAt(0).toUpperCase() + label.slice(1), url, checkedOn: s.checkedOn };
  });
  return [...pages, ...out];
}

export function programView(
  program: Program,
  evaluation: ProgramEvaluation,
  profile: Profile,
  why: string,
): ProgramView {
  return {
    id: program.id,
    name: program.name,
    institution: program.institution,
    why,
    draft: program.verification.status === "draft",
    facts: facts(program, evaluation, profile),
    checks: evaluation.checks.map(checkLine),
    fit: fitLines(evaluation),
    confidence: {
      level: CONFIDENCE_TEXT[evaluation.confidence.level],
      reasons: evaluation.confidence.reasons,
    },
    sources: sourceLines(program),
    checkedOn: verifiedOn(program),
  };
}

const NOTHING_PASSES =
  "Not yet. No program in Step Up's list fits within your limits right now. Your verdict stands; changing a limit, such as the budget, the time on site or the travel, may open one up.";

function accessText(result: SearchResult): string | null {
  const { access } = result;
  // "executive program", "executive MBA": the label in a sentence.
  const label = access.category ? CATEGORY_LABELS[access.category] : "";
  const name = label.charAt(0).toLowerCase() + label.slice(1);
  const instead = access.alternative
    ? ` The closest type with a program within your limits is ${CATEGORY_LABELS[access.alternative]}: see "Also worth a look".`
    : "";
  switch (access.status) {
    case "available":
      return null;
    case "no_winner":
      return "Two types tied, so there's no type to search yet. Pick one, and Step Up will show its programs.";
    case "no_programs":
      return `Step Up's list has no ${name} yet. Your verdict stands.${instead}`;
    case "none_within_limits": {
      const blocked = access.blockedBy.map((id) => CHECK_LABELS[id]);
      const why = blocked.length ? ` (${blocked.join(", ")})` : "";
      return `No ${name} in Step Up's list fits all your limits${why}. Your verdict stands.${instead}`;
    }
  }
}

// The ranked list and "Also worth a look", joined to the records by id. An id with no record
// (a dataset the page doesn't have) is left out rather than shown without facts.
export function resultsView(
  { profile, result }: Results,
  programs: Program[] = programRecords(),
): ResultsView {
  const view = (r: RankedProgram): ProgramView[] => {
    const program = programs.find((p) => p.id === r.id);
    const evaluation = result.programs.find((e) => e.id === r.id);
    return program && evaluation ? [programView(program, evaluation, profile, r.why)] : [];
  };
  return {
    category: result.access.category ? CATEGORY_LABELS[result.access.category] : null,
    notYet: result.noProgram.triggered ? NOTHING_PASSES : null,
    access: accessText(result),
    ranked: result.ranking.ranked.flatMap(view),
    alsoWorthALook: result.ranking.alsoWorthALook.flatMap(view),
    notAnswered: fieldNames(result.profileGaps),
  };
}

const regionName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

// The data-limits note (docs/build-plan.md): the dataset's size, region and verification window,
// and that it is not a complete list. From the records only.
export function dataLimits(programs: Program[] = programRecords()): string {
  const countries = [...new Set(programs.map((p) => p.country))].map(regionName);
  const dates = programs.flatMap((p) => verifiedOn(p) ?? []).sort();
  const drafts = programs.filter((p) => p.verification.status === "draft").length;
  const where = countries.length ? `, in ${countries.join(", ")}` : "";
  const [first, last] = [dates[0], dates.at(-1)];
  const when = !first
    ? ""
    : first === last
      ? ` Facts were checked with the schools on ${first}.`
      : ` Facts were checked with the schools between ${first} and ${last}.`;
  const draftNote = drafts
    ? ` ${plural(drafts, "record is a draft", "records are drafts")}, not yet verified.`
    : "";
  return `Step Up's list holds ${plural(programs.length, "program")}${where}.${when}${draftNote} It is not a complete list: good programs are missing, and schools change prices and schedules, so confirm every figure with the school before you apply.`;
}
