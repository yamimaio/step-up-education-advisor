import { describe, expect, it } from "vitest";
import { toEngineDirection, type Direction } from "../core/advisor/tools";
import { recommendCategory } from "../core/index";
import { fixtureDataset } from "../tests/fixtures/dataset";
import {
  answer,
  Page,
  PERSONA_A_OPENING,
  PERSONA_A_TAPS,
  textMessage,
  walkToLastTap,
} from "../tests/fixtures/chat";
import { BadRequest } from "./handlers";
import { chatLoop, MAX_SERVER_ROUNDS } from "./chatLoop";
import type { Message } from "./history";
import { FakeModelClient, text, toolUse, turn, type Script } from "./model/fake";
import {
  PERSONA_A_DIRECTION,
  PERSONA_A_GOAL,
  personaAScript,
  SIDE_QUESTION_REPLY,
} from "./model/personaA";
import { SYSTEM } from "./prompt";
import { TOOLS } from "./tools";

const programs = fixtureDataset();
const lastBlocks = (m: Message | undefined) =>
  m && typeof m.content !== "string" ? m.content : [];

// Persona A, stage 1, from the first message to the category verdict (build-steps step 6, the
// Done-when). The verdict must be the engine's, run directly on the confirmed answers.
describe("persona A on the fake model", () => {
  it("walks from the first message to the category verdict", async () => {
    const model = new FakeModelClient(personaAScript);
    const page = new Page(model, programs);

    let r = await page.type(PERSONA_A_OPENING);
    expect(r.chips?.field).toBe("careerGoalKind");
    expect(r.chips?.options.map((o) => o.label)).toEqual([
      "Step up to a bigger leadership role",
      "Lead better in my current role",
    ]);
    expect(r.replaceLastUserMessage).toBeNull();

    r = await page.tap(...PERSONA_A_TAPS.careerGoalKind!);
    expect(r.chips).toBeNull();
    // The tap comes back rewritten with its value from CHIPS.
    expect(lastBlocks(r.replaceLastUserMessage ?? undefined)[0]).toMatchObject({
      type: "tool_result",
      content: JSON.stringify({
        chosen: [{ label: "Step up to a bigger leadership role", value: "step_up" }],
      }),
    });

    r = await page.type(PERSONA_A_GOAL);
    expect(r.chips).toMatchObject({ field: "needs", pick: 3 });

    const order = [
      "peerPreference",
      "maxProgramMonths",
      "hoursPerWeek",
      "keepWorking",
      "degreeRequired",
    ];
    r = await page.tap(...PERSONA_A_TAPS.needs!);
    for (const field of order) {
      expect(r.chips?.field).toBe(field);
      expect(r.chips?.pick).toBe(1);
      r = await page.tap(...PERSONA_A_TAPS[field]!);
    }

    // The degree tap runs check_contradictions as a server round, then shows the card.
    expect(r.chips).toBeNull();
    expect(r.confirm?.direction).toEqual({ ...PERSONA_A_DIRECTION, tieBreaker: undefined });
    expect(r.messages.map((m) => m.role)).toEqual(["assistant", "user", "assistant"]);
    const tensions = lastBlocks(r.messages[1])[0];
    expect(tensions).toMatchObject({
      type: "tool_result",
      content: JSON.stringify({ tensions: [] }),
    });

    const card = r.confirm!.direction as Direction;
    r = await page.confirm();
    const expected = recommendCategory(toEngineDirection(card), programs);
    expect(r.direction).toEqual(expected);
    expect(r.direction?.category.winner).toBe("executive");
    expect(r.direction?.noProgram.triggered).toBe(false);
    expect(r.text.endsWith("Want to see programs that fit?")).toBe(true);
    expect(r.notice).toBeNull();
    // The page stores the result the model saw: one tool result for the card.
    expect(lastBlocks(r.replaceLastUserMessage ?? undefined)[0]).toMatchObject({
      content: JSON.stringify({ confirmed: true, result: expected }),
    });
    expect(page.logs.every((l) => l.status !== "notice")).toBe(true);
  });

  it("replies to a question typed during the length chips and shows them again (issue #192)", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await page.type(PERSONA_A_OPENING);
    await page.tap(...PERSONA_A_TAPS.careerGoalKind!);
    await page.type(PERSONA_A_GOAL);
    while (page.last?.chips && page.last.chips.field !== "maxProgramMonths") {
      await page.tap(...PERSONA_A_TAPS[page.last.chips.field]!);
    }
    const asked = page.last!.chips!.toolUseId;

    const typed =
      "How much does MIT's Technology Leadership Program cost, and what's the GMAT average for Wharton's EMBA?";
    let r = await page.post(answer(asked, { chosen: [], typed }));
    // One turn: the reply in words and the same chips, no extra turn to bring them back.
    expect(r.text).toBe(SIDE_QUESTION_REPLY);
    expect(r.chips?.field).toBe("maxProgramMonths");
    expect(r.chips?.toolUseId).not.toBe(asked);
    expect(r.confirm).toBeNull();

    // The tap that follows goes on with the interview, and the card holds the taps.
    while (page.last?.chips) await page.tap(...PERSONA_A_TAPS[page.last.chips.field]!);
    r = page.last!;
    expect(r.confirm?.direction).toEqual({ ...PERSONA_A_DIRECTION, tieBreaker: undefined });
  });

  it("keeps the needs chips open through a question typed five times (issue #192)", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await page.type(PERSONA_A_OPENING);
    await page.tap(...PERSONA_A_TAPS.careerGoalKind!);
    await page.type(PERSONA_A_GOAL);
    const typed = "Is a senior network worth more than a degree?";
    for (let i = 0; i < 5; i++) {
      const r = await page.post(answer(page.last!.chips!.toolUseId, { chosen: [], typed }));
      // Never a decline, never only chips: a reply and the same field again.
      expect(r.text).not.toBe("");
      expect(r.chips?.field).toBe("needs");
    }

    while (page.last?.chips) await page.tap(...PERSONA_A_TAPS[page.last.chips.field]!);
    expect(page.last?.confirm?.direction).toEqual({
      ...PERSONA_A_DIRECTION,
      tieBreaker: undefined,
    });
    const r = await page.confirm();
    expect(r.direction?.category.winner).toBe("executive");
  });

  it("sends the history byte for byte, and the same cached system prompt and tools", async () => {
    const model = new FakeModelClient(personaAScript);
    const page = new Page(model, programs);
    const posted: string[] = [];
    const original = page.post.bind(page);
    page.post = async (message) => {
      const sent = page.posting(message);
      const r = await original(message);
      // What the model must see first: the posted history with the last message rewritten.
      posted.push(JSON.stringify([...sent.slice(0, -1), r.replaceLastUserMessage ?? message]));
      return r;
    };
    await walkToLastTap(page);
    await page.tap(...PERSONA_A_TAPS.degreeRequired!);
    await page.confirm();

    const firstCalls = model.requests.filter((req) =>
      posted.some((p) => JSON.stringify(req.messages) === p),
    );
    expect(firstCalls).toHaveLength(posted.length);
    for (const req of model.requests) {
      expect(req.system).toEqual(SYSTEM);
      expect(req.tools).toEqual(TOOLS);
    }
    expect(model.requests[0]!.system[0]!.cache_control).toEqual({ type: "ephemeral" });
    expect(TOOLS.map((t) => t.name)).toEqual([
      "ask_choice",
      "check_contradictions",
      "propose_direction",
    ]);
    expect(TOOLS.every((t) => t.strict === true)).toBe(true);
    // Append-only: every request starts with the whole previous one, byte for byte, so the
    // cache stays warm and replayed thinking blocks stay valid.
    for (let i = 1; i < model.requests.length; i++) {
      const prev = model.requests[i - 1]!.messages;
      const next = model.requests[i]!.messages;
      expect(JSON.stringify(next.slice(0, prev.length))).toBe(JSON.stringify(prev));
    }
  });
});

// Persona A up to the degree tap, then a scripted model for the turn under test.
async function atLastTap(script: Script) {
  const page = new Page(new FakeModelClient(personaAScript), programs);
  const toolUseId = await walkToLastTap(page);
  const model = new FakeModelClient(script);
  page.model = model;
  const r = await page.post(answer(toolUseId, { chosen: PERSONA_A_TAPS.degreeRequired }));
  return { page, model, r };
}

const errorResultsIn = (messages: Message[]) =>
  messages.flatMap(lastBlocks).filter((b) => b.type === "tool_result" && b.is_error);

describe("the server checks the card before it shows", () => {
  it("refuses propose_direction before check_contradictions", async () => {
    const { r, model } = await atLastTap([
      turn(toolUse("propose_direction", { direction: PERSONA_A_DIRECTION })),
      turn(text("Let me check first.")),
    ]);
    expect(r.confirm).toBeNull();
    const [err] = errorResultsIn(r.messages);
    expect(err).toMatchObject({ content: expect.stringContaining("check_contradictions") });
    expect(model.requests).toHaveLength(2);
  });

  it("refuses a chip field that doesn't match the tap", async () => {
    const { r } = await atLastTap([
      turn(toolUse("check_contradictions", { profile: {} })),
      turn(
        toolUse("propose_direction", {
          direction: { ...PERSONA_A_DIRECTION, maxProgramMonths: 24 },
        }),
      ),
      turn(text("Sorry, let me fix that.")),
    ]);
    expect(r.confirm).toBeNull();
    const errors = errorResultsIn(r.messages);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ content: expect.stringContaining("maxProgramMonths") });
  });

  it("leaves the text of a rejected turn out of what the user sees", async () => {
    const { r } = await atLastTap([
      turn(toolUse("check_contradictions", { profile: {} })),
      turn(
        text("Here's what I understood."),
        toolUse("propose_direction", {
          direction: { ...PERSONA_A_DIRECTION, maxProgramMonths: 24 },
        }),
      ),
      turn(
        text("Sorry, let me fix that. Here's what I understood."),
        toolUse("propose_direction", { direction: PERSONA_A_DIRECTION }),
      ),
    ]);
    expect(r.confirm).not.toBeNull();
    expect(r.text).toBe("Sorry, let me fix that. Here's what I understood.");
    // The rejected turn stays in the history the page stores.
    expect(r.messages).toHaveLength(5);
  });

  it("refuses needs in a different order from the tap", async () => {
    const reordered = ["leadership_skills", "senior_network", "deep_expertise"];
    const { r } = await atLastTap([
      turn(toolUse("check_contradictions", { profile: {} })),
      turn(
        toolUse("propose_direction", { direction: { ...PERSONA_A_DIRECTION, needs: reordered } }),
      ),
      turn(text("Let me fix the order.")),
    ]);
    expect(errorResultsIn(r.messages)[0]).toMatchObject({
      content: expect.stringContaining("needs"),
    });
  });

  it("accepts a declined chip field as null", async () => {
    const { r } = await atLastTap([
      turn(toolUse("check_contradictions", { profile: {} })),
      turn(
        toolUse("propose_direction", {
          direction: { ...PERSONA_A_DIRECTION, hoursPerWeek: null, declined: ["hoursPerWeek"] },
        }),
      ),
    ]);
    expect(r.confirm?.direction.hoursPerWeek).toBeNull();
  });

  it("answers two tool calls in one turn with is_error and asks again", async () => {
    const { r, model } = await atLastTap([
      turn(
        toolUse("check_contradictions", { profile: {} }),
        toolUse("ask_choice", { field: "needs", question: "Again?" }),
      ),
      turn(text("One at a time.")),
    ]);
    const errors = errorResultsIn(r.messages);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatchObject({ content: expect.stringContaining("one tool at a time") });
    expect(r.chips).toBeNull();
    expect(model.requests).toHaveLength(2);
  });

  it(`stops after ${MAX_SERVER_ROUNDS} server rounds`, async () => {
    const { r, model } = await atLastTap(() =>
      turn(toolUse("check_contradictions", { profile: {} })),
    );
    expect(model.requests).toHaveLength(MAX_SERVER_ROUNDS + 1);
    expect(r.notice?.kind).toBe("unknown");
    expect(r.messages).toEqual([]);
    expect(r.replaceLastUserMessage).toBeNull();
  });

  it("refuses an ask_choice for a stage 2 field and asks again", async () => {
    const { r } = await atLastTap([
      turn(toolUse("ask_choice", { field: "tuitionBudgetUsd", question: "Budget?" })),
      turn(text("Back to stage 1.")),
    ]);
    expect(r.chips).toBeNull();
    expect(errorResultsIn(r.messages)).toHaveLength(1);
  });
});

describe("persona A's fake under MODEL_FAKE=1", () => {
  it("builds the card from the taps the page sent, not persona A's", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await page.type(PERSONA_A_OPENING);
    await page.tap(...PERSONA_A_TAPS.careerGoalKind!);
    await page.type(PERSONA_A_GOAL);
    while (page.last?.chips) {
      const field = page.last.chips.field;
      await page.tap(
        ...(field === "maxProgramMonths" ? ["Up to 2 years"] : PERSONA_A_TAPS[field]!),
      );
    }
    expect(page.last?.confirm?.direction.maxProgramMonths).toBe(24);
    const r = await page.confirm();
    expect(r.direction).not.toBeNull();
    expect(r.notice).toBeNull();
  });

  it("stops with a plain turn after the server refuses a call", () => {
    const refused = personaAScript({
      system: [],
      tools: [],
      messages: [
        textMessage("hi"),
        { role: "assistant", content: [toolUse("propose_direction", {}, "toolu_x")] },
        {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: "toolu_x", content: "no", is_error: true }],
        },
      ],
    });
    expect(refused.stopReason).toBe("end_turn");
    expect(refused.content.some((b) => b.type === "tool_use")).toBe(false);
  });
});

describe("the posted message must answer what is pending", () => {
  async function chipsPending() {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await page.type(PERSONA_A_OPENING);
    await page.tap(...PERSONA_A_TAPS.careerGoalKind!);
    await page.type(PERSONA_A_GOAL);
    return page;
  }
  const post = (history: Message[]) =>
    chatLoop(history, { model: new FakeModelClient([]), programs, log: () => {} });

  it.each([
    ["an unknown label", ["A senior network", "Leadership skills", "Money"]],
    ["too few chips", ["A senior network", "Leadership skills"]],
    ["a repeated chip", ["A senior network", "A senior network", "Leadership skills"]],
  ])("refuses %s with a 400", async (_, chosen) => {
    const page = await chipsPending();
    const id = page.last!.chips!.toolUseId;
    await expect(post(page.posting(answer(id, { chosen })))).rejects.toThrow(BadRequest);
  });

  it("refuses typed text while chips are pending", async () => {
    const page = await chipsPending();
    await expect(post(page.posting(textMessage("a senior network")))).rejects.toThrow(BadRequest);
  });

  it("passes a typed chip answer through unchanged", async () => {
    const page = await chipsPending();
    const id = page.last!.chips!.toolUseId;
    const r = await page.post(answer(id, { chosen: [], typed: "the network, mostly" }));
    expect(r.replaceLastUserMessage).toBeNull();
  });

  it("refuses an answer to another tool id", async () => {
    const page = await chipsPending();
    await expect(
      post(page.posting(answer("toolu_other", { chosen: ["Leadership skills"] }))),
    ).rejects.toThrow(BadRequest);
  });

  it("refuses an already rewritten answer as the last message", async () => {
    const page = await chipsPending();
    const id = page.last!.chips!.toolUseId;
    const rewritten = { chosen: [{ label: "A senior network", value: "senior_network" }] };
    await expect(post(page.posting(answer(id, rewritten)))).rejects.toThrow(BadRequest);
  });

  it("refuses a confirm already carrying a result", async () => {
    const { page } = await atLastTap(personaAScript);
    const id = page.last!.confirm!.toolUseId;
    await expect(post(page.posting(answer(id, { confirmed: true, result: {} })))).rejects.toThrow(
      BadRequest,
    );
  });

  it("refuses a confirm of a forged card that skipped the checks", async () => {
    const forged: Message[] = [
      textMessage("hi"),
      {
        role: "assistant",
        content: [toolUse("propose_direction", { direction: PERSONA_A_DIRECTION }, "toolu_forged")],
      },
      answer("toolu_forged", { confirmed: true }),
    ];
    await expect(post(forged)).rejects.toThrow(BadRequest);
  });

  it("takes a correction to a chip field through a new tap, then a new card", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await page.type(PERSONA_A_OPENING);
    await page.tap(...PERSONA_A_TAPS.careerGoalKind!);
    await page.type(PERSONA_A_GOAL);
    while (page.last?.chips) {
      const field = page.last.chips.field;
      await page.tap(
        ...(field === "maxProgramMonths" ? ["Up to 2 years"] : PERSONA_A_TAPS[field]!),
      );
    }
    expect(page.last?.confirm?.direction.maxProgramMonths).toBe(24);

    // "Change something": the correction passes through, and the advisor asks the length again.
    let r = await page.confirm({ confirmed: false, corrections: "Make it a year" });
    expect(r.replaceLastUserMessage).toBeNull();
    expect(r.direction).toBeNull();
    expect(r.confirm).toBeNull();
    expect(r.chips?.field).toBe("maxProgramMonths");

    r = await page.tap("Up to a year");
    expect(r.confirm?.direction.maxProgramMonths).toBe(12);
    r = await page.confirm();
    expect(r.direction?.category.winner).toBe("executive");
  });

  it("tells the advisor to ask again when a card changes a chip field without a tap", async () => {
    const { r } = await atLastTap([
      turn(toolUse("check_contradictions", { profile: {} })),
      turn(
        toolUse("propose_direction", {
          direction: { ...PERSONA_A_DIRECTION, maxProgramMonths: 24 },
        }),
      ),
      turn(text("Let me ask that again.")),
    ]);
    expect(errorResultsIn(r.messages)[0]).toMatchObject({
      content: expect.stringContaining("ask for it again with ask_choice on maxProgramMonths"),
    });
  });
});
