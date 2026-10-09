import type { Direction } from "@core/advisor/tools";
import type { DirectionResult } from "@core/engine/types";
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
  // Nothing more can be sent (auth_or_credit, or a request the server refused).
  | "blocked";

// What was on screen before a send, so a refusal or an empty-input nudge can put it back.
type Before = { chips: PendingChips | null; confirm: PendingConfirm | null; draft: string };

export type Verdict = { direction: Direction; result: DirectionResult };

export type ChatState = {
  history: MessageParam[];
  chips: PendingChips | null;
  confirm: PendingConfirm | null;
  verdict: Verdict | null;
  // The template explanation after a confirm whose model call failed; shown, never in history.
  fallbackText: string | null;
  counter: { remaining: number } | null;
  notice: Notice | null;
  status: Status;
  draft: string;
  before: Before | null;
};

export const initialChatState: ChatState = {
  history: [],
  chips: null,
  confirm: null,
  verdict: null,
  fallbackText: null,
  counter: null,
  notice: null,
  status: "idle",
  draft: "",
  before: null,
};

export type ChatAction =
  | { type: "draft"; text: string }
  | { type: "send"; message: MessageParam }
  | { type: "retry" }
  | { type: "response"; response: ChatResponse }
  // The request never got a ChatResponse: a network error (retry) or a 400 (no retry helps).
  | { type: "failure"; retry: boolean; message: string };

// The direction the user just confirmed: the card answered by the last message.
function confirmedDirection(state: ChatState): Direction | null {
  return state.before?.confirm?.direction ?? state.verdict?.direction ?? null;
}

function withVerdict(state: ChatState, result: DirectionResult | null): Verdict | null {
  if (!result) return state.verdict;
  const direction = confirmedDirection(state);
  return direction ? { direction, result } : state.verdict;
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "draft":
      return { ...state, draft: action.text };

    case "send":
      return {
        ...state,
        history: [...state.history, action.message],
        before: { chips: state.chips, confirm: state.confirm, draft: state.draft },
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
          const before = state.before ?? { chips: null, confirm: null, draft: "" };
          return {
            ...state,
            history: state.history.slice(0, -1),
            chips: before.chips,
            confirm: before.confirm,
            draft: kind === "refusal" ? before.draft : "",
            before: null,
            counter,
            notice: r.notice,
            status: "idle",
          };
        }
        // retryable, unknown, auth_or_credit: the history stays as posted. A failed confirm still
        // carries the verdict and the template text, shown but not added to the history.
        return {
          ...state,
          verdict: withVerdict(state, r.direction),
          fallbackText: r.direction && r.text ? r.text : state.fallbackText,
          counter,
          notice: r.notice,
          status: kind === "auth_or_credit" ? "blocked" : "failed",
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
        fallbackText: null,
        counter,
        notice: null,
        status: "idle",
        before: null,
      };
    }
  }
}
