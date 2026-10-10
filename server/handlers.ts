import { z } from "zod";
import { CHIP_TARGET, type ChipField } from "../core/advisor/chips";
import { pickOf } from "../core/advisor/fields";
import {
  AskChoiceInput,
  CheckContradictionsInput,
  ProposeDirectionInput,
  ProposeSearchInput,
  searchProfile,
  STAGE_1_CHIP_FIELDS,
  STAGE_2_CHIP_FIELDS,
  TENSION_FIELDS,
  toEngineDirection,
  type Direction,
} from "../core/advisor/tools";
import { checkContradictions, evaluatePrograms, recommendCategory } from "../core/index";
import type { DirectionResult, SearchResult } from "../core/engine/types";
import { ProfileSchema, type PartialProfile, type Profile } from "../core/schema/profile";
import type { Program } from "../core/schema/program";
import { COUNTRY_CODES } from "./countries";
import { MAX_TEXT_CHARS } from "./limits";
import {
  calledBefore,
  chipValue,
  lastConfirmedDirectionCall,
  latestTaps,
  parseJson,
  toolCalls,
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

// The stage 1 fields a rule reads; the rest of TENSION_FIELDS are stage 2's.
const STAGE_1_TENSION_FIELDS = TENSION_FIELDS.filter(
  (f): f is "needs" | "hoursPerWeek" | "degreeRequired" =>
    (STAGE_1_CHIP_FIELDS as readonly string[]).includes(f),
);

// What the rules see, for each field a rule reads (every one is a chip field): the user's latest
// tap, less the fields the model says the user declined, and the tensions the user resolved.
// The model sends only those last two, so it can't leave out an answer a rule needs. Once a
// direction is confirmed, its card holds the stage 1 answers, as for the search profile
// (searchProfile): its values, its declines and the tensions resolved on it. A stage 1 tap after
// the confirm still counts, since the user changed that answer.
export function tensionDraft(
  history: Message[],
  input: z.infer<typeof CheckContradictionsInput>,
): PartialProfile {
  const taps = latestTaps(history);
  const confirmed = confirmedDirection(history);
  const tapsAfter = confirmed ? latestTaps(history.slice(confirmed.resultAt + 1)) : null;
  const declined = new Set<string>(input.declined);
  const draft: Record<string, unknown> = {};
  for (const field of TENSION_FIELDS) {
    if (declined.has(field)) continue;
    const card = confirmed?.direction;
    const fromCard =
      card &&
      tapsAfter &&
      !tapsAfter.has(field) &&
      (STAGE_1_TENSION_FIELDS as string[]).includes(field);
    if (fromCard) {
      const value = card[field as (typeof STAGE_1_TENSION_FIELDS)[number]];
      if (value !== null) draft[field] = value;
    } else if (taps.has(field)) {
      draft[field] = taps.get(field);
    }
  }
  const sent = new Set<string>(input.resolvedTensions.map((t) => t.rule));
  draft.resolvedTensions = [
    ...(confirmed?.direction.resolvedTensions.filter((t) => !sent.has(t.rule)) ?? []),
    ...input.resolvedTensions,
  ];
  return draft as PartialProfile;
}

// `history` is everything before the call.
export function runCheckContradictions(input: unknown, history: Message[], programs: Program[]) {
  const parsed = CheckContradictionsInput.safeParse(input);
  if (!parsed.success) return { isError: true, content: problemsOf(parsed.error) };
  const tensions = checkContradictions(tensionDraft(history, parsed.data), programs);
  return { isError: false, content: JSON.stringify({ tensions }) };
}

export function validateAskChoice(input: unknown) {
  const parsed = AskChoiceInput.safeParse(input);
  return parsed.success
    ? { ok: true as const, input: parsed.data }
    : { ok: false as const, problems: problemsOf(parsed.error) };
}

const isStage2Chip = (field: string) => (STAGE_2_CHIP_FIELDS as readonly string[]).includes(field);

const NO_WINNER =
  "The confirmed direction names no single type of program (the user declined what's missing, every type is out, or two types tie), so there are no programs to search. Don't ask the stage 2 questions: help the user settle the direction first (name the gap, or break the tie with one question and call propose_direction again with tieBreaker).";

// Why stage 2 can't run on this history, or null when it can: it needs a confirmed direction
// whose verdict names a type (docs/ux-two-stage.md). With no winner the engine lists nothing
// (rankPrograms), so the stage 2 questions would lead nowhere.
function stage2Closed(history: Message[], programs: Program[]): string | null {
  const confirmed = confirmedDirection(history);
  if (!confirmed) {
    return "No direction is confirmed yet. Call propose_direction and wait for the user to confirm it before stage 2.";
  }
  const { category } = recommendCategory(toEngineDirection(confirmed.direction), programs);
  return category.winner === null ? NO_WINNER : null;
}

// The model's ask_choice call: a valid input, and a stage 2 chip set only once the user has
// confirmed a direction that names a type. `history` is everything before the call.
export function checkAskChoice(input: unknown, history: Message[], programs: Program[]) {
  const ask = validateAskChoice(input);
  if (ask.ok && isStage2Chip(ask.input.field)) {
    const closed = stage2Closed(history, programs);
    if (closed) {
      return {
        ok: false as const,
        problems: `${ask.input.field} is a stage 2 question. ${closed}`,
      };
    }
  }
  return ask;
}

// Deep equality that ignores object key order ({ min, max } and { max, min } are the same) and
// keys set to undefined (a card with no tieBreaker, whether or not the key is there).
function same(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => same(v, b[i]));
  }
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    const keys = (o: object) =>
      Object.keys(o)
        .filter((k) => (o as never)[k] !== undefined)
        .sort();
    const ka = keys(a);
    const kb = keys(b);
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

const ALREADY_CONFIRMED =
  "The user already confirmed these answers and saw the verdict. Don't show the card again: explain the verdict in words. Call propose_direction again only after the user changes a stage 1 answer (through ask_choice for a chip field, in words for the goal), or with tieBreaker set when the result is a tie.";

// Two cards the engine reads the same: declined and resolvedTensions in any order, and the
// tieBreaker only when the answers tie without it, since the engine ignores it otherwise.
function sameCard(a: Direction, b: Direction, programs: Program[]): boolean {
  const untied = recommendCategory(toEngineDirection({ ...a, tieBreaker: undefined }), programs);
  const key = (d: Direction) => ({
    ...d,
    declined: [...d.declined].sort(),
    resolvedTensions: [...d.resolvedTensions].sort(
      (x, y) => x.rule.localeCompare(y.rule) || x.chosen.localeCompare(y.chosen),
    ),
    tieBreaker: untied.category.tie ? d.tieBreaker : undefined,
  });
  return same(key(a), key(b));
}

// The model's propose_direction call: the checks above, and not the card the user already
// confirmed, since showing it again only loops them through "Looks right" (issue #203). Only a
// new call gets this check: the re-checks of calls already in the client-held history
// (confirmedDirection, rewriteConfirm) leave it out, so a history that holds the loop still reads.
export function checkProposeDirection(input: unknown, history: Message[], programs: Program[]) {
  const parsed = ProposeDirectionInput.safeParse(input);
  const confirmed = parsed.success ? confirmedDirection(history) : null;
  if (
    parsed.success &&
    confirmed &&
    sameCard(confirmed.direction, parsed.data.direction, programs)
  ) {
    return { ok: false as const, problems: ALREADY_CONFIRMED };
  }
  return validateProposeDirection(input, history);
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

// The stage 1 chip fields the user tapped again after the confirmed direction, with another
// value than the card's: the direction changed, so it needs a new propose_direction.
function stage1Changes(direction: Direction, tapsAfterConfirm: Map<string, unknown>): string[] {
  const changed = new Set<string>();
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

// The tension ids any check_contradictions result in the history returned to the advisor.
function tensionsReturned(history: Message[]): Set<string> {
  const ids = new Set<string>();
  for (const { use, result } of toolCalls(history)) {
    if (use.name !== "check_contradictions" || !result || result.is_error) continue;
    const tensions = (parseJson(result.content) as { tensions?: unknown } | undefined)?.tensions;
    if (!Array.isArray(tensions)) continue;
    for (const t of tensions) {
      const id = (t as { id?: unknown } | null)?.id;
      if (typeof id === "string") ids.add(id);
    }
  }
  return ids;
}

// The checks before the stage 2 card shows (docs/chat-api.md, "Validation the server does on
// propose_search"). `history` is everything before the call. On success, `profile` is what the
// engine runs on (searchProfile): the stage 1 answers from the confirmed direction, the chip
// answers from the user's taps, the rest from the card.
export function validateProposeSearch(
  input: unknown,
  history: Message[],
  programs: Program[],
): { ok: true; direction: Direction; profile: Profile } | { ok: false; problems: string } {
  const parsed = ProposeSearchInput.safeParse(input);
  if (!parsed.success) return { ok: false, problems: problemsOf(parsed.error) };
  const closed = stage2Closed(history, programs);
  if (closed) return { ok: false, problems: closed };
  // stage2Closed returns null only with a confirmed direction.
  const confirmed = confirmedDirection(history)!;
  const { direction, resultAt } = confirmed;
  const afterConfirm = history.slice(resultAt + 1);
  const problems: string[] = [];
  const changed = stage1Changes(direction, latestTaps(afterConfirm));
  if (changed.length) {
    problems.push(
      `The user changed these stage 1 answers after confirming the direction: ${changed.join(", ")}. Call check_contradictions and propose_direction again, and let the user confirm the new direction before propose_search.`,
    );
  }
  if (!calledBefore(afterConfirm, "check_contradictions")) {
    problems.push("Call check_contradictions before propose_search.");
  }
  const { profile, missing } = searchProfile(direction, parsed.data.search, latestTaps(history));
  for (const chipField of missing) {
    problems.push(
      `${CHIP_TARGET[chipField]} has no answer: ask for it with ask_choice on ${chipField}, or name ${CHIP_TARGET[chipField].split(".")[0]} in declined if the user won't say.`,
    );
  }
  // The built profile holds the model's words for the home: the country format, the coordinate
  // ranges and the declined pairing are ProfileSchema's.
  const checked = ProfileSchema.safeParse(profile);
  if (!checked.success) {
    const home = checked.error.issues.some((i) => HOME_FIELDS.includes(String(i.path[0])));
    problems.push(problemsOf(checked.error) + (home ? `\n${ASK_HOME_AGAIN}` : ""));
  } else if (profile.homeCountry !== "" && !COUNTRY_CODES.has(profile.homeCountry)) {
    problems.push(
      `homeCountry is not an ISO 3166-1 alpha-2 country code (for example AR or US). ${ASK_HOME_AGAIN}`,
    );
  }
  // A tension that fires on the answers must have reached the advisor through
  // check_contradictions, for example after a tap that came later. Whether the user resolved it
  // stays the advisor's call, as in stage 1.
  const seen = tensionsReturned(history);
  const unseen = checkContradictions(profile, programs).filter(
    (t) => !t.resolved && !seen.has(t.id),
  );
  if (unseen.length) {
    problems.push(
      `These tensions fire on the user's answers, but check_contradictions never returned them: ${unseen
        .map((t) => `${t.id} (${t.text})`)
        .join(
          "; ",
        )}. Call check_contradictions, raise each tension with the user and record their choice in resolvedTensions, then call propose_search again.`,
    );
  }
  return problems.length
    ? { ok: false, problems: problems.join("\n") }
    : { ok: true, direction, profile };
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
): { content: string; result: SearchResult; declined: string[] } | null {
  const answer = parseAnswer(ConfirmAnswer, content);
  if (!answer.confirmed) {
    checkTyped(answer.corrections);
    return null;
  }
  const checked = validateProposeSearch(callInput, historyBeforeCall, programs);
  if (!checked.ok) throw new BadRequest("confirmed search card fails validation");
  const { category } = recommendCategory(toEngineDirection(checked.direction), programs);
  const result = evaluatePrograms(checked.profile, category, programs, today);
  const summary = searchSummary(result, programs);
  return {
    content: JSON.stringify({ confirmed: true, result: summary }),
    result,
    declined: checked.profile.declined,
  };
}
