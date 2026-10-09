import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { ADVISOR_TOOLS, STAGE_1_TOOL_NAMES } from "../core/advisor/tools";

// The tools the model sees in stage 1, built once from core/advisor/tools.ts. They are frozen
// constants in a fixed order, so the cached prefix (tools, then system) is the same bytes on
// every request. Strict tool use needs a JSON Schema subset (DQ14): toStrictSchema adapts the
// schema zod generates, and the server parses every input with the zod schema, which checks
// what the subset can't express. Optional properties stay optional: the API caps strict schemas
// at 16 union-typed and 24 optional parameters per request, so making them nullable (22 unions)
// would fail every call (decisions.md, Step 6).

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
  STAGE_1_TOOL_NAMES.map((name) => {
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

export type Stage1ToolName = (typeof STAGE_1_TOOL_NAMES)[number];
export const isStage1Tool = (name: string): name is Stage1ToolName =>
  (STAGE_1_TOOL_NAMES as readonly string[]).includes(name);
export const pauses = (name: Stage1ToolName) => ADVISOR_TOOLS[name].pauses;
