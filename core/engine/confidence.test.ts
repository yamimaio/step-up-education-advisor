import { describe, expect, it } from "vitest";
import { confidence } from "./confidence";
import type { Check } from "./types";
import { fixture } from "../../tests/fixtures/dataset";

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
