import { describe, expect, it } from "vitest";
import { toEngineDirection, type Direction } from "../core/advisor/tools";
import { evaluatePrograms, recommendCategory } from "../core/index";
import { fixtureDataset } from "../tests/fixtures/dataset";
import { personaAProfile } from "../tests/fixtures/profiles";
import {
  answer,
  Page,
  PERSONA_A_OPENING,
  PERSONA_A_TAPS,
  textMessage,
  TODAY,
  walkToLastStage2Tap,
  walkToLastTap,
  walkToSearchCard,
} from "../tests/fixtures/chat";
import { ModelError } from "./model/adapter";
import { BadRequest, confirmedDirection } from "./handlers";
import { chatLoop, MAX_SERVER_ROUNDS } from "./chatLoop";
import type { Message } from "./history";
import { FakeModelClient, text, toolUse, turn, type Script } from "./model/fake";
import {
  BACKGROUND_QUESTION,
  PERSONA_A_BACKGROUND_ANSWER,
  PERSONA_A_DIRECTION,
  PERSONA_A_GOAL,
  PERSONA_A_PROGRAMS_YES,
  personaAScript,
  RESULTS_TEXT,
  SIDE_QUESTION_REPLY,
  VERDICT_TEXT,
} from "./model/personaA";
import { SYSTEM } from "./prompt";
import { searchSummary } from "./stage2";
import { TOOLS } from "./tools";

const programs = fixtureDataset();
const lastBlocks = (m: Message | undefined) =>
  m && typeof m.content !== "string" ? m.content : [];

// Persona A from the first message to the category verdict, then on through stage 2 to the
// ranked programs (build-steps step 6, the Done-when). The verdict and the programs must be the
// engine's, run directly on the confirmed answers.
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

  it("walks on through both pauses to the ranked programs", async () => {
    const model = new FakeModelClient(personaAScript);
    const page = new Page(model, programs);
    await walkToLastTap(page);
    let r = await page.tap(...PERSONA_A_TAPS.degreeRequired!);
    const card = r.confirm!.direction as Direction;
    r = await page.confirm();
    expect(r.direction?.category.winner).toBe("executive");
    expect(r.programs).toBeNull();

    // The opt-in, then the home and background in words.
    r = await page.type(PERSONA_A_PROGRAMS_YES);
    expect(r.text).toBe(BACKGROUND_QUESTION);
    expect(r.chips).toBeNull();
    r = await page.type(PERSONA_A_BACKGROUND_ANSWER);

    // Every stage 2 chip set, from CHIPS, in the advisor's order.
    const stage2 = [
      "tuitionBudgetUsd",
      "paymentPlan",
      "travelBudgetUsd",
      "travelComfort",
      "formatPreference",
      "maxOnsiteDays",
      "maxStretchDays",
      "relocate",
      "airfareRange",
      "locationValues",
      "degreeLevel",
      "currentRole",
    ];
    for (const field of stage2) {
      expect(r.chips?.field).toBe(field);
      expect(r.chips?.pick).toBe(field === "locationValues" ? 2 : 1);
      r = await page.tap(...PERSONA_A_TAPS[field]!);
    }

    // The last tap runs check_contradictions with the stage 2 answers, then shows the card.
    expect(r.chips).toBeNull();
    expect(r.messages.map((m) => m.role)).toEqual(["assistant", "user", "assistant"]);
    expect(lastBlocks(r.messages[1])[0]).toMatchObject({
      type: "tool_result",
      content: JSON.stringify({ tensions: [] }),
    });
    expect(r.confirm?.direction).toBeUndefined();
    // The card is persona A's whole profile (personas/A.md), as the engine will run it.
    expect(r.confirm?.profile).toEqual(personaAProfile);

    const profile = r.confirm!.profile!;
    r = await page.confirm();
    const category = recommendCategory(toEngineDirection(card), programs).category;
    const expected = evaluatePrograms(profile, category, programs, TODAY);
    expect(r.programs).toEqual(expected);
    expect(r.programs?.access.category).toBe("executive");
    expect(r.programs?.ranking.ranked.length).toBeGreaterThan(0);
    expect(r.direction).toBeNull();
    expect(r.confirm).toBeNull();
    expect(r.text).toBe(RESULTS_TEXT);
    expect(r.notice).toBeNull();
    // The model saw the summary of that result; the page stores the same bytes.
    expect(lastBlocks(r.replaceLastUserMessage ?? undefined)[0]).toMatchObject({
      content: JSON.stringify({ confirmed: true, result: searchSummary(expected, programs) }),
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

  it("takes a request to skip worded as a question as a decline", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await page.type(PERSONA_A_OPENING);
    await page.tap(...PERSONA_A_TAPS.careerGoalKind!);
    await page.type(PERSONA_A_GOAL);
    while (page.last?.chips && page.last.chips.field !== "hoursPerWeek") {
      await page.tap(...PERSONA_A_TAPS[page.last.chips.field]!);
    }
    const r = await page.post(
      answer(page.last!.chips!.toolUseId, { chosen: [], typed: "Can we skip this one?" }),
    );
    expect(r.chips?.field).toBe("keepWorking");
    while (page.last?.chips) await page.tap(...PERSONA_A_TAPS[page.last.chips.field]!);
    expect(page.last?.confirm?.direction).toMatchObject({
      hoursPerWeek: null,
      declined: ["hoursPerWeek"],
    });
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
    await walkToSearchCard(page);
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
      "propose_search",
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
      turn(toolUse("check_contradictions", { resolvedTensions: [], declined: [] })),
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
      turn(toolUse("check_contradictions", { resolvedTensions: [], declined: [] })),
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
      turn(toolUse("check_contradictions", { resolvedTensions: [], declined: [] })),
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
      turn(toolUse("check_contradictions", { resolvedTensions: [], declined: [] })),
      turn(
        toolUse("propose_direction", {
          direction: { ...PERSONA_A_DIRECTION, hoursPerWeek: null, declined: ["hoursPerWeek"] },
        }),
      ),
    ]);
    expect(r.confirm?.direction?.hoursPerWeek).toBeNull();
  });

  it("answers two tool calls in one turn with is_error and asks again", async () => {
    const { r, model } = await atLastTap([
      turn(
        toolUse("check_contradictions", { resolvedTensions: [], declined: [] }),
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
      turn(toolUse("check_contradictions", { resolvedTensions: [], declined: [] })),
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
    expect(page.last?.confirm?.direction?.maxProgramMonths).toBe(24);
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
    expect(page.last?.confirm?.direction?.maxProgramMonths).toBe(24);

    // "Change something": the correction passes through, and the advisor asks the length again.
    let r = await page.confirm({ confirmed: false, corrections: "Make it a year" });
    expect(r.replaceLastUserMessage).toBeNull();
    expect(r.direction).toBeNull();
    expect(r.confirm).toBeNull();
    expect(r.chips?.field).toBe("maxProgramMonths");

    r = await page.tap("Up to a year");
    expect(r.confirm?.direction?.maxProgramMonths).toBe(12);
    r = await page.confirm();
    expect(r.direction?.category.winner).toBe("executive");
  });

  it("tells the advisor to ask again when a card changes a chip field without a tap", async () => {
    const { r } = await atLastTap([
      turn(toolUse("check_contradictions", { resolvedTensions: [], declined: [] })),
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

// Issue #203: after "Looks right", the same card came back under the verdict, and each press
// showed the same card and verdict again.
describe("the server shows a confirmed card only once (issue #203)", () => {
  // Persona A to the direction card, then a scripted model for the turn after "Looks right".
  // `answers` replaces persona A's tap for a field, or skips it ("skip": a typed decline).
  async function atVerdict(script: Script, answers: Record<string, string[] | "skip"> = {}) {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await page.type(PERSONA_A_OPENING);
    await page.tap(...PERSONA_A_TAPS.careerGoalKind!);
    await page.type(PERSONA_A_GOAL);
    while (page.last?.chips) {
      const { field, toolUseId } = page.last.chips;
      const own = answers[field];
      if (own === "skip") {
        await page.post(answer(toolUseId, { chosen: [], typed: "Can we skip this one?" }));
      } else {
        await page.tap(...(own ?? PERSONA_A_TAPS[field]!));
      }
    }
    const card = page.last!.confirm!.direction!;
    page.model = new FakeModelClient(script);
    const r = await page.confirm();
    return { page, r, card };
  }
  const propose = (direction: object) => turn(toolUse("propose_direction", { direction }));

  it("refuses the same card in the turn after the confirm, so the verdict comes in words", async () => {
    const { r } = await atVerdict([propose(PERSONA_A_DIRECTION), turn(text(VERDICT_TEXT))]);
    expect(r.direction?.category.winner).toBe("executive");
    expect(r.confirm).toBeNull();
    expect(r.text).toBe(VERDICT_TEXT);
    const errors = errorResultsIn(r.messages);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      content: expect.stringContaining(
        "The user already confirmed these answers and saw the verdict. Don't show the card again: explain the verdict in words.",
      ),
    });
  });

  it("refuses it on a later turn too, after check_contradictions runs again", async () => {
    const { page } = await atVerdict([turn(text(VERDICT_TEXT))]);
    page.model = new FakeModelClient([
      checkAll(),
      propose(PERSONA_A_DIRECTION),
      turn(text("Glad it fits.")),
    ]);
    const r = await page.type("Yes, that verdict is right.");
    expect(r.confirm).toBeNull();
    expect(r.text).toBe("Glad it fits.");
    expect(errorResultsIn(r.messages)).toHaveLength(1);
  });

  it("shows a new card after the user changed an answer through the chips", async () => {
    const { page } = await atVerdict([turn(text(VERDICT_TEXT))]);
    page.model = new FakeModelClient([
      turn(
        text("Let's change the length."),
        toolUse("ask_choice", { field: "maxProgramMonths", question: "Length?" }),
      ),
    ]);
    await page.type("Actually I could do two years.");
    page.model = new FakeModelClient([
      checkAll(),
      propose({ ...PERSONA_A_DIRECTION, maxProgramMonths: 24 }),
    ]);
    let r = await page.tap("Up to 2 years");
    expect(errorResultsIn(r.messages)).toHaveLength(0);
    expect(r.confirm?.direction?.maxProgramMonths).toBe(24);

    page.model = new FakeModelClient([turn(text("Here's the new verdict."))]);
    r = await page.confirm();
    expect(r.direction).not.toBeNull();
  });

  it("refuses the same card with a tieBreaker when the answers don't tie", async () => {
    const { page, r } = await atVerdict([turn(text(VERDICT_TEXT))]);
    expect(r.direction?.category.tie).toBeUndefined();
    page.model = new FakeModelClient([
      checkAll(),
      propose({ ...PERSONA_A_DIRECTION, tieBreaker: "executive" }),
      turn(text("It's still the executive program.")),
    ]);
    const again = await page.type("The executive program, if I had to pick.");
    expect(again.confirm).toBeNull();
    expect(errorResultsIn(again.messages)).toHaveLength(1);
  });

  it("shows the card again with a tieBreaker when the answers tie", async () => {
    // These answers tie a certificate with a short course on the fixture programs.
    const tied = {
      needs: ["Leadership skills", "Deep expertise in a field", "A graduate degree"],
      hoursPerWeek: ["Under 5"],
    };
    const { page, r, card } = await atVerdict(
      [turn(text("A certificate and a short course tie."))],
      tied,
    );
    expect(r.direction?.category.tie).toEqual(["certificate", "short_course"]);
    page.model = new FakeModelClient([checkAll(), propose({ ...card, tieBreaker: "certificate" })]);
    const broken = await page.type("The certificate, if I had to pick.");
    expect(errorResultsIn(broken.messages)).toHaveLength(0);
    expect(broken.confirm?.direction?.tieBreaker).toBe("certificate");
    const verdict = await page.confirm();
    expect(verdict.direction?.category.winner).toBe("certificate");
  });

  it("refuses the same card with its declines in another order", async () => {
    const { page, card } = await atVerdict([turn(text(VERDICT_TEXT))], {
      hoursPerWeek: "skip",
      keepWorking: "skip",
    });
    expect(card.declined).toEqual(["hoursPerWeek", "keepWorking"]);
    page.model = new FakeModelClient([
      checkAll(["hoursPerWeek"]),
      propose({ ...card, declined: ["keepWorking", "hoursPerWeek"] }),
      turn(text("Glad it fits.")),
    ]);
    const r = await page.type("Yes, that verdict is right.");
    expect(r.confirm).toBeNull();
    expect(errorResultsIn(r.messages)).toHaveLength(1);
  });

  // A tab open across the deploy can already hold the loop: two confirms of the same card.
  it("still reads a history that already holds the same card confirmed twice", async () => {
    const { page } = await atVerdict([turn(text(VERDICT_TEXT))]);
    page.history.push({
      role: "assistant",
      content: [toolUse("propose_direction", { direction: PERSONA_A_DIRECTION }, "toolu_dup")],
    });
    page.model = new FakeModelClient([turn(text(VERDICT_TEXT))]);
    const r = await page.post(answer("toolu_dup", { confirmed: true }));
    expect(r.direction?.category.winner).toBe("executive");
    expect(confirmedDirection(page.history)?.direction).toMatchObject(PERSONA_A_DIRECTION);

    // Stage 2 stays open, and the card still doesn't come back.
    page.model = new FakeModelClient([
      checkAll(),
      propose(PERSONA_A_DIRECTION),
      turn(
        text("Let's look at programs."),
        toolUse("ask_choice", { field: "currentRole", question: "Role?" }),
      ),
    ]);
    const next = await page.type(PERSONA_A_PROGRAMS_YES);
    expect(next.confirm).toBeNull();
    expect(errorResultsIn(next.messages)).toHaveLength(1);
    expect(next.chips?.field).toBe("currentRole");
  });
});

// Persona A up to the last stage 2 tap (currentRole), then a scripted model for the turn under
// test. The tap is posted as persona A's.
async function atLastStage2Tap(script: Script, taps: Record<string, string[]> = {}) {
  const page = new Page(new FakeModelClient(personaAScript), programs);
  const toolUseId = await walkToLastStage2Tap(page, taps);
  const model = new FakeModelClient(script);
  page.model = model;
  const r = await page.post(answer(toolUseId, { chosen: PERSONA_A_TAPS.currentRole }));
  return { page, model, r };
}

const checkAll = (declined: string[] = []) =>
  turn(toolUse("check_contradictions", { resolvedTensions: [], declined }));
const search = (answers: object) => turn(toolUse("propose_search", { search: answers }));

// Persona A's search card: the answers that have no chips (personas/A.md).
const answersA = {
  homeCity: "Buenos Aires",
  homeRegion: "C",
  homeCountry: "AR",
  homeLat: -34.6037,
  homeLon: -58.3816,
  yearsExperience: 16,
  yearsLeading: 12,
  degreeField: "Engineering",
  resolvedTensions: [],
  declined: [],
};

describe("the server checks the stage 2 card before it shows", () => {
  it("refuses propose_search before a direction is confirmed", async () => {
    const { r } = await atLastTap([
      checkAll(),
      search(answersA),
      turn(text("Let me confirm the direction first.")),
    ]);
    expect(r.confirm).toBeNull();
    expect(errorResultsIn(r.messages)[0]).toMatchObject({
      content: expect.stringContaining("No direction is confirmed"),
    });
  });

  it("refuses propose_search before check_contradictions in stage 2", async () => {
    const { r } = await atLastStage2Tap([search(answersA), turn(text("Checking first."))]);
    expect(r.confirm).toBeNull();
    expect(errorResultsIn(r.messages)[0]).toMatchObject({
      content: expect.stringContaining("check_contradictions"),
    });
  });

  it("builds the card from the taps, the confirmed direction and the model's free text", async () => {
    const { r } = await atLastStage2Tap([checkAll(), search(answersA)]);
    expect(r.confirm?.profile).toEqual(personaAProfile);
    expect(errorResultsIn(r.messages)).toHaveLength(0);
  });

  it("refuses chip or stage 1 answers on the search card: they come from the taps", async () => {
    for (const extra of [{ maxProgramMonths: 24 }, { tuitionBudgetUsd: 15000 }]) {
      const { r } = await atLastStage2Tap([
        checkAll(),
        search({ ...answersA, ...extra }),
        turn(text("Let me fix that.")),
      ]);
      expect(r.confirm).toBeNull();
      expect(errorResultsIn(r.messages)).toHaveLength(1);
    }
  });

  it("asks for propose_direction again when the user re-tapped a stage 1 answer", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    const toolUseId = await walkToLastStage2Tap(page);
    page.model = new FakeModelClient([
      turn(
        text("One more thing."),
        toolUse("ask_choice", { field: "maxProgramMonths", question: "Length?" }),
      ),
    ]);
    await page.post(answer(toolUseId, { chosen: PERSONA_A_TAPS.currentRole }));
    expect(page.last?.chips?.field).toBe("maxProgramMonths");
    page.model = new FakeModelClient([
      checkAll(),
      search(answersA),
      turn(text("Back to the direction.")),
    ]);
    const r = await page.tap("Up to 2 years");
    expect(r.confirm).toBeNull();
    const [err] = errorResultsIn(r.messages);
    expect(err).toMatchObject({ content: expect.stringContaining("maxProgramMonths") });
    expect(err).toMatchObject({ content: expect.stringContaining("propose_direction again") });
  });

  it("accepts a new propose_direction in stage 2, then searches on the new direction", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    const toolUseId = await walkToLastStage2Tap(page);
    page.model = new FakeModelClient([
      turn(toolUse("ask_choice", { field: "maxProgramMonths", question: "Length?" })),
    ]);
    await page.post(answer(toolUseId, { chosen: PERSONA_A_TAPS.currentRole }));
    page.model = new FakeModelClient([
      checkAll(),
      turn(
        toolUse("propose_direction", {
          direction: { ...PERSONA_A_DIRECTION, maxProgramMonths: 24 },
        }),
      ),
    ]);
    let r = await page.tap("Up to 2 years");
    expect(r.confirm?.direction?.maxProgramMonths).toBe(24);

    page.model = new FakeModelClient([turn(text("Here's the new verdict."))]);
    r = await page.confirm();
    expect(r.direction).not.toBeNull();

    page.model = new FakeModelClient([checkAll(), search(answersA)]);
    r = await page.type("Go on with the programs.");
    expect(r.confirm?.profile?.maxProgramMonths).toBe(24);
  });

  it("asks for a stage 2 chip answer the user never tapped, unless it's declined", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    const id = await walkToLastStage2Tap(page);
    const typed = answer(id, { chosen: [], typed: "I'd rather not say" });
    page.model = new FakeModelClient([
      checkAll(),
      search(answersA),
      turn(text("Then let me ask with the options.")),
    ]);
    const asked = new Page(page.model, programs);
    asked.history = [...page.history];
    asked.last = page.last;
    let r = await asked.post(typed);
    expect(r.confirm).toBeNull();
    expect(errorResultsIn(r.messages)[0]).toMatchObject({
      content: expect.stringContaining("currentRole has no answer"),
    });

    page.model = new FakeModelClient([
      checkAll(),
      search({ ...answersA, declined: ["currentRole"] }),
    ]);
    r = await page.post(typed);
    expect(r.confirm?.profile).toMatchObject({ currentRole: "other", declined: ["currentRole"] });
  });

  it("lets a decline win over an earlier tap", async () => {
    const { r } = await atLastStage2Tap([
      checkAll(),
      search({ ...answersA, declined: ["travelBudgetUsd"] }),
    ]);
    expect(r.confirm?.profile).toMatchObject({
      travelBudgetUsd: null,
      declined: ["travelBudgetUsd"],
    });
  });

  it.each([
    ["a code that isn't a country", { homeCountry: "XX" }, "ISO 3166"],
    ["a country name", { homeCountry: "argentina" }, "homeCountry"],
    ["a latitude out of range", { homeLat: 120 }, "homeLat"],
    ["a longitude out of range", { homeLon: -200 }, "homeLon"],
    ["half the coordinates", { homeLon: null }, "homeLon"],
    ["an empty city that isn't declined", { homeCity: "" }, "homeCity"],
  ])("asks again for the home on %s", async (_, home, problem) => {
    const { r } = await atLastStage2Tap([
      checkAll(),
      search({ ...answersA, ...home }),
      turn(text("Where do you live, again?")),
    ]);
    expect(r.confirm).toBeNull();
    const [err] = errorResultsIn(r.messages);
    expect(err).toMatchObject({ content: expect.stringContaining(problem) });
    expect(err).toMatchObject({ content: expect.stringContaining("where they live again") });
  });

  it("accepts a declined home", async () => {
    const declinedHome = {
      ...answersA,
      homeCity: "",
      homeRegion: null,
      homeCountry: "",
      homeLat: null,
      homeLon: null,
      declined: ["homeCity", "homeRegion", "homeCountry", "homeLat", "homeLon"],
    };
    const { r } = await atLastStage2Tap([checkAll(), search(declinedHome)]);
    expect(r.confirm?.profile?.homeCountry).toBe("");
  });
});

// Persona A with no days on site: R1 fires (a senior network first, fewer than 10 days).
describe("check_contradictions runs the rules on the taps", () => {
  const noDaysOnSite = { maxOnsiteDays: ["None"] };

  it("finds a stage 2 tension though the model sends no answers", async () => {
    const { r } = await atLastStage2Tap([checkAll(), search(answersA)], noDaysOnSite);
    expect(lastBlocks(r.messages[1])[0]).toMatchObject({
      content: expect.stringContaining('"id":"R1"'),
    });
    // Returned to the advisor, so the card shows; resolving it is the advisor's call.
    expect(r.confirm?.profile?.maxOnsiteDays).toBe(0);
  });

  it("leaves out a field the user declined", async () => {
    const { r } = await atLastStage2Tap(
      [checkAll(["maxOnsiteDays"]), search({ ...answersA, declined: ["maxOnsiteDays"] })],
      noDaysOnSite,
    );
    expect(lastBlocks(r.messages[1])[0]).toMatchObject({
      content: JSON.stringify({ tensions: [] }),
    });
    expect(r.confirm?.profile?.declined).toEqual(["maxOnsiteDays"]);
  });

  it("marks a tension the user resolved", async () => {
    const resolved = [{ rule: "R1", chosen: "the network, with fewer days" }];
    const { r } = await atLastStage2Tap(
      [
        turn(toolUse("check_contradictions", { resolvedTensions: resolved, declined: [] })),
        search({ ...answersA, resolvedTensions: resolved }),
      ],
      noDaysOnSite,
    );
    expect(lastBlocks(r.messages[1])[0]).toMatchObject({
      content: expect.stringContaining('"resolved":true'),
    });
    expect(r.confirm?.profile?.resolvedTensions).toEqual(resolved);
  });

  it("refuses the card when a tension fires after the last check", async () => {
    // The check runs with 20 days on site; then the user changes it to none.
    const page = new Page(new FakeModelClient(personaAScript), programs);
    const id = await walkToLastStage2Tap(page);
    page.model = new FakeModelClient([
      checkAll(),
      turn(toolUse("ask_choice", { field: "maxOnsiteDays", question: "Days on site?" })),
    ]);
    await page.post(answer(id, { chosen: PERSONA_A_TAPS.currentRole }));
    page.model = new FakeModelClient([search(answersA), turn(text("Let me check again."))]);
    const r = await page.tap("None");
    expect(r.confirm).toBeNull();
    expect(errorResultsIn(r.messages)[0]).toMatchObject({
      content: expect.stringContaining("R1 ("),
    });
  });

  it("lets persona A's fake reach the programs with R1 firing", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    const id = await walkToLastStage2Tap(page, noDaysOnSite);
    let r = await page.post(answer(id, { chosen: PERSONA_A_TAPS.currentRole }));
    expect(r.confirm?.profile?.maxOnsiteDays).toBe(0);
    r = await page.confirm();
    expect(r.programs).not.toBeNull();
  });
});

describe("the stage 2 confirm", () => {
  const post = (history: Message[]) =>
    chatLoop(history, { model: new FakeModelClient([]), programs, log: () => {}, today: TODAY });

  // The propose_search call in the history, to tamper with.
  const searchCall = (history: Message[]) =>
    history
      .flatMap(lastBlocks)
      .find((b) => b.type === "tool_use" && b.name === "propose_search") as { input: unknown };

  it("refuses a confirm already carrying a result", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    const id = await walkToSearchCard(page);
    await expect(post(page.posting(answer(id, { confirmed: true, result: {} })))).rejects.toThrow(
      BadRequest,
    );
  });

  it("refuses a confirm of a card edited in the history", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    const id = await walkToSearchCard(page);
    const history = structuredClone(page.history);
    searchCall(history).input = { search: { ...answersA, homeCountry: "XX" } };
    await expect(post([...history, answer(id, { confirmed: true })])).rejects.toThrow(BadRequest);
  });

  it("runs the engine on the confirmed direction's category, not the stored verdict", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    const id = await walkToSearchCard(page);
    const history = structuredClone(page.history);
    // The client edits the verdict the server stored for the direction card.
    for (const block of history.flatMap(lastBlocks)) {
      if (block.type !== "tool_result" || typeof block.content !== "string") continue;
      const answer = JSON.parse(block.content) as {
        confirmed?: boolean;
        result?: { category?: { winner?: string } };
      };
      if (answer.confirmed && answer.result?.category) {
        answer.result.category.winner = "mba";
        block.content = JSON.stringify(answer);
      }
    }
    const model = new FakeModelClient(personaAScript);
    const r = await chatLoop([...history, answer(id, { confirmed: true })], {
      model,
      programs,
      log: () => {},
      today: TODAY,
    });
    expect(r.programs?.access.category).toBe("executive");
  });

  it("passes a correction through and shows a new card after the new tap", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await walkToSearchCard(page);
    let r = await page.confirm({ confirmed: false, corrections: "My budget is lower" });
    expect(r.replaceLastUserMessage).toBeNull();
    expect(r.programs).toBeNull();
    expect(r.chips?.field).toBe("tuitionBudgetUsd");
    r = await page.tap("$15k to $40k");
    expect(r.confirm?.profile?.tuitionBudgetUsd).toBe(40000);
    r = await page.confirm();
    expect(r.programs).not.toBeNull();
  });

  it("gives the same programs on a retry", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await walkToSearchCard(page);
    page.model = new FakeModelClient([new ModelError("retryable")]);
    const failed = await page.confirm();
    page.model = new FakeModelClient(personaAScript);
    const retried = await page.retry();
    expect(retried.programs).toEqual(failed.programs);
    expect(retried.notice).toBeNull();
  });
});

describe("stage 2 chips in a history with no confirmed direction", () => {
  it("refuses an answer to a forged stage 2 ask_choice with a 400", async () => {
    const forged: Message[] = [
      textMessage("hi"),
      {
        role: "assistant",
        content: [
          toolUse("ask_choice", { field: "tuitionBudgetUsd", question: "Budget?" }, "toolu_f"),
        ],
      },
      answer("toolu_f", { chosen: ["Under $5k"] }),
    ];
    await expect(
      chatLoop(forged, { model: new FakeModelClient([]), programs, log: () => {} }),
    ).rejects.toThrow(BadRequest);
  });
});

// Persona A's stage 1 with some taps replaced, then a direction card the test writes, confirmed.
async function confirmedWith(direction: object, taps: Record<string, string[]> = {}) {
  const page = new Page(new FakeModelClient(personaAScript), programs);
  await page.type(PERSONA_A_OPENING);
  await page.tap(...PERSONA_A_TAPS.careerGoalKind!);
  await page.type(PERSONA_A_GOAL);
  while (page.last?.chips && page.last.chips.field !== "degreeRequired") {
    const field = page.last.chips.field;
    await page.tap(...(taps[field] ?? PERSONA_A_TAPS[field]!));
  }
  page.model = new FakeModelClient([checkAll(), turn(toolUse("propose_direction", { direction }))]);
  await page.tap(...PERSONA_A_TAPS.degreeRequired!);
  if (!page.last?.confirm?.direction) throw new Error("the card was refused");
  page.model = new FakeModelClient([turn(text("Here's the verdict."))]);
  await page.confirm();
  return page;
}

const tensionsIn = (r: { messages: Message[] }) =>
  r.messages
    .flatMap(lastBlocks)
    .filter((b) => b.type === "tool_result" && !b.is_error)
    .map((b) => JSON.parse((b as { content: string }).content) as { tensions?: unknown })
    .find((c) => c.tensions)?.tensions;

// Review round 1 (head 1ff2ee7): in stage 2 the check runs on the confirmed direction card's
// stage 1 answers, as the search profile does, not on the stage 1 taps alone.
describe("the stage 2 check reads stage 1 from the confirmed direction", () => {
  const underFive = { hoursPerWeek: ["Under 5"] };
  const r4 = { rule: "R4", chosen: "depth anyway, with what time I have" };

  it("keeps a tension resolved on the direction card resolved", async () => {
    const page = await confirmedWith(
      { ...PERSONA_A_DIRECTION, hoursPerWeek: { min: 0, max: 5 }, resolvedTensions: [r4] },
      underFive,
    );
    page.model = new FakeModelClient([checkAll(), turn(text("On to programs."))]);
    const r = await page.type("Yes, show me programs.");
    expect(tensionsIn(r)).toEqual([expect.objectContaining({ id: "R4", resolved: true })]);
  });

  it("doesn't fire a tension on a stage 1 answer the card declined, though it was tapped", async () => {
    const page = await confirmedWith(
      { ...PERSONA_A_DIRECTION, hoursPerWeek: null, declined: ["hoursPerWeek"] },
      underFive,
    );
    page.model = new FakeModelClient([checkAll(), turn(text("On to programs."))]);
    const r = await page.type("Yes, show me programs.");
    expect(tensionsIn(r)).toEqual([]);
  });

  it("counts a stage 1 answer the user changed after the confirm", async () => {
    const page = await confirmedWith(PERSONA_A_DIRECTION);
    page.model = new FakeModelClient([
      turn(toolUse("ask_choice", { field: "hoursPerWeek", question: "Hours a week?" })),
    ]);
    await page.type("Actually I have less time than I said.");
    page.model = new FakeModelClient([checkAll(), turn(text("That changes things."))]);
    const r = await page.tap("Under 5");
    expect(tensionsIn(r)).toEqual([expect.objectContaining({ id: "R4", resolved: false })]);
  });
});

// Review round 1 (head 1ff2ee7): with no winner the engine lists nothing, so stage 2 would ask
// about 14 questions for an empty list.
describe("stage 2 stays closed while the verdict names no type", () => {
  const noNeeds = { ...PERSONA_A_DIRECTION, needs: null, declined: ["needs"] };

  it("has no winner when the user declined what's missing", async () => {
    const direction = (await confirmedWith(noNeeds)).last!.direction!;
    expect(direction.category.winner).toBeNull();
  });

  it("refuses stage 2 chips and propose_search, and says why", async () => {
    const page = await confirmedWith(noNeeds);
    page.model = new FakeModelClient([
      turn(toolUse("ask_choice", { field: "tuitionBudgetUsd", question: "Budget?" })),
      checkAll(),
      search(answersA),
      turn(text("Let's settle the direction first.")),
    ]);
    const r = await page.type("Yes, show me programs.");
    expect(r.chips).toBeNull();
    expect(r.confirm).toBeNull();
    const errors = errorResultsIn(r.messages);
    expect(errors).toHaveLength(2);
    for (const e of errors) {
      expect(e).toMatchObject({ content: expect.stringContaining("names no single type") });
    }
  });
});
