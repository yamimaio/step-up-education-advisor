import { describe, expect, it, vi } from "vitest";
import { evaluatePrograms, recommendCategory } from "../core/index";
import { toEngineDirection } from "../core/advisor/tools";
import { fixtureDataset } from "../tests/fixtures/dataset";
import {
  Page,
  PERSONA_A_OPENING,
  PERSONA_A_TAPS,
  TODAY,
  walkToLastTap,
  walkToSearchCard,
} from "../tests/fixtures/chat";
import { fallbackExplanation, fallbackSearchExplanation, NOTICE_MESSAGES } from "./fallback";
import { ModelError } from "./model/adapter";
import { createAnthropicClient } from "./model/anthropic";
import { FakeModelClient } from "./model/fake";
import { PERSONA_A_DIRECTION, personaAScript } from "./model/personaA";

const programs = fixtureDataset();

describe("the verdict survives a failed model call (plan test 6, DQ3)", () => {
  it("returns the engine's verdict with the template explanation", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await walkToLastTap(page);
    await page.tap(...PERSONA_A_TAPS.degreeRequired!);
    const before = page.history;
    // The turn after the confirm fails: out of credit.
    page.model = new FakeModelClient([new ModelError("auth_or_credit")]);
    const r = await page.confirm();

    const expected = recommendCategory(toEngineDirection(PERSONA_A_DIRECTION as never), programs);
    expect(r.direction).toEqual(expected);
    expect(r.text).toBe(fallbackExplanation(expected));
    expect(r.text).toContain("an executive program");
    expect(r.notice).toEqual({ kind: "auth_or_credit", message: NOTICE_MESSAGES.auth_or_credit });
    expect(r.messages).toEqual([]);
    expect(r.replaceLastUserMessage).toBeNull();
    // The page keeps the raw confirm it sent, so a retry posts it unchanged.
    expect(page.history.slice(0, before.length)).toEqual(before);
  });

  it("gives the same verdict on a retry", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await walkToLastTap(page);
    await page.tap(...PERSONA_A_TAPS.degreeRequired!);
    const card = page.last!.confirm!;
    page.model = new FakeModelClient([new ModelError("retryable")]);
    const failed = await page.confirm();
    page.model = new FakeModelClient(personaAScript);
    const retried = await page.retry();
    expect(card.toolUseId).toBeTruthy();
    expect(retried.direction).toEqual(failed.direction);
    expect(retried.notice).toBeNull();
  });

  it("gives the friendly message on the first message when the key is missing", async () => {
    vi.stubEnv("MODEL_API_KEY", "");
    const page = new Page(createAnthropicClient(), programs);
    const r = await page.type(PERSONA_A_OPENING);
    vi.unstubAllEnvs();
    expect(r.notice).toEqual({ kind: "auth_or_credit", message: NOTICE_MESSAGES.auth_or_credit });
    expect(r.text).toBe("");
    expect(r.direction).toBeNull();
    expect(r.messages).toEqual([]);
  });
});

describe("the template explanation", () => {
  it("skips the deciding-needs line when the needs don't separate the top two (persona A)", () => {
    // No records, so the EMBA isn't out on length and is the runner-up, as strong on every need.
    const result = recommendCategory(toEngineDirection(PERSONA_A_DIRECTION as never), []);
    expect(result.category).toMatchObject({ runnerUp: "emba", decidingNeeds: [] });
    const text = fallbackExplanation(result);
    expect(text).toContain("My verdict: an executive program.");
    expect(text).not.toContain("It fits best on");
  });

  it("names a not-yet trigger and still asks about programs", () => {
    const unclear = recommendCategory(
      toEngineDirection({ ...PERSONA_A_DIRECTION, goalClarity: "unclear" } as never),
      programs,
    );
    const text = fallbackExplanation(unclear);
    expect(text).toContain("no program yet");
    expect(text.endsWith("Want to see programs that fit?")).toBe(true);
  });

  it("lists ruled-out types with the engine's reasons", () => {
    const result = recommendCategory(
      toEngineDirection({ ...PERSONA_A_DIRECTION, degreeRequired: "required" } as never),
      programs,
    );
    const out = Object.entries(result.category.scores).filter(([, s]) => s === "out");
    expect(out.length).toBeGreaterThan(0);
    const text = fallbackExplanation(result);
    expect(text).toContain(
      "Ruled out: an executive program (you need a degree and this type does not award one).",
    );
    expect(text).not.toMatch(/Strong for|Some help with|Little help with/);
  });
});

describe("the programs survive a failed model call after the stage 2 confirm", () => {
  it("returns the engine's programs with the template explanation", async () => {
    const page = new Page(new FakeModelClient(personaAScript), programs);
    await walkToSearchCard(page);
    const profile = page.last!.confirm!.profile!;
    const before = page.history;
    page.model = new FakeModelClient([new ModelError("auth_or_credit")]);
    const r = await page.confirm();

    const { category } = recommendCategory(
      toEngineDirection(PERSONA_A_DIRECTION as never),
      programs,
    );
    const expected = evaluatePrograms(profile, category, programs, TODAY);
    expect(r.programs).toEqual(expected);
    expect(r.direction).toBeNull();
    expect(r.text).toBe(fallbackSearchExplanation(expected, programs));
    expect(r.notice).toEqual({ kind: "auth_or_credit", message: NOTICE_MESSAGES.auth_or_credit });
    expect(r.messages).toEqual([]);
    expect(r.replaceLastUserMessage).toBeNull();
    expect(page.history.slice(0, before.length)).toEqual(before);
  });
});
