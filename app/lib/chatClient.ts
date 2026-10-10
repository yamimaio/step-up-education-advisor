import type { ChatAction } from "./chatState";
import type { ChatResponse, MessageParam } from "./chatTypes";

const NETWORK_MESSAGE = "Step Up couldn't be reached. Check your connection, then retry.";
const REFUSED_MESSAGE =
  "Something went wrong with this conversation, so it can't continue. You can still download the transcript.";
const SLOW_MESSAGE = "Step Up took too long to answer. Retry in a moment.";

// "Too many messages" with the wait the server sent (body `retryAfter`, or the Retry-After header).
async function rateLimitedMessage(res: Response): Promise<string> {
  let seconds = Number(res.headers.get("Retry-After"));
  try {
    const body = (await res.json()) as { retryAfter?: unknown };
    if (typeof body.retryAfter === "number") seconds = body.retryAfter;
  } catch {
    // No JSON body: the header, or no wait at all.
  }
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "You've sent a lot of messages in a short time. Wait a little, then retry.";
  }
  const [n, unit] =
    seconds < 60 ? [Math.ceil(seconds), "second"] : [Math.ceil(seconds / 60), "minute"];
  return `You've sent a lot of messages in a short time. Wait ${n} ${unit}${n === 1 ? "" : "s"}, then retry.`;
}

// Posts the full history, unchanged, and turns the answer into a reducer action. The reducer
// applies replaceLastUserMessage and appends the returned messages.
export async function postChat(
  messages: MessageParam[],
  fetcher: typeof fetch = fetch,
): Promise<ChatAction> {
  let res: Response;
  try {
    res = await fetcher("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch {
    return { type: "failure", retry: true, message: NETWORK_MESSAGE };
  }
  // A 400 or 413 means this history is refused; posting it again would be refused too. A 408 or
  // 429 (a timeout or the rate limit, here or at the host's proxy) passes: the same history can
  // be retried.
  if (res.status === 400 || res.status === 413) {
    return { type: "failure", retry: false, message: REFUSED_MESSAGE };
  }
  if (res.status === 429) {
    return { type: "failure", retry: true, message: await rateLimitedMessage(res) };
  }
  if (res.status === 408) return { type: "failure", retry: true, message: SLOW_MESSAGE };
  if (!res.ok) return { type: "failure", retry: true, message: NETWORK_MESSAGE };
  try {
    return { type: "response", response: (await res.json()) as ChatResponse };
  } catch {
    return { type: "failure", retry: true, message: NETWORK_MESSAGE };
  }
}
