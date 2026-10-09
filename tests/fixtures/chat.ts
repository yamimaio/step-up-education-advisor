import type { Program } from "../../core/schema/program";
import { chatLoop, type ChatResponse } from "../../server/chatLoop";
import type { Message } from "../../server/history";
import type { RequestLog } from "../../server/log";
import type { ModelClient } from "../../server/model/adapter";
import { PERSONA_A_GOAL } from "../../server/model/personaA";

// The page's side of /api/chat for server tests: it keeps the history, posts it whole, swaps in
// replaceLastUserMessage and appends the returned messages (docs/chat-api.md).

export const PERSONA_A_OPENING =
  "I've led engineering teams for twelve years and I'm working out my next step.";

// Persona A's taps, by chip label exactly as in personas/A.md.
export const PERSONA_A_TAPS: Record<string, string[]> = {
  careerGoalKind: ["Step up to a bigger leadership role"],
  needs: ["A senior network", "Leadership skills", "Deep expertise in a field"],
  peerPreference: ["More senior leaders"],
  maxProgramMonths: ["Up to a year"],
  hoursPerWeek: ["5 to 10"],
  keepWorking: ["Yes, I keep working"],
  degreeRequired: ["Not needed"],
};

export const textMessage = (text: string): Message => ({
  role: "user",
  content: [{ type: "text", text }],
});

export const answer = (toolUseId: string, body: unknown): Message => ({
  role: "user",
  content: [{ type: "tool_result", tool_use_id: toolUseId, content: JSON.stringify(body) }],
});

export class Page {
  history: Message[] = [];
  last: ChatResponse | null = null;
  readonly logs: RequestLog[] = [];
  // When true, requests log through server/log.ts instead of into `logs`.
  realLogger = false;

  constructor(
    public model: ModelClient,
    readonly programs: Program[],
  ) {}

  // What the page posts for `message`, without sending it.
  posting(message: Message): Message[] {
    return [...this.history, message];
  }

  async post(message: Message): Promise<ChatResponse> {
    const sent = this.posting(message);
    const response = await chatLoop(structuredClone(sent), {
      model: this.model,
      programs: this.programs,
      log: this.realLogger ? undefined : (e) => this.logs.push(e),
    });
    this.last = response;
    if (response.notice?.kind === "empty_input") return response;
    if (response.notice) {
      this.history = sent;
      return response;
    }
    this.history = [
      ...this.history,
      response.replaceLastUserMessage ?? message,
      ...response.messages,
    ];
    return response;
  }

  // Posts the history again unchanged, as the page's Retry button does after a failure.
  retry() {
    const message = this.history.at(-1);
    if (!message) throw new Error("nothing to retry");
    this.history = this.history.slice(0, -1);
    return this.post(message);
  }

  type(text: string) {
    return this.post(textMessage(text));
  }

  tap(...labels: string[]) {
    const chips = this.last?.chips;
    if (!chips) throw new Error("no chips pending");
    return this.post(answer(chips.toolUseId, { chosen: labels }));
  }

  confirm(body: unknown = { confirmed: true }) {
    const card = this.last?.confirm;
    if (!card) throw new Error("no card pending");
    return this.post(answer(card.toolUseId, body));
  }
}

// Runs persona A from the first message up to, not including, the degree tap: the history then
// ends on the degreeRequired chips, so a test can post that tap against its own script.
export async function walkToLastTap(page: Page) {
  await page.type(PERSONA_A_OPENING);
  await page.tap(...PERSONA_A_TAPS.careerGoalKind!);
  await page.type(PERSONA_A_GOAL);
  while (page.last?.chips && page.last.chips.field !== "degreeRequired") {
    await page.tap(...PERSONA_A_TAPS[page.last.chips.field]!);
  }
  if (page.last?.chips?.field !== "degreeRequired") throw new Error("walk lost its way");
  return page.last.chips.toolUseId;
}
