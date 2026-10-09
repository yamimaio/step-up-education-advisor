import type { ChatAction } from "./chatState";
import type { ChatResponse, MessageParam } from "./chatTypes";

const NETWORK_MESSAGE = "Step Up couldn't be reached. Check your connection, then retry.";
const REFUSED_MESSAGE =
  "Something went wrong with this conversation, so it can't continue. You can still download the transcript.";

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
  // A 400 means this history is refused; posting it again would be refused too.
  if (res.status >= 400 && res.status < 500) {
    return { type: "failure", retry: false, message: REFUSED_MESSAGE };
  }
  if (!res.ok) return { type: "failure", retry: true, message: NETWORK_MESSAGE };
  try {
    return { type: "response", response: (await res.json()) as ChatResponse };
  } catch {
    return { type: "failure", retry: true, message: NETWORK_MESSAGE };
  }
}
