"use client";

import { useEffect, useRef } from "react";
import type { ChatState } from "@app/lib/chatState";
import { toTurns } from "@app/lib/conversation";
import { ChipRow } from "./ChipRow";
import { DirectionCard } from "./DirectionCard";
import { Message } from "./Message";
import { MessageCounter } from "./MessageCounter";
import { VerdictBlock } from "./VerdictBlock";

export const GREETING =
  "Hi, I'm Step Up. Tell me where you are in your career and what you'd like to be doing next, and I'll help you find the step that fits.";

export type ChatHandlers = {
  onDraft: (text: string) => void;
  onType: (text: string) => void;
  onChips: (chosen: string[]) => void;
  onConfirm: () => void;
  onCorrect: (corrections: string) => void;
  onRetry: () => void;
};

// The chat column: messages, then the pending chips or card, the notice and the input box.
// The verdict shows right after the user's "Looks right", before the advisor explains it.
export function Chat({ state, ...on }: { state: ChatState } & ChatHandlers) {
  const turns = toTurns(state.history);
  const busy = state.status !== "idle";
  const confirmedAt = turns.findLastIndex((t) => t.kind === "confirm" && t.confirmed);
  const verdictAt = state.verdict ? (confirmedAt >= 0 ? confirmedAt : turns.length - 1) : -2;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [turns.length, state.chips, state.confirm, state.notice]);

  const verdict = state.verdict && (
    <li>
      <VerdictBlock verdict={state.verdict} />
    </li>
  );
  const fallback = state.fallbackText && (
    <Message turn={{ kind: "assistant", text: state.fallbackText }} />
  );

  return (
    <div className="flex flex-col gap-4">
      <ol aria-label="Conversation" className="flex flex-col gap-3">
        <Message turn={{ kind: "assistant", text: GREETING }} />
        {verdictAt === -1 && verdict}
        {turns.map((turn, i) => (
          <MessageWithVerdict key={i} turn={turn} after={i === verdictAt ? verdict : null} />
        ))}
        {fallback}
        {state.status === "sending" && (
          <li className="text-sm text-ink/60" role="status">
            Step Up is thinking…
          </li>
        )}
      </ol>

      {state.chips && (
        <ChipRow
          key={state.chips.toolUseId}
          chips={state.chips}
          disabled={busy}
          onSend={on.onChips}
        />
      )}
      {state.confirm && (
        <DirectionCard
          key={state.confirm.toolUseId}
          direction={state.confirm.direction}
          disabled={busy}
          onConfirm={on.onConfirm}
          onCorrect={on.onCorrect}
        />
      )}

      {state.notice && (
        <div role="alert" className="rounded border border-amber-600/40 bg-amber-50 p-3 text-sm">
          <p>{state.notice.message}</p>
          {state.status === "failed" && (
            <button
              type="button"
              onClick={on.onRetry}
              className="mt-2 rounded bg-teal px-3 py-1 text-paper"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {state.counter && <MessageCounter remaining={state.counter.remaining} />}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (state.draft.trim()) on.onType(state.draft.trim());
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Your message
        </label>
        <textarea
          id="chat-input"
          value={state.draft}
          disabled={busy}
          maxLength={4000}
          rows={2}
          placeholder={state.chips ? "Tap a chip, or type your answer" : "Type your message"}
          onChange={(e) => on.onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="flex-1 rounded border border-ink/30 bg-white p-2 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !state.draft.trim()}
          className="self-end rounded bg-teal px-4 py-2 text-paper disabled:opacity-50"
        >
          Send
        </button>
      </form>
      <div ref={endRef} />
    </div>
  );
}

function MessageWithVerdict({
  turn,
  after,
}: {
  turn: Parameters<typeof Message>[0]["turn"];
  after: React.ReactNode;
}) {
  return (
    <>
      <Message turn={turn} />
      {after}
    </>
  );
}
