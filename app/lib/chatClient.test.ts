import { describe, expect, it } from "vitest";
import { postChat } from "./chatClient";

const answer = (status: number, body?: unknown, headers: Record<string, string> = {}) =>
  (async () =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers,
    })) as unknown as typeof fetch;

const history = [{ role: "user" as const, content: "hi" }];

describe("postChat", () => {
  it.each([400, 413])("blocks the conversation on a %i", async (status) => {
    const action = await postChat(history, answer(status, { error: "bad_request" }));
    expect(action).toMatchObject({ type: "failure", retry: false });
  });

  it("offers a retry on a 429, with the wait the server sent", async () => {
    const action = await postChat(
      history,
      answer(429, { error: "rate_limited", retryAfter: 42 }, { "Retry-After": "42" }),
    );
    expect(action).toEqual({
      type: "failure",
      retry: true,
      message: "You've sent a lot of messages in a short time. Wait 42 seconds, then retry.",
    });
  });

  it("words a long wait in minutes, and reads the header when there is no body", async () => {
    const action = await postChat(history, answer(429, undefined, { "Retry-After": "61" }));
    expect(action).toMatchObject({
      retry: true,
      message: expect.stringContaining("Wait 2 minutes"),
    });
  });

  it("still offers a retry on a 429 with no wait at all", async () => {
    const action = await postChat(history, answer(429));
    expect(action).toMatchObject({
      retry: true,
      message: expect.stringContaining("Wait a little"),
    });
  });

  it.each([408, 404, 500, 502])("offers a retry on a %i", async (status) => {
    const action = await postChat(history, answer(status));
    expect(action).toMatchObject({ type: "failure", retry: true });
  });

  it("offers a retry when the network fails", async () => {
    const fail = (async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch;
    expect(await postChat(history, fail)).toMatchObject({ type: "failure", retry: true });
  });
});
