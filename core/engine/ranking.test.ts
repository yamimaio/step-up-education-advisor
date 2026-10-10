import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import {
  cohortText,
  formatFit,
  ordinal,
  programScore,
  rankPrograms,
  seniorPeersRating,
  totalCost,
  travelFit,
} from "./ranking";
import type { Check, ProgramEvaluation } from "./types";
import { loadPrograms } from "../data/load";
import { fixture, fixtureDataset } from "../../tests/fixtures/dataset";
import { BOSTON, makeProfile, personaAProfile } from "../../tests/fixtures/profiles";

const today = new Date("2026-10-08T00:00:00Z");

describe("Persona A (the done-when)", () => {
  const result = evaluate(personaAProfile, fixtureDataset(), today);

  it("ranks the executive fixture first, with a why line naming senior peers", () => {
    expect(result.category.winner).toBe("executive");
    expect(result.ranking.ranked[0]).toEqual({
      id: "fake-executive",
      why: "Ranked first for senior peers (cohort median 15 years) and leadership skills.",
    });
  });

  it("scores it 3 × 4 + 2 × 5 + 1 × 3, + 2 × format fit 5, + 1 × travel fit 5", () => {
    const exec = result.programs.find((p) => p.id === "fake-executive");
    expect(exec?.score.needs.map((n) => [n.need, n.rating, n.points])).toEqual([
      ["senior_network", 4, 12],
      ["leadership_skills", 5, 10],
      ["deep_expertise", 3, 3],
    ]);
    expect(exec?.score.format).toEqual({ fit: 5, text: "Blended, as you prefer." });
    expect(exec?.score.travel).toEqual({
      fit: 5,
      text: "3 trips to campus, which you said you enjoy.",
    });
    expect(exec?.score.total).toBe(40);
  });

  it("keeps the runner-up's near miss out of 'Also worth a look'", () => {
    // The certificate doesn't publish its weekly hours, so it is a near miss.
    expect(result.category.runnerUp).toBe("certificate");
    expect(result.programs.find((p) => p.id === "fake-certificate")?.status).toBe("near_miss");
    expect(result.ranking.alsoWorthALook).toEqual([]);
  });

  it("lists it there once it passes, with its own why line", () => {
    const programs = fixtureDataset().map((p) =>
      p.id === "fake-certificate" ? { ...p, hoursPerWeek: { min: 6, max: 8 } } : p,
    );
    expect(evaluate(personaAProfile, programs, today).ranking.alsoWorthALook).toEqual([
      {
        id: "fake-certificate",
        why: "Also worth a look for leadership skills and deep expertise.",
      },
    ]);
  });
});

describe("Senior peers comes from the cohort figure when it is published", () => {
  it.each([
    [0, 1],
    [4.9, 1],
    [5, 2],
    [9, 2],
    [10, 3],
    [14, 3],
    [15, 4],
    [19, 4],
    [20, 5],
    [30, 5],
  ])("%s years → %s", (years, rating) => {
    expect(seniorPeersRating(years)).toBe(rating);
  });

  const profile = {
    needs: ["senior_network"],
    formatPreference: "no_preference",
    travelComfort: "fine",
  } as const;
  const none = { kind: "none", trips: 0, tripsPerYear: 0, tripsEstimated: false } as const;

  it("ignores the record's rating when the figure exists", () => {
    const program = fixture("fake-executive", { cohortMedianExperienceYears: 8 });
    const [n] = programScore(program, { ...profile, needs: [...profile.needs] }, none).needs;
    expect(n).toMatchObject({ rating: 2, derived: true, note: "cohort median 8 years" });
  });

  it("uses the record's rating and note when the figure is null", () => {
    const program = fixture("fake-specialized-masters");
    const [n] = programScore(program, { ...profile, needs: [...profile.needs] }, none).needs;
    expect(n).toMatchObject({
      rating: 1,
      derived: false,
      note: "Fixture note.",
      lowEvidence: true,
    });
  });

  it("words the figure by what the school publishes", () => {
    const text = (basis: "median" | "average" | "unspecified") =>
      cohortText({ cohortMedianExperienceYears: 14, cohortExperienceBasis: basis });
    expect(text("median")).toBe("cohort median 14 years");
    expect(text("average")).toBe("cohort average 14 years");
    expect(text("unspecified")).toBe("cohort about 14 years");
  });
});

describe("Format fit (section 3a)", () => {
  it.each([
    ["blended", "hybrid", 5, "Blended, as you prefer."],
    ["online", "online", 5, "Online, as you prefer."],
    ["in_person", "in_person", 5, "In person, as you prefer."],
    ["blended", "online", 3, "Online; you prefer blended."],
    ["blended", "in_person", 3, "In person; you prefer blended."],
    ["online", "hybrid", 3, "Blended; you prefer online."],
    ["in_person", "hybrid", 3, "Blended; you prefer in person."],
    ["online", "in_person", 1, "In person; you prefer online."],
    ["in_person", "online", 1, "Online; you prefer in person."],
  ] as const)("prefers %s, program is %s → %s", (preference, format, fit, text) => {
    expect(formatFit(preference, format)).toEqual({ fit, text });
  });

  it("scores every format 3 with no line when there is no preference", () => {
    for (const format of ["online", "hybrid", "in_person"] as const) {
      expect(formatFit("no_preference", format)).toEqual({ fit: 3, text: null });
    }
  });
});

describe("Travel fit (section 3a)", () => {
  const trips = { kind: "estimate", trips: 3, tripsPerYear: 3, tripsEstimated: false } as const;
  const none = { kind: "none", trips: 0, tripsPerYear: 0, tripsEstimated: false } as const;

  it("is 5 for someone who enjoys travel when the program needs trips, else 3", () => {
    expect(travelFit("appeal", trips)).toEqual({
      fit: 5,
      text: "3 trips to campus, which you said you enjoy.",
    });
    expect(travelFit("appeal", none)).toEqual({ fit: 3, text: null });
  });

  it("is 1 for someone who finds travel a burden when the program needs trips, else 3", () => {
    expect(travelFit("burden", trips)).toEqual({
      fit: 1,
      text: "3 trips to campus, which you said is a burden.",
    });
    expect(travelFit("burden", none)).toEqual({ fit: 3, text: null });
  });

  it("is 3 for every program when travel is fine", () => {
    expect(travelFit("fine", trips)).toEqual({ fit: 3, text: null });
  });

  it("says when the trip count is estimated or unknown", () => {
    expect(
      travelFit("appeal", { kind: "estimate", trips: 26, tripsPerYear: 26, tripsEstimated: true })
        .text,
    ).toBe("About 26 trips to campus, which you said you enjoy.");
    expect(
      travelFit("burden", {
        kind: "unknown",
        trips: null,
        tripsPerYear: null,
        tripsEstimated: false,
      }).text,
    ).toBe("Needs travel to campus, which you said is a burden.");
  });

  it("gives the yearly count for a program longer than a year (review #86)", () => {
    // A 2-year EMBA with 6 residencies a year: 12 trips in all, 6 a year.
    const emba = { kind: "estimate", trips: 12, tripsPerYear: 6, tripsEstimated: false } as const;
    expect(travelFit("burden", emba).text).toBe("6 trips a year, which you said is a burden.");
    const viaEngine = evaluate(
      { ...personaAProfile, maxProgramMonths: 24 },
      [fixture("fake-executive", { durationMonths: 13 })],
      today,
    ).programs[0];
    expect(viaEngine?.travelEstimate).toMatchObject({ trips: 6, tripsPerYear: 3 });
    expect(viaEngine?.score.travel.text).toBe("3 trips a year, which you said you enjoy.");
  });

  it("names the published trips when the lodging rate isn't published (review #86)", () => {
    const [p] = evaluate(
      personaAProfile,
      [fixture("fake-executive", { lodgingPerNightUsd: null })],
      today,
    ).programs;
    expect(p?.travelEstimate.kind).toBe("unknown");
    expect(p?.score.travel).toEqual({
      fit: 5,
      text: "3 trips to campus, which you said you enjoy.",
    });
  });

  it("names the yearly trips when the program length isn't published (review #86)", () => {
    const [p] = evaluate(
      personaAProfile,
      [fixture("fake-executive", { durationMonths: null, durationMaxMonths: null })],
      today,
    ).programs;
    expect(p?.travelEstimate).toMatchObject({ kind: "unknown", trips: null, tripsPerYear: 3 });
    expect(p?.score.travel).toEqual({
      fit: 5,
      text: "3 trips a year, which you said you enjoy.",
    });
  });

  it("needs no trips from a user who lives within commuting distance", () => {
    const local = evaluate(
      makeProfile({ ...BOSTON, travelComfort: "burden" }),
      fixtureDataset(),
      today,
    );
    expect(local.programs.find((p) => p.id === "fake-executive")?.score.travel).toEqual({
      fit: 3,
      text: null,
    });
  });
});

describe("The why line names the two needs that contributed most", () => {
  const none = { kind: "none", trips: 0, tripsPerYear: 0, tripsEstimated: false } as const;
  const program = (ratings: Partial<Record<string, number>>) =>
    fixture("fake-certificate", {
      ratings: { ...fixture("fake-certificate").ratings, ...ratings },
    });
  const profile = {
    needs: ["leadership_skills", "deep_expertise", "graduate_degree"],
    formatPreference: "no_preference",
    travelComfort: "fine",
  } as const;
  const score = (p: ReturnType<typeof program>) =>
    programScore(p, { ...profile, needs: [...profile.needs] }, none);

  it("by what each adds above a rating of 1, so a strong third need can outrank a weak first", () => {
    // 3 × (2 − 1) = 3, 2 × (3 − 1) = 4, 1 × (5 − 1) = 4.
    expect(
      score(program({ leadership_skills: 2, deep_expertise: 3, graduate_degree: 5 })).topNeeds,
    ).toEqual(["deep_expertise", "graduate_degree"]);
  });

  it("giving a tie to the need the user ranked higher", () => {
    // 3 × 2 = 6, 2 × 3 = 6, 1 × 4 = 4.
    expect(
      score(program({ leadership_skills: 3, deep_expertise: 4, graduate_degree: 5 })).topNeeds,
    ).toEqual(["leadership_skills", "deep_expertise"]);
  });

  it("never naming a need rated 1", () => {
    expect(
      score(program({ leadership_skills: 1, deep_expertise: 1, graduate_degree: 4 })).topNeeds,
    ).toEqual(["graduate_degree"]);
  });
});

// Evaluations for the ranking alone: only what rankPrograms reads.
const ev = (
  id: string,
  over: Partial<Omit<ProgramEvaluation, "score">> & { total?: number } = {},
): ProgramEvaluation => {
  const { total = 30, ...rest } = over;
  return {
    id,
    category: "executive",
    status: "pass",
    locationFit: 3,
    totalCostUsd: 30000,
    travelEstimate: { lodgingOnly: false },
    score: {
      total,
      needs: [],
      format: { fit: 3, text: null },
      travel: { fit: 3, text: null },
      topNeeds: [],
    },
    ...rest,
  } as ProgramEvaluation;
};
const scores = {
  mba: "out",
  emba: "out",
  specialized_masters: 8,
  executive: 28,
  certificate: 12,
  short_course: "out",
} as const;
const confirmed = { winner: "executive", runnerUp: "certificate", scores } as const;
const ids = (list: { id: string }[]) => list.map((r) => r.id);
// A near miss over a published limit, and one only on a value the school doesn't publish.
const tuitionOver = { id: "tuition", status: "near_miss", unknown: false } as Check;
const hoursUnpublished = { id: "hours", status: "near_miss", unknown: true } as Check;
const overLimit = { status: "near_miss" as const, checks: [tuitionOver] };
const unpublished = { status: "near_miss" as const, checks: [hoursUnpublished] };
// The access card names no alternative unless a test says so.
const rank = (
  evaluations: ProgramEvaluation[],
  category: Parameters<typeof rankPrograms>[1],
  alternative: Parameters<typeof rankPrograms>[2]["alternative"] = null,
) => rankPrograms(evaluations, category, { alternative });

describe("Order", () => {
  it("puts passing programs before near misses over a published limit, then by score", () => {
    const r = rank(
      [
        ev("fake-a", { total: 25 }),
        ev("fake-near", { total: 45, ...overLimit }),
        ev("fake-b", { total: 35 }),
      ],
      confirmed,
    );
    expect(ids(r.ranked)).toEqual(["fake-b", "fake-a", "fake-near"]);
    expect(r.ranked.map((x) => x.why)).toEqual([
      "Ranked first.",
      "Ranked second.",
      "Ranked third.",
    ]);
  });

  it("ranks a near miss only on unpublished values with the passes, by score (#247)", () => {
    const r = rank(
      [
        ev("fake-a", { total: 25 }),
        ev("fake-unpublished", { total: 45, ...unpublished }),
        ev("fake-b", { total: 35 }),
        // Unpublished hours too, but also over a published limit: still after the passes.
        ev("fake-over", {
          total: 50,
          status: "near_miss",
          checks: [hoursUnpublished, tuitionOver],
        }),
      ],
      confirmed,
    );
    expect(ids(r.ranked)).toEqual(["fake-unpublished", "fake-b", "fake-a", "fake-over"]);
  });

  it("breaks ties by location fit, then lower known total cost, unknown last, then id", () => {
    const r = rank(
      [
        ev("fake-unknown", { totalCostUsd: null }),
        ev("fake-h", { totalCostUsd: 20000 }),
        ev("fake-ch", { totalCostUsd: 20000 }),
        ev("fake-dear", { totalCostUsd: 50000 }),
        ev("fake-near-home", { locationFit: 5, totalCostUsd: 90000 }),
      ],
      confirmed,
    );
    // Code-unit order: "fake-ch" before "fake-h".
    expect(ids(r.ranked)).toEqual([
      "fake-near-home",
      "fake-ch",
      "fake-h",
      "fake-dear",
      "fake-unknown",
    ]);
  });

  it("compares a lodging-only cost by its known part, and puts it behind only on a tie (review #86)", () => {
    const lodgingOnly = { lodgingOnly: true } as ProgramEvaluation["travelEstimate"];
    const r = rank(
      [
        // $60k online vs $15k tuition + $3k lodging, airfare still to add.
        ev("fake-online", { totalCostUsd: 60000 }),
        ev("fake-travel", { totalCostUsd: 18000, travelEstimate: lodgingOnly }),
        ev("fake-a-travel-even", { totalCostUsd: 30000, travelEstimate: lodgingOnly }),
        ev("fake-z-even", { totalCostUsd: 30000 }),
      ],
      confirmed,
    );
    expect(ids(r.ranked)).toEqual([
      "fake-travel",
      "fake-z-even",
      "fake-a-travel-even",
      "fake-online",
    ]);
  });

  it("orders two unknown totals by id, whatever their lodging (review #86)", () => {
    const lodgingOnly = { lodgingOnly: true } as ProgramEvaluation["travelEstimate"];
    const r = rank(
      [
        ev("fake-b", { totalCostUsd: null }),
        ev("fake-a", { totalCostUsd: null, travelEstimate: lodgingOnly }),
      ],
      confirmed,
    );
    expect(ids(r.ranked)).toEqual(["fake-a", "fake-b"]);
  });

  it("words every position, past eighth", () => {
    const r = rank(
      Array.from({ length: 12 }, (_, i) => ev(`fake-${String(i).padStart(2, "0")}`)),
      confirmed,
    );
    expect(r.ranked.slice(7).map((x) => x.why)).toEqual([
      "Ranked eighth.",
      "Ranked ninth.",
      "Ranked tenth.",
      "Ranked eleventh.",
      "Ranked twelfth.",
    ]);
  });

  it.each([
    [1, "first"],
    [13, "thirteenth"],
    [20, "twentieth"],
    [21, "twenty-first"],
    [42, "forty-second"],
    [99, "ninety-ninth"],
    [100, "100th"],
    [111, "111th"],
    [122, "122nd"],
  ])("ordinal %s is %s", (n, word) => {
    expect(ordinal(n)).toBe(word);
  });

  it("leaves out failures and programs of a ruled-out type", () => {
    const r = rank(
      [
        ev("fake-fail", { status: "fail" }),
        ev("fake-out", { category: "short_course" }),
        ev("fake-ok"),
      ],
      { ...confirmed, runnerUp: "short_course" },
    );
    expect(ids(r.ranked)).toEqual(["fake-ok"]);
    expect(r.alsoWorthALook).toEqual([]);
  });

  it("lists nothing while there is no confirmed category", () => {
    expect(rank([ev("fake-a")], { ...confirmed, winner: null, runnerUp: null })).toEqual({
      ranked: [],
      alsoWorthALook: [],
    });
  });
});

describe("Persona A on the real records (#247)", () => {
  const result = evaluate(personaAProfile, loadPrograms(), today);

  it("ranks MIT TLP first: a near miss only because its weekly hours aren't published", () => {
    const mit = result.programs.find((p) => p.id === "mit-tlp");
    const stanford = result.programs.find((p) => p.id === "stanford-lead");
    expect(mit?.status).toBe("near_miss");
    expect(mit?.checks.filter((c) => c.status !== "pass")).toMatchObject([
      { id: "hours", status: "near_miss", unknown: true, note: "not published" },
    ]);
    expect(stanford?.status).toBe("pass");
    expect(mit?.score.total).toBeGreaterThan(stanford?.score.total ?? Infinity);
    expect(ids(result.ranking.ranked)).toEqual(["mit-tlp", "stanford-lead"]);
    expect(result.ranking.ranked[0]?.why).toBe(
      "Ranked first for senior peers (cohort median 20 years) and leadership skills.",
    );
  });
});

describe("Also worth a look", () => {
  it("holds up to 2 passing programs of the runner-up, best first, never a near miss", () => {
    const cert = (id: string, total: number, status: "pass" | "near_miss" = "pass") =>
      ev(id, { category: "certificate", total, status });
    const r = rank(
      [
        ev("fake-exec"),
        cert("fake-c1", 20),
        cert("fake-c2", 30),
        cert("fake-c3", 25),
        cert("fake-c4", 45, "near_miss"),
      ],
      confirmed,
    );
    expect(ids(r.ranked)).toEqual(["fake-exec"]);
    expect(ids(r.alsoWorthALook)).toEqual(["fake-c2", "fake-c3"]);
  });

  it("holds the access card's alternative when the confirmed category has nothing to rank", () => {
    // A third category, not the runner-up, near misses over a published limit after passes; a
    // near miss only on an unpublished value ranks with the passes (#247).
    const withShort = { ...confirmed, scores: { ...scores, short_course: 10 } };
    const r = rank(
      [
        ev("fake-exec", { status: "fail" }),
        ev("fake-cert", { category: "certificate", status: "fail" }),
        ev("fake-s1", { category: "short_course", total: 45, ...overLimit }),
        ev("fake-s2", { category: "short_course", total: 20 }),
        ev("fake-s3", { category: "short_course", total: 30, ...unpublished }),
      ],
      withShort,
      "short_course",
    );
    expect(r.ranked).toEqual([]);
    expect(ids(r.alsoWorthALook)).toEqual(["fake-s3", "fake-s2"]);
  });

  it("lists the runner-up's near miss when it is the only program within reach (review #86)", () => {
    // Persona A who can spend at most a day on site, a day at a time: every program fails but
    // the online certificate, a near miss on unpublished hours.
    const result = evaluate(
      { ...personaAProfile, maxOnsiteDays: 1, maxStretchDays: 1 },
      fixtureDataset(),
      today,
    );
    expect(result.programs.filter((p) => p.status !== "fail").map((p) => p.id)).toEqual([
      "fake-certificate",
    ]);
    expect(result.noProgram).toEqual({ triggered: false });
    expect(result.access).toMatchObject({
      status: "none_within_limits",
      alternative: "certificate",
    });
    expect(result.ranking).toEqual({
      ranked: [],
      alsoWorthALook: [
        {
          id: "fake-certificate",
          why: "Also worth a look for leadership skills and deep expertise.",
        },
      ],
    });
  });
});

describe("The list agrees with the access card and the no-program result", () => {
  // Whenever stage 2 doesn't say "nothing passes" and a category is confirmed, something is listed.
  it.each([
    ["the worked example", {}],
    ["a tight budget", { tuitionBudgetUsd: 20000 }],
    ["no time on site", { maxOnsiteDays: 0 }],
    ["one day on site", { maxOnsiteDays: 1, maxStretchDays: 1 }],
    ["Buenos Aires, one day on site", { ...personaAProfile, maxOnsiteDays: 1, maxStretchDays: 1 }],
    ["a degree required", { degreeRequired: "required" as const, maxProgramMonths: 24 }],
  ])("%s", (_name, overrides) => {
    const result = evaluate(makeProfile(overrides), fixtureDataset(), today);
    const shown = result.ranking.ranked.length + result.ranking.alsoWorthALook.length;
    if (result.category.winner !== null && !result.noProgram.triggered) {
      expect(shown).toBeGreaterThan(0);
    }
    if (result.access.alternative !== null && result.ranking.ranked.length === 0) {
      const listed = result.ranking.alsoWorthALook.map(
        (r) => result.programs.find((p) => p.id === r.id)?.category,
      );
      expect(listed).toContain(result.access.alternative);
    }
  });
});

describe("Format fit at weight 2", () => {
  const profile = makeProfile({ formatPreference: "blended", travelComfort: "fine" });

  it("lifts a blended program above an otherwise equal one", () => {
    const programs = [
      fixture("fake-executive", { id: "fake-in-person", format: "in_person" }),
      fixture("fake-executive", { id: "fake-blended" }),
    ];
    expect(ids(evaluate(profile, programs, today).ranking.ranked)).toEqual([
      "fake-blended",
      "fake-in-person",
    ]);
  });

  it("doesn't beat a much better fit on the user's top need", () => {
    // In person: format fit 3 (−4 points) but leadership 5 vs 3 on the user's second need (+4)
    // and senior peers 4 vs 2 on the first (+6).
    const programs = [
      fixture("fake-executive", {
        id: "fake-blended",
        cohortMedianExperienceYears: 8,
        ratings: { ...fixture().ratings, leadership_skills: 3 },
      }),
      fixture("fake-executive", { id: "fake-in-person", format: "in_person" }),
    ];
    expect(ids(evaluate(profile, programs, today).ranking.ranked)).toEqual([
      "fake-in-person",
      "fake-blended",
    ]);
  });
});

describe("Total cost for breaking ties", () => {
  it("adds tuition and travel, and is unknown when either part is", () => {
    const program = { tuitionUsd: 30000, tuitionPerCourseUsd: null, courseCount: null };
    expect(totalCost(program, { totalUsd: 9225 })).toBe(39225);
    expect(totalCost(program, { totalUsd: null })).toBeNull();
    // Lodging only (airfare unknown) still adds its known part; byRank handles the rest.
    expect(totalCost(program, { totalUsd: 5475 })).toBe(35475);
    expect(totalCost({ ...program, tuitionUsd: null }, { totalUsd: 0 })).toBeNull();
  });
});
