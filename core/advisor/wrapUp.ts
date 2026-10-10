// The note the server adds to the user's message at the wrap-up turn (docs/chat-api.md, "Message
// cap"), after any tool result. The page keeps it in the history, so the history stays
// append-only, and hides the block whose text is exactly this string. Matching the whole text,
// not a prefix, means nothing a user types can pass for the note or be hidden as one. Frozen
// text: it is part of the cached history from then on. check_contradictions comes first
// because the server refuses a propose_direction without it.
export const WRAP_UP_NOTE =
  "[Step Up note] The conversation is close to its message limit. Stop asking new questions. Call check_contradictions with the stage 1 answers you have, then call propose_direction now: set every stage 1 field you don't have to null and name it in declined.";
