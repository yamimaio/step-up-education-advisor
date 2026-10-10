import type Anthropic from "@anthropic-ai/sdk";
import { CHIPS, type ChipField } from "../core/advisor/chips";
import { pickOf } from "../core/advisor/fields";
import type { Direction } from "../core/advisor/tools";
import type { DirectionResult, SearchResult } from "../core/engine/types";
import type { Profile } from "../core/schema/profile";
import type { Program } from "../core/schema/program";
import {
  fallbackExplanation,
  fallbackSearchExplanation,
  NOTICE_MESSAGES,
  type NoticeKind,
} from "./fallback";
import {
  BadRequest,
  checkAskChoice,
  EmptyInput,
  rewriteChipAnswer,
  rewriteConfirm,
  rewriteSearchConfirm,
  runCheckContradictions,
  validateProposeDirection,
  validateProposeSearch,
} from "./handlers";
import {
  blocksOf,
  hasConfirmedDirection,
  pendingTool,
  toolUsesOf,
  userTurns,
  type Message,
} from "./history";
import { COUNTER_FROM, MESSAGE_CAP, WRAP_UP_AT, WRAP_UP_NOTE } from "./limits";
import { logRequest, type RequestLog, type RequestStatus } from "./log";
import { ModelError, type ModelClient, type ModelErrorKind } from "./model/adapter";
import { SYSTEM } from "./prompt";
import { isEmptyInput } from "./requestSchema";
import { TOOLS } from "./tools";

// One /api/chat request (implementation plan section 5; the contract is docs/chat-api.md). The
// page posts the whole history; the server rewrites the answer to a pending tool, calls the
// model, runs check_contradictions itself, and returns when the model ends its turn or calls a
// pausing tool. Cards come from CHIPS and the engine, never from model text.

export const MAX_SERVER_ROUNDS = 5;

export type PendingChips = {
  toolUseId: string;
  field: ChipField;
  question: string;
  options: { label: string; value: unknown }[];
  pick: number;
};

// The stage 1 card holds the direction; the stage 2 card holds the profile the engine will run
// on (the stage 1 answers from the confirmed direction, the rest from the card). Exactly one of
// the two is set.
export type PendingConfirm =
  | { toolUseId: string; direction: Direction; profile?: never }
  | { toolUseId: string; profile: Profile; direction?: never };

export type ChatResponse = {
  replaceLastUserMessage: Message | null;
  messages: Message[];
  text: string;
  chips: PendingChips | null;
  confirm: PendingConfirm | null;
  direction: DirectionResult | null;
  // Set only on the turn right after the user confirms the stage 2 card: evaluatePrograms's result.
  programs: SearchResult | null;
  counter: { remaining: number } | null;
  notice: { kind: NoticeKind; message: string } | null;
};

export type ChatDeps = {
  model: ModelClient;
  programs: Program[];
  log?: (entry: RequestLog) => void;
  // The date stage 2 checks how recently each record was verified against; tests fix it.
  today?: Date;
};

const notice = (kind: NoticeKind) => ({ kind, message: NOTICE_MESSAGES[kind] });

const errorResult = (id: string, content: string): Anthropic.ToolResultBlockParam => ({
  type: "tool_result",
  tool_use_id: id,
  content,
  is_error: true,
});

type Resolved = {
  message: Message;
  direction: DirectionResult | null;
  programs: SearchResult | null;
  // The searched profile's declined fields, with `programs`, for the template explanation.
  declined: string[];
};

// The answer to the pending tool, rewritten for the model, or the typed message as posted.
// Throws BadRequest when the posted message doesn't fit what is pending.
function resolveLastMessage(posted: Message[], programs: Program[], today: Date): Resolved {
  const last = posted.at(-1)!;
  const blocks = blocksOf(last);
  const pending = pendingTool(posted);
  const asPosted = { message: last, direction: null, programs: null, declined: [] };
  if (!pending) {
    if (!blocks.every((b) => b.type === "text")) throw new BadRequest("nothing is pending");
    if (isEmptyInput(last)) throw new EmptyInput();
    return asPosted;
  }
  const [result, ...rest] = blocks;
  if (
    pending.several ||
    rest.length > 0 ||
    result?.type !== "tool_result" ||
    result.tool_use_id !== pending.use.id ||
    result.is_error
  ) {
    throw new BadRequest("the last message doesn't answer the pending tool");
  }
  const rewrite = (content: string): Message => ({
    role: "user",
    content: [{ ...result, content }],
  });
  const callAt = posted.findIndex((m) => toolUsesOf(m).some((u) => u.id === pending.use.id));
  const before = posted.slice(0, callAt);
  if (pending.use.name === "ask_choice") {
    const ask = checkAskChoice(pending.use.input, before, programs);
    if (!ask.ok) throw new BadRequest("pending ask_choice is invalid");
    const content = rewriteChipAnswer(ask.input.field, result.content);
    return content === null ? asPosted : { ...asPosted, message: rewrite(content) };
  }
  // A card: check the call against the history before it, then run the engine.
  if (pending.use.name === "propose_search") {
    const confirmed = rewriteSearchConfirm(
      result.content,
      pending.use.input,
      before,
      programs,
      today,
    );
    return confirmed
      ? {
          ...asPosted,
          message: rewrite(confirmed.content),
          programs: confirmed.result,
          declined: confirmed.declined,
        }
      : asPosted;
  }
  const confirmed = rewriteConfirm(result.content, pending.use.input, before, programs);
  return confirmed
    ? { ...asPosted, message: rewrite(confirmed.content), direction: confirmed.result }
    : asPosted;
}

const hasWrapUpNote = (history: Message[]) =>
  history.some(
    (m) =>
      m.role === "user" && blocksOf(m).some((b) => b.type === "text" && b.text === WRAP_UP_NOTE),
  );

const textOf = (messages: Message[]) =>
  messages
    .filter((m) => m.role === "assistant")
    .flatMap(blocksOf)
    .flatMap((b) => (b.type === "text" && b.text.trim() ? [b.text.trim()] : []))
    .join("\n\n");

export async function chatLoop(posted: Message[], deps: ChatDeps): Promise<ChatResponse> {
  const log = deps.log ?? logRequest;
  const usage = { inputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, outputTokens: 0 };
  let calls = 0;
  const done = (status: RequestStatus, errorKind?: ModelErrorKind) =>
    log({ status, rounds: calls, ...usage, ...(errorKind ? { errorKind } : {}) });

  const empty: ChatResponse = {
    replaceLastUserMessage: null,
    messages: [],
    text: "",
    chips: null,
    confirm: null,
    direction: null,
    programs: null,
    counter: null,
    notice: null,
  };

  let resolved: Resolved;
  try {
    resolved = resolveLastMessage(posted, deps.programs, deps.today ?? new Date());
  } catch (error) {
    if (error instanceof EmptyInput) {
      done("empty_input");
      return { ...empty, notice: notice("empty_input") };
    }
    if (error instanceof BadRequest) done("bad_request");
    throw error;
  }
  const { direction, programs } = resolved;
  let lastMessage = resolved.message;

  const turns = userTurns(posted);
  const counter = turns >= COUNTER_FROM ? { remaining: Math.max(0, MESSAGE_CAP - turns) } : null;
  // On a failure the verdict or the programs still show, with the template explanation (DQ3).
  const failed = (kind: NoticeKind): ChatResponse => ({
    ...empty,
    text: direction
      ? fallbackExplanation(direction)
      : programs
        ? fallbackSearchExplanation(programs, deps.programs, resolved.declined)
        : "",
    direction,
    programs,
    counter,
    notice: notice(kind),
  });

  if (turns > MESSAGE_CAP) {
    done("limit");
    return failed("limit");
  }

  const prior = posted.slice(0, -1);
  if (turns >= WRAP_UP_AT && !direction && !hasConfirmedDirection(prior) && !hasWrapUpNote(prior)) {
    lastMessage = {
      role: "user",
      content: [...blocksOf(lastMessage), { type: "text", text: WRAP_UP_NOTE }],
    };
  }
  const history = [...prior, lastMessage];
  const added: Message[] = [];
  let chips: PendingChips | null = null;
  let confirm: PendingConfirm | null = null;
  // The text the user sees: every turn but those the server sent back with is_error, so the
  // model's repair talk after a rejected call never reaches the page.
  const shown: string[] = [];

  try {
    for (let rounds = 0; ; rounds++) {
      const turn = await deps.model.send({
        system: [...SYSTEM],
        tools: [...TOOLS],
        messages: [...history, ...added],
      });
      calls++;
      usage.inputTokens += turn.usage.inputTokens;
      usage.cacheReadTokens += turn.usage.cacheReadTokens;
      usage.cacheCreationTokens += turn.usage.cacheCreationTokens;
      usage.outputTokens += turn.usage.outputTokens;
      // A truncated turn may hold a cut-off tool input: never run it.
      if (turn.stopReason !== "end_turn" && turn.stopReason !== "tool_use") {
        throw new ModelError("unknown");
      }
      const content = turn.content as Anthropic.ContentBlockParam[];
      added.push({ role: "assistant", content });
      const said = textOf([{ role: "assistant", content }]);
      const uses = content.filter((b): b is Anthropic.ToolUseBlockParam => b.type === "tool_use");
      const [use] = uses;
      if (!use) {
        shown.push(said);
        break;
      }

      let results: Anthropic.ToolResultBlockParam[];
      if (uses.length > 1) {
        results = uses.map((u) =>
          errorResult(u.id, "Call one tool at a time, then wait for its result."),
        );
      } else if (use.name === "ask_choice") {
        const ask = checkAskChoice(use.input, [...history, ...added.slice(0, -1)], deps.programs);
        if (ask.ok) {
          const field = ask.input.field;
          chips = {
            toolUseId: use.id,
            field,
            question: ask.input.question,
            options: CHIPS[field].map((c) => ({ label: c.label, value: c.value })),
            pick: pickOf(field),
          };
          shown.push(said);
          break;
        }
        results = [errorResult(use.id, ask.problems)];
      } else if (use.name === "propose_direction") {
        const checked = validateProposeDirection(use.input, [...history, ...added.slice(0, -1)]);
        if (checked.ok) {
          confirm = { toolUseId: use.id, direction: checked.direction };
          shown.push(said);
          break;
        }
        results = [errorResult(use.id, checked.problems)];
      } else if (use.name === "propose_search") {
        const checked = validateProposeSearch(
          use.input,
          [...history, ...added.slice(0, -1)],
          deps.programs,
        );
        if (checked.ok) {
          confirm = { toolUseId: use.id, profile: checked.profile };
          shown.push(said);
          break;
        }
        results = [errorResult(use.id, checked.problems)];
      } else if (use.name === "check_contradictions") {
        const ran = runCheckContradictions(
          use.input,
          [...history, ...added.slice(0, -1)],
          deps.programs,
        );
        results = [
          ran.isError
            ? errorResult(use.id, ran.content)
            : { type: "tool_result", tool_use_id: use.id, content: ran.content },
        ];
      } else {
        results = [errorResult(use.id, `There is no tool named ${use.name}.`)];
      }
      if (!results.every((r) => r.is_error)) shown.push(said);
      // Each answered round costs a model call; the loop stops a model that never settles.
      if (rounds >= MAX_SERVER_ROUNDS) throw new ModelError("unknown");
      added.push({ role: "user", content: results });
    }
  } catch (error) {
    const kind = error instanceof ModelError ? error.kind : "unknown";
    done("notice", kind);
    return failed(kind);
  }

  done(chips ? "paused_chips" : confirm ? "paused_confirm" : "ok");
  return {
    replaceLastUserMessage: lastMessage === posted.at(-1) ? null : lastMessage,
    messages: added,
    text: shown.filter(Boolean).join("\n\n"),
    chips,
    confirm,
    direction,
    programs,
    counter,
    notice: null,
  };
}
