import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_BODY_BYTES, RATE_LIMIT_PER_MINUTE } from "@server/limits";
import { chatRateLimiter } from "@server/rateLimit";
import { DELETE, GET, POST, PUT } from "./route";

const SECRET = "my employer is Initech";

const post = (body: string, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
    }),
  );

beforeEach(() => {
  chatRateLimiter.reset();
  vi.stubEnv("MODEL_FAKE", "1");
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function expectBadRequest(response: Response) {
  expect(response.status).toBe(400);
  const text = await response.text();
  expect(JSON.parse(text)).toEqual({ error: "bad_request" });
  expect(text).not.toContain(SECRET);
}

describe("POST /api/chat", () => {
  it("answers a first message through the fake model", async () => {
    const response = await post(
      JSON.stringify({ messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }] }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.chips.field).toBe("careerGoalKind");
    expect(body.notice).toBeNull();
  });

  it.each([
    ["invalid JSON", `{"messages": [${SECRET}`],
    ["no messages", JSON.stringify({ messages: [] })],
    [
      "an assistant message last",
      JSON.stringify({
        messages: [
          { role: "user", content: SECRET },
          { role: "assistant", content: SECRET },
        ],
      }),
    ],
    [
      "an extra field",
      JSON.stringify({ messages: [{ role: "user", content: SECRET }], model: "x" }),
    ],
    [
      "an image block",
      JSON.stringify({
        messages: [{ role: "user", content: [{ type: "image", source: SECRET }] }],
      }),
    ],
    [
      "a system message",
      JSON.stringify({
        messages: [
          { role: "system", content: SECRET },
          { role: "user", content: "hi" },
        ],
      }),
    ],
    [
      "text over 4,000 characters",
      JSON.stringify({ messages: [{ role: "user", content: SECRET + "x".repeat(4000) }] }),
    ],
    [
      "a tool result answering nothing",
      JSON.stringify({
        messages: [
          { role: "user", content: [{ type: "tool_result", tool_use_id: "t", content: SECRET }] },
        ],
      }),
    ],
  ])("refuses %s with a generic 400", async (_, body) => {
    await expectBadRequest(await post(body));
  });

  it("refuses more than 120 messages", async () => {
    const messages = Array.from({ length: 121 }, (_, i) =>
      i % 2 ? { role: "assistant", content: "ok" } : { role: "user", content: SECRET },
    );
    await expectBadRequest(await post(JSON.stringify({ messages })));
  });

  it("refuses a body over 1 MB, with or without a declared length", async () => {
    const big = JSON.stringify({
      messages: [{ role: "user", content: SECRET }],
      pad: "x".repeat(MAX_BODY_BYTES),
    });
    await expectBadRequest(await post(big));
    await expectBadRequest(await post("{}", { "content-length": String(MAX_BODY_BYTES + 1) }));
  });

  it("nudges on empty input", async () => {
    const response = await post(JSON.stringify({ messages: [{ role: "user", content: "  " }] }));
    expect(response.status).toBe(200);
    expect((await response.json()).notice.kind).toBe("empty_input");
  });
});

describe("the per-IP rate limit", () => {
  const hi = JSON.stringify({ messages: [{ role: "user", content: SECRET }] });
  const from = (ip: string) => ({ "x-forwarded-for": `10.0.0.1, ${ip}` });

  it("answers 429 with retryAfter past the minute limit, before reading the body", async () => {
    for (let i = 0; i < RATE_LIMIT_PER_MINUTE; i++) {
      expect((await post(hi, from("203.0.113.7"))).status).toBe(200);
    }
    const lines: string[] = [];
    vi.spyOn(console, "info").mockImplementation((line: string) => void lines.push(line));
    const refused = await post("not even JSON", from("203.0.113.7"));
    expect(refused.status).toBe(429);
    const body = await refused.json();
    expect(body).toEqual({ error: "rate_limited", retryAfter: expect.any(Number) });
    expect(body.retryAfter).toBeGreaterThan(0);
    expect(refused.headers.get("Retry-After")).toBe(String(body.retryAfter));
    // The log line names the window, never the address.
    expect(lines).toEqual([JSON.stringify({ event: "chat_rate_limited", window: "minute" })]);
  });

  it("counts each address apart, by the proxy's entry", async () => {
    for (let i = 0; i < RATE_LIMIT_PER_MINUTE; i++) await post(hi, from("203.0.113.7"));
    expect((await post(hi, from("203.0.113.7"))).status).toBe(429);
    expect((await post(hi, from("198.51.100.2"))).status).toBe(200);
    // A forged first entry doesn't make a new client.
    const forged = { "x-forwarded-for": "6.6.6.6, 203.0.113.7" };
    expect((await post(hi, forged)).status).toBe(429);
  });

  it("keys on CF-Connecting-IP when present, so X-Forwarded-For can't pick the bucket (#186)", async () => {
    // Behind Cloudflare: a forged first entry and a proxy last entry that changes every request.
    const viaCloudflare = (i: number) => ({
      "cf-connecting-ip": "203.0.113.7",
      "x-forwarded-for": `6.6.6.${i}, 10.0.0.${i}`,
    });
    for (let i = 0; i < RATE_LIMIT_PER_MINUTE; i++) {
      expect((await post(hi, viaCloudflare(i))).status).toBe(200);
    }
    expect((await post(hi, viaCloudflare(99))).status).toBe(429);
    expect((await post(hi, { "cf-connecting-ip": "198.51.100.2" })).status).toBe(200);
  });
});

describe("other methods", () => {
  it.each([
    ["GET", GET],
    ["PUT", PUT],
    ["DELETE", DELETE],
  ])("%s gives 405", async (_, handler) => {
    const response = handler();
    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "method_not_allowed" });
  });
});
