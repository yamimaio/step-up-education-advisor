import type { Program } from "../../core/schema/program";
import { chatLoop, type ChatResponse } from "../../server/chatLoop";
import type { Message } from "../../server/history";
import type { RequestLog } from "../../server/log";
import type { ModelClient } from "../../server/model/adapter";
import {
  PERSONA_A_BACKGROUND_ANSWER,
  PERSONA_A_GOAL,
  PERSONA_A_PROGRAMS_YES,
} from "../../server/model/personaA";

// The page's side of /api/chat for server tests: it keeps the history, posts it whole, swaps in
// replaceLastUserMessage and appends the returned messages (docs/chat-api.md).

export const PERSONA_A_OPENING =
  "I've led engineering teams for twelve years and I'm working out my next step.";

// The date stage 2 runs on in server tests (record freshness counts in confidence).
export const TODAY = new Date("2026-10-10T00:00:00Z");

// Persona A's taps, by chip label exactly as in personas/A.md, both stages.
export const PERSONA_A_TAPS: Record<string, string[]> = {
  careerGoalKind: ["Step up to a bigger leadership role"],
  needs: ["A senior network", "Leadership skills", "Deep expertise in a field"],
  peerPreference: ["More senior leaders"],
  maxProgramMonths: ["Up to a year"],
  hoursPerWeek: ["5 to 10"],
  keepWorking: ["Yes, I keep working"],
  degreeRequired: ["Not needed"],
  tuitionBudgetUsd: ["$40k to $80k"],
  paymentPlan: ["Installments"],
  travelBudgetUsd: ["$5k to $10k"],
  travelComfort: ["Part of the appeal"],
  formatPreference: ["Blended"],
  maxOnsiteDays: ["Up to 20"],
  maxStretchDays: ["About a week"],
  relocate: ["No, I would not"],
  airfareRange: ["$1,000 to $1,500"],
  locationValues: ["Immersion", "Network density"],
  degreeLevel: ["Bachelor's"],
  currentRole: ["Manager"],
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
      today: TODAY,
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

// Runs persona A from the first message to the stage 2 card: the verdict, the yes to programs,
// the home and background, every stage 2 tap. The history then ends on the propose_search card.
export async function walkToSearchCard(page: Page) {
  await walkToLastTap(page);
  await page.tap(...PERSONA_A_TAPS.degreeRequired!);
  await page.confirm();
  await page.type(PERSONA_A_PROGRAMS_YES);
  await page.type(PERSONA_A_BACKGROUND_ANSWER);
  while (page.last?.chips) await page.tap(...PERSONA_A_TAPS[page.last.chips.field]!);
  if (!page.last?.confirm?.profile) throw new Error("walk lost its way");
  return page.last.confirm.toolUseId;
}

// Runs persona A up to, not including, the last stage 2 tap (currentRole): a test can post that
// tap against its own script. `taps` replaces persona A's tap for a field, so a test can make a
// contradiction rule fire.
export async function walkToLastStage2Tap(page: Page, taps: Record<string, string[]> = {}) {
  await walkToLastTap(page);
  await page.tap(...PERSONA_A_TAPS.degreeRequired!);
  await page.confirm();
  await page.type(PERSONA_A_PROGRAMS_YES);
  await page.type(PERSONA_A_BACKGROUND_ANSWER);
  while (page.last?.chips && page.last.chips.field !== "currentRole") {
    const field = page.last.chips.field;
    await page.tap(...(taps[field] ?? PERSONA_A_TAPS[field]!));
  }
  if (page.last?.chips?.field !== "currentRole") throw new Error("walk lost its way");
  return page.last.chips.toolUseId;
}
