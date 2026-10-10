import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { ADVISOR_TOOL_NAMES, ADVISOR_TOOLS, type AdvisorToolName } from "../core/advisor/tools";

// The tools the model sees, both stages, built once from core/advisor/tools.ts. They are frozen
// constants in a fixed order, so the cached prefix (tools, then system) is the same bytes on
// every request; the server, not the tool list, keeps stage 2 closed until a direction is
// confirmed. Strict tool use needs a JSON Schema subset (DQ14): toStrictSchema adapts the
// schema zod generates, and the server parses every input with the zod schema, which checks
// what the subset can't express. Optional properties stay optional: the API caps strict schemas
// at 16 union-typed and 24 optional parameters per request, so making them nullable would fail
// every call (decisions.md, Step 6).

type Json = { [key: string]: unknown };

// Keywords strict tool schemas don't support. zod enforces them on the server instead.
const UNSUPPORTED = [
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

const isObject = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// Unsupported keywords dropped and every object closed. `required` stays as zod wrote it.
export function toStrictSchema(schema: Json): Json {
  const out: Json = {};
  for (const [key, value] of Object.entries(schema)) {
    if (!UNSUPPORTED.includes(key)) out[key] = value;
  }
  if (Array.isArray(out.anyOf)) out.anyOf = out.anyOf.map((s) => toStrictSchema(s as Json));
  if (isObject(out.items)) out.items = toStrictSchema(out.items);
  if (out.type === "object") {
    const properties = isObject(out.properties) ? out.properties : {};
    out.properties = Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [key, toStrictSchema(value as Json)]),
    );
    out.additionalProperties = false;
  }
  return out;
}

export const TOOLS: readonly Anthropic.Tool[] = Object.freeze(
  ADVISOR_TOOL_NAMES.map((name) => {
    const spec = ADVISOR_TOOLS[name];
    return {
      name,
      description: spec.description,
      input_schema: toStrictSchema(
        z.toJSONSchema(spec.input) as Json,
      ) as Anthropic.Tool.InputSchema,
      strict: true,
    };
  }),
);

export const isAdvisorTool = (name: string): name is AdvisorToolName =>
  (ADVISOR_TOOL_NAMES as readonly string[]).includes(name);
export const pauses = (name: AdvisorToolName) => ADVISOR_TOOLS[name].pauses;
