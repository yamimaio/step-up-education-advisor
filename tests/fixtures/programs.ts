import type { ProgramInput } from "../../core/schema/program";

// Six realistic but clearly fake records, one per type. Ids start with "fake-"; none of this
// describes a real school. Shaped for the plan's worked example: the executive program is
// 8 months, both MBAs are 24, and the other three fit inside 12.

const CHECKED = "2026-10-01";
const GSA = "https://www.gsa.gov/travel/plan-book/per-diem-rates";

export function source(id: string, field: string, quote = `Fixture quote for ${field}.`) {
  return {
    field,
    url: `https://example.edu/${id}`,
    quote,
    checkedOn: CHECKED,
    kind: "official_page" as const,
  };
}

const ADDRESS = "1 Fixture Way, Boston, MA 02110";
const DERIVED = "Derived from campusAddress (city-centre approximation).";

export function campusSource(id: string) {
  return source(id, "campusAddress", `Campus: ${ADDRESS}`);
}

const gsaSource = {
  field: "lodgingPerNightUsd",
  url: GSA,
  quote: "Boston / Cambridge ... $365 ... $213 ... $305 ... $365",
  checkedOn: CHECKED,
  kind: "official_page" as const,
};

// A valid, on-site hybrid program; each fixture overrides what makes it different.
function base(id: string, overrides: Partial<ProgramInput>): ProgramInput {
  return {
    id,
    name: `Fixture ${id}`,
    institution: "Fake University (test fixture)",
    category: "executive",
    credential: "Certificate of completion",
    format: "hybrid",
    durationMonths: 8,
    durationMaxMonths: null,
    credits: null,
    attendance: "residencies",
    onsiteNote: null,
    onsiteDaysPerYear: 15,
    residencyCount: 3,
    longestStretchDays: 5,
    hoursPerWeek: { min: 8, max: 10 },
    workCompatible: true,
    city: "Boston",
    state: "MA",
    campusAddress: ADDRESS,
    campusLat: 42.3601,
    campusLon: -71.0589,
    metro: "boston",
    country: "US",
    locationOffers: ["network_density", "industry_hub"],
    tuitionUsd: 30000,
    tuitionPerCourseUsd: null,
    courseCount: null,
    tuitionIncludes: "Tuition, materials, and breakfast and lunch; travel and lodging are extra.",
    lodgingIncluded: false,
    paymentOptions: ["installments", "employer_sponsorship", "early_payment_discount"],
    minExperienceYears: 8,
    accreditation: [],
    cohortMedianExperienceYears: 15,
    cohortExperienceBasis: "median",
    cohortSeniority: "Mostly directors and VPs",
    lodgingPerNightUsd: { min: 213, max: 365 },
    // The executive category defaults (docs/need-based-ranking.md, section 1).
    ratings: {
      leadership_skills: 5,
      deep_expertise: 3,
      graduate_degree: 1,
      senior_network: 5,
      new_industry_or_city: 3,
    },
    ratingNotes: {
      leadership_skills: "Fixture note.",
      deep_expertise: "Fixture note.",
      graduate_degree: "Fixture note.",
      senior_network: "Fixture note.",
      new_industry_or_city: "Fixture note.",
    },
    ratingLowEvidence: [],
    figureNotes: { campusLat: DERIVED, campusLon: DERIVED },
    sources: [
      campusSource(id),
      source(id, "format"),
      source(id, "durationMonths"),
      source(id, "tuitionUsd"),
      source(id, "cohortMedianExperienceYears"),
      gsaSource,
    ],
    verification: { status: "verified", verifiedBy: "Fixture Author" },
    ...overrides,
  };
}

export const fakeExecutive = base("fake-executive", {});

export const fakeEmba = base("fake-emba", {
  category: "emba",
  credential: "Executive MBA",
  format: "in_person",
  durationMonths: 24,
  credits: "60 credits",
  attendance: "recurring_weekends",
  onsiteNote: "Every other Friday and Saturday",
  onsiteDaysPerYear: 48,
  residencyCount: 24,
  longestStretchDays: 2,
  tuitionUsd: 180000,
  tuitionIncludes: "Tuition, books, and lodging on class weekends.",
  lodgingIncluded: true,
  accreditation: ["AACSB"],
  cohortMedianExperienceYears: 14,
  cohortExperienceBasis: "average",
  figureNotes: {
    tuitionUsd: "Fixture note: price for the previous entering class.",
    campusLat: DERIVED,
    campusLon: DERIVED,
  },
  ratings: {
    leadership_skills: 5,
    deep_expertise: 3,
    graduate_degree: 5,
    senior_network: 5,
    new_industry_or_city: 3,
  },
});

export const fakeMba = base("fake-mba", {
  category: "mba",
  credential: "MBA",
  format: "in_person",
  durationMonths: 24,
  durationMaxMonths: 24,
  credits: "60 credits",
  attendance: "recurring_daily",
  onsiteNote: "Full-time, on campus",
  onsiteDaysPerYear: 240,
  residencyCount: null,
  longestStretchDays: null,
  hoursPerWeek: { min: 40, max: 50 },
  workCompatible: false,
  tuitionUsd: 150000,
  minExperienceYears: 2,
  accreditation: ["AACSB", "AMBA"],
  cohortMedianExperienceYears: 5,
  cohortExperienceBasis: "median",
  cohortSeniority: "Mostly individual contributors, some early managers",
  lodgingPerNightUsd: null,
  ratings: {
    leadership_skills: 3,
    deep_expertise: 3,
    graduate_degree: 5,
    senior_network: 1,
    new_industry_or_city: 5,
  },
  sources: [
    campusSource("fake-mba"),
    source("fake-mba", "format"),
    source("fake-mba", "durationMonths"),
    source("fake-mba", "tuitionUsd"),
    source("fake-mba", "cohortSeniority"),
  ],
});

export const fakeSpecializedMasters = base("fake-specialized-masters", {
  category: "specialized_masters",
  credential: "MS in Fixture Management",
  durationMonths: 12,
  durationMaxMonths: 18,
  credits: "30 credits",
  attendance: "recurring_evenings",
  onsiteNote: "Weekday evenings",
  onsiteDaysPerYear: null,
  residencyCount: null,
  longestStretchDays: null,
  tuitionUsd: null,
  tuitionPerCourseUsd: 5000,
  courseCount: 10,
  tuitionIncludes: null,
  lodgingIncluded: null,
  paymentOptions: null,
  accreditation: null,
  cohortMedianExperienceYears: null,
  cohortExperienceBasis: null,
  lodgingPerNightUsd: null,
  ratings: {
    leadership_skills: 3,
    deep_expertise: 5,
    graduate_degree: 5,
    senior_network: 1,
    new_industry_or_city: 3,
  },
  ratingLowEvidence: ["senior_network"],
  sources: [
    campusSource("fake-specialized-masters"),
    source("fake-specialized-masters", "format"),
    source("fake-specialized-masters", "tuitionPerCourseUsd"),
    source("fake-specialized-masters", "cohortSeniority"),
  ],
  verification: { status: "draft", verifiedBy: null },
});

export const fakeCertificate = base("fake-certificate", {
  category: "certificate",
  credential: "Graduate certificate",
  format: "online",
  durationMonths: 8,
  durationMaxMonths: 36,
  credits: "4 courses for graduate credit",
  attendance: "none",
  onsiteDaysPerYear: 0,
  residencyCount: 0,
  longestStretchDays: 0,
  hoursPerWeek: null,
  city: null,
  state: null,
  campusAddress: null,
  campusLat: null,
  campusLon: null,
  metro: null,
  country: "US",
  locationOffers: ["travel_ease", "affordability"],
  tuitionUsd: 14000,
  tuitionPerCourseUsd: 3500,
  courseCount: 4,
  tuitionIncludes: "Tuition only; books may be extra.",
  lodgingIncluded: null,
  paymentOptions: ["installments", "loans", "scholarships"],
  minExperienceYears: null,
  cohortMedianExperienceYears: null,
  cohortExperienceBasis: null,
  cohortSeniority: "Titles include analyst, program manager and director",
  lodgingPerNightUsd: null,
  ratings: {
    leadership_skills: 3,
    deep_expertise: 3,
    graduate_degree: 3,
    senior_network: 1,
    new_industry_or_city: 1,
  },
  sources: [
    source("fake-certificate", "format"),
    source("fake-certificate", "tuitionUsd"),
    source("fake-certificate", "cohortSeniority"),
  ],
});

export const fakeShortCourse = base("fake-short-course", {
  category: "short_course",
  credential: "Certificate of completion",
  format: "in_person",
  durationMonths: 0.25,
  credits: "none",
  attendance: "residencies",
  onsiteDaysPerYear: 5,
  residencyCount: 1,
  longestStretchDays: 5,
  hoursPerWeek: null,
  tuitionUsd: 9000,
  paymentOptions: null,
  minExperienceYears: null,
  cohortMedianExperienceYears: null,
  cohortExperienceBasis: null,
  cohortSeniority: null,
  ratings: {
    leadership_skills: 3,
    deep_expertise: 3,
    graduate_degree: 1,
    senior_network: 1,
    new_industry_or_city: 1,
  },
  sources: [
    campusSource("fake-short-course"),
    source("fake-short-course", "format"),
    source("fake-short-course", "tuitionUsd"),
    gsaSource,
  ],
});

export const fixturePrograms: ProgramInput[] = [
  fakeExecutive,
  fakeEmba,
  fakeMba,
  fakeSpecializedMasters,
  fakeCertificate,
  fakeShortCourse,
];
