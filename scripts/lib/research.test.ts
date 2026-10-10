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
  it("are keyed by the five needs, parsed past footnote markers and \\$ escapes", () => {
    const r = parseRatings(read("fake-sample-rating.md"));
    expect(r.ratings).toEqual({
      leadership_skills: 5,
      deep_expertise: 3,
      graduate_degree: 2,
      senior_network: 4,
      new_industry_or_city: 3,
    });
    expect(r.ratingNotes.new_industry_or_city).toMatch(/the \$24,000 fee\.$/);
    expect(r.ratingNotes.graduate_degree).toMatch(/^default 1 → 2 because "participants/);
    expect(r.ratingLowEvidence).toEqual(["senior_network", "new_industry_or_city"]);
  });

  it("use the answer, not the prompt's template", () => {
    expect(parseRatings(read("fake-sample-rating.md")).ratings.leadership_skills).toBe(5);
  });

  it("ignore a later sentence that quotes the word ratings (#16)", () => {
    const answer = `${read("fake-sample-rating.md")}\nNote: the "ratings" above reflect low evidence.\n`;
    expect(parseRatings(answer).ratings.senior_network).toBe(4);
  });

  it("reject a lowEvidence list that isn't a JSON array, so the file gets fixed", () => {
    const answer = read("fake-sample-rating.md").replace(
      '"lowEvidence": ["senior_network", "new_industry_or_city"]',
      // A function, since "$$" in a replacement string means one "$".
      () => '"lowEvidence": $$\n"senior_network",\n"new_industry_or_city"\n$$',
    );
    expect(() => parseRatings(answer)).toThrow(/lowEvidence/);
  });

  it("reject a rating keyed by an old lens name", () => {
    const old =
      '"ratings": { "network": 4, "depth": 3, "practicality": 4, "costValue": 3 },\n"ratingNotes": {},\n"lowEvidence": []';
    expect(() => parseRatings(old)).toThrow(/leadership_skills/);
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

  it("skips an example block that is not the program record", () => {
    const text = `PART 1\n\`\`\`json\n{ "note": "example" }\n\`\`\`\n${block}`;
    expect(extractPart1(text).name).toBe("X");
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

  it("refuses a lodging quote that mixes in meals, unless the overrides give the range", () => {
    const s = sample();
    s.research = s.research.replace(
      "Boston / Cambridge ... $365 ... $213 ... $305 ... $365",
      "Lodging $190 ... M&IE $79",
    );
    expect(() => convertResearch(s)).toThrow(/more than lodging/);
    const ok = convertResearch({
      ...s,
      overrides: { ...(s.overrides as object), lodgingPerNightUsd: { min: 190, max: 190 } },
    });
    expect(ok.record.lodgingPerNightUsd).toEqual({ min: 190, max: 190 });
  });

  it("refuses overrides that set id, sources, ratings or verification", () => {
    for (const key of ["id", "sources", "ratings", "verification"]) {
      const s = sample();
      s.overrides = { ...(s.overrides as object), [key]: {} };
      expect(() => convertResearch(s)).toThrow(new RegExp(`sets ${key}, which it may not`));
    }
  });

  it("appends extraSources from the overrides", () => {
    const s = sample();
    const extra = {
      field: "hoursPerWeek",
      url: "https://example.edu/fake-sample/workload",
      quote: "About 10 hours a week",
      checkedOn: "2026-10-01",
      kind: "official_page",
    };
    s.overrides = { ...(s.overrides as object), extraSources: [extra] };
    expect(convertResearch(s).record.sources.at(-1)).toEqual(extra);
  });

  it("lets the overrides set a fact from school material when a source backs it", () => {
    const s = sample();
    const extra = {
      field: "cohortMedianExperienceYears",
      quote: "With an average of 19 years of professional experience",
      checkedOn: "2026-10-01",
      kind: "school_correspondence",
    };
    s.overrides = {
      ...(s.overrides as object),
      cohortMedianExperienceYears: 19,
      cohortExperienceBasis: "average",
      workCompatible: false,
    };
    expect(() => convertResearch(s)).toThrow(
      /sets workCompatible, cohortMedianExperienceYears without a matching extraSources entry/,
    );
    const base = s.overrides as { extraSources?: unknown[] };
    s.overrides = {
      ...base,
      extraSources: [
        ...(base.extraSources ?? []),
        extra,
        { ...extra, field: "workCompatible", quote: "Full-time study" },
      ],
    };
    const { record } = convertResearch(s);
    expect(record.cohortMedianExperienceYears).toBe(19);
    expect(record.cohortExperienceBasis).toBe("average");
    expect(record.workCompatible).toBe(false);
    expect(recordProblems(record)).toEqual([]);
  });

  it("lets the overrides set a sourced format the research left null", () => {
    const s = sample();
    s.research = s.research.replace(/"format": "[a-z_]+"/, '"format": null');
    const base = s.overrides as { extraSources?: unknown[] };
    s.overrides = { ...base, format: "in_person" };
    expect(() => convertResearch(s)).toThrow(/sets format without a matching extraSources entry/);
    s.overrides = {
      ...base,
      format: "in_person",
      extraSources: [
        ...(base.extraSources ?? []),
        {
          field: "format",
          url: "https://example.edu/fake-sample/format",
          quote: "All courses are offered on campus.",
          checkedOn: "2026-10-10",
        },
      ],
    };
    const { record } = convertResearch(s);
    expect(record.format).toBe("in_person");
    expect(recordProblems(record)).toEqual([]);
  });

  it("lets the overrides set a price from another intake (B1) with a source", () => {
    const s = sample();
    const base = s.overrides as { extraSources?: unknown[] };
    s.overrides = { ...base, tuitionUsd: 243000, paymentOptions: ["installments", "loans"] };
    expect(() => convertResearch(s)).toThrow(
      /sets tuitionUsd, paymentOptions without a matching extraSources entry/,
    );
    const price = {
      field: "tuitionUsd",
      url: "https://example.edu/fake-sample/tuition",
      quote: "Tuition for the class entering in 2026 is $243,000.",
      checkedOn: "2026-10-10",
    };
    s.overrides = {
      ...base,
      tuitionUsd: 243000,
      paymentOptions: ["installments", "loans"],
      extraSources: [
        ...(base.extraSources ?? []),
        price,
        { ...price, field: "paymentOptions", quote: "six equal installments ... loans" },
      ],
    };
    const { record } = convertResearch(s);
    expect(record.tuitionUsd).toBe(243000);
    expect(record.paymentOptions).toEqual(["installments", "loans"]);
    expect(recordProblems(record)).toEqual([]);
  });

  it("drops the research sources of a field the overrides replace", () => {
    const s = sample();
    const base = s.overrides as { extraSources?: unknown[] };
    const newer = {
      field: "durationMonths",
      url: "https://example.edu/fake-sample/schedule.pdf",
      quote: "Newer schedule",
      checkedOn: "2026-10-02",
      kind: "official_page",
    };
    s.overrides = { ...base, replaceSources: ["durationMonths"] };
    expect(() => convertResearch(s)).toThrow(
      /replaces the sources of durationMonths without a matching extraSources entry/,
    );
    s.overrides = {
      ...base,
      replaceSources: ["durationMonths"],
      extraSources: [...(base.extraSources ?? []), newer],
    };
    const durationSources = convertResearch(s).record.sources.filter(
      (x) => x.field === "durationMonths",
    );
    expect(durationSources).toEqual([newer]);
  });

  it("marks a source with no url as school_correspondence and says so", () => {
    const s = sample();
    s.research = s.research.replace(/("field": "durationMonths",\s*)"url": "[^"]*",\s*/, "$1");
    expect(s.research).not.toMatch(/durationMonths",\s*"url"/);
    const { record, notes } = convertResearch(s);
    expect(record.sources.find((x) => x.field === "durationMonths")?.kind).toBe(
      "school_correspondence",
    );
    expect(notes.join("\n")).toMatch(/durationMonths.*school_correspondence/);
    expect(recordProblems(record)).toEqual([]);
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
