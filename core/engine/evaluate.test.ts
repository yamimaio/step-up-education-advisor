import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import { fixtureDataset } from "../../tests/fixtures/dataset";
import { CAMBRIDGE_MA, makeProfile, workedExampleProfile } from "../../tests/fixtures/profiles";

const today = new Date("2026-10-08T00:00:00Z");

describe("Category fit on the fixtures", () => {
  it("reproduces the plan's worked example", () => {
    const { category, noProgram } = evaluate(workedExampleProfile, fixtureDataset(), today);
    expect(category.scores).toEqual({
      executive: 11,
      emba: "out",
      mba: "out",
      specialized_masters: 1,
      certificate: 3,
      short_course: 3,
    });
    expect(category.winner).toBe("executive");
    expect(category.runnerUp).toBe("certificate");
    expect(category.reasons.emba.join(" ")).toContain("program length");
    expect(category.reasons.emba.join(" ")).toMatch(
      /no program of this type is within your limits/,
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

  it("gives the winning category its 0.5 bonus, but not while the result is a tie", () => {
    const programs = fixtureDataset();
    const exec = (r: ReturnType<typeof evaluate>) =>
      r.programs.find((p) => p.id === "fake-executive")?.scenarioScores.network ?? 0;
    const win = evaluate(workedExampleProfile, programs, today);
    // Same score with a different winner: ruling the executive type out removes the bonus.
    const other = evaluate(makeProfile({ degreeRequired: "required" }), programs, today);
    expect(win.category.winner).toBe("executive");
    expect(exec(win) - exec(other)).toBeCloseTo(0.5, 10);
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

describe("A tie gets no category bonus", () => {
  const tie = {
    needs: ["leadership_skills", "deep_expertise", "graduate_degree"] as const,
    degreeRequired: "required" as const,
    tuitionBudgetUsd: 250000,
    maxProgramMonths: 24,
    keepWorking: false,
    maxOnsiteDays: 300,
    maxStretchDays: 300,
    hoursPerWeek: { min: 40, max: 60 },
    travelBudgetUsd: null,
  };
  const mba = (r: ReturnType<typeof evaluate>) =>
    r.programs.find((p) => p.id === "fake-mba")?.scenarioScores.network ?? 0;

  it("adds 0.5 only once the user picks the winner", () => {
    const profile = makeProfile({ ...tie, needs: [...tie.needs] });
    const open = evaluate(profile, fixtureDataset(), today);
    expect(open.category.tie).toEqual(["mba", "emba"]);
    const picked = evaluate({ ...profile, tieBreaker: "mba" }, fixtureDataset(), today);
    expect(picked.category.winner).toBe("mba");
    expect(mba(picked) - mba(open)).toBeCloseTo(0.5, 10);
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
