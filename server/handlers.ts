import { z } from "zod";
import { CHIP_TARGET, type ChipField } from "../core/advisor/chips";
import { STAGE_1_CHECKLIST } from "../core/advisor/fields";
import {
  AskChoiceInput,
  CheckContradictionsInput,
  ProposeDirectionInput,
  STAGE_1_CHIP_FIELDS,
  toEngineDirection,
  type Direction,
} from "../core/advisor/tools";
import { checkContradictions, recommendCategory } from "../core/index";
import type { DirectionResult } from "../core/engine/types";
import type { Program } from "../core/schema/program";
import { MAX_TEXT_CHARS } from "./limits";
import { calledBefore, chipValue, latestTaps, type Message } from "./history";
import { parseToolInput } from "./tools";

// The server's side of each stage 1 tool (docs/chat-api.md): running check_contradictions,
// checking what the model sends to the pausing tools, and turning the page's answers (chip
// labels, a bare confirm) into the tool results the model sees.

// The posted history breaks the contract: the route answers 400 without echoing anything.
export class BadRequest extends Error {
  constructor(reason: string) {
    super(`bad request: ${reason}`);
    this.name = "BadRequest";
  }
}

// The page typed only whitespace: the nudge, no model call.
export class EmptyInput extends Error {
  constructor() {
    super("empty input");
    this.name = "EmptyInput";
  }
}

const problemsOf = (error: z.ZodError) => z.prettifyError(error);

export function runCheckContradictions(input: unknown, programs: Program[]) {
  const parsed = parseToolInput(CheckContradictionsInput, input);
  if (!parsed.success) return { isError: true, content: problemsOf(parsed.error) };
  const tensions = checkContradictions(parsed.data.profile, programs);
  return { isError: false, content: JSON.stringify({ tensions }) };
}

export function validateAskChoice(input: unknown) {
  const parsed = parseToolInput(AskChoiceInput, input);
  return parsed.success
    ? { ok: true as const, input: parsed.data }
    : { ok: false as const, problems: problemsOf(parsed.error) };
}

// How many chips a field takes: 3 for needs, otherwise 1 (core/advisor/fields.ts).
export function pickOf(field: string): number {
  return STAGE_1_CHECKLIST.find((e) => (e.chips as string[]).includes(field))?.pick ?? 1;
}

// Deep equality that ignores object key order ({ min, max } and { max, min } are the same).
function same(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => same(v, b[i]));
  }
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return same(ka, kb) && ka.every((k) => same((a as never)[k], (b as never)[k]));
  }
  return a === b;
}

function valueAt(direction: Direction, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (v, key) =>
        typeof v === "object" && v !== null ? (v as Record<string, unknown>)[key] : undefined,
      direction,
    );
}

// The checks before the confirm card shows (docs/chat-api.md, "Validation the server does on
// propose_direction"). `history` is everything before the call. Problems go back to the model as
// an is_error result, so it asks again.
export function validateProposeDirection(
  input: unknown,
  history: Message[],
): { ok: true; direction: Direction } | { ok: false; problems: string } {
  const parsed = parseToolInput(ProposeDirectionInput, input);
  if (!parsed.success) return { ok: false, problems: problemsOf(parsed.error) };
  const { direction } = parsed.data;
  const problems: string[] = [];
  if (!calledBefore(history, "check_contradictions")) {
    problems.push("Call check_contradictions with the stage 1 answers before propose_direction.");
  }
  const taps = latestTaps(history);
  for (const chipField of STAGE_1_CHIP_FIELDS) {
    const path = CHIP_TARGET[chipField];
    const field = path.split(".")[0] as keyof Direction;
    if (direction.declined.includes(field as never) || direction[field] === null) continue;
    if (!taps.has(chipField)) {
      problems.push(
        `${path} was not set by a chip tap: ask for it with ask_choice on ${chipField}.`,
      );
    } else if (!same(taps.get(chipField), valueAt(direction, path))) {
      problems.push(`${path} doesn't match the chip the user tapped last for ${chipField}.`);
    }
  }
  return problems.length ? { ok: false, problems: problems.join("\n") } : { ok: true, direction };
}

const ChipAnswer = z.strictObject({ chosen: z.array(z.string()), typed: z.string().optional() });

const ConfirmAnswer = z.union([
  z.strictObject({ confirmed: z.literal(true) }),
  z.strictObject({ confirmed: z.literal(false), corrections: z.string() }),
]);

function parseAnswer<T extends z.ZodType>(schema: T, content: unknown): z.infer<T> {
  if (typeof content !== "string") throw new BadRequest("tool result content is not a string");
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new BadRequest("tool result is not JSON");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new BadRequest("tool result has the wrong shape");
  return parsed.data;
}

function checkTyped(text: string) {
  if (!text.trim()) throw new EmptyInput();
  if (text.length > MAX_TEXT_CHARS) throw new BadRequest("typed answer too long");
}

// A chip answer becomes { chosen: [{ label, value }] }, with each value from CHIPS[field]. A
// typed answer passes through unchanged. Returns null when the content stays as posted.
export function rewriteChipAnswer(field: ChipField, content: unknown): string | null {
  const answer = parseAnswer(ChipAnswer, content);
  if (answer.typed !== undefined) {
    if (answer.chosen.length > 0) throw new BadRequest("typed answer with chips");
    checkTyped(answer.typed);
    return null;
  }
  if (answer.chosen.length !== pickOf(field)) throw new BadRequest("wrong number of chips");
  if (new Set(answer.chosen).size !== answer.chosen.length) throw new BadRequest("repeated chip");
  const chosen = answer.chosen.map((label) => {
    const chip = chipValue(field, label);
    if (!chip.found) throw new BadRequest("unknown chip label");
    return { label, value: chip.value };
  });
  return JSON.stringify({ chosen });
}

// A confirm becomes { confirmed: true, result }: the engine's stage 1 verdict on the direction
// in the propose_direction call it answers, never on anything the client sends. The call is
// checked again first, because the history is client-held. A correction passes through.
export function rewriteConfirm(
  content: unknown,
  callInput: unknown,
  historyBeforeCall: Message[],
  programs: Program[],
): { content: string; result: DirectionResult } | null {
  const answer = parseAnswer(ConfirmAnswer, content);
  if (!answer.confirmed) {
    checkTyped(answer.corrections);
    return null;
  }
  const checked = validateProposeDirection(callInput, historyBeforeCall);
  if (!checked.ok) throw new BadRequest("confirmed card fails validation");
  const result = recommendCategory(toEngineDirection(checked.direction), programs);
  return { content: JSON.stringify({ confirmed: true, result }), result };
}
