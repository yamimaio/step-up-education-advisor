import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import { noProgramForDirection } from "./noProgram";
import type { Need } from "../schema/enums";
import { fixtureDataset } from "../../tests/fixtures/dataset";
import { BUENOS_AIRES, makeProfile } from "../../tests/fixtures/profiles";

const today = new Date("2026-10-08T00:00:00Z");
const run = (o: Parameters<typeof makeProfile>[0], programs = fixtureDataset()) =>
  evaluate(makeProfile(o), programs, today).noProgram;

describe("Each no-program trigger fires on its own example (S8-6)", () => {
  it("no type fits: a degree is required but the user allows only 3 months", () => {
    expect(run({ degreeRequired: "required", maxProgramMonths: 3 })).toEqual({
      triggered: true,
      trigger: "no_type_fits",
    });
  });

  it("nothing passes: $3,000, no on-site days and a home far from every campus (stage 2)", () => {
    // Far away, because a local evening master's has no time away and its per-course price
    // never fails the tuition check (default 4).
    expect(run({ tuitionBudgetUsd: 3000, maxOnsiteDays: 0, ...BUENOS_AIRES })).toEqual({
      triggered: true,
      trigger: "nothing_passes",
    });
  });

  it("2 hours a week is a stage-1 answer: it rules the strong types out, so no type fits", () => {
    // Before the stage split this example was nothing_passes. Hours now decide in stage 1, which
    // leaves only the certificate and the short course (12 each, under the threshold of 14).
    expect(
      run({ tuitionBudgetUsd: 3000, hoursPerWeek: { min: 1, max: 2 }, maxOnsiteDays: 0 }),
    ).toEqual({ triggered: true, trigger: "no_type_fits" });
  });

  it("goal unclear", () => {
    expect(run({ goalClarity: "unclear" })).toEqual({ triggered: true, trigger: "goal_unclear" });
  });

  it("is not triggered for the worked example", () => {
    expect(run({})).toEqual({ triggered: false });
  });

  it("puts goal_unclear before nothing_passes, and counts an empty dataset as nothing_passes", () => {
    expect(run({ goalClarity: "unclear", tuitionBudgetUsd: 1 }).trigger).toBe("goal_unclear");
    expect(run({}, []).trigger).toBe("nothing_passes");
  });

  it("puts stage 1's no_type_fits before stage 2's nothing_passes", () => {
    expect(run({ degreeRequired: "required", maxProgramMonths: 3, tuitionBudgetUsd: 1 })).toEqual({
      triggered: true,
      trigger: "no_type_fits",
    });
  });

  it("does not fire no_type_fits for a new city as the only need, because a full-time MBA scores 16", () => {
    const profile = makeProfile({
      needs: ["new_industry_or_city", "senior_network", "graduate_degree"],
      keepWorking: false,
      tuitionBudgetUsd: 250000,
      maxProgramMonths: 36,
      maxOnsiteDays: 300,
      maxStretchDays: 300,
      hoursPerWeek: { min: 40, max: 60 },
      homeCity: "Boston",
    });
    const result = evaluate(profile, fixtureDataset(), today);
    // The MBA is not out: 5x3 for the new city, 1x2 for the network, 5x1 for the degree, -6 for no degree needed.
    expect(result.category.scores.mba).toBe(16);
    expect(result.noProgram.triggered).toBe(false);
  });
});

describe("No type fits below the threshold of 14 (1-5 scale)", () => {
  const clear = {
    goalClarity: "clear" as const,
    needs: ["senior_network", "leadership_skills", "deep_expertise"] as Need[],
  };
  const scores = (best: number) => ({
    scores: {
      mba: "out" as const,
      emba: "out" as const,
      specialized_masters: best - 1,
      executive: best,
      certificate: 9,
      short_course: 9,
    },
  });

  it("fires at 13 and not at 14", () => {
    expect(noProgramForDirection(clear, scores(13))).toEqual({
      triggered: true,
      trigger: "no_type_fits",
    });
    expect(noProgramForDirection(clear, scores(14))).toEqual({
      triggered: false,
    });
  });
});

describe("A declined goal clarity is not 'goal unclear'", () => {
  it("does not fire goal_unclear for an answer the user never gave", () => {
    const result = evaluate(
      makeProfile({ goalClarity: "unclear", declined: ["goalClarity"] }),
      fixtureDataset(),
      today,
    );
    expect(result.noProgram.trigger).not.toBe("goal_unclear");
  });
});

describe("Programs of a ruled-out type do not count as a way forward", () => {
  it("fires nothing_passes when every passing program belongs to a type the degree rule removed", () => {
    // Degree required, only the executive record: it passes the limits but its type is out.
    // Stage 1 still has a verdict (the EMBA, kept in by D6 with no records), so this is stage 2's.
    const executive = fixtureDataset().filter((p) => p.id === "fake-executive");
    const result = evaluate(makeProfile({ degreeRequired: "required" }), executive, today);
    expect(result.category.winner).toBe("emba");
    expect(result.noProgram).toEqual({ triggered: true, trigger: "nothing_passes" });
    expect(result.access).toMatchObject({ status: "no_programs", alternative: null });
  });
});
