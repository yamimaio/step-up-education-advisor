# Step Up: the `/api/chat` contract (Stage 1)

The contract between the chat page (step 7) and the server (step 6), so both can be built in parallel. It covers Stage 1 of the two-stage flow (`docs/ux-two-stage.md`): the interview, the confirm card and the category verdict. Stage 2 (`propose_search`, the ranked programs) is not wired yet; its additions are listed at the end.

Types named here live in the repo: the tool inputs in `core/advisor/tools.ts`, the chip sets in `core/advisor/chips.ts`, and `DirectionResult` in `core/engine/types.ts` (PR #22). Message and block shapes are the Anthropic Messages API shapes (`MessageParam`), passed through unchanged.

## The flow in one paragraph

The page keeps the whole history and posts it on every turn. The server adds the frozen system prompt and the Stage 1 tools, calls the model, runs any server tool (`check_contradictions`) itself, and returns when the model ends its turn or calls a pausing tool (`ask_choice` or `propose_direction`). The page swaps in `replaceLastUserMessage` when it is set, appends the returned `messages` to its history, shows the assistant's text, and shows chips or the confirm card when the response carries one. The user's tap or confirm goes back as a `tool_result` in the next request.

### One tool per turn

Every model call sets `tool_choice: { type: "auto", disable_parallel_tool_use: true }`, so an assistant turn holds at most one `tool_use` and at most one thing is pending. If a turn still holds more than one, the server answers every one of them with an `is_error` result ("call one tool at a time") and calls the model again, as a server round. Nothing pauses for the user on such a turn.

## Request

`POST /api/chat`, `Content-Type: application/json`.

```ts
type ChatRequest = {
  // The full history: every message the server returned so far, unchanged (thinking blocks
  // included, never edited or reordered), plus one new user message at the end.
  messages: MessageParam[];
};
```

The new user message at the end is one of:

| When | The last message |
| --- | --- |
| The user types | `{ role: "user", content: [{ type: "text", text }] }` |
| A chip set is pending | `{ role: "user", content: [{ type: "tool_result", tool_use_id, content: JSON.stringify(ChipAnswer) }] }` |
| The confirm card is pending | `{ role: "user", content: [{ type: "tool_result", tool_use_id, content: JSON.stringify(ConfirmAnswer) }] }` |

```ts
// The labels of the chips tapped, in order: one for a single choice, `pick` for a multi-select
// (needs: 3). Labels only: the server looks each one up in CHIPS[field] (the field of the
// pending ask_choice) and refuses a label that isn't in the set with a 400. The client never
// sends a chip value. If the user types instead of tapping, `typed` holds their words and
// `chosen` is empty.
type ChipAnswer = {
  chosen: string[];
  typed?: string;
};

// "Looks right", or "Change something" with what to change in the user's words.
type ConfirmAnswer = { confirmed: true } | { confirmed: false; corrections: string };
```

`tool_use_id` is the `toolUseId` the server returned with the chips or the card. When a tool is pending, the next message must answer it; anything else gets a 400.

**The server rewrites a tool result before the model sees it**, and returns the rewritten message in `replaceLastUserMessage` (see the response):

- a chip answer becomes `{ chosen: [{ label, value }] }`, with each value from `CHIPS[field]`;
- a confirm becomes `{ confirmed: true, result: DirectionResult }` (see "The category result").

A typed message, a `typed` chip answer and a correction pass through unchanged.

**Limits** (from `docs/build-steps.md`, step 6): at most 120 messages, at most 4,000 characters per user text block, a body of at most 1 MB. Empty or whitespace-only text gets a friendly nudge without a model call: a 200 with `notice.kind: "empty_input"` (see "After a notice"), which tells the page to drop that message.

## Response

`200`, `Content-Type: application/json`.

```ts
type ChatResponse = {
  // When set, replace the user message the page just sent (the last one in its history) with
  // this one: the server's rewritten tool result. The page must not keep both: two
  // tool_results for one tool_use_id make the Messages API reject every later turn.
  // Always null when the model call failed (`notice` set): the page keeps the label-only or
  // `{ confirmed }` message it sent, so a retry posts it unchanged and the server rewrites it again.
  replaceLastUserMessage: MessageParam | null;

  // Then append these, in order: the new assistant turns and the results of server tools
  // (check_contradictions). They never repeat the message the page sent.
  messages: MessageParam[];

  // The assistant's visible text from this turn, joined with blank lines. Empty when the model
  // only called a tool.
  text: string;

  // At most one of these two is set: what the user must answer next.
  chips: PendingChips | null;
  confirm: PendingConfirm | null;

  // Set only on the turn right after the user confirms the card.
  direction: DirectionResult | null;

  // From message 30: the messages left before the cap.
  counter: { remaining: number } | null;

  // A plain message for the user when the model failed or the input was empty. What the page
  // does next depends on `kind` (see "After a notice"). `messages` is then empty (server-tool
  // rounds from the failed request are dropped, and a retry runs them again) and `text` is empty
  // or the post-confirm template.
  notice: {
    kind: "retryable" | "auth_or_credit" | "refusal" | "unknown" | "empty_input";
    message: string;
  } | null;
};

type PendingChips = {
  toolUseId: string;
  // A key of CHIPS, one of STAGE_1_CHIP_FIELDS.
  field: string;
  // The advisor's question, shown above the chips.
  question: string;
  // From CHIPS[field], never from the model.
  options: { label: string; value: unknown }[];
  // How many to tap, in order (1, or 3 for needs).
  pick: number;
};

type PendingConfirm = {
  toolUseId: string;
  // The propose_direction input, validated against DirectionSchema. The page renders each line
  // with the chip labels from CHIPS (value → label), and the goal in the user's words. A declined
  // field is null and shows as "Not answered".
  direction: Direction;
};
```

### The category result

When the user confirms, the page sends `{ confirmed: true }`. The server:

1. finds the `propose_direction` call it answers in the history and takes its `direction` (never a direction the client sends);
2. turns it into the engine's stage 1 input with `toEngineDirection` (`core/advisor/tools.ts`): a declined field, which holds `null`, gets the placeholder the engine ignores, and `peerPreference` and `resolvedTensions` are dropped. Then it runs `recommendCategory`;
3. rewrites the tool result to `{ confirmed: true, result: DirectionResult }` and returns it in `replaceLastUserMessage`, so the page stores the same bytes the model saw (one tool result, not two) and the cache stays warm;
4. calls the model, which explains the verdict and ends with "Want to see programs that fit?";
5. returns the result in `direction`, so the verdict card renders from engine data, never from model text.

If the model fails after a confirm, the response still carries `direction` and a template explanation in `text` (`server/fallback.ts`), with `notice` set, `replaceLastUserMessage` null and `messages` empty. The page shows the verdict card and the template text but does not add them to the history.

On a correction, the server passes `{ confirmed: false, corrections }` through as the tool result, and the advisor updates the answers and calls `propose_direction` again (a new card, a new `toolUseId`).

### Validation the server does on `propose_direction`

The server answers with `is_error` and the problems, so the model asks again, without pausing, when:

- the input fails `ProposeDirectionInput`;
- `check_contradictions` hasn't been called in the history;
- a chip field's value doesn't match a chip the user tapped. Taps are read from the history by label, through `CHIPS[field]`; a value written next to a label is never trusted. A declined field (`null`, named in `declined`) is exempt.

## Errors

| Status | When | Body |
| --- | --- | --- |
| 400 | The body fails the request schema, breaks a limit, or doesn't answer the pending tool | `{ error: "bad_request" }`, never echoing the input |
| 405 | Any method but `POST` | `{ error: "method_not_allowed" }` |

### After a notice

Model failures and empty input are not HTTP errors: they return 200 with `notice` set, so the page can keep the interview going. Whenever `notice` is set, `messages` is empty and `replaceLastUserMessage` is null, so the page's history still ends with the message it posted. What the page does next depends on `notice.kind`:

| `notice.kind` | What the page does |
| --- | --- |
| `retryable`, `unknown` | Keeps its history and shows the message with a Retry button. Input stays disabled until a retry succeeds (see Retrying). |
| `refusal` | Retrying the same history would be refused again. The page drops its last message and goes back to the state before it: typed text returns to the input box, or the pending chips or confirm card show again (from the previous response). Input is enabled, so the user can rephrase or choose again. |
| `auth_or_credit` | No retry can help. The page shows the message and disables input. A verdict card already shown, and the transcript download, keep working. |
| `empty_input` | The text was empty or whitespace only, so no model call was made. The page drops that message from its history, clears the input and shows `notice.message` as a nudge next to it. It is never stored as a turn. |

The page should not send an empty or whitespace-only message in the first place. `empty_input` is the server's guard, not the normal path.

**Retrying** (`retryable` and `unknown` only). After a failure the history the page holds is exactly what it posted: the server returned no messages and no replacement, so the last message is still the page's own (a typed message, a label-only `ChipAnswer` or a `{ confirmed }` answer). The page's only next request is that same history, unchanged, behind a Retry button; input stays disabled until a retry succeeds. The server treats it as a first attempt: it resolves the labels or reruns `recommendCategory` (deterministic, so the verdict is the same) and, on success, returns the rewrite in `replaceLastUserMessage`. A rewritten result (`chosen` holding objects, or `confirmed` with a `result`) is valid only earlier in the history, never as the last message; as the last message it gets a 400.

## Example: a chip turn

Response after the model asks for the program length:

```json
{
  "replaceLastUserMessage": null,
  "messages": [{ "role": "assistant", "content": [{ "type": "text", "text": "How long a program could you take on right now?" }, { "type": "tool_use", "id": "toolu_01", "name": "ask_choice", "input": { "field": "maxProgramMonths", "question": "The longest program you'd take on now" } }] }],
  "text": "How long a program could you take on right now?",
  "chips": { "toolUseId": "toolu_01", "field": "maxProgramMonths", "question": "The longest program you'd take on now", "options": [{ "label": "About 2 months", "value": 3 }, { "label": "Up to 6 months", "value": 6 }, { "label": "Up to a year", "value": 12 }, { "label": "Up to 2 years", "value": 24 }, { "label": "Longer is fine", "value": 60 }], "pick": 1 },
  "confirm": null,
  "direction": null,
  "counter": null,
  "notice": null
}
```

The next request appends that assistant message and the tap, by label only:

```json
{ "role": "user", "content": [{ "type": "tool_result", "tool_use_id": "toolu_01", "content": "{\"chosen\":[\"Up to a year\"]}" }] }
```

The response to it carries the rewritten tap, which replaces that last message in the page's history:

```json
{ "replaceLastUserMessage": { "role": "user", "content": [{ "type": "tool_result", "tool_use_id": "toolu_01", "content": "{\"chosen\":[{\"label\":\"Up to a year\",\"value\":12}]}" }] } }
```

## Stage 2 (not wired yet)

When stage 2 is wired, the response gains `PendingConfirm` for `propose_search` (the stage 2 answers) and a `programs` field with the stage 2 result, built the same way: the server runs the engine on the confirmed input from the history and the cards render from that result. `ask_choice` then also accepts the stage 2 chip sets.
