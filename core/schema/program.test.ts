import { describe, expect, it } from "vitest";
import {
  fakeCertificate,
  fakeEmba,
  fakeExecutive,
  fixturePrograms,
} from "../../tests/fixtures/programs";
import { DatasetSchema, FixtureDatasetSchema, validateDataset } from "./dataset";
import { verifiedOn } from "./derived";
import { ProgramSchema, type ProgramInput } from "./program";

const clone = (p: ProgramInput): ProgramInput => structuredClone(p);

function problems(p: ProgramInput): string[] {
  const r = ProgramSchema.safeParse(p);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}

describe("fixture dataset", () => {
  it("is accepted", () => {
    expect(validateDataset(fixturePrograms, "2026-10-08", FixtureDatasetSchema)).toEqual([]);
  });

  it("covers every category once", () => {
    const categories = fixturePrograms.map((p) => p.category).sort();
    expect(categories).toEqual(
      ["certificate", "emba", "executive", "mba", "short_course", "specialized_masters"].sort(),
    );
  });

  it("is refused as real data, because fake ids belong to fixtures", () => {
    const out = validateDataset(fixturePrograms, "2026-10-08");
    expect(out.some((m) => m.includes('"fake-" are test fixtures'))).toBe(true);
  });

  it("accepts the empty dataset", () => {
    expect(validateDataset([], "2026-10-08")).toEqual([]);
    expect(DatasetSchema.safeParse([]).success).toBe(true);
  });
});

describe("required sources", () => {
  it("rejects a record missing its schedule source, naming the group", () => {
    const p = clone(fakeExecutive);
    p.sources = p.sources.filter((s) => s.field !== "format" && s.field !== "durationMonths");
    expect(problems(p).join("\n")).toMatch(/no source for the schedule facts/);
  });

  it("rejects a record missing its tuition source", () => {
    const p = clone(fakeExecutive);
    p.sources = p.sources.filter((s) => s.field !== "tuitionUsd");
    expect(problems(p).join("\n")).toMatch(/no source for the tuition facts/);
  });

  it("rejects a class profile with no source", () => {
    const p = clone(fakeExecutive);
    p.sources = p.sources.filter((s) => s.field !== "cohortMedianExperienceYears");
    expect(problems(p).join("\n")).toMatch(/no source for the class profile facts/);
  });

  it("needs no tuition source when every tuition fact is null", () => {
    const p = clone(fakeExecutive);
    Object.assign(p, {
      tuitionUsd: null,
      tuitionIncludes: null,
      lodgingIncluded: null,
      paymentOptions: null,
    });
    p.sources = p.sources.filter((s) => s.field !== "tuitionUsd");
    expect(problems(p)).toEqual([]);
  });

  it("rejects a source for a field that does not exist", () => {
    const p = clone(fakeExecutive);
    p.sources.push({ ...p.sources[0]!, field: "numberOfCourses" });
    expect(problems(p).join("\n")).toMatch(/"numberOfCourses" is not a program field/);
  });

  it("rejects a 'not published' placeholder in place of a quote", () => {
    const p = clone(fakeExecutive);
    p.sources.push({ ...p.sources[0]!, quote: "not published" });
    expect(problems(p).join("\n")).toMatch(/not 'not published'/);
  });

  it("rejects an official page source with no url but allows school correspondence", () => {
    const noUrl = { field: "format", quote: "Hybrid", checkedOn: "2026-10-01" };
    const official = clone(fakeExecutive);
    official.sources.push({ ...noUrl, kind: "official_page" });
    expect(problems(official).join("\n")).toMatch(/needs a url/);
    const direct = clone(fakeExecutive);
    direct.sources.push({ ...noUrl, kind: "school_correspondence" });
    expect(problems(direct)).toEqual([]);
  });

  it("rejects a checkedOn that is not a real date", () => {
    const p = clone(fakeExecutive);
    p.sources[0] = { ...p.sources[0]!, checkedOn: "2026-02-31" };
    expect(problems(p).join("\n")).toMatch(/checkedOn/);
  });

  it("fails a checkedOn later than today", () => {
    const out = validateDataset([fakeExecutive], "2026-09-01", FixtureDatasetSchema);
    expect(out.join("\n")).toMatch(
      /fake-executive › sources\.0\.checkedOn: 2026-10-01 is later than 2026-09-01/,
    );
  });
});

describe("ratings", () => {
  it.each([0, 6, 3.5])("rejects a rating of %s", (value) => {
    const p = clone(fakeExecutive);
    p.ratings = { ...p.ratings, senior_network: value };
    expect(problems(p).join("\n")).toMatch(/ratings\.senior_network/);
  });

  it("are keyed by the five needs: an old lens name is rejected", () => {
    const p = clone(fakeExecutive) as unknown as { ratings: Record<string, number> };
    p.ratings = { ...p.ratings, network: 4 };
    expect(problems(p as never).join("\n")).toMatch(/ratings.*network/);
  });

  it("list low-evidence ratings by need", () => {
    const p = clone(fakeExecutive);
    p.ratingLowEvidence = ["costValue" as never];
    expect(problems(p).join("\n")).toMatch(/ratingLowEvidence/);
    p.ratingLowEvidence = ["senior_network"];
    expect(problems(p)).toEqual([]);
  });
});

describe("online programs", () => {
  it("rejects on-site days above 0", () => {
    const p = clone(fakeCertificate);
    p.onsiteDaysPerYear = 3;
    expect(problems(p).join("\n")).toMatch(/onsiteDaysPerYear: an online program must have 0/);
  });

  it("rejects null on-site counts, since online means 0", () => {
    const p = clone(fakeCertificate);
    p.residencyCount = null;
    expect(problems(p).join("\n")).toMatch(/residencyCount/);
  });

  it("rejects lodging and a recurring attendance pattern", () => {
    const p = clone(fakeCertificate);
    p.lodgingPerNightUsd = { min: 100, max: 200 };
    p.attendance = "recurring_evenings";
    const out = problems(p).join("\n");
    expect(out).toMatch(/attendance/);
    expect(out).toMatch(/no lodging/);
  });

  it("allows a null city, but an on-site program needs one", () => {
    expect(problems(fakeCertificate)).toEqual([]);
    const p = clone(fakeExecutive);
    p.city = null;
    expect(problems(p).join("\n")).toMatch(/city: required unless/);
  });
});

describe("campus coordinates", () => {
  it("accepts coordinates on site and null online", () => {
    expect(problems(fakeExecutive)).toEqual([]);
    expect(fakeCertificate.campusLat).toBeNull();
    expect(problems(fakeCertificate)).toEqual([]);
  });

  it.each(["in_person", "hybrid"] as const)(
    "validate-data rejects a %s program with null coordinates or address",
    (format) => {
      const p = clone(fakeExecutive);
      p.format = format;
      p.campusAddress = null;
      p.campusLat = null;
      p.campusLon = null;
      const out = validateDataset([p], "2026-10-08", FixtureDatasetSchema).join("\n");
      expect(out).toMatch(/campusAddress: required unless/);
      expect(out).toMatch(/campusLat: required unless/);
      expect(out).toMatch(/campusLon: required unless/);
    },
  );

  it("rejects one null coordinate on site", () => {
    const p = clone(fakeExecutive);
    p.campusLon = null;
    expect(problems(p).join("\n")).toMatch(/campusLon: required unless/);
  });

  it("reports the campus errors together with a missing city", () => {
    const p = clone(fakeExecutive);
    p.city = null;
    p.campusAddress = null;
    p.campusLat = null;
    p.campusLon = null;
    const out = problems(p).join("\n");
    expect(out).toMatch(/city: required unless/);
    expect(out).toMatch(/campusAddress: required unless/);
    expect(out).toMatch(/campusLat: required unless/);
  });

  it("rejects campus fields on an online program", () => {
    const p = clone(fakeCertificate);
    p.campusLat = 42.36;
    p.campusLon = -71.06;
    p.campusAddress = "1 Fixture Way, Boston, MA 02110";
    const out = problems(p).join("\n");
    expect(out).toMatch(/campusLat: an online program has no campus/);
    expect(out).toMatch(/campusLon: an online program has no campus/);
    expect(out).toMatch(/campusAddress: an online program has no campus/);
  });

  it("rejects out-of-range and non-numeric coordinates", () => {
    for (const bad of [{ campusLat: 91 }, { campusLon: -181 }, { campusLat: "42.36" }]) {
      expect(ProgramSchema.safeParse({ ...clone(fakeExecutive), ...bad }).success).toBe(false);
    }
  });

  it("needs a campusAddress source that quotes the address", () => {
    const none = clone(fakeExecutive);
    none.sources = none.sources.filter((s) => s.field !== "campusAddress");
    expect(problems(none).join("\n")).toMatch(/campusAddress: needs an official_page source/);
    expect(problems(none)).toHaveLength(1);
    const wrong = clone(fakeExecutive);
    for (const s of wrong.sources) if (s.field === "campusAddress") s.quote = "Visit us in Boston.";
    expect(problems(wrong).join("\n")).toMatch(/campusAddress: needs an official_page source/);
  });

  it("does not accept correspondence as the source of the address", () => {
    const p = clone(fakeExecutive);
    for (const s of p.sources) if (s.field === "campusAddress") s.kind = "school_correspondence";
    expect(problems(p).join("\n")).toMatch(/campusAddress: needs an official_page source/);
  });

  it("matches the address across line breaks, commas and spacing", () => {
    const p = clone(fakeExecutive);
    p.campusAddress = "2211 Campus Drive, Evanston, IL 60208";
    for (const s of p.sources) {
      if (s.field === "campusAddress") s.quote = "Visit 2211  Campus Drive\nEvanston IL 60208.";
    }
    expect(problems(p)).toEqual([]);
  });

  it("marks the coordinates as derived in the figure notes", () => {
    const p = clone(fakeExecutive);
    p.figureNotes = {};
    const out = problems(p).join("\n");
    expect(out).toMatch(/figureNotes.campusLat: say how/);
    expect(out).toMatch(/figureNotes.campusLon: say how/);
  });
});

describe("lodging", () => {
  it("needs a gsa.gov source for a US rate", () => {
    const p = clone(fakeExecutive);
    p.sources = p.sources.filter((s) => s.field !== "lodgingPerNightUsd");
    p.sources.push({ ...p.sources[0]!, field: "lodgingPerNightUsd" });
    expect(problems(p).join("\n")).toMatch(/gsa\.gov/);
  });

  it("needs any source at all", () => {
    const p = clone(fakeExecutive);
    p.sources = p.sources.filter((s) => s.field !== "lodgingPerNightUsd");
    expect(problems(p).join("\n")).toMatch(/lodging needs a source/);
  });

  it("reports a url without a scheme as an issue instead of throwing", () => {
    const p = clone(fakeExecutive);
    p.sources = p.sources.map((s) =>
      s.field === "lodgingPerNightUsd" ? { ...s, url: "www.gsa.gov/per-diem" } : s,
    );
    const out = problems(p);
    expect(out.some((m) => m.startsWith("sources.") && m.includes(".url:"))).toBe(true);
  });

  it("does not require gsa.gov outside the US", () => {
    const p = clone(fakeExecutive);
    p.country = "GB";
    p.sources = p.sources.map((s) =>
      s.field === "lodgingPerNightUsd" ? { ...s, url: "https://example.ac.uk/rates" } : s,
    );
    expect(problems(p)).toEqual([]);
  });

  it("rejects min above max and a scalar", () => {
    const p = clone(fakeExecutive);
    p.lodgingPerNightUsd = { min: 400, max: 200 };
    expect(problems(p).join("\n")).toMatch(/min must not exceed max/);
    const scalar = clone(fakeExecutive) as unknown as Record<string, unknown>;
    scalar.lodgingPerNightUsd = 365;
    expect(ProgramSchema.safeParse(scalar).success).toBe(false);
  });
});

describe("other rules", () => {
  it("rejects verified without verifiedBy", () => {
    const p = clone(fakeExecutive);
    p.verification = { status: "verified", verifiedBy: null };
    expect(problems(p).join("\n")).toMatch(/verifiedBy/);
  });

  it("rejects a duplicate id", () => {
    const out = validateDataset([fakeExecutive, fakeExecutive], "2026-10-08", FixtureDatasetSchema);
    expect(out.join("\n")).toMatch(/fake-executive › id: duplicate id/);
  });

  it("rejects hours with min above max", () => {
    const p = clone(fakeExecutive);
    p.hoursPerWeek = { min: 12, max: 8 };
    expect(problems(p).join("\n")).toMatch(/hoursPerWeek/);
  });

  it("needs the cohort basis whenever the cohort years are set", () => {
    const p = clone(fakeEmba);
    p.cohortExperienceBasis = null;
    expect(problems(p).join("\n")).toMatch(/cohortExperienceBasis/);
  });

  it("accepts null accreditation (not published) and [] (none) as different values", () => {
    expect(problems({ ...clone(fakeExecutive), accreditation: null })).toEqual([]);
    expect(problems({ ...clone(fakeExecutive), accreditation: [] })).toEqual([]);
  });

  it("rejects a country that is not an ISO code and a figure note on no field", () => {
    const p = clone(fakeExecutive);
    p.country = "USA";
    p.figureNotes = { nonsense: "x" };
    const out = problems(p).join("\n");
    expect(out).toMatch(/country/);
    expect(out).toMatch(/figureNotes\.nonsense/);
  });

  it("rejects an unknown key, so a typo can't slip into the data", () => {
    const p = { ...clone(fakeExecutive), lodgingPerNight: 5 };
    expect(ProgramSchema.safeParse(p).success).toBe(false);
  });

  it.each([0, -1])("rejects a duration of %s months, but allows a fraction", (months) => {
    const p = clone(fakeCertificate);
    p.durationMonths = months;
    p.durationMaxMonths = null;
    expect(problems(p).join("\n")).toMatch(/durationMonths/);
    p.durationMonths = 0.25;
    expect(problems(p)).toEqual([]);
  });

  it("rejects a duration max of 0", () => {
    const p = clone(fakeCertificate);
    p.durationMaxMonths = 0;
    expect(problems(p).join("\n")).toMatch(/durationMaxMonths/);
  });

  it("rejects a duration max below the typical duration", () => {
    const p = clone(fakeCertificate);
    p.durationMaxMonths = 4;
    expect(problems(p).join("\n")).toMatch(/durationMaxMonths/);
  });
});

describe("verifiedOn", () => {
  it("is the oldest checkedOn", () => {
    const p = clone(fakeExecutive);
    p.sources[0] = { ...p.sources[0]!, checkedOn: "2026-08-15" };
    expect(verifiedOn(ProgramSchema.parse(p))).toBe("2026-08-15");
  });
});
