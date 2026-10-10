# Step Up: the `/api/chat` contract

The contract between the chat page (step 7) and the server (step 6), so both can be built in parallel. It covers both stages of the two-stage flow (`docs/ux-two-stage.md`): Stage 1 (the interview, the direction card and the category verdict) and Stage 2 (the practical questions, the search card and the ranked programs, see "Stage 2" at the end).

Types named here live in the repo: the tool inputs in `core/advisor/tools.ts`, the chip sets in `core/advisor/chips.ts`, and `DirectionResult` and `SearchResult` in `core/engine/types.ts`. Message and block shapes are the Anthropic Messages API shapes (`MessageParam`), passed through unchanged.

## The flow in one paragraph

The page keeps the whole history and posts it on every turn. The server adds the frozen system prompt and the four tools, calls the model, runs any server tool (`check_contradictions`) itself, and returns when the model ends its turn or calls a pausing tool (`ask_choice`, `propose_direction` or `propose_search`). The page swaps in `replaceLastUserMessage` when it is set, appends the returned `messages` to its history, shows the assistant's text, and shows chips or the confirm card when the response carries one. The user's tap or confirm goes back as a `tool_result` in the next request.

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
// pending ask_choice). The answer must hold exactly `pick` distinct labels from the set, or
// none with `typed`; anything else gets a 400. The client never sends a chip value. If the
// user types instead of tapping, `typed` holds their words and `chosen` is empty; the advisor
// then asks with ask_choice again, because the card only accepts chip fields from a tap.
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
- a confirm of the direction card becomes `{ confirmed: true, result: DirectionResult }` (see "The category result");
- a confirm of the search card becomes `{ confirmed: true, result: SearchSummary }` (see "Stage 2").

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
  // only called a tool. Text from a turn the server answered with is_error (a rejected tool
  // call) is left out; it stays in `messages`. The page applies the same rule when it draws
  // the history: an assistant message whose tool calls all got is_error shows no text, in the
  // chat or the transcript (app/lib/conversation.ts). #110 tracks the cost of this rule.
  text: string;

  // At most one of these two is set: what the user must answer next.
  chips: PendingChips | null;
  confirm: PendingConfirm | null;

  // Set only on the turn right after the user confirms the direction card.
  direction: DirectionResult | null;

  // Set only on the turn right after the user confirms the search card: the result of
  // evaluatePrograms(...), the core type, unchanged (see "Stage 2").
  programs: SearchResult | null;

  // From message 30: the messages left before the cap.
  counter: { remaining: number } | null;

  // A plain message for the user when the model failed or the input was empty. What the page
  // does next depends on `kind` (see "After a notice"). `messages` is then empty (server-tool
  // rounds from the failed request are dropped, and a retry runs them again) and `text` is empty
  // or the post-confirm template.
  notice: {
    kind: "retryable" | "auth_or_credit" | "refusal" | "unknown" | "empty_input" | "limit";
    message: string;
  } | null;
};

type PendingChips = {
  toolUseId: string;
  // A key of CHIPS: one of STAGE_1_CHIP_FIELDS, or, once a direction is confirmed, one of
  // STAGE_2_CHIP_FIELDS.
  field: string;
  // The advisor's question, shown above the chips.
  question: string;
  // From CHIPS[field], never from the model.
  options: { label: string; value: unknown }[];
  // How many to tap, in order: exactly this many (3 for needs, 2 for locationValues, else 1).
  pick: number;
};

// Exactly one of `direction` (the stage 1 card) and `profile` (the stage 2 card) is set.
type PendingConfirm =
  | {
      toolUseId: string;
      // The propose_direction input, validated against DirectionSchema. The page renders each
      // line with the chip labels from CHIPS (value → label), and the goal in the user's words.
      // A declined field is null and shows as "Not answered".
      direction: Direction;
    }
  | {
      toolUseId: string;
      // The profile the engine will run on (see "Stage 2"): ProfileSchema. A field named in
      // `profile.declined` shows as "Not answered", whatever its value.
      profile: Profile;
    };
```

### The category result

When the user confirms, the page sends `{ confirmed: true }`. The server:

1. finds the `propose_direction` call it answers in the history and takes its `direction`, never a direction outside the validated tool call. Because the history is client-held, it runs that call's checks again (below) against the history before it, and answers 400 if they fail;
2. turns it into the engine's stage 1 input with `toEngineDirection` (`core/advisor/tools.ts`): a declined field, which holds `null`, gets the placeholder the engine ignores, and `peerPreference` and `resolvedTensions` are dropped. Then it runs `recommendCategory`;
3. rewrites the tool result to `{ confirmed: true, result: DirectionResult }` and returns it in `replaceLastUserMessage`, so the page stores the same bytes the model saw (one tool result, not two) and the cache stays warm;
4. calls the model, which explains the verdict and ends with "Want to see programs that fit?";
5. returns the result in `direction`, so the verdict card renders from engine data, never from model text.

If the model fails after a confirm, the response still carries `direction` and a template explanation in `text` (`server/fallback.ts`), with `notice` set, `replaceLastUserMessage` null and `messages` empty. The page shows the verdict card and the template text but does not add them to the history.

On a correction, the server passes `{ confirmed: false, corrections }` through as the tool result, and the advisor updates the answers and calls `propose_direction` again (a new card, a new `toolUseId`). A correction to a chip field goes through `ask_choice` on that field first, because the card only takes a chip field from the latest tap; a card that changes it without a new tap gets `is_error` telling the advisor to ask again.

### Validation the server does on `propose_direction`

The server answers with `is_error` and the problems, so the model asks again, without pausing, when:

- the input fails `ProposeDirectionInput`;
- `check_contradictions` hasn't been called in the history;
- a chip field's value doesn't equal the user's **latest** tap for that field (`needs` in the order tapped). Taps are read from the history by label, through `CHIPS[field]`; a value written next to a label is never trusted. A typed answer is not a tap. A declined field (`null`, named in `declined`) is exempt.

## Errors

| Status | When | Body |
| --- | --- | --- |
| 400 | The body fails the request schema, breaks a limit, or doesn't answer the pending tool | `{ error: "bad_request" }`, never echoing the input |
| 405 | Any method but `POST` | `{ error: "method_not_allowed" }` |
| 429 | The client address passed the rate limit (20 a minute, 100 an hour; `docs/decisions.md`). Checked before the body is read | `{ error: "rate_limited", retryAfter }`, `retryAfter` in whole seconds, also sent as `Retry-After` |

The page treats only `400` and `413` as a refusal of the history (input off). A `408`, a `429`, any other status without a `ChatResponse` and a network error keep the history and offer a Retry; for a `429` the notice says how long to wait.

### After a notice

Model failures and empty input are not HTTP errors: they return 200 with `notice` set, so the page can keep the interview going. Whenever `notice` is set, `messages` is empty and `replaceLastUserMessage` is null, so the page's history still ends with the message it posted. What the page does next depends on `notice.kind`:

| `notice.kind` | What the page does |
| --- | --- |
| `retryable`, `unknown` | Keeps its history and shows the message with a Retry button. Input stays disabled until a retry succeeds (see Retrying). |
| `refusal` | Retrying the same history would be refused again. The page drops its last message and goes back to the state before it: typed text returns to the input box, or the pending chips or confirm card show again (from the previous response). Input is enabled, so the user can rephrase or choose again. |
| `auth_or_credit` | No retry can help. The page shows the message and disables input. A verdict card already shown, and the transcript download, keep working. |
| `empty_input` | The text was empty or whitespace only, so no model call was made. The page drops that message from its history, clears the input and shows `notice.message` as a nudge next to it. It is never stored as a turn. |
| `limit` | The conversation passed its message cap (see "Message cap"), so no model call was made. As for `auth_or_credit`: the page shows the message and disables input. A verdict card or programs already shown, those that come with this response (`direction` or `programs`), and the transcript download keep working. |

The page should not send an empty or whitespace-only message in the first place. `empty_input` is the server's guard, not the normal path.

**Retrying** (`retryable` and `unknown` only). After a failure the history the page holds is exactly what it posted: the server returned no messages and no replacement, so the last message is still the page's own (a typed message, a label-only `ChipAnswer` or a `{ confirmed }` answer). The page's only next request is that same history, unchanged, behind a Retry button; input stays disabled until a retry succeeds. The server treats it as a first attempt: it resolves the labels or reruns `recommendCategory` or `evaluatePrograms` (deterministic, so the verdict and the programs are the same on the same day) and, on success, returns the rewrite in `replaceLastUserMessage`. A rewritten result (`chosen` holding objects, or `confirmed` with a `result`) is valid only earlier in the history, never as the last message; as the last message it gets a 400.

## Message cap

The cap counts **user turns**: typed messages, chip answers and confirm answers, the new one included (DQ4). The server's own rounds (`check_contradictions` results, `is_error` answers) are not turns.

- **From turn 30**, `counter` is `{ remaining: 40 - turns }`; before that it is null. The page shows it quietly ("10 messages left").
- **At turn 35 or later**, while no `propose_direction` card has been confirmed, the server adds one text block to the posted message, after any tool result: `[Step Up note] The conversation is close to its message limit. …` It tells the advisor to wrap up and call `propose_direction`. The rewritten message comes back in `replaceLastUserMessage` like any other rewrite, so the history stays append-only. The note is added once. The page keeps the block in its history and does not show it, in the chat or the transcript. It hides only a user text block whose text equals `WRAP_UP_NOTE` (`core/advisor/wrapUp.ts`) exactly, never a prefix match, so nothing a user types is hidden or mistaken for the note.
- **From turn 41**, the server makes no model call and answers with `notice.kind: "limit"`, `messages` empty and `replaceLastUserMessage` null. If the message confirms a card, the response still carries `direction` or `programs` and the template explanation in `text`.
- The wrap-up note is for stage 1 only: once a direction is confirmed, no note is added (`docs/decisions.md`, "Step 6, Stage 2").

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
  "programs": null,
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

## Stage 2

After the verdict the advisor asks "Want to see programs that fit?". On a yes, it asks the stage 2 questions (`advisor.md`, "Stage 2: show me programs"), checks them with `check_contradictions` and shows the search card with `propose_search`. Nothing new on the wire but what follows; requests, chips, notices and the cap work as in stage 1.

### Stage 2 chips

`ask_choice` takes every chip set: `STAGE_1_CHIP_FIELDS` and `STAGE_2_CHIP_FIELDS` (`core/advisor/tools.ts`). A stage 2 chip set before a direction is confirmed, or while the confirmed direction names no type, gets `is_error` (the advisor asks again later), and a pending one in a history with no confirmed direction gets a 400. `locationValues` takes exactly 2 taps, in order; every other stage 2 set takes 1. A stage 1 chip set can still be asked in stage 2, when the user changes a stage 1 answer.

### `check_contradictions` runs on the taps

The model sends `{ resolvedTensions: [{ rule, chosen }], declined: [...] }` and nothing else, in both stages. Every field a contradiction rule reads is a chip field (`TENSION_FIELDS` in `core/advisor/tools.ts`), so the server runs the rules on the user's latest tap for each of them, less the fields named in `declined`, with the tensions in `resolvedTensions` marked resolved. A field with no tap is missing, and a rule that needs it doesn't fire. The model can't leave out an answer a rule needs. Once a direction is confirmed, its card holds the stage 1 answers the rules read (`needs`, `hoursPerWeek`, `degreeRequired`), as for the search card: its values, its declines and the tensions resolved on it. A stage 1 tap after the confirm still counts, since the user changed that answer.

### The search card

The model's `propose_search` input is `{ search: SearchAnswers }`: only what has no chips and only the model can fill in. That is the home (`homeCity`, `homeRegion`, `homeCountry`, `homeLat`, `homeLon`), `yearsExperience`, `yearsLeading`, the degree's field (`degreeField`), the tensions resolved in stage 2 (`resolvedTensions`) and the stage 2 fields the user declined (`declined`). The server builds the profile from it (`searchProfile`).

`confirm` is `{ toolUseId, profile }`: that profile, the one the engine will run on (`ProfileSchema`).

- **Stage 1 answers** come from the last confirmed `propose_direction` card in the history. A field declined there holds the engine's placeholder (`DECLINED_PLACEHOLDERS`) and is named in `declined`. `peerPreference` and any `tieBreaker` come from that card too; `resolvedTensions` holds the direction's, then any new ones from the search card.
- **Stage 2 chip answers** come from the user's latest taps, never from the model. A field named in `declined` holds a neutral placeholder the engine ignores (`STAGE_2_PLACEHOLDERS`), even after a tap; the page shows it as "Not answered".
- **Home:** `homeCountry` is a two-letter ISO 3166-1 code (`server/countries.ts`), `homeLat` and `homeLon` decimal degrees. A declined home holds `""` for `homeCity` and `homeCountry` and null for `homeRegion`, `homeLat` and `homeLon`, all five named in `declined`.

### Validation the server does on `propose_search`

The server answers with `is_error` and the problems, so the model asks again, without pausing, when:

- the input fails `ProposeSearchInput`, for example with a chip or stage 1 answer in it;
- no `propose_direction` card has been confirmed, or the last confirmed one fails its own checks against the history before it;
- the confirmed direction names no type (`category.winner` is null: the user declined what's missing, every type is out, or two types tie). The engine would list nothing, so the problem tells the advisor to settle the direction first;
- **a stage 1 answer changed since that confirm**: the user tapped a stage 1 chip set after the confirm with another value. The problem tells the advisor to call `check_contradictions` and `propose_direction` again, and only then `propose_search`;
- `check_contradictions` hasn't been called since that confirm;
- a stage 2 chip field has no tap and isn't named in `declined`; the problem names the `ask_choice` field to ask;
- the built profile fails `ProfileSchema`: a country code that isn't two capital letters, a latitude or longitude out of range, a home field empty without being declined, or a half-declined pair of coordinates. A problem with the home tells the advisor to ask where the user lives again, or to decline the home;
- `homeCountry` is not a real ISO 3166-1 alpha-2 code ("XX", "UK");
- a contradiction rule fires on the built profile, the user hasn't resolved it, and no `check_contradictions` result in the history returned it, for example after a tap that came later. Whether the user resolves a tension the advisor did see stays the advisor's call, as in stage 1.

### The programs result

When the user confirms the search card, the page sends `{ confirmed: true }`. The server:

1. finds the `propose_search` call it answers in the history, builds its profile again from that call and the taps before it, runs its checks again (above), and answers 400 if they fail;
2. takes the category from the last confirmed direction before that call: it reruns `recommendCategory` on that card's input, so neither the model nor a verdict stored in the client-held history can change it;
3. runs `evaluatePrograms(profile, category, programs, today)` on the card's profile (as built above);
4. rewrites the tool result to `{ confirmed: true, result: SearchSummary }` and returns it in `replaceLastUserMessage`. `SearchSummary` (`server/stage2.ts`) is what the model needs to explain the list: for each program in `ranking.ranked` and `ranking.alsoWorthALook`, its id, name and institution from the record, category, status, `why`, its city, the checks it misses or can't be checked on and the passing checks the engine has a note on (each with its `note`, such as a per-course estimate, a lodging-only travel total or "requires relocating"), the format and travel lines, the estimated total cost and the confidence level; plus `access`, `noProgram`, `profileGaps` and how many programs are not listed. The whole `SearchResult` is about 2,000 characters a program, and a tool result in the posted history is capped at 20,000;
5. calls the model, which explains the list from that summary;
6. returns the whole result in `programs`: `SearchResult`, the core type `evaluatePrograms` returns, unchanged. The program cards render from it and from the program records (`loadPrograms()`), never from model text.

If the model fails after the confirm, the response still carries `programs` and a template explanation in `text` (`fallbackSearchExplanation` in `server/fallback.ts`: the access message, the ranked programs by name with their why lines and, for a near miss, why: slightly over a published limit, a figure the school doesn't publish, or an answer of the user's that is missing; "Also worth a look"; the declined answers in plain words; and an unknown airfare the user didn't decline), with `notice` set, `replaceLastUserMessage` null and `messages` empty, as for the verdict.

On a correction, the server passes `{ confirmed: false, corrections }` through, and the advisor updates the answers and calls `propose_search` again (a chip field through a new tap first).
