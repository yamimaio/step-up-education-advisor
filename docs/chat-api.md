# Step Up: the `/api/chat` contract (Stage 1)

The contract between the chat page (step 7) and the server (step 6), so both can be built in parallel. It covers Stage 1 of the two-stage flow (`docs/ux-two-stage.md`): the interview, the confirm card and the category verdict. Stage 2 (`propose_search`, the ranked programs) is not wired yet; its additions are listed at the end.

Types named here live in the repo: the tool inputs in `core/advisor/tools.ts`, the chip sets in `core/advisor/chips.ts`, and `DirectionResult` in `core/engine/types.ts` (PR #22). Message and block shapes are the Anthropic Messages API shapes (`MessageParam`), passed through unchanged.

## The flow in one paragraph

The page keeps the whole history and posts it on every turn. The server adds the frozen system prompt and the Stage 1 tools, calls the model, runs any server tool (`check_contradictions`) itself, and returns when the model ends its turn or calls a pausing tool (`ask_choice` or `propose_direction`). The page appends the returned messages to its history, shows the assistant's text, and shows chips or the confirm card when the response carries one. The user's tap or confirm goes back as a `tool_result` in the next request.

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
// The chips tapped, in order: one for a single choice, `pick` for a multi-select (needs: 3).
// If the user types instead of tapping, `typed` holds their words and `chosen` is empty.
type ChipAnswer = {
  chosen: { label: string; value: unknown }[];
  typed?: string;
};

// "Looks right", or "Change something" with what to change in the user's words.
type ConfirmAnswer = { confirmed: true } | { confirmed: false; corrections: string };
```

`tool_use_id` is the `toolUseId` the server returned with the chips or the card. When a tool is pending, the next message must answer it; anything else gets a 400.

**Limits** (from `docs/build-steps.md`, step 6): at most 120 messages, at most 4,000 characters per user text block, a body of at most 1 MB. Empty or whitespace-only text gets a friendly nudge without a model call.

## Response

`200`, `Content-Type: application/json`.

```ts
type ChatResponse = {
  // Append these to the history, in order, before the next request. They hold the new
  // assistant turns, and on a confirm, the server's rewritten tool_result (see below).
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

  // A plain message for the user when the model failed. `text` may then be empty.
  notice: { kind: "retryable" | "auth_or_credit" | "refusal" | "unknown"; message: string } | null;
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
  // with the chip labels from CHIPS (value → label), and the goal in the user's words.
  direction: Direction;
};
```

### The category result

When the user confirms, the page sends `{ confirmed: true }`. The server:

1. finds the `propose_direction` call it answers in the history and takes its `direction` (never a direction the client sends);
2. drops `peerPreference` and `resolvedTensions`, which the engine's stage 1 input (`DirectionProfile`) doesn't take, and runs `recommendCategory`;
3. replaces the tool result with `{ confirmed: true, result: DirectionResult }` and returns that rewritten user message first in `messages`, so the page stores the same bytes the model saw and the cache stays warm;
4. calls the model, which explains the verdict and ends with "Want to see programs that fit?";
5. returns the result in `direction`, so the verdict card renders from engine data, never from model text.

If the model fails after a confirm, the response still carries `direction` and a template explanation in `text` (`server/fallback.ts`), with `notice` set.

On a correction, the server passes `{ confirmed: false, corrections }` through as the tool result, and the advisor updates the answers and calls `propose_direction` again (a new card, a new `toolUseId`).

### Validation the server does on `propose_direction`

The server answers with `is_error` and the problems, so the model asks again, without pausing, when:

- the input fails `ProposeDirectionInput`;
- `check_contradictions` hasn't been called in the history;
- a chip field's value doesn't match a chip the user tapped.

## Errors

| Status | When | Body |
| --- | --- | --- |
| 400 | The body fails the request schema, breaks a limit, or doesn't answer the pending tool | `{ error: "bad_request" }`, never echoing the input |
| 405 | Any method but `POST` | `{ error: "method_not_allowed" }` |

Model failures are not HTTP errors: they return 200 with `notice` set, so the page can keep the history and offer a retry.

## Example: a chip turn

Response after the model asks for the program length:

```json
{
  "messages": [{ "role": "assistant", "content": [{ "type": "text", "text": "How long a program could you take on right now?" }, { "type": "tool_use", "id": "toolu_01", "name": "ask_choice", "input": { "field": "maxProgramMonths", "question": "The longest program you'd take on now" } }] }],
  "text": "How long a program could you take on right now?",
  "chips": { "toolUseId": "toolu_01", "field": "maxProgramMonths", "question": "The longest program you'd take on now", "options": [{ "label": "About 2 months", "value": 3 }, { "label": "Up to 6 months", "value": 6 }, { "label": "Up to a year", "value": 12 }, { "label": "Up to 2 years", "value": 24 }, { "label": "Longer is fine", "value": 60 }], "pick": 1 },
  "confirm": null,
  "direction": null,
  "counter": null,
  "notice": null
}
```

The next request appends that assistant message and the tap:

```json
{ "role": "user", "content": [{ "type": "tool_result", "tool_use_id": "toolu_01", "content": "{\"chosen\":[{\"label\":\"Up to a year\",\"value\":12}]}" }] }
```

## Stage 2 (not wired yet)

When stage 2 is wired, the response gains `PendingConfirm` for `propose_search` (the stage 2 answers) and a `programs` field with the stage 2 result, built the same way: the server runs the engine on the confirmed input from the history and the cards render from that result. `ask_choice` then also accepts the stage 2 chip sets.
