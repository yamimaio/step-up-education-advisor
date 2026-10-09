import { describe, expect, it } from "vitest";
import { toEngineDirection } from "@core/advisor/tools";
import { recommendCategory } from "@core/engine/direction";
import { personaADirection } from "../../tests/fixtures/directions";
import { chatReducer, initialChatState, type ChatState } from "./chatState";
import { textMessage, toolResultMessage, type ChatResponse, type PendingChips } from "./chatTypes";

const ok: ChatResponse = {
  replaceLastUserMessage: null,
  messages: [],
  text: "",
  chips: null,
  confirm: null,
  direction: null,
  counter: null,
  notice: null,
};

const chips: PendingChips = {
  toolUseId: "t1",
  field: "maxProgramMonths",
  question: "How long?",
  options: [{ label: "Up to a year", value: 12 }],
  pick: 1,
};
const ask = { role: "assistant" as const, content: "How long?" };
const result = recommendCategory(toEngineDirection(personaADirection), []);

// A state waiting on chips, after the user typed "hello" earlier.
const waitingOnChips: ChatState = {
  ...initialChatState,
  history: [textMessage("hello"), ask],
  chips,
};
const tap = toolResultMessage("t1", { chosen: ["Up to a year"] });
const sent = chatReducer(waitingOnChips, { type: "send", message: tap });

describe("chatReducer", () => {
  it("appends the sent message and hides the chips while sending", () => {
    expect(sent.history.at(-1)).toBe(tap);
    expect(sent.chips).toBeNull();
    expect(sent.status).toBe("sending");
  });

  it("replaces the last message with the server's rewrite, then appends the new messages", () => {
    const rewritten = toolResultMessage("t1", { chosen: ["rewritten"] });
    const next = chatReducer(sent, {
      type: "response",
      response: { ...ok, replaceLastUserMessage: rewritten, messages: [ask], chips },
    });
    expect(next.history).toEqual([textMessage("hello"), ask, rewritten, ask]);
    expect(next.chips).toBe(chips);
    expect(next.status).toBe("idle");
  });

  it("keeps the history as posted and offers retry on a retryable notice", () => {
    const next = chatReducer(sent, {
      type: "response",
      response: { ...ok, notice: { kind: "retryable", message: "Try again" } },
    });
    expect(next.history).toEqual(sent.history);
    expect(next.status).toBe("failed");
    expect(chatReducer(next, { type: "retry" }).status).toBe("sending");
  });

  it("drops the message and shows the chips again on a refusal", () => {
    const next = chatReducer(sent, {
      type: "response",
      response: { ...ok, notice: { kind: "refusal", message: "Can't help with that" } },
    });
    expect(next.history).toEqual(waitingOnChips.history);
    expect(next.chips).toBe(chips);
    expect(next.status).toBe("idle");
  });

  it("gives typed words back on a refusal", () => {
    const typing = chatReducer(initialChatState, { type: "draft", text: "my words" });
    const out = chatReducer(typing, { type: "send", message: textMessage("my words") });
    expect(out.draft).toBe("");
    const next = chatReducer(out, {
      type: "response",
      response: { ...ok, notice: { kind: "refusal", message: "No" } },
    });
    expect(next.history).toEqual([]);
    expect(next.draft).toBe("my words");
  });

  it("drops an empty message, clears the input and shows the nudge", () => {
    const typing = chatReducer(initialChatState, { type: "draft", text: "   " });
    const out = chatReducer(typing, { type: "send", message: textMessage("   ") });
    const next = chatReducer(out, {
      type: "response",
      response: { ...ok, notice: { kind: "empty_input", message: "Say a bit more" } },
    });
    expect(next.history).toEqual([]);
    expect(next.draft).toBe("");
    expect(next.notice?.message).toBe("Say a bit more");
    expect(next.status).toBe("idle");
  });

  it("disables input for good on auth_or_credit", () => {
    const next = chatReducer(sent, {
      type: "response",
      response: { ...ok, notice: { kind: "auth_or_credit", message: "Unavailable" } },
    });
    expect(next.status).toBe("blocked");
  });

  it("blocks input with no retry on a limit notice, keeping the history as posted", () => {
    const next = chatReducer(sent, {
      type: "response",
      response: { ...ok, notice: { kind: "limit", message: "Message limit reached" } },
    });
    expect(next.status).toBe("blocked");
    expect(next.history).toEqual(sent.history);
    expect(next.notice?.kind).toBe("limit");
  });

  it("shows the verdict and template text when a limit notice comes with the confirm", () => {
    const card: ChatState = {
      ...initialChatState,
      history: [textMessage("hello"), ask],
      confirm: { toolUseId: "t2", direction: personaADirection },
    };
    const out = chatReducer(card, {
      type: "send",
      message: toolResultMessage("t2", { confirmed: true }),
    });
    const next = chatReducer(out, {
      type: "response",
      response: {
        ...ok,
        direction: result,
        text: "Template",
        notice: { kind: "limit", message: "Message limit reached" },
      },
    });
    expect(next.status).toBe("blocked");
    expect(next.verdict).toEqual({ direction: personaADirection, result });
    expect(next.fallbackText).toBe("Template");
    expect(next.history).toEqual(out.history);
  });

  it("shows the verdict and template text after a failed confirm, outside the history", () => {
    const card: ChatState = {
      ...initialChatState,
      history: [textMessage("hello"), ask],
      confirm: { toolUseId: "t2", direction: personaADirection },
    };
    const confirm = toolResultMessage("t2", { confirmed: true });
    const out = chatReducer(card, { type: "send", message: confirm });
    const next = chatReducer(out, {
      type: "response",
      response: {
        ...ok,
        direction: result,
        text: "Template",
        notice: { kind: "retryable", message: "Try again" },
      },
    });
    expect(next.verdict).toEqual({ direction: personaADirection, result });
    expect(next.fallbackText).toBe("Template");
    expect(next.history).toEqual(out.history);
    // A successful retry replaces the template with the model's own turn.
    const retried = chatReducer(chatReducer(next, { type: "retry" }), {
      type: "response",
      response: { ...ok, direction: result, messages: [ask], text: "How long?" },
    });
    expect(retried.fallbackText).toBeNull();
    expect(retried.verdict?.result).toBe(result);
  });

  it("blocks on a refused request and retries a network failure", () => {
    expect(chatReducer(sent, { type: "failure", retry: false, message: "x" }).status).toBe(
      "blocked",
    );
    expect(chatReducer(sent, { type: "failure", retry: true, message: "x" }).status).toBe("failed");
  });

  it("keeps the counter from the server", () => {
    const next = chatReducer(sent, {
      type: "response",
      response: { ...ok, counter: { remaining: 9 } },
    });
    expect(next.counter).toEqual({ remaining: 9 });
  });

  it("takes back a failed attempt's verdict when the retried confirm is refused", () => {
    const card: ChatState = {
      ...initialChatState,
      history: [textMessage("hello"), ask],
      confirm: { toolUseId: "t2", direction: personaADirection },
    };
    const out = chatReducer(card, {
      type: "send",
      message: toolResultMessage("t2", { confirmed: true }),
    });
    const failed = chatReducer(out, {
      type: "response",
      response: {
        ...ok,
        direction: result,
        text: "T",
        notice: { kind: "retryable", message: "x" },
      },
    });
    expect(failed.verdict).not.toBeNull();
    const refused = chatReducer(chatReducer(failed, { type: "retry" }), {
      type: "response",
      response: { ...ok, notice: { kind: "refusal", message: "No" } },
    });
    expect(refused.confirm?.toolUseId).toBe("t2");
    expect(refused.verdict).toBeNull();
    expect(refused.fallbackText).toBeNull();
  });

  it("gives a refused correction back to the card", () => {
    const card: ChatState = {
      ...initialChatState,
      history: [textMessage("hello"), ask],
      confirm: { toolUseId: "t2", direction: personaADirection },
    };
    const words = "Up to 2 years is fine";
    const out = chatReducer(card, {
      type: "send",
      message: toolResultMessage("t2", { confirmed: false, corrections: words }),
      correction: words,
    });
    expect(out.correction).toBeNull();
    const refused = chatReducer(out, {
      type: "response",
      response: { ...ok, notice: { kind: "refusal", message: "No" } },
    });
    expect(refused.confirm?.toolUseId).toBe("t2");
    expect(refused.correction).toBe(words);
    expect(refused.draft).toBe("");
    // The next send clears it.
    expect(
      chatReducer(refused, { type: "send", message: toolResultMessage("t2", { confirmed: true }) })
        .correction,
    ).toBeNull();
  });
});
