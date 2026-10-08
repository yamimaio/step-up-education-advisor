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
    p.ratings = { ...p.ratings, network: value };
    expect(problems(p).join("\n")).toMatch(/ratings\.network/);
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
