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

// The wrap-up note lives in core/advisor so the page can hide exactly that block.
export { WRAP_UP_NOTE } from "../core/advisor/wrapUp";

// Per-IP rate limit on /api/chat (server/rateLimit.ts, docs/decisions.md "Rate limit"). A whole
// conversation is at most 40 turns, so the hour allows two and a half, with retries.
export const RATE_LIMIT_PER_MINUTE = 20;
export const RATE_LIMIT_PER_HOUR = 100;
export const MAX_TRACKED_CLIENTS = 10_000;
