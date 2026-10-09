// The message cap (implementation plan section 5, D5; docs/chat-api.md, "Message cap"). User
// turns are counted as in server/history.ts: typed messages, chip taps and confirms (DQ4).

export const MESSAGE_CAP = 40;
// From this turn the response carries the messages left.
export const COUNTER_FROM = 30;
// From this turn, while no direction is confirmed, the advisor is told to wrap up (once).
export const WRAP_UP_AT = 35;

// The page posts at most this many messages and this much text per user block (build-steps step 6).
export const MAX_MESSAGES = 120;
export const MAX_TEXT_CHARS = 4000;
export const MAX_BODY_BYTES = 1_000_000;

// Added to the user's message at the wrap-up turn, after any tool result. The page keeps it in
// the history (so the history stays append-only) and doesn't show it. Frozen text: it is part of
// the cached history from then on. check_contradictions comes first because the server refuses a
// propose_direction without it.
export const WRAP_UP_PREFIX = "[Step Up note]";
export const WRAP_UP_NOTE = `${WRAP_UP_PREFIX} The conversation is close to its message limit. Stop asking new questions. Call check_contradictions with the stage 1 answers you have, then call propose_direction now: set every stage 1 field you don't have to null and name it in declined.`;
