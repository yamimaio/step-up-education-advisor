import { describe, expect, it } from "vitest";
import { evaluatePrograms, recommendCategory } from "../core/index";
import { fixture, fixtureDataset } from "../tests/fixtures/dataset";
import { personaAProfile } from "../tests/fixtures/profiles";
import { TODAY } from "../tests/fixtures/chat";
import { fallbackSearchExplanation } from "./fallback";
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
  it("lists the ranked programs by name with their why lines", () => {
    const { programs, result } = search();
    const text = fallbackSearchExplanation(result, programs);
    const first = programs.find((p) => p.id === result.ranking.ranked[0]!.id)!;
    expect(text).toContain("Programs that fit, best first:");
    expect(text).toContain(`${first.name} (${first.institution})`);
    expect(text).toContain(result.ranking.ranked[0]!.why);
    expect(text).toContain("comes from the scoring engine");
  });

  it("says when the confirmed type has nothing within the limits, and names the alternative", () => {
    const { programs, result } = search(fixtureDataset(), {
      ...personaAProfile,
      tuitionBudgetUsd: 5000,
    });
    expect(result.access.status).toBe("none_within_limits");
    const text = fallbackSearchExplanation(result, programs);
    expect(text).toContain("None of the executive programs in the data fits all your limits");
    expect(text).toContain("tuition");
    expect(text).toContain("Your verdict stands.");
    if (result.access.alternative) expect(text).toContain("The closest type with one is");
  });

  it("says when the data has no program of the confirmed type", () => {
    const programs = fixtureDataset().filter((p) => p.category !== "executive");
    const { result } = search(programs);
    expect(result.access.status).toBe("no_programs");
    expect(fallbackSearchExplanation(result, programs)).toContain(
      "There are no executive programs in the data yet.",
    );
  });

  it("names the answers the user declined", () => {
    const declined = {
      ...personaAProfile,
      declined: ["travelBudgetUsd"],
    };
    const { programs, result } = search(fixtureDataset(), declined);
    expect(fallbackSearchExplanation(result, programs)).toContain(
      "Answers you chose not to give, so the list leaves them out: travelBudgetUsd",
    );
  });
});
