import type Anthropic from "@anthropic-ai/sdk";

// The model boundary (implementation plan section 5). The chat loop only sees this interface, so
// a different model can replace Claude later and tests run on the fake (server/model/fake.ts).

export type ModelRequest = {
  system: Anthropic.TextBlockParam[];
  tools: Anthropic.Tool[];
  messages: Anthropic.MessageParam[];
};

export type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
};

export type ModelTurn = {
  // The assistant's blocks as the API returned them; the loop appends them to the history unchanged.
  content: Anthropic.ContentBlock[];
  stopReason: Anthropic.StopReason | null;
  usage: ModelUsage;
};

export interface ModelClient {
  send(request: ModelRequest): Promise<ModelTurn>;
}

// What the page shows after a failed model call (docs/chat-api.md, "After a notice").
export type ModelErrorKind = "retryable" | "auth_or_credit" | "refusal" | "unknown";

export class ModelError extends Error {
  constructor(readonly kind: ModelErrorKind) {
    super(`model call failed: ${kind}`);
    this.name = "ModelError";
  }
}
