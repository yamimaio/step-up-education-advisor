import JSON5 from "json5";
import { ProgramSchema, type ProgramInput } from "../../core/schema/program";
import { PaymentOption, RatingKey } from "../../core/schema/enums";

// Turns a Perplexity research answer (Prompt 1) and rating answer (Prompt 2) into a draft
// Program record. Pure: strings in, a record and notes out. Facts that don't fit the schema
// are reported, never edited away.

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);

// [^1] style footnote markers sit between JSON members in the rating answers.
const stripFootnotes = (text: string) => text.replace(/\[\^\d+\]/g, "");

function balancedObjects(text: string): string[] {
  const found: string[] = [];
  for (let start = text.indexOf("{"); start !== -1; start = text.indexOf("{", start + 1)) {
    let depth = 0;
    let quote: string | null = null;
    for (let i = start; i < text.length; i++) {
      const c = text[i]!;
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        found.push(text.slice(start, i + 1));
        break;
      }
    }
  }
  return found;
}

function parseObject(text: string): Raw | null {
  try {
    const value: unknown = JSON5.parse(text);
    return isObject(value) ? value : null;
  } catch {
    return null;
  }
}

/** PART 1: the first fenced block after "Part 1" that parses as an object, else the first balanced {…}. */
export function extractPart1(markdown: string): Raw {
  const heading = markdown.search(/part\s*1/i);
  const rest = markdown.slice(heading === -1 ? 0 : heading);
  const fenced = [...rest.matchAll(/```[a-z]*\n([\s\S]*?)```/gi)].map((m) => m[1]!);
  for (const block of fenced) {
    const obj = parseObject(block);
    if (obj && "name" in obj) return obj;
  }
  for (const candidate of balancedObjects(rest)) {
    const obj = parseObject(candidate);
    if (obj && "name" in obj) return obj;
  }
  throw new Error("No JSON object found after the PART 1 heading.");
}

export type RatingResult = {
  ratings: Record<RatingKey, number>;
  ratingNotes: Record<RatingKey, string>;
  ratingLowEvidence: RatingKey[];
};

/** The answer's `"ratings": …, "ratingNotes": …, "lowEvidence": …` text, wrapped in {} and read as JSON5. */
export function parseRatings(markdown: string): RatingResult {
  const text = stripFootnotes(markdown);
  // The prompt echoes a template with "ratings": { "network": n …, so take the last one.
  const start = text.lastIndexOf('"ratings"');
  if (start === -1) throw new Error('No "ratings" block found in the rating answer.');
  const tail = text.slice(start);
  const low = /"lowEvidence"\s*:\s*\[[^\]]*\]/.exec(tail);
  if (!low) throw new Error('No "lowEvidence" list found in the rating answer.');
  const obj = parseObject(`{${tail.slice(0, low.index + low[0].length)}}`);
  if (!obj) throw new Error("The ratings block could not be read as JSON5.");
  const { ratings, ratingNotes, lowEvidence } = obj;
  if (!isObject(ratings) || !isObject(ratingNotes) || !Array.isArray(lowEvidence)) {
    throw new Error("The ratings block needs ratings, ratingNotes and lowEvidence.");
  }
  const keys = RatingKey.options;
  for (const key of keys) {
    if (typeof ratings[key] !== "number")
      throw new Error(`Rating "${key}" is missing or not a number.`);
    if (typeof ratingNotes[key] !== "string") throw new Error(`Rating note "${key}" is missing.`);
  }
  return {
    ratings: Object.fromEntries(keys.map((k) => [k, ratings[k]])) as Record<RatingKey, number>,
    ratingNotes: Object.fromEntries(
      keys.map((k) => [k, (ratingNotes[k] as string).trim()]),
    ) as Record<RatingKey, string>,
    ratingLowEvidence: lowEvidence.map((k) => RatingKey.parse(k)),
  };
}

/** The "uncertain or conflicting" bullets, which go into the step 4 PR body. */
export function extractUncertain(markdown: string): string[] {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => /^#{1,6}\s.*(uncertain|conflicting)/i.test(l));
  if (start === -1) return [];
  const items: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line) || /^---\s*$/.test(line)) break;
    const m = /^\s*[-*]\s+(.*)$/.exec(line);
    if (m) items.push(stripFootnotes(m[1]!).trim());
  }
  return items;
}

const PAYMENT_LOOKUP: Record<string, PaymentOption> = {
  installments: "installments",
  "payment plan": "installments",
  "payment plans": "installments",
  "employer sponsorship": "employer_sponsorship",
  "employer sponsorship letter": "employer_sponsorship",
  employer_sponsorship: "employer_sponsorship",
  loans: "loans",
  loan: "loans",
  "federal or private loans": "loans",
  scholarships: "scholarships",
  scholarship: "scholarships",
  "early payment discount": "early_payment_discount",
  early_payment_discount: "early_payment_discount",
};

const nullIfNotPublished = (v: unknown) =>
  typeof v === "string" && /^\s*(not published|n\/a)\.?\s*$/i.test(v) ? null : (v ?? null);

// Perplexity names for facts the schema stores under another field, or has no field for.
const SOURCE_FIELD_MAP: Record<string, string> = {
  hoursPerWeekMin: "hoursPerWeek",
  hoursPerWeekMax: "hoursPerWeek",
  tuitionPerCourse: "tuitionPerCourseUsd",
  numberOfCourses: "courseCount",
};

const normalizeSourceField = (field: string) =>
  SOURCE_FIELD_MAP[field] ?? (field.startsWith("paymentOptions.") ? "paymentOptions" : field);

// The only keys an overrides file may set: facts the research JSON doesn't produce, plus hand
// fixes for ones it gets wrong. Never id, sources, ratings or verification.
const OVERRIDE_KEYS = [
  "locationOffers",
  "attendance",
  "onsiteNote",
  "metro",
  "state",
  "city",
  "campusLat",
  "campusLon",
  "durationMonths",
  "durationMaxMonths",
  "credits",
  "tuitionPerCourseUsd",
  "courseCount",
  "lodgingIncluded",
  "lodgingPerNightUsd",
  "cohortExperienceBasis",
  "figureNotes",
  "extraSources",
] as const;

export type Overrides = Partial<
  Pick<ProgramInput, Exclude<(typeof OVERRIDE_KEYS)[number], "extraSources">>
> & {
  locationOffers: ProgramInput["locationOffers"];
  /** Sources to append, for example quotes the research kept in its Part 2 tables. */
  extraSources?: ProgramInput["sources"];
};

export type Converted = {
  record: ProgramInput;
  /** Things the converter left out or changed, for the PR body. */
  notes: string[];
  uncertain: string[];
};

const PROGRAM_KEYS_FROM_RESEARCH = new Set([
  "name",
  "institution",
  "category",
  "credential",
  "format",
  "durationMonths",
  "credits",
  "onsiteDaysPerYear",
  "residencyCount",
  "longestStretchDays",
  "hoursPerWeekMin",
  "hoursPerWeekMax",
  "workCompatible",
  "city",
  "country",
  "tuitionUsd",
  "tuitionIncludes",
  "paymentOptions",
  "minExperienceYears",
  "accreditation",
  "cohortMedianExperienceYears",
  "cohortSeniority",
  "lodgingPerNightUsd",
  "nextStartDate",
  "sources",
]);

function lodgingFrom(
  raw: Raw,
  sources: Raw[],
  online: boolean,
  notes: string[],
  override: ProgramInput["lodgingPerNightUsd"] | undefined,
) {
  if (override !== undefined) return override;
  if (online) {
    if (raw.lodgingPerNightUsd != null)
      notes.push("lodgingPerNightUsd dropped: the program is online.");
    return null;
  }
  const source = sources.find((s) => s.field === "lodgingPerNightUsd");
  const quote = String(source?.quote ?? "");
  const amounts = [...quote.matchAll(/\$\s?([\d,]+(?:\.\d+)?)/g)].map((m) =>
    Number(m[1]!.replace(/,/g, "")),
  );
  // A quote that mixes in meals or totals would give a wrong range, and travel uses the max.
  if (amounts.length > 0 && /m\s?&\s?ie|meals?|incidental|total|taxes? of/i.test(quote)) {
    throw new Error(
      `The lodging quote mentions more than lodging ("${quote}"). Provide lodgingPerNightUsd {min,max} in the overrides file.`,
    );
  }
  if (amounts.length > 0) {
    const range = { min: Math.min(...amounts), max: Math.max(...amounts) };
    notes.push(`lodgingPerNightUsd set to ${range.min}–${range.max} from the GSA quote.`);
    return range;
  }
  if (typeof raw.lodgingPerNightUsd === "number") {
    throw new Error(
      `lodgingPerNightUsd is the single number ${raw.lodgingPerNightUsd} and its source quote lists no $ amounts. ` +
        `Provide {min,max} in the overrides file.`,
    );
  }
  return null;
}

export function convertResearch(input: {
  id: string;
  research: string;
  rating: string;
  overrides: unknown;
}): Converted {
  const { id } = input;
  const notes: string[] = [];
  const raw = extractPart1(input.research);
  const ratings = parseRatings(input.rating);

  if (!isObject(input.overrides) || !Array.isArray(input.overrides.locationOffers)) {
    throw new Error(`The overrides file must set locationOffers for ${id} (DQ6).`);
  }
  const unknownKeys = Object.keys(input.overrides).filter(
    (k) => !(OVERRIDE_KEYS as readonly string[]).includes(k),
  );
  if (unknownKeys.length > 0) {
    throw new Error(
      `The overrides file for ${id} sets ${unknownKeys.join(", ")}, which it may not. Allowed: ${OVERRIDE_KEYS.join(", ")}.`,
    );
  }
  const { extraSources = [], ...overrides } = input.overrides as Overrides;

  for (const key of Object.keys(raw)) {
    if (!PROGRAM_KEYS_FROM_RESEARCH.has(key))
      notes.push(`Unknown research field "${key}" ignored.`);
  }
  if (raw.nextStartDate != null) notes.push("nextStartDate dropped (DQ7).");

  const online = raw.format === "online";
  const rawSources = (Array.isArray(raw.sources) ? raw.sources : []).filter(isObject);

  // Payment options: fixed values only, an unknown string is a hard error.
  const rawPayment = Array.isArray(raw.paymentOptions) ? raw.paymentOptions : [];
  const payment = rawPayment.map((s) => {
    const mapped = PAYMENT_LOOKUP[String(s).trim().toLowerCase()];
    if (!mapped)
      throw new Error(
        `Unknown payment option "${String(s)}". Add it to the lookup table or fix the research.`,
      );
    return mapped;
  });

  // "3 places": Cambridge, Massachusetts becomes city + state.
  let city = (nullIfNotPublished(raw.city) as string | null) ?? null;
  let state: string | null = null;
  if (city?.includes(",")) {
    const [c, ...rest] = city.split(",");
    city = c!.trim();
    state = rest.join(",").trim() || null;
    notes.push(`city split into "${city}" and state "${state}".`);
  }

  const hMin = raw.hoursPerWeekMin as number | null | undefined;
  const hMax = raw.hoursPerWeekMax as number | null | undefined;
  const hoursPerWeek =
    hMin == null && hMax == null
      ? null
      : { min: (hMin ?? hMax) as number, max: (hMax ?? hMin) as number };

  const lodging = lodgingFrom(raw, rawSources, online, notes, overrides.lodgingPerNightUsd);

  const sources: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const s of rawSources) {
    const field = normalizeSourceField(String(s.field));
    const quote = typeof s.quote === "string" ? s.quote.trim() : "";
    if (!quote || /^not published\.?$/i.test(quote)) continue; // placeholder for a null fact
    if (field === "nextStartDate") continue;
    if (field === "lodgingPerNightUsd" && lodging === null) continue;
    if (field === "mastersStackability" || field === "admissionRequirements") {
      notes.push(`Source for "${field}" dropped: the schema has no such field.`);
      continue;
    }
    const key = `${field}|${s.url}|${quote}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // A fact without a page is something the school told us directly.
    const kind = s.url ? "official_page" : "school_correspondence";
    if (!s.url) notes.push(`Source for "${field}" has no url, so it is school_correspondence.`);
    sources.push({ field, url: s.url, quote, checkedOn: s.checkedOn, kind });
  }

  const cohortYears = (raw.cohortMedianExperienceYears as number | null | undefined) ?? null;

  // Residencies are the only pattern the research JSON can show; anything else is set by hand.
  const derivedAttendance: ProgramInput["attendance"] | undefined = online
    ? "none"
    : (raw.residencyCount as number | null)
      ? "residencies"
      : undefined;
  const record: ProgramInput = {
    id,
    name: raw.name as string,
    institution: raw.institution as string,
    category: raw.category as ProgramInput["category"],
    credential: raw.credential as string,
    format: raw.format as ProgramInput["format"],
    durationMonths: (raw.durationMonths as number | null | undefined) ?? null,
    durationMaxMonths: null,
    credits: nullIfNotPublished(raw.credits) as string | null,
    attendance: derivedAttendance as ProgramInput["attendance"],
    onsiteNote: null,
    onsiteDaysPerYear: (raw.onsiteDaysPerYear as number | null | undefined) ?? null,
    residencyCount: (raw.residencyCount as number | null | undefined) ?? null,
    longestStretchDays: (raw.longestStretchDays as number | null | undefined) ?? null,
    hoursPerWeek,
    workCompatible: raw.workCompatible as boolean,
    city,
    state,
    campusLat: null,
    campusLon: null,
    metro: null,
    country: (raw.country as string | undefined) ?? "US",
    tuitionUsd: (raw.tuitionUsd as number | null | undefined) ?? null,
    tuitionPerCourseUsd: null,
    courseCount: null,
    tuitionIncludes: nullIfNotPublished(raw.tuitionIncludes) as string | null,
    lodgingIncluded: null,
    paymentOptions: payment.length > 0 ? [...new Set(payment)] : null,
    minExperienceYears: (raw.minExperienceYears as number | null | undefined) ?? null,
    accreditation: Array.isArray(raw.accreditation) ? (raw.accreditation as string[]) : null,
    cohortMedianExperienceYears: cohortYears,
    cohortExperienceBasis: cohortYears === null ? null : "unspecified",
    cohortSeniority: nullIfNotPublished(raw.cohortSeniority) as string | null,
    lodgingPerNightUsd: lodging,
    ratings: ratings.ratings,
    ratingNotes: ratings.ratingNotes,
    ratingLowEvidence: ratings.ratingLowEvidence,
    figureNotes: {},
    sources: [...sources, ...extraSources] as ProgramInput["sources"],
    verification: { status: "draft", verifiedBy: null },
    ...overrides,
  };

  if (record.attendance === undefined) {
    throw new Error(
      `attendance can't be derived for ${id} (no residencies, not online). Set it in the overrides file: ` +
        `recurring_weekends, recurring_evenings, recurring_daily or residencies.`,
    );
  }

  return { record, notes, uncertain: extractUncertain(input.research) };
}

/** Validates a converted record and returns "field: message" lines. */
export function recordProblems(record: unknown): string[] {
  const result = ProgramSchema.safeParse(record);
  if (result.success) return [];
  return result.error.issues.map((i) => `${i.path.join(".") || "(record)"}: ${i.message}`);
}

/** Puts a record into the dataset, sorted by id. A verified record is never overwritten without force. */
export function upsertRecord(
  existing: ProgramInput[],
  record: ProgramInput,
  force: boolean,
): ProgramInput[] {
  const current = existing.find((p) => p.id === record.id);
  if (current?.verification.status === "verified" && !force) {
    throw new Error(
      `${record.id} is already verified by ${current.verification.verifiedBy}. Use --force to overwrite it.`,
    );
  }
  return [...existing.filter((p) => p.id !== record.id), record].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
}
