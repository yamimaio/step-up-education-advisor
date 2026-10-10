import { describe, expect, it } from "vitest";
import { ProposeDirectionInput } from "../core/advisor/tools";
import { PERSONA_A_DIRECTION } from "./model/personaA";
import { advisorPrompt, SYSTEM } from "./prompt";
import { TOOLS, toStrictSchema } from "./tools";

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
        }
      });
    },
  );

  it("keeps optional properties optional and closes every object", () => {
    const strict = toStrictSchema({
      type: "object",
      properties: { a: { type: "string", minLength: 1 }, b: { type: ["number", "null"] } },
      required: ["a"],
    });
    expect(strict).toEqual({
      type: "object",
      properties: { a: { type: "string" }, b: { type: ["number", "null"] } },
      required: ["a"],
      additionalProperties: false,
    });
  });

  // Totals over every strict tool in a request.
  function complexity(tools: readonly { input_schema: unknown }[]) {
    let optional = 0;
    let unions = 0;
    for (const tool of tools) {
      walk(tool.input_schema, (n) => {
        if (Array.isArray(n.anyOf) || Array.isArray(n.type)) unions++;
        if (n.type === "object" && typeof n.properties === "object" && n.properties) {
          const required = new Set((n.required as string[] | undefined) ?? []);
          optional += Object.keys(n.properties).filter((k) => !required.has(k)).length;
        }
      });
    }
    return { optional, unions };
  }

  // The documented limits (platform.claude.com/docs/en/build-with-claude/structured-outputs).
  // Over them, every call is a 400.
  it("stays inside the API's documented complexity limits", () => {
    const { optional, unions } = complexity(TOOLS);
    expect(TOOLS.filter((t) => t.strict).length).toBeLessThanOrEqual(20);
    expect(optional).toBeLessThanOrEqual(24);
    expect(unions).toBeLessThanOrEqual(16);
  });

  // The API also caps the size of the grammar it compiles from the strict schemas, a limit no
  // document gives and no test can check: schemas inside the documented limits were refused
  // ("The compiled grammar is too large", decisions.md, "The real API refused the stage 2
  // schemas"). This budget is the configuration `npm run probe-tools` saw the API accept. Raise
  // it only after a probe of the bigger schemas passes.
  it("stays inside the budget the real API accepted", () => {
    const { optional, unions } = complexity(TOOLS);
    expect(optional).toBeLessThanOrEqual(1);
    expect(unions).toBeLessThanOrEqual(10);
    const bytes = Object.fromEntries(
      TOOLS.map((t) => [t.name, JSON.stringify(t.input_schema).length]),
    );
    expect(bytes.ask_choice).toBeLessThanOrEqual(454);
    expect(bytes.check_contradictions).toBeLessThanOrEqual(529);
    expect(bytes.propose_direction).toBeLessThanOrEqual(1768);
    expect(bytes.propose_search).toBeLessThanOrEqual(1143);
  });

  it("parses inputs with the zod schema, which enforces what strict mode can't", () => {
    const short = { ...PERSONA_A_DIRECTION, needs: ["senior_network"] };
    expect(ProposeDirectionInput.safeParse({ direction: short }).success).toBe(false);
    const negative = { ...PERSONA_A_DIRECTION, maxProgramMonths: -1 };
    expect(ProposeDirectionInput.safeParse({ direction: negative }).success).toBe(false);
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
