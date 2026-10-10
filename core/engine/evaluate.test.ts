import { describe, expect, it } from "vitest";
import { recommendCategory } from "./direction";
import { evaluate } from "./evaluate";
import { evaluatePrograms } from "./search";
import { fixtureDataset } from "../../tests/fixtures/dataset";
import { CAMBRIDGE_MA, makeProfile, workedExampleProfile } from "../../tests/fixtures/profiles";

const today = new Date("2026-10-08T00:00:00Z");

describe("Category fit on the fixtures", () => {
  it("reproduces the plan's worked example", () => {
    const { category, noProgram } = evaluate(workedExampleProfile, fixtureDataset(), today);
    expect(category.scores).toEqual({
      executive: 28,
      emba: "out",
      mba: "out",
      specialized_masters: 8,
      certificate: 12,
      short_course: 12,
    });
    expect(category.winner).toBe("executive");
    expect(category.runnerUp).toBe("certificate");
    expect(category.reasons.emba[0]).toBe(
      "Out: the one Executive MBA program Step Up has verified so far isn't within your limits (program length).",
    );
    expect(noProgram.triggered).toBe(false);
  });

  it("gives the same result for a user in Cambridge as for one in Boston", () => {
    const boston = evaluate(workedExampleProfile, fixtureDataset(), today);
    const cambridge = evaluate(makeProfile(CAMBRIDGE_MA), fixtureDataset(), today);
    expect(cambridge.category).toEqual(boston.category);
    expect(cambridge.programs.map((p) => p.status)).toEqual(boston.programs.map((p) => p.status));
  });

  it("rules EMBA and the MBA out on length", () => {
    const { programs } = evaluate(workedExampleProfile, fixtureDataset(), today);
    for (const id of ["fake-emba", "fake-mba"]) {
      const p = programs.find((x) => x.id === id);
      expect(p?.status).toBe("fail");
      expect(p?.checks.find((c) => c.id === "length")?.status).toBe("fail");
    }
  });
});

describe("evaluate runs stage 1, then stage 2 with the stage-1 category", () => {
  it("equals the two stages called in order", () => {
    const programs = fixtureDataset();
    const direction = recommendCategory(workedExampleProfile, programs);
    const search = evaluatePrograms(workedExampleProfile, direction.category, programs, today);
    expect(evaluate(workedExampleProfile, programs, today)).toEqual({
      category: direction.category,
      noProgram: search.noProgram,
      programs: search.programs,
      ranking: search.ranking,
      access: search.access,
      profileGaps: search.profileGaps,
    });
  });

  it("reports stage 1's trigger over stage 2's", () => {
    const result = evaluate(
      makeProfile({ goalClarity: "unclear", tuitionBudgetUsd: 1 }),
      fixtureDataset(),
      today,
    );
    expect(result.noProgram.trigger).toBe("goal_unclear");
  });
});

describe("evaluate", () => {
  it("returns every program in input order with all eight checks", () => {
    const result = evaluate(workedExampleProfile, fixtureDataset(), today);
    expect(result.programs.map((p) => p.id)).toEqual(fixtureDataset().map((p) => p.id));
    for (const p of result.programs)
      expect(p.checks.map((c) => c.id)).toEqual([
        "tuition",
        "travelBudget",
        "onsiteDays",
        "longestStretch",
        "length",
        "hours",
        "workCompatible",
        "location",
      ]);
  });

  it("is deterministic and does not mutate its input", () => {
    const profile = structuredClone(workedExampleProfile);
    const programs = fixtureDataset();
    const before = structuredClone(programs);
    const a = evaluate(profile, programs, today);
    const b = evaluate(profile, programs, today);
    expect(a).toEqual(b);
    expect(profile).toEqual(workedExampleProfile);
    expect(programs).toEqual(before);
  });

  it("scores a program the same whichever category wins: there is no category bonus", () => {
    const programs = fixtureDataset();
    const exec = (r: ReturnType<typeof evaluate>) =>
      r.programs.find((p) => p.id === "fake-executive")?.score.total;
    const win = evaluate(workedExampleProfile, programs, today);
    const other = evaluate(makeProfile({ degreeRequired: "required" }), programs, today);
    expect(win.category.winner).toBe("executive");
    expect(other.category.winner).not.toBe("executive");
    expect(exec(win)).toBe(exec(other));
  });

  it("lists profile gaps", () => {
    const result = evaluate(
      makeProfile({ declined: ["tuitionBudgetUsd"] }),
      fixtureDataset(),
      today,
    );
    expect(result.profileGaps).toEqual(["tuitionBudgetUsd", "airfareRange"]);
  });

  it("caps the draft master's at low confidence (D7) and keeps the verified executive high", () => {
    const { programs } = evaluate(workedExampleProfile, fixtureDataset(), today);
    const masters = programs.find((p) => p.id === "fake-specialized-masters");
    expect(masters?.confidence.level).toBe("low");
    expect(programs.find((p) => p.id === "fake-executive")?.confidence.level).toBe("high");
  });
});

describe("An unresolved tie lists no programs yet", () => {
  const tie = {
    needs: ["graduate_degree", "new_industry_or_city", "senior_network"] as const,
    degreeRequired: "required" as const,
    tuitionBudgetUsd: 250000,
    maxProgramMonths: 24,
    keepWorking: false,
    maxOnsiteDays: 300,
    maxStretchDays: 300,
    hoursPerWeek: { min: 40, max: 60 },
    travelBudgetUsd: null,
  };

  it("ranks the picked winner's programs, with the other under 'Also worth a look'", () => {
    const profile = makeProfile({ ...tie, needs: [...tie.needs] });
    const open = evaluate(profile, fixtureDataset(), today);
    expect(open.category.tie).toEqual(["mba", "emba"]);
    expect(open.ranking).toEqual({ ranked: [], alsoWorthALook: [] });
    const picked = evaluate({ ...profile, tieBreaker: "mba" }, fixtureDataset(), today);
    expect(picked.category.winner).toBe("mba");
    expect(picked.ranking.ranked.map((r) => r.id)).toEqual(["fake-mba"]);
    expect(picked.ranking.alsoWorthALook.map((r) => r.id)).toEqual(["fake-emba"]);
  });
});

describe("Declined answers are not constraints", () => {
  it("does not fail the MBA on a declined keepWorking", () => {
    const profile = makeProfile({
      keepWorking: true,
      tuitionBudgetUsd: 250000,
      maxProgramMonths: 24,
      declined: ["keepWorking"],
    });
    const mba = evaluate(profile, fixtureDataset(), today).programs.find(
      (p) => p.id === "fake-mba",
    );
    expect(mba?.checks.find((c) => c.id === "workCompatible")?.status).toBe("pass");
  });
});
