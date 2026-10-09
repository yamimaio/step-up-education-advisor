import { describe, expect, it } from "vitest";
import { CheckContradictionsInput, ProposeDirectionInput } from "../core/advisor/tools";
import { PERSONA_A_DIRECTION } from "./model/personaA";
import { advisorPrompt, SYSTEM } from "./prompt";
import { parseToolInput, TOOLS, toStrictSchema } from "./tools";

const BANNED = [
  "$schema",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "minItems",
  "maxItems",
  "uniqueItems",
];

// Every object node in a schema, and every keyword used anywhere.
function walk(node: unknown, visit: (n: Record<string, unknown>) => void) {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, visit));
  if (typeof node !== "object" || node === null) return;
  visit(node as Record<string, unknown>);
  for (const value of Object.values(node)) walk(value, visit);
}

describe("strict tool schemas (DQ14)", () => {
  it.each(TOOLS.map((t) => [t.name, t] as const))(
    "%s stays inside the strict subset",
    (_, tool) => {
      walk(tool.input_schema, (n) => {
        for (const key of BANNED) expect(n, key).not.toHaveProperty(key);
        if (n.type === "object") {
          expect(n.additionalProperties).toBe(false);
          expect([...(n.required as string[])].sort()).toEqual(
            Object.keys(n.properties as object).sort(),
          );
        }
        expect(Array.isArray(n.type)).toBe(false);
      });
    },
  );

  it("turns an optional property into a required, nullable one", () => {
    const strict = toStrictSchema({
      type: "object",
      properties: { a: { type: "string", minLength: 1 }, b: { type: ["number", "null"] } },
      required: ["a"],
    });
    expect(strict).toEqual({
      type: "object",
      properties: {
        a: { type: "string" },
        b: { anyOf: [{ type: "number" }, { type: "null" }] },
      },
      required: ["a", "b"],
      additionalProperties: false,
    });
  });

  it("reads an all-null draft as an empty one", () => {
    const draft = {
      careerGoal: null,
      goalClarity: null,
      needs: ["senior_network"],
      peerPreference: null,
      maxProgramMonths: null,
      hoursPerWeek: null,
      keepWorking: null,
      degreeRequired: null,
      resolvedTensions: [{ rule: "R4", chosen: null }],
      declined: null,
    };
    const parsed = parseToolInput(CheckContradictionsInput, { profile: draft });
    expect(parsed.success && parsed.data.profile).toEqual({
      needs: ["senior_network"],
      resolvedTensions: [{ rule: "R4" }],
    });
  });

  it("keeps the nulls that mean declined, and drops a null tieBreaker", () => {
    const direction = { ...PERSONA_A_DIRECTION, hoursPerWeek: null, declined: ["hoursPerWeek"] };
    const parsed = parseToolInput(ProposeDirectionInput, { direction });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.direction.hoursPerWeek).toBeNull();
    expect(parsed.success && "tieBreaker" in parsed.data.direction).toBe(false);
  });

  it("still enforces what the strict subset can't (exactly 3 needs)", () => {
    const direction = { ...PERSONA_A_DIRECTION, needs: ["senior_network"] };
    expect(parseToolInput(ProposeDirectionInput, { direction }).success).toBe(false);
  });
});

describe("the system prompt", () => {
  it("is advisor.md without its frontmatter, with the cache breakpoint", () => {
    expect(SYSTEM).toHaveLength(1);
    expect(SYSTEM[0]!.text.startsWith("# Step Up advisor")).toBe(true);
    expect(SYSTEM[0]!.text).not.toContain("name: step-up-advisor");
    expect(SYSTEM[0]!.cache_control).toEqual({ type: "ephemeral" });
  });

  it("refuses an empty prompt", () => {
    expect(() => advisorPrompt("---\nname: x\n---\n\n")).toThrow();
  });
});
