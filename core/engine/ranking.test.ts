import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import {
  cohortText,
  formatFit,
  programScore,
  rankPrograms,
  seniorPeersRating,
  totalCost,
  travelFit,
} from "./ranking";
import type { ProgramEvaluation } from "./types";
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
  const none = { kind: "none", trips: 0, tripsEstimated: false } as const;

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
  const trips = { kind: "estimate", trips: 3, tripsEstimated: false } as const;
  const none = { kind: "none", trips: 0, tripsEstimated: false } as const;

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
    expect(travelFit("appeal", { kind: "estimate", trips: 26, tripsEstimated: true }).text).toBe(
      "About 26 trips to campus, which you said you enjoy.",
    );
    expect(travelFit("burden", { kind: "unknown", trips: null, tripsEstimated: false }).text).toBe(
      "Needs travel to campus, which you said is a burden.",
    );
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
  const none = { kind: "none", trips: 0, tripsEstimated: false } as const;
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

describe("Order", () => {
  it("puts passing programs before near misses, then by score", () => {
    const r = rankPrograms(
      [
        ev("fake-a", { total: 25 }),
        ev("fake-near", { total: 45, status: "near_miss" }),
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

  it("breaks ties by location fit, then lower known total cost, unknown last, then id", () => {
    const r = rankPrograms(
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

  it("leaves out failures and programs of a ruled-out type", () => {
    const r = rankPrograms(
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
    expect(rankPrograms([ev("fake-a")], { ...confirmed, winner: null, runnerUp: null })).toEqual({
      ranked: [],
      alsoWorthALook: [],
    });
  });
});

describe("Also worth a look", () => {
  it("holds up to 2 passing programs of the runner-up, best first, never a near miss", () => {
    const cert = (id: string, total: number, status: "pass" | "near_miss" = "pass") =>
      ev(id, { category: "certificate", total, status });
    const r = rankPrograms(
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
    expect(totalCost(program, { totalUsd: 9225, lodgingOnly: false })).toBe(39225);
    expect(totalCost(program, { totalUsd: null, lodgingOnly: false })).toBeNull();
    // Lodging only: the airfare is missing, so the total isn't known.
    expect(totalCost(program, { totalUsd: 5475, lodgingOnly: true })).toBeNull();
    expect(
      totalCost({ ...program, tuitionUsd: null }, { totalUsd: 0, lodgingOnly: false }),
    ).toBeNull();
  });
});
