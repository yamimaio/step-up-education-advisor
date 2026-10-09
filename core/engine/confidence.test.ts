import { describe, expect, it } from "vitest";
import { confidence } from "./confidence";
import type { Check } from "./types";
import { fixture } from "../../tests/fixtures/dataset";
import { makeProfile, workedExampleProfile } from "../../tests/fixtures/profiles";
import { recommendCategory } from "./direction";
import { evaluatePrograms } from "./search";

// The fixtures were checked on 2026-10-01.
const day = (n: number) => new Date(Date.UTC(2026, 9, 1 + n));
const pass: Check = {
  id: "tuition",
  status: "pass",
  value: 1,
  limit: 2,
  unit: "USD",
  unknown: false,
};

describe("Confidence describes the data, not the fit", () => {
  it("is high with a fresh, official, fully published record", () => {
    expect(confidence(fixture(), [pass], day(0)).level).toBe("high");
  });

  it("holds at day 60 and drops to medium at day 61", () => {
    expect(confidence(fixture(), [pass], day(60)).level).toBe("high");
    const late = confidence(fixture(), [pass], day(61));
    expect(late.level).toBe("medium");
    expect(late.reasons.join(" ")).toMatch(/60 days/);
  });

  it("is medium with one condition missing and low with two", () => {
    expect(confidence(fixture(), [pass], day(61)).level).toBe("medium");
    expect(confidence(fixture(), [pass], day(0)).level).toBe("high");
    // An unpublished price is also an unknown-value check, so it counts twice (default 16).
    const noTuition = fixture("fake-executive", { tuitionUsd: null });
    const unknown: Check = { ...pass, status: "near_miss", value: null, unknown: true };
    expect(confidence(noTuition, [unknown], day(0)).level).toBe("low");
  });

  it("names unknown checks in plain words", () => {
    const reasons = confidence(
      fixture(),
      [{ ...pass, id: "travelBudget", unknown: true }],
      day(0),
    ).reasons.join(" ");
    expect(reasons).toContain("travel cost");
    expect(reasons).not.toContain("travelBudget");
  });

  it("drops when a check hit the unknown-value rule (S8-5)", () => {
    const unknown: Check = { ...pass, status: "near_miss", unknown: true };
    const result = confidence(fixture(), [unknown], day(0));
    expect(result.level).toBe("medium");
    expect(result.reasons.join(" ")).toMatch(/tuition/);
  });

  it("stays high for a real near miss when every figure is published", () => {
    const over: Check = { ...pass, status: "near_miss", value: 88000, limit: 80000 };
    expect(confidence(fixture(), [over], day(0)).level).toBe("high");
  });

  it("caps a draft record at low (D7)", () => {
    const draft = fixture("fake-executive", {
      verification: { status: "draft", verifiedBy: null },
    });
    const result = confidence(draft, [pass], day(0));
    expect(result.level).toBe("low");
    expect(result.reasons.join(" ")).toMatch(/Draft/);
  });

  it("does not count school correspondence as an official page", () => {
    const sources = fixture().sources.map((s) =>
      s.field === "tuitionUsd" ? { ...s, kind: "school_correspondence" as const } : s,
    );
    expect(confidence(fixture("fake-executive", { sources }), [pass], day(0)).level).toBe("medium");
  });
});

describe("A price published per course counts as a published price", () => {
  const masters = fixture("fake-specialized-masters", {
    verification: { status: "verified", verifiedBy: "Fixture Author" },
    onsiteDaysPerYear: 40,
  });

  it("does not say tuition is unpublished when the per-course price has an official source", () => {
    const { reasons } = confidence(masters, [pass], day(0));
    expect(reasons.join(" ")).not.toMatch(/Tuition is not published/);
  });

  it("keeps a fresh, sourced per-course record off 'not published' through the real pipeline", () => {
    const result = evaluatePrograms(
      makeProfile({ tuitionBudgetUsd: 60000 }),
      recommendCategory(workedExampleProfile, [masters]).category,
      [masters],
      day(0),
    );
    const [p] = result.programs;
    expect(p?.checks.find((c) => c.id === "tuition")?.unknown).toBe(false);
    expect(p?.confidence.reasons.join(" ")).not.toMatch(/tuition/i);
  });

  it("still says so when the per-course price has no official source", () => {
    const unsourced = {
      ...masters,
      sources: masters.sources.filter((s) => s.field !== "tuitionPerCourseUsd"),
    };
    expect(confidence(unsourced, [pass], day(0)).reasons.join(" ")).toMatch(
      /Tuition is not published/,
    );
  });
});

describe("A local program's published schedule is its on-site evidence", () => {
  const scheduleOnly = (id: string) => {
    const base = fixture(id, {
      verification: { status: "verified", verifiedBy: "Fixture Author" },
      onsiteDaysPerYear: null,
    });
    return {
      ...base,
      sources: [
        ...base.sources.filter((s) => s.field !== "format"),
        { ...base.sources[0]!, field: "attendance", quote: "Classes meet on weekday evenings." },
      ],
    };
  };

  it("counts an official attendance source for an evening program with no day count", () => {
    const { reasons } = confidence(scheduleOnly("fake-specialized-masters"), [pass], day(0));
    expect(reasons.join(" ")).not.toMatch(/On-site time/);
  });

  it("still asks for a day count from a program reached by travel", () => {
    const { reasons } = confidence(scheduleOnly("fake-executive"), [pass], day(0));
    expect(reasons.join(" ")).toMatch(/On-site time is not published/);
  });
});
