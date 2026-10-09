import { describe, expect, it } from "vitest";
import { recommendCategory } from "./direction";
import { evaluate } from "./evaluate";
import { categoryAccess, evaluatePrograms } from "./search";
import { fixtureDataset } from "../../tests/fixtures/dataset";
import { BUENOS_AIRES, makeProfile, workedExampleProfile } from "../../tests/fixtures/profiles";
import type { CategoryResult } from "./types";

const today = new Date("2026-10-08T00:00:00Z");
const programs = fixtureDataset();
const confirmed = recommendCategory(workedExampleProfile, programs).category;

describe("Stage 2 never changes the confirmed category", () => {
  it("keeps the verdict when the budget rules out its programs, and says so", () => {
    // The executive fixture costs $30,000; $20,000 fails it by more than 15%.
    const profile = makeProfile({ tuitionBudgetUsd: 20000 });
    const result = evaluate(profile, programs, today);
    expect(result.category.winner).toBe("executive");
    expect(result.access).toEqual({
      category: "executive",
      status: "none_within_limits",
      blockedBy: ["tuition"],
      alternative: "certificate",
    });
    expect(result.programs.find((p) => p.id === "fake-executive")?.status).toBe("fail");
    expect(result.ranking.ranked).toEqual([]);
    // Only passing runner-up programs are listed; the certificate is a near miss on hours.
    expect(result.ranking.alsoWorthALook).toEqual([]);
  });

  it("uses the category it is given, not one it works out itself", () => {
    // A user who picked the certificate stays with it, even though stage 1 says executive.
    const chosen: CategoryResult = { ...confirmed, winner: "certificate", runnerUp: "executive" };
    const given = evaluatePrograms(workedExampleProfile, chosen, programs, today);
    const own = evaluatePrograms(workedExampleProfile, confirmed, programs, today);
    expect(given.ranking.ranked.map((r) => r.id)).toEqual(["fake-certificate"]);
    expect(given.ranking.alsoWorthALook.map((r) => r.id)).toEqual(["fake-executive"]);
    expect(own.ranking.ranked.map((r) => r.id)).toEqual(["fake-executive"]);
    // Scores don't depend on the category: only the order of the list does.
    expect(given.programs.map((p) => p.score)).toEqual(own.programs.map((p) => p.score));
    expect(given.access.category).toBe("certificate");
  });

  it("is available when the category has a program within the limits", () => {
    expect(evaluate(workedExampleProfile, programs, today).access).toEqual({
      category: "executive",
      status: "available",
      blockedBy: [],
      alternative: null,
    });
  });

  it("returns nothing_passes only, and only when no program is within the limits", () => {
    const none = evaluatePrograms(
      makeProfile({ tuitionBudgetUsd: 3000, maxOnsiteDays: 0, ...BUENOS_AIRES }),
      confirmed,
      programs,
      today,
    );
    expect(none.noProgram).toEqual({ triggered: true, trigger: "nothing_passes" });
    expect(none.access).toMatchObject({ status: "none_within_limits", alternative: null });
    const fine = evaluatePrograms(workedExampleProfile, confirmed, programs, today);
    expect(fine.noProgram).toEqual({ triggered: false });
  });

  it("is deterministic and lists all profile gaps", () => {
    const profile = makeProfile({ declined: ["tuitionBudgetUsd"] });
    const a = evaluatePrograms(profile, confirmed, programs, today);
    expect(a).toEqual(evaluatePrograms(profile, confirmed, programs, today));
    expect(a.profileGaps).toEqual(["tuitionBudgetUsd", "airfareRange"]);
  });
});

describe("Category access", () => {
  const scores = {
    mba: 9,
    emba: 11,
    specialized_masters: 10,
    executive: "out",
    certificate: "out",
    short_course: "out",
  } as const;
  const program = (category: "mba" | "emba" | "specialized_masters", status: "pass" | "fail") => ({
    category,
    status,
    checks: [],
  });

  it("has no winner while a tie is unresolved", () => {
    expect(categoryAccess({ winner: null, scores }, [program("emba", "pass")])).toEqual({
      category: null,
      status: "no_winner",
      blockedBy: [],
      alternative: null,
    });
  });

  it("points to the best-scoring category with a program, skipping ones without", () => {
    const access = categoryAccess({ winner: "emba", scores }, [
      program("emba", "fail"),
      program("specialized_masters", "fail"),
      program("mba", "pass"),
    ]);
    expect(access).toMatchObject({ status: "none_within_limits", alternative: "mba" });
  });

  it("says when the category has no records yet, and still offers an alternative", () => {
    const access = categoryAccess({ winner: "emba", scores }, [
      program("specialized_masters", "pass"),
    ]);
    expect(access).toEqual({
      category: "emba",
      status: "no_programs",
      blockedBy: [],
      alternative: "specialized_masters",
    });
  });
});
