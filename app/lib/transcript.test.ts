import { describe, expect, it } from "vitest";
import { toEngineDirection } from "@core/advisor/tools";
import { recommendCategory } from "@core/engine/direction";
import { evaluatePrograms } from "@core/engine/search";
import { fixture, fixtureDataset } from "../../tests/fixtures/dataset";
import { personaADirection } from "../../tests/fixtures/directions";
import { personaAProfile } from "../../tests/fixtures/profiles";
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
    results: null,
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
    // Persona A: the runner-up is as strong on every need, so there's no deciding-needs line.
    expect(verdict.result.category.decidingNeeds).toEqual([]);
    expect(md).not.toContain("Deciding needs");
  });

  it("includes the template explanation shown after a failed confirm", () => {
    const withFallback = buildTranscript({
      history,
      verdict,
      results: null,
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
      results: null,
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

describe("buildTranscript, stage 2", () => {
  // After the verdict: a stage 2 chip tap, the search card and its confirm.
  const stage2: MessageParam[] = [
    ...history,
    {
      role: "assistant",
      content: [
        { type: "text", text: "How would you rather study?" },
        {
          type: "tool_use",
          id: "t3",
          name: "ask_choice",
          input: { field: "formatPreference", question: "Online, blended or in person?" },
        },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: "t3",
          content: JSON.stringify({ chosen: [{ label: "Blended", value: "blended" }] }),
        },
      ],
    },
    {
      role: "assistant",
      content: [
        { type: "tool_use", id: "t4", name: "propose_search", input: { profile: personaAProfile } },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: "t4",
          content: JSON.stringify({ confirmed: true, result: {} }),
        },
      ],
    },
    { role: "assistant", content: "Here are the programs that fit." },
  ];
  // The executive fixture as a draft, so the transcript must carry the label.
  const programs = [
    ...fixtureDataset().filter((p) => p.id !== "fake-executive"),
    fixture("fake-executive", { verification: { status: "draft", verifiedBy: null } }),
  ];
  const result = evaluatePrograms(
    personaAProfile,
    verdict.result.category,
    programs,
    new Date("2026-10-10"),
  );
  const md = buildTranscript({
    history: stage2,
    verdict,
    results: { profile: personaAProfile, result },
    fallbackText: null,
    date: new Date("2026-10-10T12:00:00Z"),
    programs,
  });

  it("holds the stage 2 answers: the chip tapped and the confirmed search card", () => {
    expect(md).toContain("- Online, blended or in person?: Blended");
    expect(md.match(/> Looks right/g)).toHaveLength(2);
    expect(md).toContain("## What you confirmed for the search");
    expect(md).toContain("- Tuition budget: $40k to $80k");
    expect(md).toContain("- Where you live: Buenos Aires, C, AR");
    expect(md.indexOf("## Verdict")).toBeLessThan(md.indexOf("## Programs"));
  });

  it("holds each listed program with its facts, checks, confidence, sources and draft label", () => {
    expect(result.ranking.ranked.map((r) => r.id)).toEqual(["fake-executive"]);
    expect(md).toContain("### Fixture fake-executive");
    expect(md).toContain("**Draft, not yet verified**");
    expect(md).toContain("Ranked first for senior peers (cohort median 15 years)");
    expect(md).toContain("- Fits: Tuition: $30,000; your limit $80,000");
    expect(md).toContain("- Tuition: $30,000");
    expect(md).toContain("Confidence: Low. Draft record, not yet verified.");
    expect(md).toContain("Sources checked on 2026-10-01.");
    expect(md).toContain(
      "- [Campus address, format, length, tuition, class experience](<https://example.edu/fake-executive>), checked 2026-10-01",
    );
    // Only listed programs: a failing one is not in the file.
    expect(md).not.toContain("Fixture fake-mba");
  });

  it("ends with the data-limits note", () => {
    expect(md).toContain("## About this data");
    expect(md).toContain("Step Up's list holds 6 programs, in United States.");
    expect(md).toContain("2 records are drafts, not yet verified.");
  });
});
