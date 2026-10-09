import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { ADVISOR_TOOLS, STAGE_1_TOOL_NAMES } from "../core/advisor/tools";

// The tools the model sees in stage 1, built once from core/advisor/tools.ts. They are frozen
// constants in a fixed order, so the cached prefix (tools, then system) is the same bytes on
// every request. Strict tool use needs a JSON Schema subset (DQ14): toStrictSchema adapts the
// schema zod generates, and fromStrictInput undoes the one change that affects values (an
// optional field arrives as null) before zod checks everything the subset can't express.

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

const nullable = (schema: Json): Json =>
  Array.isArray(schema.anyOf) && schema.anyOf.some((s) => isObject(s) && s.type === "null")
    ? schema
    : { anyOf: [schema, { type: "null" }] };

// Every object closed and fully required (an optional property becomes nullable), unsupported
// keywords dropped, and `type: [a, b]` spelled as anyOf.
export function toStrictSchema(schema: Json): Json {
  const out: Json = {};
  for (const [key, value] of Object.entries(schema)) {
    if (!UNSUPPORTED.includes(key)) out[key] = value;
  }
  if (Array.isArray(out.type)) {
    const { type, ...rest } = out;
    return toStrictSchema({ ...rest, anyOf: (type as string[]).map((t) => ({ type: t })) });
  }
  if (Array.isArray(out.anyOf)) out.anyOf = out.anyOf.map((s) => toStrictSchema(s as Json));
  if (isObject(out.items)) out.items = toStrictSchema(out.items);
  if (out.type === "object") {
    const properties = isObject(out.properties) ? out.properties : {};
    const required = new Set((out.required as string[] | undefined) ?? []);
    out.properties = Object.fromEntries(
      Object.entries(properties).map(([key, value]) => {
        const strict = toStrictSchema(value as Json);
        return [key, required.has(key) ? strict : nullable(strict)];
      }),
    );
    out.required = Object.keys(properties);
    out.additionalProperties = false;
  }
  return out;
}

// Removes the nulls the strict schema forced into optional properties, guided by the original
// schema, so the zod schema sees "missing" where the model meant "not set".
export function stripOptionalNulls(schema: Json, value: unknown): unknown {
  if (Array.isArray(value)) {
    return isObject(schema.items)
      ? value.map((v) => stripOptionalNulls(schema.items as Json, v))
      : value;
  }
  if (!isObject(value)) return value;
  // A nullable object is an anyOf; follow its object branch.
  const branch = Array.isArray(schema.anyOf)
    ? (schema.anyOf.find((s) => isObject(s) && s.type === "object") as Json | undefined)
    : schema;
  if (!branch || !isObject(branch.properties)) return value;
  const properties = branch.properties;
  const required = new Set((branch.required as string[] | undefined) ?? []);
  const out: Json = {};
  for (const [key, v] of Object.entries(value)) {
    if (v === null && key in properties && !required.has(key)) continue;
    out[key] = key in properties ? stripOptionalNulls(properties[key] as Json, v) : v;
  }
  return out;
}

const original = (input: z.ZodType) => z.toJSONSchema(input) as Json;

// Parses a tool input the model sent under the strict schema with the tool's zod schema.
export function parseToolInput<T extends z.ZodType>(input: T, raw: unknown) {
  return input.safeParse(stripOptionalNulls(original(input), raw)) as z.ZodSafeParseResult<
    z.infer<T>
  >;
}

export const TOOLS: readonly Anthropic.Tool[] = Object.freeze(
  STAGE_1_TOOL_NAMES.map((name) => {
    const spec = ADVISOR_TOOLS[name];
    return {
      name,
      description: spec.description,
      input_schema: toStrictSchema(original(spec.input)) as Anthropic.Tool.InputSchema,
      strict: true,
    };
  }),
);

export type Stage1ToolName = (typeof STAGE_1_TOOL_NAMES)[number];
export const isStage1Tool = (name: string): name is Stage1ToolName =>
  (STAGE_1_TOOL_NAMES as readonly string[]).includes(name);
export const pauses = (name: Stage1ToolName) => ADVISOR_TOOLS[name].pauses;
