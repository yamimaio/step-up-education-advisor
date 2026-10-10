"use client";

import { useReducer } from "react";
import { Chat } from "@app/components/Chat";
import { DownloadTranscript } from "@app/components/DownloadTranscript";
import { PrivacyNotice } from "@app/components/PrivacyNotice";
import { postChat } from "@app/lib/chatClient";
import { chatReducer, initialChatState } from "@app/lib/chatState";
import { textMessage, toolResultMessage, type MessageParam } from "@app/lib/chatTypes";

// The page: chat, chips, the two confirm cards, the verdict and the program cards. State lives in
// memory only (D3); every turn posts the whole history to /api/chat (docs/chat-api.md). Sends and
// retries only start while idle or failed, so state.history is the history the server last answered.
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-teal">Step Up</h1>
        <DownloadTranscript
          disabled={state.history.length === 0}
          input={{
            history: state.history,
            verdict: state.verdict,
            results: state.results,
            fallbackText: state.fallbackText,
          }}
        />
      </header>
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
              toolResultMessage(state.confirm.toolUseId, { confirmed: false, corrections: text }),
            );
          } else {
            send(textMessage(text));
          }
        }}
        onChips={(chosen) => {
          if (state.chips) send(toolResultMessage(state.chips.toolUseId, { chosen }));
        }}
        onConfirm={() => {
          if (state.confirm) send(toolResultMessage(state.confirm.toolUseId, { confirmed: true }));
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
  );
}
