import { z } from "zod";
import { IsoDate, HoursRange, Text, CountryCode, Latitude, Longitude } from "./common";
import { Attendance, Category, Format, LocationValue, PaymentOption, RatingKey } from "./enums";

const nonNegative = z.number().nonnegative();
const nonNegativeInt = z.number().int().nonnegative();
const text = Text;

const Rating = z.number().int().min(1).max(5);

const Ratings = z.strictObject({
  network: Rating,
  depth: Rating,
  practicality: Rating,
  costValue: Rating,
});

const RatingNotes = z.strictObject({
  network: text,
  depth: text,
  practicality: text,
  costValue: text,
});

// GSA publishes lodging by month, so a program carries the range across the fiscal year.
// The travel estimate uses `max`.
const LodgingRange = z
  .strictObject({ min: nonNegative, max: nonNegative })
  .refine((l) => l.min <= l.max, "min must not exceed max");

export const SourceKind = z.enum(["official_page", "school_correspondence"]);

const ProgramObject = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use lowercase letters, digits and hyphens"),
  name: text,
  institution: text,
  category: Category,
  credential: text,
  format: Format,
  // Typical or fastest published length; durationMaxMonths is the slowest allowed pace.
  // Null means the school doesn't publish it.
  durationMonths: z.number().positive().nullable(),
  durationMaxMonths: z.number().positive().nullable(),
  // What the program awards beyond the certificate, in the school's words.
  credits: text.nullable(),
  attendance: Attendance,
  // The published schedule wording, shown on the card.
  onsiteNote: text.nullable(),
  // Total on-site days (residencies and weekend sessions); 0 for online; null if unpublished.
  onsiteDaysPerYear: nonNegative.nullable(),
  residencyCount: nonNegativeInt.nullable(),
  longestStretchDays: nonNegative.nullable(),
  hoursPerWeek: HoursRange.nullable(),
  workCompatible: z.boolean(),
  // Bare city name; null only for online programs.
  city: text.nullable(),
  state: text.nullable(),
  // Approximate campus coordinates in degrees; the engine compares them with the user's home.
  // The official street address the coordinates were derived from; needs a source quoting it.
  campusAddress: text.nullable(),
  campusLat: Latitude.nullable(),
  campusLon: Longitude.nullable(),
  // Same-metro key (for example "boston" for Boston and Cambridge); resolved by core in step 3.
  metro: text.nullable(),
  // ISO 3166 alpha-2 code.
  country: CountryCode,
  locationOffers: z
    .array(LocationValue)
    .refine((a) => new Set(a).size === a.length, "must not repeat a value"),
  tuitionUsd: nonNegative.nullable(),
  tuitionPerCourseUsd: nonNegative.nullable(),
  courseCount: nonNegativeInt.nullable(),
  tuitionIncludes: text.nullable(),
  // True when tuition covers lodging, so the travel estimate skips it.
  lodgingIncluded: z.boolean().nullable(),
  paymentOptions: z
    .array(PaymentOption)
    .min(1)
    .refine((a) => new Set(a).size === a.length, "must not repeat a value")
    .nullable(),
  minExperienceYears: nonNegative.nullable(),
  // [] = non-degree or none; null = not published.
  accreditation: z.array(text).nullable(),
  cohortMedianExperienceYears: nonNegative.nullable(),
  cohortExperienceBasis: z.enum(["median", "average", "unspecified"]).nullable(),
  cohortSeniority: text.nullable(),
  lodgingPerNightUsd: LodgingRange.nullable(),
  ratings: Ratings,
  ratingNotes: RatingNotes,
  ratingLowEvidence: z.array(RatingKey),
  // A short caveat shown next to a value, keyed by the field it is about.
  figureNotes: z.record(z.string(), text),
  sources: z.array(
    z.strictObject({
      field: z.string(),
      // A school page. Optional only for facts the school gave directly.
      url: z.url().optional(),
      quote: text,
      checkedOn: IsoDate,
      kind: SourceKind.default("official_page"),
    }),
  ),
  verification: z.strictObject({
    status: z.enum(["draft", "verified"]),
    verifiedBy: text.nullable(),
  }),
});

type FieldKey = keyof z.input<typeof ProgramObject>;

export const PROGRAM_FIELDS = Object.keys(ProgramObject.shape) as FieldKey[];
// Facts a source can be about: every field except the sources themselves.
export const SOURCEABLE_FIELDS = PROGRAM_FIELDS.filter((k) => k !== "sources");

// The plan's three fact groups. A group needs a source when any of its fields has a value.
export const FACT_GROUPS = {
  tuition: [
    "tuitionUsd",
    "tuitionPerCourseUsd",
    "courseCount",
    "tuitionIncludes",
    "lodgingIncluded",
    "paymentOptions",
  ],
  schedule: [
    "format",
    "durationMonths",
    "durationMaxMonths",
    "attendance",
    "onsiteNote",
    "onsiteDaysPerYear",
    "residencyCount",
    "longestStretchDays",
    "hoursPerWeek",
  ],
  "campus location": ["campusAddress", "campusLat", "campusLon"],
  "class profile": ["cohortMedianExperienceYears", "cohortExperienceBasis", "cohortSeniority"],
} as const satisfies Record<string, readonly FieldKey[]>;

const isGsa = (url: string | undefined) => {
  if (!url) return false;
  // A malformed url is already reported by z.url(); superRefine still runs, so don't throw here.
  try {
    const host = new URL(url).hostname;
    return host === "gsa.gov" || host.endsWith(".gsa.gov");
  } catch {
    return false;
  }
};

export const ProgramSchema = ProgramObject.superRefine((p, ctx) => {
  const fail = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: "custom", path, message });

  // Sources: a real field, a real quote, a URL unless the school told us directly.
  p.sources.forEach((s, i) => {
    if (!(SOURCEABLE_FIELDS as string[]).includes(s.field)) {
      fail(["sources", i, "field"], `"${s.field}" is not a program field`);
    }
    if (/^not published\.?$/i.test(s.quote)) {
      fail(["sources", i, "quote"], "a source needs the school's own words, not 'not published'");
    }
    if (s.kind === "official_page" && !s.url) {
      fail(["sources", i, "url"], "an official_page source needs a url");
    }
  });

  // Fact-group coverage.
  const sourced = new Set(p.sources.map((s) => s.field));
  for (const [group, fields] of Object.entries(FACT_GROUPS)) {
    const present = fields.filter((f) => p[f] !== null && p[f] !== undefined);
    if (present.length > 0 && !fields.some((f) => sourced.has(f))) {
      fail(
        ["sources"],
        `no source for the ${group} facts (${present.join(", ")}); add one with a field from: ${fields.join(", ")}`,
      );
    }
  }

  // Lodging: a source for it, on gsa.gov for US programs.
  if (p.lodgingPerNightUsd !== null) {
    const lodgingSources = p.sources.filter((s) => s.field === "lodgingPerNightUsd");
    if (lodgingSources.length === 0) {
      fail(["lodgingPerNightUsd"], "lodging needs a source with field lodgingPerNightUsd");
    } else if (p.country === "US" && !lodgingSources.some((s) => isGsa(s.url))) {
      fail(["lodgingPerNightUsd"], "a US lodging rate needs a source on gsa.gov");
    }
  }

  // Online programs have no on-site time, location or lodging.
  if (p.format === "online") {
    for (const f of ["onsiteDaysPerYear", "residencyCount", "longestStretchDays"] as const) {
      if (p[f] !== 0) fail([f], "an online program must have 0 here");
    }
    if (p.attendance !== "none")
      fail(["attendance"], 'an online program must have attendance "none"');
    if (p.lodgingPerNightUsd !== null)
      fail(["lodgingPerNightUsd"], "an online program has no lodging");
  } else if (p.city === null) {
    fail(["city"], "required unless the program is online");
  } else {
    for (const f of ["campusAddress", "campusLat", "campusLon"] as const) {
      if (p[f] === null) fail([f], "required unless the program is online");
    }
  }

  // The coordinates are derived from the address, so the address is quoted from the school and
  // the figure notes say so.
  if (p.campusAddress !== null) {
    const quotes = p.sources.filter((s) => s.field === "campusAddress");
    if (!quotes.some((s) => s.quote.toLowerCase().includes(p.campusAddress!.toLowerCase()))) {
      fail(["campusAddress"], "needs a source with field campusAddress whose quote contains it");
    }
  }
  for (const f of ["campusLat", "campusLon"] as const) {
    if (p[f] !== null && !/derived/i.test(p.figureNotes[f] ?? "")) {
      fail(["figureNotes", f], 'say how it was obtained, for example "derived from campusAddress"');
    }
  }

  if (
    p.durationMonths !== null &&
    p.durationMaxMonths !== null &&
    p.durationMaxMonths < p.durationMonths
  ) {
    fail(["durationMaxMonths"], "must not be less than durationMonths");
  }

  if ((p.cohortMedianExperienceYears === null) !== (p.cohortExperienceBasis === null)) {
    fail(
      ["cohortExperienceBasis"],
      "set together with cohortMedianExperienceYears (median, average or unspecified), or both null",
    );
  }

  for (const key of Object.keys(p.figureNotes)) {
    if (!(SOURCEABLE_FIELDS as string[]).includes(key)) {
      fail(["figureNotes", key], `"${key}" is not a program field`);
    }
  }

  if (new Set(p.ratingLowEvidence).size !== p.ratingLowEvidence.length) {
    fail(["ratingLowEvidence"], "must not repeat a rating");
  }

  if (p.verification.status === "verified" && p.verification.verifiedBy === null) {
    fail(["verification", "verifiedBy"], "a verified record needs verifiedBy");
  }
});

export type Program = z.infer<typeof ProgramSchema>;
export type ProgramInput = z.input<typeof ProgramSchema>;
