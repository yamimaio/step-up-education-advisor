import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ModelError, type ModelClient, type ModelErrorKind, type ModelRequest } from "./adapter";

// The Claude implementation of ModelClient, and the only file that reads MODEL_API_KEY
// (CLAUDE.md rule 3; ESLint enforces it). Settings are D4 and D5: Sonnet 5.5, adaptive thinking,
// one fixed effort for the whole conversation (a change would break the cache), 16,000 tokens.

export const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 16000;
// Per attempt; the SDK retries twice (retryable errors only), so a turn waits at most 3 × this.
const TIMEOUT_MS = 120_000;

// The part of the SDK client this file uses, so tests can pass a stub instead of the network.
export type MessagesApi = {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
};

export function createAnthropicClient(sdk?: MessagesApi): ModelClient {
  const apiKey = process.env.MODEL_API_KEY;
  if (!sdk && !apiKey) {
    // A missing key is the auth_or_credit notice, not a crash.
    return {
      send: () => Promise.reject(new ModelError("auth_or_credit")),
    };
  }
  const client = sdk ?? new Anthropic({ apiKey, maxRetries: 2, timeout: TIMEOUT_MS });
  return {
    async send(request: ModelRequest) {
      let message: Anthropic.Message;
      try {
        message = await client.messages.create(buildParams(request));
      } catch (error) {
        throw new ModelError(errorKind(error));
      }
      if (message.stop_reason === "refusal") throw new ModelError("refusal");
      return {
        content: message.content,
        stopReason: message.stop_reason,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
          cacheCreationTokens: message.usage.cache_creation_input_tokens ?? 0,
        },
      };
    },
  };
}

export function buildParams(request: ModelRequest): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    // auto: Sonnet 5.5 rejects forced tool choice. One tool per turn (docs/chat-api.md).
    tool_choice: { type: "auto", disable_parallel_tool_use: true },
    // The system blocks carry their own breakpoint; this one caches the history automatically.
    cache_control: { type: "ephemeral" },
    system: request.system,
    tools: request.tools,
    messages: request.messages,
  };
}

export type ProbeResult =
  | { ok: true; requestId: string | null; inputTokens: number; outputTokens: number }
  | { ok: false; status: number | null; message: string; requestId: string | null };

// One real request with the server's own parameters, for scripts/probe-tools.ts and
// scripts/real-run.ts only (never from tests: CLAUDE.md rule 2). The API compiles strict tool
// schemas on every request and refuses a grammar that's too large, a limit no test can check.
// `maxTokens` keeps a probe cheap; a refused request uses no tokens.
export async function probeRequest(request: ModelRequest, maxTokens: number): Promise<ProbeResult> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey)
    return { ok: false, status: null, message: "MODEL_API_KEY is not set", requestId: null };
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: TIMEOUT_MS });
  try {
    const message = await client.messages.create({
      ...buildParams(request),
      max_tokens: maxTokens,
    });
    return {
      ok: true,
      requestId: message._request_id ?? null,
      inputTokens:
        message.usage.input_tokens +
        (message.usage.cache_read_input_tokens ?? 0) +
        (message.usage.cache_creation_input_tokens ?? 0),
      outputTokens: message.usage.output_tokens,
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return {
        ok: false,
        status: error.status ?? null,
        message: error.message,
        requestId: error.requestID ?? null,
      };
    }
    return { ok: false, status: null, message: String(error), requestId: null };
  }
}

// By the API's error type, never the message text (shared/error-codes in the claude-api skill).
export function errorKind(error: unknown): ModelErrorKind {
  if (error instanceof Anthropic.APIConnectionError) return "retryable";
  if (!(error instanceof Anthropic.APIError)) return "unknown";
  switch (error.type) {
    case "authentication_error":
    case "permission_error":
    case "billing_error":
      return "auth_or_credit";
    case "rate_limit_error":
    case "overloaded_error":
    case "api_error":
    case "timeout_error":
      return "retryable";
  }
  // No error type in the body: judge by the status.
  if (error.status === 401 || error.status === 403 || error.status === 402) return "auth_or_credit";
  if (error.status === 429 || (error.status !== undefined && error.status >= 500)) {
    return "retryable";
  }
  return "unknown";
}
