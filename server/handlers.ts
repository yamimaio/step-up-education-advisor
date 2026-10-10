import { z } from "zod";
import { CHIP_TARGET, type ChipField } from "../core/advisor/chips";
import { pickOf } from "../core/advisor/fields";
import {
  AskChoiceInput,
  CheckContradictionsInput,
  ProposeDirectionInput,
  ProposeSearchInput,
  STAGE_1_CHIP_FIELDS,
  STAGE_2_CHIP_FIELDS,
  toEngineDirection,
  toEngineProfile,
  type Direction,
} from "../core/advisor/tools";
import { checkContradictions, evaluatePrograms, recommendCategory } from "../core/index";
import type { DirectionResult, SearchResult } from "../core/engine/types";
import type { Profile } from "../core/schema/profile";
import type { Program } from "../core/schema/program";
import { COUNTRY_CODES } from "./countries";
import { MAX_TEXT_CHARS } from "./limits";
import {
  calledBefore,
  chipValue,
  lastConfirmedDirectionCall,
  latestTaps,
  type Message,
} from "./history";
import { searchSummary } from "./stage2";

// The server's side of each tool (docs/chat-api.md): running check_contradictions, checking
// what the model sends to the pausing tools, and turning the page's answers (chip labels, a
// bare confirm) into the tool results the model sees.

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
  const parsed = CheckContradictionsInput.safeParse(input);
  if (!parsed.success) return { isError: true, content: problemsOf(parsed.error) };
  const tensions = checkContradictions(parsed.data.profile, programs);
  return { isError: false, content: JSON.stringify({ tensions }) };
}

export function validateAskChoice(input: unknown) {
  const parsed = AskChoiceInput.safeParse(input);
  return parsed.success
    ? { ok: true as const, input: parsed.data }
    : { ok: false as const, problems: problemsOf(parsed.error) };
}

const isStage2Chip = (field: string) => (STAGE_2_CHIP_FIELDS as readonly string[]).includes(field);

// The model's ask_choice call: a valid input, and a stage 2 chip set only once the user has
// confirmed a direction (docs/ux-two-stage.md). `history` is everything before the call.
export function checkAskChoice(input: unknown, history: Message[]) {
  const ask = validateAskChoice(input);
  if (ask.ok && isStage2Chip(ask.input.field) && !confirmedDirection(history)) {
    return {
      ok: false as const,
      problems: `${ask.input.field} is a stage 2 question. Ask it only after the user confirms the direction card and says yes to seeing programs.`,
    };
  }
  return ask;
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

function valueAt(answers: Direction | Profile, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (v, key) =>
        typeof v === "object" && v !== null ? (v as Record<string, unknown>)[key] : undefined,
      answers,
    );
}

// The checks before the confirm card shows (docs/chat-api.md, "Validation the server does on
// propose_direction"). `history` is everything before the call. Problems go back to the model as
// an is_error result, so it asks again.
export function validateProposeDirection(
  input: unknown,
  history: Message[],
): { ok: true; direction: Direction } | { ok: false; problems: string } {
  const parsed = ProposeDirectionInput.safeParse(input);
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
      problems.push(
        `${path} doesn't match the chip the user tapped last for ${chipField}. If the user changed this answer, ask for it again with ask_choice on ${chipField} before the card; otherwise use the tapped value.`,
      );
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

// The direction the user confirmed last, checked again against the history before its call
// (the history is client-held), and the index of the message that confirms it. Null when no
// card was confirmed or the last confirmed card fails its checks.
export function confirmedDirection(
  history: Message[],
): { direction: Direction; resultAt: number } | null {
  const call = lastConfirmedDirectionCall(history);
  if (!call) return null;
  const checked = validateProposeDirection(call.use.input, history.slice(0, call.callAt));
  return checked.ok ? { direction: checked.direction, resultAt: call.resultAt } : null;
}

// The stage 1 fields of the propose_search profile, compared with the confirmed direction.
const STAGE_1_FIELDS = [
  "careerGoal",
  "goalClarity",
  "needs",
  "peerPreference",
  "maxProgramMonths",
  "hoursPerWeek",
  "keepWorking",
  "degreeRequired",
] as const satisfies readonly (keyof Direction & keyof Profile)[];

// The stage 1 answers that changed since the confirmed direction: a card value that differs
// from it (a field declined on one card and not the other counts), or a stage 1 chip tapped
// after the confirm with another value. Any of these needs a new propose_direction.
function stage1Changes(
  direction: Direction,
  card: Profile,
  tapsAfterConfirm: Map<string, unknown>,
): string[] {
  const changed = new Set<string>();
  for (const field of STAGE_1_FIELDS) {
    const wasDeclined = (direction.declined as readonly string[]).includes(field);
    const isDeclined = card.declined.includes(field);
    if (wasDeclined ? !isDeclined : isDeclined || !same(card[field], direction[field])) {
      changed.add(field);
    }
  }
  for (const chipField of STAGE_1_CHIP_FIELDS) {
    if (!tapsAfterConfirm.has(chipField)) continue;
    const path = CHIP_TARGET[chipField];
    const field = path.split(".")[0] as keyof Direction;
    if (
      direction[field] === null ||
      !same(tapsAfterConfirm.get(chipField), valueAt(direction, path))
    ) {
      changed.add(field);
    }
  }
  return [...changed];
}

const HOME_FIELDS = ["homeCity", "homeRegion", "homeCountry", "homeLat", "homeLon"];
const ASK_HOME_AGAIN =
  'Ask the user where they live again, or, if they won\'t say, name homeCity, homeRegion, homeCountry, homeLat and homeLon in declined ("" for the city and country, null for the rest).';

// The checks before the stage 2 card shows (docs/chat-api.md, "Validation the server does on
// propose_search"). `history` is everything before the call. On success, `profile` is what the
// engine runs on: the stage 1 answers from the confirmed direction, the rest from the card.
export function validateProposeSearch(
  input: unknown,
  history: Message[],
): { ok: true; direction: Direction; profile: Profile } | { ok: false; problems: string } {
  const parsed = ProposeSearchInput.safeParse(input);
  if (!parsed.success) {
    const home = parsed.error.issues.some(
      (i) => i.path[0] === "profile" && HOME_FIELDS.includes(String(i.path[1])),
    );
    return {
      ok: false,
      problems: problemsOf(parsed.error) + (home ? `\n${ASK_HOME_AGAIN}` : ""),
    };
  }
  const card = parsed.data.profile;
  const confirmed = confirmedDirection(history);
  if (!confirmed) {
    return {
      ok: false,
      problems:
        "No direction is confirmed yet. Call propose_direction and wait for the user to confirm it before propose_search.",
    };
  }
  const { direction, resultAt } = confirmed;
  const afterConfirm = history.slice(resultAt + 1);
  const problems: string[] = [];
  const changed = stage1Changes(direction, card, latestTaps(afterConfirm));
  if (changed.length) {
    problems.push(
      `These stage 1 answers differ from the confirmed direction card: ${changed.join(", ")}. If the user changed one, ask for it again with ask_choice when it has chips, then call check_contradictions and propose_direction again before propose_search. Otherwise copy them from the confirmed card; a field declined there stays named in declined.`,
    );
  }
  if (!calledBefore(afterConfirm, "check_contradictions")) {
    problems.push(
      "Call check_contradictions with the answers so far, stage 2 included, before propose_search.",
    );
  }
  const taps = latestTaps(history);
  for (const chipField of STAGE_2_CHIP_FIELDS) {
    const path = CHIP_TARGET[chipField];
    const field = path.split(".")[0]!;
    if (card.declined.includes(field)) continue;
    if (!taps.has(chipField)) {
      problems.push(
        `${path} was not set by a chip tap: ask for it with ask_choice on ${chipField}, or name ${field} in declined if the user won't say.`,
      );
    } else if (!same(taps.get(chipField), valueAt(card, path))) {
      problems.push(
        `${path} doesn't match the chip the user tapped last for ${chipField}. If the user changed this answer, ask for it again with ask_choice on ${chipField}; otherwise use the tapped value.`,
      );
    }
  }
  if (card.homeCountry !== "" && !COUNTRY_CODES.has(card.homeCountry)) {
    problems.push(
      `homeCountry is not an ISO 3166-1 alpha-2 country code (for example AR or US). ${ASK_HOME_AGAIN}`,
    );
  }
  return problems.length
    ? { ok: false, problems: problems.join("\n") }
    : { ok: true, direction, profile: toEngineProfile(direction, card) };
}

// A confirm of the stage 2 card becomes { confirmed: true, result }, where result is a summary
// of the engine's stage 2 result for the model (server/stage2.ts). The engine runs on the
// profile from the propose_search call it answers and the category of the direction confirmed
// before it, both checked again from the history, never on anything the client sends. The full
// result goes back to the page in `programs`. A correction passes through.
export function rewriteSearchConfirm(
  content: unknown,
  callInput: unknown,
  historyBeforeCall: Message[],
  programs: Program[],
  today: Date,
): { content: string; result: SearchResult } | null {
  const answer = parseAnswer(ConfirmAnswer, content);
  if (!answer.confirmed) {
    checkTyped(answer.corrections);
    return null;
  }
  const checked = validateProposeSearch(callInput, historyBeforeCall);
  if (!checked.ok) throw new BadRequest("confirmed search card fails validation");
  const { category } = recommendCategory(toEngineDirection(checked.direction), programs);
  const result = evaluatePrograms(checked.profile, category, programs, today);
  const summary = searchSummary(result, programs);
  return { content: JSON.stringify({ confirmed: true, result: summary }), result };
}
