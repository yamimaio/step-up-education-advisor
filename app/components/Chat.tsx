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
  const pendingRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const lastStatus = useRef(state.status);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [turns.length, state.chips, state.confirm, state.notice]);

  // While sending, the input is disabled and the chips or card unmount, so focus drops to the
  // page. When the answer arrives, put it on what comes next: the first chip, the card's heading,
  // Retry, or the input box.
  useEffect(() => {
    const was = lastStatus.current;
    lastStatus.current = state.status;
    if (was !== "sending" || state.status === "sending") return;
    const next =
      state.status === "failed"
        ? retryRef.current
        : (pendingRef.current?.querySelector<HTMLElement>("button, h2") ??
          (state.status === "idle" ? inputRef.current : null));
    next?.focus();
  }, [state.status]);

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
      {/* A log region, so screen readers announce each new reply as it is added. */}
      <div role="log" aria-label="Conversation">
        <ol className="flex flex-col gap-3">
          <Message turn={{ kind: "assistant", text: GREETING }} />
          {verdictAt === -1 && verdict}
          {turns.map((turn, i) => (
            <MessageWithVerdict key={i} turn={turn} after={i === verdictAt ? verdict : null} />
          ))}
          {fallback}
        </ol>
      </div>
      {/* Always mounted, so the change of text is announced. */}
      <p role="status" className="text-sm text-ink/60">
        {state.status === "sending" ? "Step Up is thinking…" : ""}
      </p>

      <div ref={pendingRef}>
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
            correction={state.correction}
            disabled={busy}
            onConfirm={on.onConfirm}
            onCorrect={on.onCorrect}
          />
        )}
      </div>

      {state.notice && (
        <div role="alert" className="rounded border border-amber-600/40 bg-amber-50 p-3 text-sm">
          <p>{state.notice.message}</p>
          {state.status === "failed" && (
            <button
              ref={retryRef}
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
          ref={inputRef}
          value={state.draft}
          disabled={busy}
          maxLength={4000}
          rows={2}
          placeholder={state.chips ? "Tap a chip, or type your answer" : "Type your message"}
          onChange={(e) => on.onDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter that commits an IME composition (Japanese, Chinese, Korean) doesn't send.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
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
