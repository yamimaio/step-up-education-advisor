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
import { BadRequest } from "./handlers";
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
    expect(r.confirm?.direction?.hoursPerWeek).toBeNull();
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

const checkAll = () => turn(toolUse("check_contradictions", { profile: {} }));
const search = (profile: object) => turn(toolUse("propose_search", { profile }));

describe("the server checks the stage 2 card before it shows", () => {
  it("refuses propose_search before a direction is confirmed", async () => {
    const { r } = await atLastTap([
      checkAll(),
      search(personaAProfile),
      turn(text("Let me confirm the direction first.")),
    ]);
    expect(r.confirm).toBeNull();
    expect(errorResultsIn(r.messages)[0]).toMatchObject({
      content: expect.stringContaining("No direction is confirmed"),
    });
  });

  it("refuses propose_search before check_contradictions in stage 2", async () => {
    const { r } = await atLastStage2Tap([search(personaAProfile), turn(text("Checking first."))]);
    expect(r.confirm).toBeNull();
    expect(errorResultsIn(r.messages)[0]).toMatchObject({
      content: expect.stringContaining("check_contradictions"),
    });
  });

  it("shows the card once the checks pass", async () => {
    const { r } = await atLastStage2Tap([checkAll(), search(personaAProfile)]);
    expect(r.confirm?.profile).toEqual(personaAProfile);
    expect(errorResultsIn(r.messages)).toHaveLength(0);
  });

  it("asks for propose_direction again when a stage 1 answer on the card changed", async () => {
    const { r } = await atLastStage2Tap([
      checkAll(),
      search({ ...personaAProfile, maxProgramMonths: 24 }),
      turn(text("Let me fix that.")),
    ]);
    expect(r.confirm).toBeNull();
    const [err] = errorResultsIn(r.messages);
    expect(err).toMatchObject({ content: expect.stringContaining("maxProgramMonths") });
    expect(err).toMatchObject({ content: expect.stringContaining("propose_direction again") });
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
    // Whatever the card says, the length changed since the confirmed direction.
    for (const months of [12, 24]) {
      const retry = new Page(new FakeModelClient([]), programs);
      retry.history = [...page.history];
      retry.last = page.last;
      retry.model = new FakeModelClient([
        checkAll(),
        search({ ...personaAProfile, maxProgramMonths: months }),
        turn(text("Back to the direction.")),
      ]);
      const r = await retry.tap("Up to 2 years");
      expect(r.confirm).toBeNull();
      expect(errorResultsIn(r.messages)[0]).toMatchObject({
        content: expect.stringContaining("propose_direction again"),
      });
    }
  });

  it("accepts a new propose_direction in stage 2, then the search on the new direction", async () => {
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

    const longer = { ...personaAProfile, maxProgramMonths: 24 };
    page.model = new FakeModelClient([checkAll(), search(longer)]);
    r = await page.type("Go on with the programs.");
    expect(r.confirm?.profile?.maxProgramMonths).toBe(24);
  });

  it("refuses a stage 2 chip field that doesn't match the tap", async () => {
    const { r } = await atLastStage2Tap([
      checkAll(),
      search({ ...personaAProfile, tuitionBudgetUsd: 15000 }),
      turn(text("Let me fix the budget.")),
    ]);
    expect(errorResultsIn(r.messages)[0]).toMatchObject({
      content: expect.stringContaining("tuitionBudgetUsd doesn't match"),
    });
  });

  it("refuses location values in another order from the tap", async () => {
    const { r } = await atLastStage2Tap([
      checkAll(),
      search({ ...personaAProfile, locationValues: ["network_density", "immersion"] }),
      turn(text("Let me fix the order.")),
    ]);
    expect(errorResultsIn(r.messages)[0]).toMatchObject({
      content: expect.stringContaining("locationValues"),
    });
  });

  it("accepts a declined stage 2 field with any value", async () => {
    const { r } = await atLastStage2Tap([
      checkAll(),
      search({ ...personaAProfile, travelBudgetUsd: 0, declined: ["travelBudgetUsd"] }),
    ]);
    expect(r.confirm?.profile?.declined).toEqual(["travelBudgetUsd"]);
  });

  it.each([
    ["a code that isn't a country", { homeCountry: "XX" }, "ISO 3166"],
    ["a country name", { homeCountry: "argentina" }, "homeCountry"],
    ["a latitude out of range", { homeLat: 120 }, "homeLat"],
    ["a longitude out of range", { homeLon: -200 }, "homeLon"],
  ])("asks again for the home on %s", async (_, home, problem) => {
    const { r } = await atLastStage2Tap([
      checkAll(),
      search({ ...personaAProfile, ...home }),
      turn(text("Where do you live, again?")),
    ]);
    expect(r.confirm).toBeNull();
    const [err] = errorResultsIn(r.messages);
    expect(err).toMatchObject({ content: expect.stringContaining(problem) });
    expect(err).toMatchObject({ content: expect.stringContaining("where they live again") });
  });

  it("accepts a declined home", async () => {
    const declinedHome = {
      ...personaAProfile,
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
describe("a tension that fires in stage 2 must reach the advisor before the card", () => {
  const noDaysOnSite = { maxOnsiteDays: ["None"] };
  const card = { ...personaAProfile, maxOnsiteDays: 0 };

  it("refuses the card when check_contradictions never returned it", async () => {
    // The model sends only the stage 1 answers, so R1 can't fire in its check.
    const stage1Only = turn(
      toolUse("check_contradictions", { profile: { needs: personaAProfile.needs } }),
    );
    const { r } = await atLastStage2Tap(
      [stage1Only, search(card), turn(text("Let me check that properly."))],
      noDaysOnSite,
    );
    expect(r.confirm).toBeNull();
    const [err] = errorResultsIn(r.messages);
    expect(err).toMatchObject({ content: expect.stringContaining("R1 (") });
    expect(err).toMatchObject({ content: expect.stringContaining("never returned them") });
  });

  it("shows the card once check_contradictions returned it", async () => {
    const withStage2 = turn(
      toolUse("check_contradictions", {
        profile: { needs: personaAProfile.needs, maxOnsiteDays: 0 },
      }),
    );
    const { r } = await atLastStage2Tap([withStage2, search(card)], noDaysOnSite);
    expect(lastBlocks(r.messages[1])[0]).toMatchObject({
      content: expect.stringContaining('"id":"R1"'),
    });
    expect(r.confirm?.profile?.maxOnsiteDays).toBe(0);
  });

  it("shows the card when the user already resolved it", async () => {
    const resolved = { ...card, resolvedTensions: [{ rule: "R1", chosen: "network" }] };
    const { r } = await atLastStage2Tap([checkAll(), search(resolved)], noDaysOnSite);
    expect(r.confirm?.profile?.resolvedTensions).toEqual([{ rule: "R1", chosen: "network" }]);
  });

  it("lets persona A's fake, which sends the stage 2 answers, reach the programs", async () => {
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
    searchCall(history).input = { profile: { ...personaAProfile, tuitionBudgetUsd: 250000 } };
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
