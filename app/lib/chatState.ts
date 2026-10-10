import type { Direction } from "@core/advisor/tools";
import type { DirectionResult, SearchResult } from "@core/engine/types";
import type { Profile } from "@core/schema/profile";
import type { ChatResponse, MessageParam, Notice, PendingChips, PendingConfirm } from "./chatTypes";

// The page's chat state, in memory only (D3). The history holds exactly what the server returned
// plus the user's messages, never edited (docs/chat-api.md). Reducer only: no fetch here.

export type Status =
  // Input enabled.
  | "idle"
  // A request is in flight.
  | "sending"
  // The last request failed and can be retried unchanged (retryable, unknown, network).
  | "failed"
  // Nothing more can be sent (auth_or_credit, limit, or a request the server refused).
  | "blocked";

// What was on screen before a send, so a refusal or an empty-input nudge can put it back. A
// retried confirm that is refused also takes back the verdict or programs its failed attempt showed.
type Before = {
  chips: PendingChips | null;
  confirm: PendingConfirm | null;
  draft: string;
  // The words sent from the card's "Change something" box, given back on a refusal.
  correction: string | null;
  verdict: Verdict | null;
  results: Results | null;
  fallbackText: string | null;
};

export type Verdict = { direction: Direction; result: DirectionResult };

// Stage 2: the search card the user confirmed (its toolUseId and profile) and the engine's result
// for it. The chat draws the programs under that card's answer, not a later one's.
export type Results = { toolUseId: string; profile: Profile; result: SearchResult };

export type ChatState = {
  history: MessageParam[];
  chips: PendingChips | null;
  confirm: PendingConfirm | null;
  verdict: Verdict | null;
  results: Results | null;
  // The template explanation after a confirm whose model call failed; shown, never in history.
  fallbackText: string | null;
  counter: { remaining: number } | null;
  notice: Notice | null;
  status: Status;
  draft: string;
  // A refused correction, put back in the card's "Change something" box.
  correction: string | null;
  before: Before | null;
};

export const initialChatState: ChatState = {
  history: [],
  chips: null,
  confirm: null,
  verdict: null,
  results: null,
  fallbackText: null,
  counter: null,
  notice: null,
  status: "idle",
  draft: "",
  correction: null,
  before: null,
};

export type ChatAction =
  | { type: "draft"; text: string }
  | { type: "send"; message: MessageParam; correction?: string }
  | { type: "retry" }
  | { type: "response"; response: ChatResponse }
  // The request never got a ChatResponse: a network error, 5xx, 408 or 429 (retry), or a 400 or
  // 413 (no retry helps).
  | { type: "failure"; retry: boolean; message: string };

// The card the last message answered, while the answer is in flight or just came back.
function answeredCard(state: ChatState): PendingConfirm | null {
  return state.before?.confirm ?? null;
}

// The direction the user just confirmed: the card answered by the last message.
function confirmedDirection(state: ChatState): Direction | null {
  const card = answeredCard(state);
  return card && "direction" in card ? card.direction : (state.verdict?.direction ?? null);
}

function withVerdict(state: ChatState, result: DirectionResult | null): Verdict | null {
  if (!result) return state.verdict;
  const direction = confirmedDirection(state);
  return direction ? { direction, result } : state.verdict;
}

// The programs after a response. A new verdict clears them: they were ranked for the direction it
// replaces, and the advisor asks for a new search card before showing programs again. `programs`
// is missing, not null, from a server that predates stage 2.
function withResults(
  state: ChatState,
  r: Pick<ChatResponse, "direction" | "programs">,
): Results | null {
  if (r.direction) return null;
  if (!r.programs) return state.results;
  const card = answeredCard(state);
  return card && "profile" in card
    ? { toolUseId: card.toolUseId, profile: card.profile, result: r.programs }
    : state.results;
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "draft":
      return { ...state, draft: action.text };

    case "send":
      return {
        ...state,
        history: [...state.history, action.message],
        before: {
          chips: state.chips,
          confirm: state.confirm,
          draft: state.draft,
          correction: action.correction ?? null,
          verdict: state.verdict,
          results: state.results,
          fallbackText: state.fallbackText,
        },
        correction: null,
        chips: null,
        confirm: null,
        draft: "",
        notice: null,
        status: "sending",
      };

    case "retry":
      return { ...state, notice: null, status: "sending" };

    case "failure":
      return {
        ...state,
        notice: { kind: action.retry ? "retryable" : "unknown", message: action.message },
        status: action.retry ? "failed" : "blocked",
      };

    case "response": {
      const r = action.response;
      const counter = r.counter ?? state.counter;
      if (r.notice) {
        const { kind } = r.notice;
        if (kind === "refusal" || kind === "empty_input") {
          // Drop the message just sent and go back to the state before it. The nudge clears
          // the input; a refusal gives the user their words back to rephrase.
          const before: Before = state.before ?? {
            chips: null,
            confirm: null,
            draft: "",
            correction: null,
            verdict: state.verdict,
            results: state.results,
            fallbackText: state.fallbackText,
          };
          return {
            ...state,
            history: state.history.slice(0, -1),
            chips: before.chips,
            confirm: before.confirm,
            draft: kind === "refusal" ? before.draft : "",
            correction: kind === "refusal" ? before.correction : null,
            verdict: before.verdict,
            results: before.results,
            fallbackText: before.fallbackText,
            before: null,
            counter,
            notice: r.notice,
            status: "idle",
          };
        }
        // retryable, unknown, auth_or_credit, limit: the history stays as posted. A failed confirm still
        // carries the verdict or the programs and the template text, shown but not added to the history.
        const confirmed = r.direction || r.programs;
        return {
          ...state,
          verdict: withVerdict(state, r.direction),
          results: withResults(state, r),
          fallbackText: confirmed && r.text ? r.text : state.fallbackText,
          counter,
          notice: r.notice,
          status: kind === "auth_or_credit" || kind === "limit" ? "blocked" : "failed",
        };
      }
      const history = r.replaceLastUserMessage
        ? [...state.history.slice(0, -1), r.replaceLastUserMessage]
        : state.history;
      return {
        ...state,
        history: [...history, ...r.messages],
        chips: r.chips,
        confirm: r.confirm,
        verdict: withVerdict(state, r.direction),
        results: withResults(state, r),
        fallbackText: null,
        counter,
        notice: null,
        status: "idle",
        before: null,
      };
    }
  }
}
