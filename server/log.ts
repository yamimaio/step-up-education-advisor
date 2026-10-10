import type { ClientHeaderShape } from "./rateLimit";

// The server's only logger (CLAUDE.md rule 4). It takes numbers, booleans and fixed enums only, so
// message content can't be logged by type: no strings from the request or the model ever reach it.

export type RequestStatus =
  "ok" | "paused_chips" | "paused_confirm" | "notice" | "empty_input" | "limit" | "bad_request";

export type RequestLog = {
  status: RequestStatus;
  // Model calls made for this request.
  rounds: number;
  inputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  outputTokens: number;
  errorKind?: "retryable" | "auth_or_credit" | "refusal" | "unknown";
};

export function logRequest(entry: RequestLog): void {
  // Rebuilt field by field, so nothing beyond the typed fields can slip into the line.
  const line: RequestLog = {
    status: entry.status,
    rounds: entry.rounds,
    inputTokens: entry.inputTokens,
    cacheReadTokens: entry.cacheReadTokens,
    cacheCreationTokens: entry.cacheCreationTokens,
    outputTokens: entry.outputTokens,
    ...(entry.errorKind ? { errorKind: entry.errorKind } : {}),
  };
  console.info(JSON.stringify({ event: "chat_request", ...line }));
}

// A request refused by the rate limit: which window refused it, never the address.
export function logRateLimited(window: "minute" | "hour"): void {
  console.info(JSON.stringify({ event: "chat_rate_limited", window }));
}

// Temporary (issue #186): which client-address headers reach the app on the host, to confirm the
// rate limit's key. Counts and booleans only, never an address. Remove once confirmed.
export function logClientHeaders(shape: ClientHeaderShape): void {
  // Rebuilt field by field, like logRequest.
  const line: ClientHeaderShape = {
    forwardedFor: shape.forwardedFor,
    cfConnectingIp: shape.cfConnectingIp,
    trueClientIp: shape.trueClientIp,
  };
  console.info(JSON.stringify({ event: "chat_client_headers", ...line }));
}
