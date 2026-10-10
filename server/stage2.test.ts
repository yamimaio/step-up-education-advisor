import { describe, expect, it } from "vitest";
import { evaluatePrograms, recommendCategory } from "../core/index";
import { fixture, fixtureDataset } from "../tests/fixtures/dataset";
import { personaAProfile } from "../tests/fixtures/profiles";
import { TODAY } from "../tests/fixtures/chat";
import type { Program } from "../core/schema/program";
import { fallbackExplanation, fallbackSearchExplanation } from "./fallback";
import { ChatRequestSchema } from "./requestSchema";
import { searchSummary } from "./stage2";

const search = (programs = fixtureDataset(), profile = personaAProfile) => {
  const { category } = recommendCategory(profile, programs);
  return { programs, result: evaluatePrograms(profile, category, programs, TODAY) };
};

// The confirm as the page posts it back later in the history, with the summary as its content.
const storedConfirm = (content: string) => ({
  messages: [
    { role: "user", content: "hi" },
    {
      role: "assistant",
      content: [{ type: "tool_use", id: "t", name: "propose_search", input: {} }],
    },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "t", content }] },
    { role: "assistant", content: "Here they are." },
    { role: "user", content: "thanks" },
  ],
});

describe("what the model sees of the stage 2 result", () => {
  it("names each listed program from its record, with the engine's why line", () => {
    const { programs, result } = search();
    const summary = searchSummary(result, programs);
    const [first] = summary.ranked;
    const record = programs.find((p) => p.id === first!.id)!;
    expect(first).toMatchObject({
      name: record.name,
      institution: record.institution,
      why: result.ranking.ranked[0]!.why,
    });
    expect(summary.access).toEqual(result.access);
    expect(summary.ranked.length + summary.alsoWorthALook.length + summary.notListed).toBe(
      programs.length,
    );
  });

  it("lists only the checks a program misses or can't be checked on", () => {
    const { programs, result } = search();
    for (const entry of searchSummary(result, programs).ranked) {
      for (const issue of entry.issues) {
        expect(issue.status !== "pass" || issue.unknown, issue.check).toBe(true);
      }
    }
  });

  // The history caps a tool result at 20,000 characters, so the whole result can't be stored
  // with many programs listed; the summary can.
  it("fits the history's tool result limit with 25 programs listed", () => {
    const many = [
      ...fixtureDataset(),
      ...Array.from({ length: 24 }, (_, i) =>
        fixture("fake-executive", { id: `fake-executive-${i}` }),
      ),
    ];
    const { programs, result } = search(many);
    expect(result.ranking.ranked.length).toBe(25);
    const summary = JSON.stringify({ confirmed: true, result: searchSummary(result, programs) });
    const whole = JSON.stringify({ confirmed: true, result });
    expect(ChatRequestSchema.safeParse(storedConfirm(summary)).success).toBe(true);
    expect(ChatRequestSchema.safeParse(storedConfirm(whole)).success).toBe(false);
  });
});

describe("the stage 2 template explanation", () => {
  const explain = (programs = fixtureDataset(), profile = personaAProfile) => {
    const { result } = search(programs, profile);
    return { result, text: fallbackSearchExplanation(result, programs, profile.declined) };
  };
  // The template line for one program.
  const lineFor = (text: string, program: Program) =>
    text.split("\n").find((l) => l.startsWith(`- ${program.name} (`)) ?? "";

  it("lists the ranked programs by name with their why lines", () => {
    const programs = fixtureDataset();
    const { result, text } = explain(programs);
    const first = programs.find((p) => p.id === result.ranking.ranked[0]!.id)!;
    expect(text).toContain("Programs that fit, best first:");
    expect(text).toContain(`${first.name} (${first.institution})`);
    expect(text).toContain(result.ranking.ranked[0]!.why);
    expect(text).toContain("comes from the scoring engine");
  });

  it("says when the confirmed type has nothing within the limits, and names the alternative", () => {
    const { result, text } = explain(fixtureDataset(), {
      ...personaAProfile,
      tuitionBudgetUsd: 5000,
    });
    expect(result.access.status).toBe("none_within_limits");
    expect(text).toContain("None of the executive programs in the data fits all your limits");
    expect(text).toContain("tuition");
    expect(text).toContain("Your verdict stands.");
    if (result.access.alternative) expect(text).toContain("The closest type with one is");
  });

  it("says when the data has no program of the confirmed type", () => {
    const programs = fixtureDataset().filter((p) => p.category !== "executive");
    const { result, text } = explain(programs);
    expect(result.access.status).toBe("no_programs");
    expect(text).toContain("There are no executive programs in the data yet.");
  });

  // Review round 1 on PR #155: a near miss under the unknown-value rule misses nothing.
  it("says the school doesn't publish a figure, not that the program misses a limit", () => {
    const unpublished = fixture("fake-executive", { hoursPerWeek: null });
    const programs = [...fixtureDataset().filter((p) => p.id !== unpublished.id), unpublished];
    const { result, text } = explain(programs);
    const evaluation = result.programs.find((e) => e.id === unpublished.id)!;
    expect(evaluation.status).toBe("near_miss");
    const line = lineFor(text, unpublished);
    expect(line).toContain(
      "The school doesn't publish its weekly hours, so that can't be checked against your answers.",
    );
    expect(line).not.toMatch(/over|misses/);
  });

  it("says a program is slightly over a published limit", () => {
    const executive = fixture("fake-executive");
    const { result, text } = explain(fixtureDataset(), {
      ...personaAProfile,
      tuitionBudgetUsd: Math.ceil(executive.tuitionUsd! * 0.95),
    });
    expect(result.programs.find((e) => e.id === executive.id)!.status).toBe("near_miss");
    expect(lineFor(text, executive)).toContain("Close: it's slightly over your tuition budget.");
  });

  it("names the declined answers in plain words, the home as one", () => {
    const declinedHome = {
      ...personaAProfile,
      homeCity: "",
      homeRegion: null,
      homeCountry: "",
      homeLat: null,
      homeLon: null,
      declined: ["travelBudgetUsd", "homeCity", "homeRegion", "homeCountry", "homeLat", "homeLon"],
    };
    const { text } = explain(fixtureDataset(), declinedHome);
    expect(text).toContain(
      "Answers you chose not to give, so the list leaves them out: your travel budget and where you live.",
    );
    expect(text).not.toMatch(/homeCity|travelBudgetUsd/);
  });

  it("calls an unknown airfare unknown, not declined, when the user tapped I don't know", () => {
    const tapped = { ...personaAProfile, airfareRange: "unknown" as const };
    const { result, text } = explain(fixtureDataset(), tapped);
    expect(result.profileGaps).toContain("airfareRange");
    expect(text).not.toContain("Answers you chose not to give");
    expect(text).toContain(
      "The airfare from where you live isn't known, so travel estimates cover lodging only.",
    );
  });

  it("lists a declined airfare with the other declined answers", () => {
    const declined = {
      ...personaAProfile,
      airfareRange: "unknown" as const,
      declined: ["airfareRange"],
    };
    const { text } = explain(fixtureDataset(), declined);
    expect(text).toContain("leaves them out: the airfare from home.");
    expect(text).not.toContain("The airfare from where you live isn't known");
  });

  it("says a travel near miss from an unknown airfare isn't over the budget", () => {
    const executive = fixture("fake-executive");
    const tapped = { ...personaAProfile, airfareRange: "unknown" as const };
    const { text } = explain(fixtureDataset(), tapped);
    const line = lineFor(text, executive);
    expect(line).toContain(
      "Not fully checked: the travel estimate covers lodging only, because the airfare isn't known.",
    );
    expect(line).not.toContain("over your travel budget");
  });
});

describe("the stage 1 template explanation", () => {
  it("names the declined answers in plain words", () => {
    const direction = { ...personaAProfile, declined: ["hoursPerWeek", "peerPreference"] };
    const result = recommendCategory(direction, fixtureDataset());
    expect(fallbackExplanation(result)).toContain(
      "Answers you chose not to give, so the verdict leaves them out: hours a week",
    );
  });
});
