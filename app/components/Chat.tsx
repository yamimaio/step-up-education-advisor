"use client";

import { useEffect, useRef } from "react";
import type { ChatState } from "@app/lib/chatState";
import { toTurns, type Turn } from "@app/lib/conversation";
import { confirmCard } from "@app/lib/labels";
import { ChipRow } from "./ChipRow";
import { ConfirmCard } from "./ConfirmCard";
import { Message } from "./Message";
import { MessageCounter } from "./MessageCounter";
import { ProgramResults } from "./ProgramResults";
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
// The verdict shows right after the user's "Looks right" on the first card, and the programs
// right after it on the search card, each before the advisor explains it.
export function Chat({ state, ...on }: { state: ChatState } & ChatHandlers) {
  const turns = toTurns(state.history);
  const busy = state.status !== "idle";
  // Where a card's result goes: after the confirm that produced it (the verdict: the last stage 1
  // confirm; the programs: the confirm of their own search card, so a later card's failed confirm
  // never looks answered by them), or at the end while that confirm is not in the history yet.
  const anchor = (shown: boolean, match: (t: Turn) => boolean) => {
    if (!shown) return -2;
    const at = turns.findLastIndex((t) => t.kind === "confirm" && t.confirmed && match(t));
    return at >= 0 ? at : turns.length - 1;
  };
  const verdictAt = anchor(state.verdict !== null, (t) => t.kind === "confirm" && t.stage === 1);
  const resultsAt = anchor(
    state.results !== null,
    (t) => t.kind === "confirm" && t.toolUseId === state.results?.toolUseId,
  );
  const endRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLLIElement>(null);
  const lastStatus = useRef(state.status);
  const shownResults = useRef<string | null>(null);

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

  // When a search's program cards first show, the view starts at "Programs that fit" rather than
  // past the last card, and focus goes to that heading. After a failed reply, focus stays on
  // Retry. Declared after the effects above, so it runs after them.
  const resultsId = state.results?.toolUseId ?? null;
  useEffect(() => {
    if (resultsId === shownResults.current) return;
    shownResults.current = resultsId;
    const heading = resultsRef.current?.querySelector<HTMLElement>("h2");
    if (!heading) return;
    heading.scrollIntoView?.({ block: "start" });
    if (state.status !== "failed") heading.focus({ preventScroll: true });
  }, [resultsId, state.status]);

  const verdict = state.verdict && (
    <li>
      <VerdictBlock verdict={state.verdict} />
    </li>
  );
  // The cards are long, so they stay out of the log's announcements (aria-live="off"); the log
  // announces one short line instead, and the cards are read like the rest of the page.
  const listed = state.results
    ? state.results.result.ranking.ranked.length +
      state.results.result.ranking.alsoWorthALook.length
    : 0;
  const results = state.results && (
    <>
      <li className="sr-only">
        {listed === 1 ? "1 program" : `${listed} programs`} listed below, under Programs that fit.
      </li>
      <li ref={resultsRef} aria-live="off">
        <ProgramResults results={state.results} verdict={state.verdict} />
      </li>
    </>
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
          {resultsAt === -1 && results}
          {turns.map((turn, i) => (
            <MessageThen
              key={i}
              turn={turn}
              after={
                <>
                  {i === verdictAt && verdict}
                  {i === resultsAt && results}
                </>
              }
            />
          ))}
          {fallback}
        </ol>
      </div>
      {/* Always mounted, so the change of text is announced. */}
      <p role="status" className="text-sm text-muted">
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
          <ConfirmCard
            key={state.confirm.toolUseId}
            {...confirmCard(state.confirm, state.verdict?.direction)}
            correction={state.correction}
            disabled={busy}
            onConfirm={on.onConfirm}
            onCorrect={on.onCorrect}
          />
        )}
      </div>

      {state.notice && (
        <div role="alert" className="rounded-xl border border-warm bg-card p-3 text-sm">
          <p>{state.notice.message}</p>
          {state.status === "failed" && (
            <button
              ref={retryRef}
              type="button"
              onClick={on.onRetry}
              className="mt-2 rounded-lg bg-teal px-3 py-1 font-medium text-white"
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
          className="min-w-0 flex-1 rounded-xl border border-muted bg-card p-2 placeholder:text-muted disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !state.draft.trim()}
          className="self-end rounded-lg bg-teal px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
      <div ref={endRef} />
    </div>
  );
}

function MessageThen({
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
