import { afterEach, describe, expect, it, vi } from "vitest";
import { CHIPS } from "../core/advisor/chips";
import { fixtureDataset } from "../tests/fixtures/dataset";
import { Page, PERSONA_A_OPENING, PERSONA_A_TAPS, walkToLastTap } from "../tests/fixtures/chat";
import { logRequest } from "./log";
import { FakeModelClient } from "./model/fake";
import { PERSONA_A_GOAL, personaAScript, VERDICT_TEXT } from "./model/personaA";

// CLAUDE.md rule 4: the server logs counts, statuses and error kinds, never message content.

afterEach(() => vi.restoreAllMocks());

describe("logging during persona A's run", () => {
  it("holds no message text, profile value or tool input", async () => {
    const lines: string[] = [];
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        lines.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
      });
    }
    const page = new Page(new FakeModelClient(personaAScript), fixtureDataset());
    page.realLogger = true;
    await walkToLastTap(page);
    await page.tap(...PERSONA_A_TAPS.degreeRequired!);
    await page.confirm();

    expect(lines.length).toBeGreaterThan(0);
    const secrets = [
      PERSONA_A_OPENING,
      PERSONA_A_GOAL,
      VERDICT_TEXT.slice(0, 30),
      ...Object.values(PERSONA_A_TAPS).flat(),
      ...CHIPS.needs.map((c) => c.value),
      "step_up",
      "more_senior",
      "executive",
      "toolu_",
      "check_contradictions",
    ];
    for (const line of lines) {
      for (const secret of secrets) expect(line).not.toContain(secret);
      // Every value is a number or one of the fixed enums.
      const entry = JSON.parse(line) as Record<string, unknown>;
      for (const [key, value] of Object.entries(entry)) {
        if (typeof value !== "number") expect(["event", "status", "errorKind"]).toContain(key);
      }
    }
  });

  it("logRequest drops anything outside its typed fields", () => {
    const lines: string[] = [];
    vi.spyOn(console, "info").mockImplementation((line: string) => void lines.push(line));
    logRequest({
      status: "ok",
      rounds: 1,
      inputTokens: 1,
      cacheReadTokens: 2,
      cacheCreationTokens: 3,
      outputTokens: 4,
      ...({ text: PERSONA_A_GOAL } as object),
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain(PERSONA_A_GOAL);
  });
});
