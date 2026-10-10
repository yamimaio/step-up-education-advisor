import { describe, expect, it } from "vitest";
import { toEngineDirection } from "@core/advisor/tools";
import { recommendCategory } from "@core/engine/direction";
import { personaADirection } from "../../tests/fixtures/directions";
import type { MessageParam } from "./chatTypes";
import { buildTranscript, localDate } from "./transcript";

const history: MessageParam[] = [
  { role: "user", content: [{ type: "text", text: "I lead engineering teams." }] },
  {
    role: "assistant",
    content: [
      { type: "thinking", thinking: "hidden", signature: "x" },
      { type: "text", text: "How long a program could you take on?" },
      {
        type: "tool_use",
        id: "t1",
        name: "ask_choice",
        input: { field: "maxProgramMonths", question: "The longest program you'd take on now" },
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: "t1",
        content: JSON.stringify({ chosen: [{ label: "Up to a year", value: 12 }] }),
      },
    ],
  },
  {
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "t2",
        name: "propose_direction",
        input: { direction: personaADirection },
      },
    ],
  },
  {
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: "t2",
        content: JSON.stringify({ confirmed: true, result: {} }),
      },
    ],
  },
  { role: "assistant", content: "An executive program fits best." },
];

const verdict = {
  direction: personaADirection,
  result: recommendCategory(toEngineDirection(personaADirection), []),
};

describe("buildTranscript", () => {
  const md = buildTranscript({
    history,
    verdict,
    fallbackText: null,
    date: new Date("2026-10-09T12:00:00Z"),
  });

  it("holds every visible message, in order, without thinking or tool calls", () => {
    const order = [
      "I lead engineering teams.",
      "How long a program could you take on?",
      "Up to a year",
      "Looks right",
      "An executive program fits best.",
    ].map((s) => md.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(md).not.toContain("hidden");
  });

  it("lists the chips tapped with their question", () => {
    expect(md).toContain("## Chips tapped");
    expect(md).toContain("- The longest program you'd take on now: Up to a year");
  });

  it("holds the confirmed card and the engine verdict", () => {
    expect(md).toContain("## What you confirmed");
    expect(md).toContain('Step up to a bigger leadership role: "Move into an executive role"');
    expect(md).toContain("## Verdict");
    expect(md).toContain("- Best next step: Executive program");
    expect(md).toContain(
      "| Executive program | Strong for a senior network and leadership skills.",
    );
    expect(md).not.toMatch(/\| Score \||subtotal/);
  });

  it("includes the template explanation shown after a failed confirm", () => {
    const withFallback = buildTranscript({
      history,
      verdict,
      fallbackText: "Template explanation",
      date: new Date(),
    });
    expect(withFallback).toContain("> Template explanation");
  });

  it("writes no pick under a not-yet verdict", () => {
    const unclear = { ...personaADirection, goalClarity: "unclear" as const };
    const notYet = buildTranscript({
      history,
      verdict: { direction: unclear, result: recommendCategory(toEngineDirection(unclear), []) },
      fallbackText: null,
      date: new Date(),
    });
    expect(notYet).toContain("Not yet.");
    expect(notYet).not.toContain("Best next step");
    expect(notYet).not.toContain("Runner-up");
  });

  it("dates the file with the user's local date, not the UTC one", () => {
    expect(localDate(new Date(2026, 9, 9, 23, 30))).toBe("2026-10-09");
    expect(localDate(new Date(2026, 0, 2, 0, 5))).toBe("2026-01-02");
  });
});
