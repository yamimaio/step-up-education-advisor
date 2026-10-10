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
import type { Results, Verdict } from "./chatState";
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

// `note`: the record's figure notes for the fields behind the fact (a figure from another year,
// a minimum, an average), which the card must show next to it (decisions.md, B1).
export type Fact = { label: string; value: string; note: string | null };
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

// A near miss is "over" only for a published figure past the user's limit, the server template's
// rule (isOver, server/fallback.ts, PR #155 round 2). One the engine can't compare (a per-course
// price with no published total, a lodging-only travel total under the budget, a location with
// no home) is not fully checked; an unpublished figure says "not published" in its detail.
const NOT_FULLY_CHECKED = "Not fully checked";
function isOver(c: Check): boolean {
  if (c.unknown || c.value === null || c.id === "location") return false;
  if (c.id === "travelBudget" && typeof c.value === "number" && typeof c.limit === "number") {
    return c.value > c.limit;
  }
  return true;
}

function statusText(c: Check): string {
  return c.status === "near_miss" && !c.unknown && !isOver(c)
    ? NOT_FULLY_CHECKED
    : STATUS_TEXT[c.status];
}

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
  if (p.tuitionUsd !== null) return usd(p.tuitionUsd);
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

type Line = Omit<Fact, "note">;

// The record fields behind each fact, whose figure notes go with it.
const FACT_FIELDS: Record<string, string[]> = {
  Credential: ["credential"],
  Credits: ["credits"],
  Accreditation: ["accreditation"],
  Format: ["format", "attendance"],
  Length: ["durationMonths", "durationMaxMonths"],
  "Hours a week": ["hoursPerWeek"],
  "On site": ["onsiteDaysPerYear", "residencyCount"],
  Schedule: ["onsiteNote"],
  "Longest stretch away": ["longestStretchDays"],
  Where: ["city", "state", "country", "campusAddress", "metro"],
  "What the location gives you": ["locationOffers"],
  Tuition: ["tuitionUsd", "tuitionPerCourseUsd", "courseCount"],
  "Tuition includes": ["tuitionIncludes", "lodgingIncluded"],
  "Payment options": ["paymentOptions"],
  "Travel and lodging": ["lodgingPerNightUsd"],
  Classmates: ["cohortMedianExperienceYears", "cohortExperienceBasis"],
  "Who's in the class": ["cohortSeniority"],
  "Experience required": ["minExperienceYears"],
};

// Notes the card never shows: it has no coordinates, so "derived from campusAddress" says nothing.
const HIDDEN_NOTES = new Set(["campusLat", "campusLon"]);

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Each line with the notes of the fields behind it. A note on a field no shown line covers (an
// online program has no schedule line) goes in "Other notes", so no caveat is dropped.
function withNotes(p: Program, lines: Line[]): Fact[] {
  const used = new Set<string>();
  const facts = lines.map((line) => {
    const fields = (FACT_FIELDS[line.label] ?? []).filter((f) => p.figureNotes[f]);
    for (const f of fields) used.add(f);
    const note = fields.map((f) => p.figureNotes[f]).join(" ");
    return { ...line, note: note || null };
  });
  const other = Object.entries(p.figureNotes).filter(
    ([field]) => !used.has(field) && !HIDDEN_NOTES.has(field),
  );
  if (other.length > 0) {
    const value = other.map(([field, note]) => `${capital(words(field))}: ${note}`).join(" ");
    facts.push({ label: "Other notes", value, note: null });
  }
  return facts;
}

function onsiteFacts(p: Program): Line[] {
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
  const out: Line[] = [
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
  const asked = !profile.declined.includes("locationValues") && profile.locationValues.length > 0;
  if (asked && p.format !== "online") {
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
  return withNotes(p, out);
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
  return {
    label: capital(CHECK_LABELS[c.id]),
    status: c.status,
    statusText: statusText(c),
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
    return { label: capital(s.fields.join(", ")), url, checkedOn: s.checkedOn };
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

// Records hold school pages; any other scheme (javascript:, file:) is shown as text, never linked,
// on the card and in the transcript.
export const isWebLink = (url: string) => /^https?:\/\//i.test(url);

// The engine names no type to search (`no_winner`) for three reasons, told apart here: the user
// declined the needs (stage 1 has nothing to pick a type with), two types tied and the user
// picked neither, or every type is ruled out.
function noWinnerText(profile: Profile, verdict: Verdict | null): string {
  if (profile.declined.includes("needs")) {
    return "Step Up picks the type of program, and ranks programs, by what you said is missing, and you chose not to say. So there's no type to search yet. Tell Step Up what's missing, and it can show programs.";
  }
  const tie = verdict?.result.category.tie;
  if (tie) {
    return `${CATEGORY_LABELS[tie[0]]} and ${CATEGORY_LABELS[tie[1]]} tied, so there's no single type to search yet. Tell Step Up which of the two you'd rather have, and it can show that type's programs.`;
  }
  return "There's no single type of program to search yet, so there's no list.";
}

function accessText(
  result: SearchResult,
  profile: Profile,
  verdict: Verdict | null,
): string | null {
  const { access } = result;
  // "executive program", "executive MBA": the label in a sentence.
  const label = access.category ? CATEGORY_LABELS[access.category] : "";
  const name = label.charAt(0).toLowerCase() + label.slice(1);
  // The alternative is the best type with a program that isn't a fail: "within your limits" only
  // when one of its programs passes every check, otherwise it nearly fits.
  const alt = access.alternative;
  const passes = result.programs.some((e) => e.category === alt && e.status === "pass");
  const reach = passes ? "within your limits" : "that nearly fits your limits";
  const instead = alt
    ? ` The closest type with a program ${reach} is ${CATEGORY_LABELS[alt]}: see "Also worth a look".`
    : "";
  switch (access.status) {
    case "available":
      return null;
    case "no_winner":
      return noWinnerText(profile, verdict);
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
// (a dataset the page doesn't have) is left out rather than shown without facts. `verdict`: the
// confirmed stage 1 result the search ran on, which says whether two types tied.
export function resultsView(
  { profile, result }: Results,
  programs: Program[] = programRecords(),
  verdict: Verdict | null = null,
): ResultsView {
  const view = (r: RankedProgram): ProgramView[] => {
    const program = programs.find((p) => p.id === r.id);
    const evaluation = result.programs.find((e) => e.id === r.id);
    return program && evaluation ? [programView(program, evaluation, profile, r.why)] : [];
  };
  return {
    category: result.access.category ? CATEGORY_LABELS[result.access.category] : null,
    notYet: result.noProgram.triggered ? NOTHING_PASSES : null,
    access: accessText(result, profile, verdict),
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
