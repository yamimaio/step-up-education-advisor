import { describe, expect, it } from "vitest";
import { categoryFit, failedChecks } from "./categoryFit";
import { applyDeclinedDefaults } from "./normalize";
import { makeProfile } from "../../tests/fixtures/profiles";
import type { Need } from "../schema/enums";
import type { Profile } from "../schema/profile";

// With no program records no type is ruled out on length or cost (D6), so the scores are
// the matrix subtotal plus adjustments.
const score = (o: Partial<Profile>) =>
  categoryFit(applyDeclinedDefaults(makeProfile(o)).profile, [], []);

const degreeFirst: Partial<Profile> = {
  needs: ["graduate_degree", "leadership_skills", "deep_expertise"],
};

describe("Needs are weighted 3/2/1 times the type matrix", () => {
  it("scores each type from its ratings", () => {
    const { scores } = score({ ...degreeFirst, degreeRequired: "preferred" });
    // graduate_degree x3, leadership x2, expertise x1, then the preferred adjustment of -1
    expect(scores).toEqual({
      mba: 8,
      emba: 10,
      specialized_masters: 9,
      executive: 5,
      certificate: 3,
      short_course: 3,
    });
  });
});

describe("The degree answer adjusts MBA, EMBA and specialized master's", () => {
  it.each([
    ["no", 6, 8, 7],
    ["unsure", 7, 9, 8],
    ["preferred", 8, 10, 9],
  ] as const)("%s", (degreeRequired, mba, emba, masters) => {
    const { scores } = score({ ...degreeFirst, degreeRequired });
    expect(scores).toMatchObject({ mba, emba, specialized_masters: masters, executive: 5 });
  });
});

describe("A required degree rules out executive, certificate and short course (S8-2)", () => {
  it("marks all three out and leaves the degree types", () => {
    const { scores, winner, tie } = score({ ...degreeFirst, degreeRequired: "required" });
    expect(scores).toMatchObject({
      executive: "out",
      certificate: "out",
      short_course: "out",
      mba: 9,
      emba: 11,
      specialized_masters: 10,
    });
    expect(tie).toBeUndefined();
    expect(winner).toBe("emba");
  });
});

describe("Growing in the role adds 2 to executive, certificate and short course (S8-3)", () => {
  it("adds 2 to those three types only", () => {
    const base = score({ ...degreeFirst, degreeRequired: "preferred" }).scores;
    const grown = score({
      ...degreeFirst,
      degreeRequired: "preferred",
      careerGoal: { kind: "grow_in_role", description: "Lead better" },
    }).scores;
    expect(grown).toMatchObject({
      executive: 7,
      certificate: 5,
      short_course: 5,
      mba: base.mba,
      emba: base.emba,
      specialized_masters: base.specialized_masters,
    });
  });

  it("step_up adds nothing: the matrix and degree adjustment alone decide", () => {
    const { scores } = score({ ...degreeFirst, degreeRequired: "no" });
    expect(scores).toMatchObject({ mba: 6, executive: 5, certificate: 3, short_course: 3 });
  });
});

describe("A type with no records is never ruled out (D6, S8-9)", () => {
  it("keeps a score and notes the missing data", () => {
    const result = categoryFit(
      applyDeclinedDefaults(makeProfile()).profile,
      [{ id: "fake-executive", category: "executive" }],
      [{ id: "fake-executive", status: "pass" }],
    );
    expect(result.scores.mba).not.toBe("out");
    expect(result.reasons.mba.join(" ")).toMatch(/No verified programs/);
  });

  it("rules out a type whose every record fails, and keeps one with a near miss", () => {
    const programs = [
      { id: "a", category: "mba" as const },
      { id: "b", category: "emba" as const },
    ];
    const result = categoryFit(applyDeclinedDefaults(makeProfile()).profile, programs, [
      { id: "a", status: "fail" },
      { id: "b", status: "near_miss" },
    ]);
    expect(result.scores.mba).toBe("out");
    expect(result.scores.emba).not.toBe("out");
  });
});

describe("A tie is not broken by formula", () => {
  // A degree x3, a new city x2 and a network x1 score MBA and EMBA 10 each; the master's has 8.
  const tied: Partial<Profile> = {
    needs: ["graduate_degree", "new_industry_or_city", "senior_network"],
    degreeRequired: "required",
  };

  it("returns the tied pair in matrix order", () => {
    const result = score(tied);
    expect(result.scores).toMatchObject({ mba: 10, emba: 10, specialized_masters: 8 });
    expect(result.tie).toEqual(["mba", "emba"]);
  });

  it("lets tieBreaker settle it when it is one of the pair", () => {
    const result = score({ ...tied, tieBreaker: "emba" });
    expect(result).toMatchObject({ winner: "emba", runnerUp: "mba" });
    expect(result.tie).toBeUndefined();
  });

  it("ignores a tieBreaker that isn't in the pair", () => {
    expect(score({ ...tied, tieBreaker: "executive" }).tie).toEqual(["mba", "emba"]);
  });
});

describe("The two needs that decided it", () => {
  it("are the needs with the largest weighted gap between winner and runner-up", () => {
    const result = score({ degreeRequired: "no" });
    // worked-example needs: network, leadership, expertise
    expect(result.winner).toBe("executive");
    expect(result.decidingNeeds).toHaveLength(2);
  });

  it("is empty when every type is out", () => {
    const result = categoryFit(
      applyDeclinedDefaults(makeProfile({ degreeRequired: "required" })).profile,
      [
        { id: "a", category: "mba" },
        { id: "b", category: "emba" },
        { id: "c", category: "specialized_masters" },
        { id: "d", category: "executive" },
      ],
      [
        { id: "a", status: "fail" },
        { id: "b", status: "fail" },
        { id: "c", status: "fail" },
        { id: "d", status: "pass" },
      ],
    );
    expect(result.winner).toBeNull();
    expect(result.decidingNeeds).toEqual([]);
  });
});

describe("An unresolved tie has no winner", () => {
  const tied = {
    needs: ["graduate_degree", "new_industry_or_city", "senior_network"] as Need[],
    degreeRequired: "required" as const,
  };

  it("leaves winner, runner-up and deciding needs empty while the pair is tied", () => {
    const r = score(tied);
    expect(r.tie).toEqual(["mba", "emba"]);
    expect(r).toMatchObject({ winner: null, runnerUp: null, decidingNeeds: [] });
  });

  it("names the winner once the user picks one of the pair", () => {
    const r = score({ ...tied, tieBreaker: "emba" });
    expect(r).toMatchObject({ winner: "emba", runnerUp: "mba" });
    expect(r.tie).toBeUndefined();
  });
});

describe("A ruled-out type says which checks ruled it out", () => {
  it("names the failed checks in plain words", () => {
    const profile = applyDeclinedDefaults(makeProfile({ maxProgramMonths: 3 })).profile;
    const programs = [{ id: "a", category: "mba" as const }];
    const checks = [
      {
        id: "length" as const,
        status: "fail" as const,
        value: 24,
        limit: 3,
        unit: "",
        unknown: false,
      },
    ];
    const r = categoryFit(profile, programs, [{ id: "a", status: "fail", checks }]);
    expect(r.reasons.mba.join(" ")).toMatch(/within your limits \(program length\)/);
  });
});

describe("Failed checks are ordered by count, then by check order", () => {
  const check = (id: "tuition" | "location", status: "pass" | "fail") => ({
    id,
    status,
    value: null,
    limit: null,
    unit: "",
    unknown: false,
  });

  it("does not depend on the order of the programs", () => {
    const a = [check("tuition", "pass"), check("location", "fail")];
    const b = [check("tuition", "fail"), check("location", "pass")];
    expect(failedChecks([a, b])).toEqual(["tuition", "location"]);
    expect(failedChecks([b, a])).toEqual(["tuition", "location"]);
    expect(failedChecks([a, b, a])).toEqual(["location", "tuition"]);
  });
});
