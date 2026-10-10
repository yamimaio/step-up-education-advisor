"use client";

import { useReducer } from "react";
import { Chat } from "@app/components/Chat";
import { DownloadTranscript } from "@app/components/DownloadTranscript";
import { PrivacyNotice } from "@app/components/PrivacyNotice";
import { ProgressLine } from "@app/components/ProgressLine";
import { StepUpMark } from "@app/components/StepUpMark";
import { UnderstoodPanel } from "@app/components/UnderstoodPanel";
import { postChat } from "@app/lib/chatClient";
import { chatReducer, initialChatState } from "@app/lib/chatState";
import { progressSteps } from "@app/lib/progress";
import { understoodLines } from "@app/lib/understood";
import { textMessage, toolResultMessage, type MessageParam } from "@app/lib/chatTypes";

// The Stage 1 page: chat, chips, the confirm card and the verdict. State lives in memory only
// (D3); every turn posts the whole history to /api/chat (docs/chat-api.md). Sends and retries
// only start while idle or failed, so state.history is the history the server last answered.
// On lg screens a read-only "What I've understood" panel sits beside the chat.

const TAGLINE = "Find the next educational step that fits where you want to lead.";

export default function Home() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  const post = async (messages: MessageParam[]) => dispatch(await postChat(messages));

  // `correction`: words from the card's own box, given back to it if the server refuses them.
  const send = (message: MessageParam, correction?: string) => {
    if (state.status !== "idle") return;
    dispatch({ type: "send", message, correction });
    void post([...state.history, message]);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-6 lg:max-w-[calc(64.5rem+4rem)] lg:px-8">
      <header className="flex flex-col gap-3 border-b border-line pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <StepUpMark className="size-9 shrink-0" />
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Step Up</h1>
          </div>
          <DownloadTranscript
            disabled={state.history.length === 0}
            input={{
              history: state.history,
              verdict: state.verdict,
              fallbackText: state.fallbackText,
            }}
          />
        </div>
        <p className="text-sm text-muted">{TAGLINE}</p>
        <ProgressLine steps={progressSteps(state)} />
      </header>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
        <main className="flex min-w-0 flex-col gap-4">
          <PrivacyNotice />
          <Chat
            state={state}
            onDraft={(text) => dispatch({ type: "draft", text })}
            onType={(text) => {
              // Typing while chips or the card are pending answers them in words.
              if (state.chips) {
                send(toolResultMessage(state.chips.toolUseId, { chosen: [], typed: text }));
              } else if (state.confirm) {
                send(
                  toolResultMessage(state.confirm.toolUseId, {
                    confirmed: false,
                    corrections: text,
                  }),
                );
              } else {
                send(textMessage(text));
              }
            }}
            onChips={(chosen) => {
              if (state.chips) send(toolResultMessage(state.chips.toolUseId, { chosen }));
            }}
            onConfirm={() => {
              if (state.confirm)
                send(toolResultMessage(state.confirm.toolUseId, { confirmed: true }));
            }}
            onCorrect={(corrections) => {
              if (state.confirm) {
                send(
                  toolResultMessage(state.confirm.toolUseId, { confirmed: false, corrections }),
                  corrections,
                );
              }
            }}
            onRetry={() => {
              if (state.status !== "failed") return;
              dispatch({ type: "retry" });
              void post(state.history);
            }}
          />
        </main>
        <UnderstoodPanel lines={understoodLines(state)} />
      </div>
    </div>
  );
}
