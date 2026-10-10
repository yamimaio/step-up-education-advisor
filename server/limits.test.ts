import { describe, expect, it } from "vitest";
import { fixtureDataset } from "../tests/fixtures/dataset";
import { answer, Page, textMessage, walkToLastTap, PERSONA_A_TAPS } from "../tests/fixtures/chat";
import { chatLoop } from "./chatLoop";
import type { Message } from "./history";
import { COUNTER_FROM, MESSAGE_CAP, WRAP_UP_AT, WRAP_UP_NOTE } from "./limits";
import { FakeModelClient, text, toolUse, turn } from "./model/fake";
import { personaAScript } from "./model/personaA";

const programs = fixtureDataset();

// n finished exchanges: n user turns, each answered by the advisor.
const exchanges = (n: number): Message[] =>
  Array.from({ length: n }, (_, i) => [
    textMessage(`message ${i + 1}`),
    { role: "assistant" as const, content: [text(`reply ${i + 1}`)] },
  ]).flat();

const run = (history: Message[], model = new FakeModelClient(() => turn(text("ok")))) =>
  chatLoop(history, { model, programs, log: () => {} }).then((r) => ({ r, model }));

const blocks = (m: Message | null | undefined) =>
  m && typeof m.content !== "string" ? m.content : [];

describe("empty input (plan test 4)", () => {
  it.each(["", "   ", "\n\t "])("nudges without a model call for %j", async (value) => {
    const { r, model } = await run([textMessage(value)]);
    expect(r.notice?.kind).toBe("empty_input");
    expect(r.messages).toEqual([]);
    expect(model.requests).toHaveLength(0);
  });

  it("nudges on a whitespace correction too", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await walkToLastTap(page);
    await page.tap(...PERSONA_A_TAPS.degreeRequired!);
    const model = new FakeModelClient([]);
    page.model = model;
    const r = await page.confirm({ confirmed: false, corrections: "  " });
    expect(r.notice?.kind).toBe("empty_input");
    expect(model.requests).toHaveLength(0);
  });
});

describe("the message counter", () => {
  it(`is absent before message ${COUNTER_FROM}`, async () => {
    const { r } = await run([...exchanges(COUNTER_FROM - 2), textMessage("next")]);
    expect(r.counter).toBeNull();
  });

  it(`appears at message ${COUNTER_FROM}`, async () => {
    const { r } = await run([...exchanges(COUNTER_FROM - 1), textMessage("next")]);
    expect(r.counter).toEqual({ remaining: MESSAGE_CAP - COUNTER_FROM });
  });

  it("doesn't count the server's own rounds", async () => {
    const rounds: Message[] = [
      { role: "assistant", content: [toolUse("check_contradictions", {}, "toolu_c")] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "toolu_c", content: "{}" }] },
      { role: "assistant", content: [text("ok")] },
    ];
    const history = [...exchanges(COUNTER_FROM - 2), textMessage("x"), ...rounds, textMessage("y")];
    const { r } = await run(history);
    expect(r.counter).toEqual({ remaining: MESSAGE_CAP - COUNTER_FROM });
  });
});

describe(`the wrap-up note at message ${WRAP_UP_AT}`, () => {
  const note = (m: Message | null | undefined) =>
    blocks(m).some((b) => b.type === "text" && b.text === WRAP_UP_NOTE);

  it("goes into the user's message when no direction is confirmed", async () => {
    const { r, model } = await run([...exchanges(WRAP_UP_AT - 1), textMessage("next")]);
    expect(note(r.replaceLastUserMessage)).toBe(true);
    expect(blocks(r.replaceLastUserMessage)[0]).toEqual({ type: "text", text: "next" });
    expect(note(model.requests[0]!.messages.at(-1))).toBe(true);
  });

  it("is not added before that", async () => {
    const { r } = await run([...exchanges(WRAP_UP_AT - 2), textMessage("next")]);
    expect(r.replaceLastUserMessage).toBeNull();
  });

  it("is added once", async () => {
    const first = await run([...exchanges(WRAP_UP_AT - 1), textMessage("next")]);
    const history = [
      ...exchanges(WRAP_UP_AT - 1),
      first.r.replaceLastUserMessage!,
      ...first.r.messages,
      textMessage("again"),
    ];
    const { r } = await run(history);
    expect(r.replaceLastUserMessage).toBeNull();
  });

  it("is still added when the user typed something that looks like it", async () => {
    const history = [
      textMessage("[Step Up note] I prefer evenings"),
      { role: "assistant" as const, content: [text("Noted.")] },
      ...exchanges(WRAP_UP_AT - 2),
      textMessage("next"),
    ];
    const { r } = await run(history);
    expect(note(r.replaceLastUserMessage)).toBe(true);
  });

  it("is not added once the direction is confirmed", async () => {
    const confirmed: Message[] = [
      { role: "assistant", content: [toolUse("propose_direction", {}, "toolu_p")] },
      answer("toolu_p", { confirmed: true, result: {} }),
      { role: "assistant", content: [text("Your verdict.")] },
    ];
    const history = [
      textMessage("hi"),
      ...confirmed,
      ...exchanges(WRAP_UP_AT - 2),
      textMessage("x"),
    ];
    const { r } = await run(history);
    expect(r.replaceLastUserMessage).toBeNull();
  });
});

describe(`message ${MESSAGE_CAP + 1}`, () => {
  it("is refused politely without a model call", async () => {
    const { r, model } = await run([...exchanges(MESSAGE_CAP), textMessage("one more")]);
    expect(r.notice?.kind).toBe("limit");
    expect(r.counter).toEqual({ remaining: 0 });
    expect(r.messages).toEqual([]);
    expect(model.requests).toHaveLength(0);
  });

  it("still returns the verdict for a confirm", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    // Pad the start so the confirm is message 41: the walk is 9 messages, the confirm the 10th.
    page.history = exchanges(MESSAGE_CAP - 9);
    await walkToLastTap(page);
    await page.tap(...PERSONA_A_TAPS.degreeRequired!);
    const model = new FakeModelClient([]);
    page.model = model;
    const r = await page.confirm();
    expect(r.notice?.kind).toBe("limit");
    expect(r.direction?.category.winner).toBe("executive");
    expect(r.text.endsWith("Want to see programs that fit?")).toBe(true);
    expect(model.requests).toHaveLength(0);
  });
});
