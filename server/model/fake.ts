import type Anthropic from "@anthropic-ai/sdk";
import { ModelError, type ModelClient, type ModelRequest, type ModelTurn } from "./adapter";

// Scripted model turns for tests and MODEL_FAKE=1 (CLAUDE.md rule 2): it costs nothing and never
// reaches the network. Turns are built from SDK types, so the fake can't drift from the API
// shapes the real client returns (build-steps R7). Every request is recorded, deep-copied, so a
// test can check what the model saw: the system prompt, tools, cache markers and history.

// A step is a turn, or a ModelError the call throws the way the real client would.
export type Step = ModelTurn | ModelError;
export type Script = Step[] | ((request: ModelRequest, call: number) => Step);

export class FakeModelClient implements ModelClient {
  readonly requests: ModelRequest[] = [];
  private call = 0;

  constructor(private readonly script: Script) {}

  async send(request: ModelRequest): Promise<ModelTurn> {
    this.requests.push(structuredClone(request));
    const call = this.call++;
    const step = typeof this.script === "function" ? this.script(request, call) : this.script[call];
    if (!step) throw new Error(`fake model has no turn for call ${call}`);
    if (step instanceof ModelError) throw step;
    return structuredClone(step);
  }
}

export function fakeUsage(): ModelTurn["usage"] {
  return { inputTokens: 100, outputTokens: 20, cacheReadTokens: 0, cacheCreationTokens: 0 };
}

export function text(value: string): Anthropic.TextBlock {
  return { type: "text", text: value, citations: null };
}

export function thinking(value = ""): Anthropic.ThinkingBlock {
  return { type: "thinking", thinking: value, signature: `sig-${value.length}` };
}

let toolUseCount = 0;
export function toolUse(name: string, input: unknown, id?: string): Anthropic.ToolUseBlock {
  return {
    type: "tool_use",
    id: id ?? `toolu_fake_${String(++toolUseCount).padStart(3, "0")}`,
    name,
    input,
    caller: { type: "direct" },
  };
}

// An assistant turn: a thinking block first, as Sonnet 5.5 returns, then the given blocks.
export function turn(...blocks: Anthropic.ContentBlock[]): ModelTurn {
  const usesTool = blocks.some((b) => b.type === "tool_use");
  return {
    content: [thinking(), ...blocks],
    stopReason: usesTool ? "tool_use" : "end_turn",
    usage: fakeUsage(),
  };
}
