import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ProfileSchema } from "../schema/profile";
import { CHIP_FIELDS, CHIP_TARGET, CHIPS } from "./chips";
import { CHECKLIST } from "./fields";

// The schema for the profile field a chip set fills; a nested path like "degree.level" walks in.
function schemaFor(path: string): z.ZodType {
  const [head, ...rest] = path.split(".");
  let schema: z.ZodType = ProfileSchema.shape[head as keyof typeof ProfileSchema.shape];
  for (const key of rest) schema = (schema as unknown as z.ZodObject).shape[key]!;
  // A multi-select chip stores one element of the array.
  return schema instanceof z.ZodArray ? (schema.element as z.ZodType) : schema;
}

describe("Every chip value passes the matching ProfileSchema field", () => {
  it.each(CHIP_FIELDS)("%s", (field) => {
    const schema = schemaFor(CHIP_TARGET[field]);
    for (const chip of CHIPS[field]) {
      expect(schema.safeParse(chip.value).success, `${field}: ${chip.label}`).toBe(true);
    }
  });
});

describe("Chip sets are complete and unambiguous", () => {
  it("has a chip set for every numeric limit field", () => {
    for (const f of [
      "tuitionBudgetUsd",
      "travelBudgetUsd",
      "hoursPerWeek",
      "maxProgramMonths",
      "maxOnsiteDays",
      "maxStretchDays",
    ] as const) {
      expect(CHIP_FIELDS).toContain(f);
    }
  });

  it("covers every enum value of the fixed-choice fields", () => {
    const enumOf = (path: string) => (schemaFor(path) as unknown as { options: string[] }).options;
    for (const field of CHIP_FIELDS) {
      const schema = schemaFor(CHIP_TARGET[field]);
      if (!("options" in schema)) continue;
      expect(CHIPS[field].map((c) => c.value).sort(), field).toEqual(
        [...enumOf(CHIP_TARGET[field])].sort(),
      );
    }
  });

  it("has unique labels within a set", () => {
    for (const field of CHIP_FIELDS) {
      const labels = CHIPS[field].map((c) => c.label);
      expect(new Set(labels).size, field).toBe(labels.length);
    }
  });

  it("has unique values within a set", () => {
    for (const field of CHIP_FIELDS) {
      const values = CHIPS[field].map((c) => JSON.stringify(c.value));
      expect(new Set(values).size, field).toBe(values.length);
    }
  });

  it("uses the labels from the plan for the budget and time sets", () => {
    expect(CHIPS.tuitionBudgetUsd.map((c) => c.label)).toEqual([
      "Under $5k",
      "$5k to $15k",
      "$15k to $40k",
      "$40k to $80k",
      "Over $80k",
      "No set limit",
    ]);
    expect(CHIPS.hoursPerWeek.map((c) => c.value)).toEqual([
      { min: 0, max: 5 },
      { min: 5, max: 10 },
      { min: 10, max: 15 },
      { min: 15, max: 20 },
      { min: 20, max: 40 },
    ]);
    expect(CHIPS.maxProgramMonths.map((c) => c.value)).toEqual([3, 6, 12, 24, 60]);
  });
});

describe("The checklist only names chip sets that exist", () => {
  it("references known chip fields, and every chip set is used", () => {
    const used = new Set(CHECKLIST.flatMap((e) => e.chips));
    for (const chip of used) expect(CHIP_FIELDS).toContain(chip);
    for (const field of CHIP_FIELDS) expect(used.has(field), field).toBe(true);
  });
});
