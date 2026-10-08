import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ProgramSchema } from "../../core/schema/program";
import {
  convertResearch,
  extractPart1,
  extractUncertain,
  parseRatings,
  recordProblems,
  upsertRecord,
} from "./research";

const dir = new URL("../../tests/fixtures/research/", import.meta.url);
const read = (name: string) => readFileSync(new URL(name, dir), "utf8");

const sample = () => ({
  id: "fake-sample",
  research: read("fake-sample.md"),
  rating: read("fake-sample-rating.md"),
  overrides: JSON.parse(read("fake-sample-overrides.json")) as unknown,
});

describe("fake sample", () => {
  it("converts to a valid draft record", () => {
    const { record, notes } = convertResearch(sample());
    expect(recordProblems(record)).toEqual([]);
    expect(record.verification).toEqual({ status: "draft", verifiedBy: null });
    expect(record.id).toBe("fake-sample");
    expect(notes).toContain("nextStartDate dropped (DQ7).");
  });

  it("reads JSON with comments and a trailing comma around prose", () => {
    expect(extractPart1(read("fake-sample.md")).name).toBe("Technology Leadership Intensive");
  });

  it("maps free-text payment options, splits the city and keeps null fields null", () => {
    const { record } = convertResearch(sample());
    expect(record.paymentOptions).toEqual(["installments", "employer_sponsorship"]);
    expect(record.city).toBe("Boston");
    expect(record.state).toBe("Massachusetts");
    expect(record.hoursPerWeek).toBeNull();
    expect(record.tuitionIncludes).toBeNull();
  });

  it("turns the single GSA number into a range from the quote", () => {
    const { record } = convertResearch(sample());
    expect(record.lodgingPerNightUsd).toEqual({ min: 213, max: 365 });
  });

  it("normalizes source fields and drops 'not published' placeholders", () => {
    const { record } = convertResearch(sample());
    const fields = record.sources.map((s) => s.field);
    expect(fields).toContain("paymentOptions");
    expect(fields).not.toContain("paymentOptions.installments");
    expect(fields).not.toContain("hoursPerWeekMin");
    expect(fields).not.toContain("nextStartDate");
  });

  it("sets the cohort basis to unspecified, to be confirmed by hand", () => {
    expect(convertResearch(sample()).record.cohortExperienceBasis).toBe("unspecified");
  });

  it("returns the uncertain items for the PR body", () => {
    const { uncertain } = convertResearch(sample());
    expect(uncertain).toHaveLength(3);
    expect(uncertain[0]).toMatch(/six months/);
    expect(uncertain[0]).not.toMatch(/\[\^/);
  });
});

describe("ratings", () => {
  it("are parsed past footnote markers and \\$ escapes", () => {
    const r = parseRatings(read("fake-sample-rating.md"));
    expect(r.ratings).toEqual({ network: 4, depth: 3, practicality: 4, costValue: 3 });
    expect(r.ratingNotes.costValue).toMatch(/^\$24,000/);
    expect(r.ratingLowEvidence).toEqual(["costValue"]);
  });

  it("use the answer, not the prompt's template", () => {
    expect(parseRatings(read("fake-sample-rating.md")).ratings.network).toBe(4);
  });

  it("fail clearly when the block is missing", () => {
    expect(() => parseRatings("nothing here")).toThrow(/ratings/);
  });
});

describe("part 1 headings", () => {
  const block = '```json\n{ "name": "X" }\n```';
  it.each(["## PART 1", "## Part 1 — JSON", "## Part 1: JSON"])("finds the JSON after %s", (h) => {
    expect(extractPart1(`prompt text\n\n${h}\n\n${block}`).name).toBe("X");
  });

  it("falls back to a bare object when there is no fence", () => {
    expect(extractPart1('PART 1\n{ "name": "Y", "a": 1, }').name).toBe("Y");
  });
});

describe("failures", () => {
  it("names an unknown payment option", () => {
    const s = sample();
    s.research = s.research.replace('"employer sponsorship"', '"gift basket"');
    expect(() => convertResearch(s)).toThrow(/Unknown payment option "gift basket"/);
  });

  it("requires locationOffers in the overrides", () => {
    expect(() => convertResearch({ ...sample(), overrides: {} })).toThrow(/locationOffers/);
  });

  it("asks for attendance when it can't be derived", () => {
    const s = sample();
    s.research = s.research.replace('"residencyCount": 2', '"residencyCount": null');
    expect(() => convertResearch(s)).toThrow(/attendance can't be derived/);
    const ok = convertResearch({
      ...s,
      overrides: { ...(s.overrides as object), attendance: "recurring_weekends" },
    });
    expect(ok.record.attendance).toBe("recurring_weekends");
  });

  it("refuses a lone lodging number it can't turn into a range", () => {
    const s = sample();
    s.research = s.research.replace(
      "Boston / Cambridge ... $365 ... $213 ... $305 ... $365",
      "see page",
    );
    expect(() => convertResearch(s)).toThrow(/single number 365/);
  });

  it("reports schema problems per field instead of fixing them", () => {
    const s = sample();
    s.research = s.research.replace('"workCompatible": true', '"workCompatible": "yes"');
    expect(recordProblems(convertResearch(s).record).join("\n")).toMatch(/workCompatible/);
  });
});

describe("online programs", () => {
  it("drop lodging and its source, and get attendance none", () => {
    const s = sample();
    s.research = s.research
      .replace('"format": "hybrid"', '"format": "online"')
      .replace('"onsiteDaysPerYear": 10', '"onsiteDaysPerYear": 0')
      .replace('"residencyCount": 2', '"residencyCount": 0')
      .replace('"longestStretchDays": 5', '"longestStretchDays": 0')
      .replace('"city": "Boston, Massachusetts"', '"city": null');
    const { record } = convertResearch({ ...s, overrides: { locationOffers: ["travel_ease"] } });
    expect(record.attendance).toBe("none");
    expect(record.lodgingPerNightUsd).toBeNull();
    expect(record.sources.map((x) => x.field)).not.toContain("lodgingPerNightUsd");
    expect(recordProblems(record)).toEqual([]);
  });
});

describe("upsertRecord", () => {
  const draft = ProgramSchema.parse(convertResearch(sample()).record);
  const verified = {
    ...draft,
    verification: { status: "verified" as const, verifiedBy: "Someone" },
  };

  it("sorts by id and replaces a draft", () => {
    const other = { ...draft, id: "aaa" };
    const out = upsertRecord([draft, other], { ...draft, name: "New" }, false);
    expect(out.map((p) => p.id)).toEqual(["aaa", "fake-sample"]);
    expect(out[1]!.name).toBe("New");
  });

  it("does not overwrite a verified record without force", () => {
    expect(() => upsertRecord([verified], draft, false)).toThrow(/already verified by Someone/);
    expect(upsertRecord([verified], draft, true)[0]!.verification.status).toBe("draft");
  });
});

describe("extractUncertain", () => {
  it("returns nothing when there is no such section", () => {
    expect(extractUncertain("# Title\n\ntext")).toEqual([]);
  });
});
