import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TOOLS } from "../tools";
import { SYSTEM } from "../prompt";
import { ModelError } from "./adapter";
import {
  buildParams,
  createAnthropicClient,
  errorKind,
  MODEL,
  type MessagesApi,
} from "./anthropic";

// Never the network (CLAUDE.md rule 2): the SDK is replaced by a stub.

const message = (overrides: Partial<Anthropic.Message> = {}): Anthropic.Message =>
  ({
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: MODEL,
    content: [{ type: "text", text: "Hello", citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 10,
      output_tokens: 5,
      cache_read_input_tokens: 900,
      cache_creation_input_tokens: 0,
    },
    ...overrides,
  }) as Anthropic.Message;

const stub = (impl: () => Promise<Anthropic.Message>) => {
  const create = vi.fn(impl);
  return { sdk: { messages: { create } } as MessagesApi, create };
};

const request = {
  system: [...SYSTEM],
  tools: [...TOOLS],
  messages: [{ role: "user" as const, content: "hi" }],
};

const apiError = (status: number, type: string) =>
  Anthropic.APIError.generate(
    status,
    { type: "error", error: { type, message: "x" } },
    undefined,
    new Headers(),
  );

afterEach(() => vi.unstubAllEnvs());

describe("the Claude client", () => {
  it("sends the fixed model settings (D4, D5)", () => {
    const params = buildParams(request);
    expect(params).toMatchObject({
      model: "claude-sonnet-5-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
      cache_control: { type: "ephemeral" },
    });
    expect(params.system).toBe(request.system);
    expect(params.tools).toBe(request.tools);
    expect(params.messages).toBe(request.messages);
  });

  it("returns the turn and its usage", async () => {
    const { sdk, create } = stub(async () => message());
    const turn = await createAnthropicClient(sdk).send(request);
    expect(create).toHaveBeenCalledOnce();
    expect(turn.content).toEqual(message().content);
    expect(turn.usage).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      cacheReadTokens: 900,
      cacheCreationTokens: 0,
    });
  });

  it("turns a refusal into a refusal error", async () => {
    const { sdk } = stub(async () => message({ stop_reason: "refusal" }));
    await expect(createAnthropicClient(sdk).send(request)).rejects.toMatchObject({
      kind: "refusal",
    });
  });

  it("gives auth_or_credit when the key is missing, without calling anything", async () => {
    vi.stubEnv("MODEL_API_KEY", "");
    const error = await createAnthropicClient()
      .send(request)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ModelError);
    expect((error as ModelError).kind).toBe("auth_or_credit");
  });

  it.each([
    [apiError(401, "authentication_error"), "auth_or_credit"],
    [apiError(403, "permission_error"), "auth_or_credit"],
    [apiError(402, "billing_error"), "auth_or_credit"],
    [apiError(429, "rate_limit_error"), "retryable"],
    [apiError(529, "overloaded_error"), "retryable"],
    [apiError(500, "api_error"), "retryable"],
    [apiError(400, "invalid_request_error"), "unknown"],
    [new Anthropic.APIConnectionError({ message: "down" }), "retryable"],
    [new Anthropic.APIConnectionTimeoutError(), "retryable"],
    [new Error("bug"), "unknown"],
  ])("maps %s to %s", async (error, kind) => {
    expect(errorKind(error)).toBe(kind);
    const { sdk } = stub(async () => {
      throw error;
    });
    await expect(createAnthropicClient(sdk).send(request)).rejects.toMatchObject({ kind });
  });
});
