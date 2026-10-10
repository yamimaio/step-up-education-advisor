import { describe, expect, it } from "vitest";
import advisor from "./advisor.md?raw";
import { CHIP_FIELDS } from "./chips";
import { STAGE_1_CHECKLIST, STAGE_2_CHECKLIST } from "./fields";
import { ADVISOR_TOOL_NAMES } from "./tools";

function frontmatter(text: string) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return null;
  const fields: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const kv = /^([a-z-]+):\s*(.+)$/.exec(line);
    if (kv) fields[kv[1]!] = kv[2]!.trim();
  }
  return fields;
}

// The text from a "## " heading to the next one.
function section(heading: string) {
  return advisor.split(/^## /m).find((s) => s.startsWith(`${heading}\n`)) ?? "";
}

const STAGE_2 = "Stage 2: show me programs";

describe("advisor.md is a valid SKILL.md", () => {
  it("has frontmatter with a name and a description", () => {
    const fm = frontmatter(advisor);
    expect(fm).not.toBeNull();
    expect(fm?.name).toBe("step-up-advisor");
    expect(fm?.description?.length ?? 0).toBeGreaterThan(20);
  });
});

describe("advisor.md names the tools that exist", () => {
  it("mentions every tool", () => {
    for (const name of ADVISOR_TOOL_NAMES) expect(advisor).toContain(`\`${name}\``);
  });

  it("mentions no tool that doesn't exist", () => {
    const named = new Set(advisor.match(/\b(?:ask|check|propose|search|score)_[a-z_]+\b/g) ?? []);
    for (const name of named) expect(ADVISOR_TOOL_NAMES as readonly string[]).toContain(name);
  });

  it("mentions the stage 2 tool only in the tool list and the stage 2 section", () => {
    const stage1 = advisor.replace(section(STAGE_2), "").replace(section("The tools"), "");
    expect(stage1).not.toContain("propose_search");
  });
});

describe("advisor.md is a frozen prompt prefix", () => {
  it("has no dates or timestamps", () => {
    expect(advisor).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(advisor).not.toMatch(/\d{1,2}:\d{2}(:\d{2})?\s?(am|pm|utc|z)?\b/i);
    expect(advisor).not.toMatch(/\b(?:19|20)\d{2}\b/);
  });
});

describe("advisor.md runs stage 1, then stage 2 on request", () => {
  it("lists every stage 1 field in the stage 1 checklist", () => {
    const checklist = section("How stage 1 runs");
    for (const entry of STAGE_1_CHECKLIST) {
      for (const field of entry.fields) expect(checklist).toContain(`\`${field}\``);
    }
  });

  it("asks no stage 2 field before the stage 2 section", () => {
    const stage1 = advisor.replace(section(STAGE_2), "");
    for (const entry of STAGE_2_CHECKLIST) {
      for (const field of entry.fields) expect(stage1, field).not.toContain(`\`${field}\``);
    }
  });

  it("warns before a decline of needs, which makes the engine say not yet", () => {
    expect(section("How stage 1 runs")).toContain("`needs` is the exception");
    expect(section('The "not yet" rule')).toContain("declined `needs`");
  });

  it("ends the verdict with the stage 2 question", () => {
    expect(section("Deliver the verdict")).toContain('"Want to see programs that fit?"');
  });

  it("writes stage 2 as the last section, with every stage 2 field", () => {
    const headings = [...advisor.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(headings.at(-1)).toBe(STAGE_2);
    const stage2 = section(STAGE_2);
    for (const entry of STAGE_2_CHECKLIST) {
      for (const field of entry.fields) expect(stage2, field).toContain(`\`${field}\``);
    }
    expect(stage2).toContain("`formatPreference`");
  });
});

// The server refuses these with is_error (docs/chat-api.md), so a rule that leads the model to
// them costs a round (issues #76 and #80).
describe("advisor.md only asks for tool calls the server accepts", () => {
  it("requires ask_choice only for fields with a chip set; goalClarity has none", () => {
    const tools = section("The tools");
    expect(tools).toContain("**Every** field with a chip set");
    expect(tools).not.toMatch(/fixed-choice field/);
    expect(CHIP_FIELDS as readonly string[]).not.toContain("goalClarity");
    expect(section("How stage 1 runs")).toContain("`goalClarity` is yours to set");
  });

  it("calls check_contradictions before propose_direction, even after a wrap-up note", () => {
    const wrapUp = section("Confirm before the verdict")
      .split("\n")
      .find((line) => line.includes("wrap up"));
    expect(wrapUp).toBeDefined();
    const check = wrapUp!.indexOf("`check_contradictions`");
    expect(check).toBeGreaterThanOrEqual(0);
    expect(check).toBeLessThan(wrapUp!.indexOf("`propose_direction`"));
    expect(section("The tools")).toMatch(/\*\*always\*\* before `propose_direction`/);
  });
});

describe("advisor.md explains the verdict in words, from the engine's reasons (issue #130)", () => {
  it("forbids scores in the advisor's words", () => {
    const verdict = section("Deliver the verdict");
    expect(verdict).toMatch(/Never state a score, subtotal, point, adjustment or rank number/);
    expect(section("Facts come from tool results only")).toContain(
      "Scores never appear in what you write.",
    );
  });

  it("names what separates the winner from the runner-up when the needs don't", () => {
    const verdict = section("Deliver the verdict");
    expect(verdict).toContain(
      "When the needs don't separate the winner from the runner-up (`decidingNeeds` is empty), name the reason that does",
    );
  });

  it('matches the engine: a ruled-out type\'s reasons start with "Out:"', () => {
    expect(section("Deliver the verdict")).toContain(
      'A type is ruled out only when its reasons start with "Out:"',
    );
  });

  it("takes every loss reason from the type's reasons, so no length reason is invented", () => {
    const verdict = section("Deliver the verdict");
    expect(verdict).toContain("only from that type's `reasons`");
    expect(verdict).toMatch(
      /never give a type a length, hours or work reason that its reasons don't state/,
    );
  });
});

// The server's checks on propose_search (docs/chat-api.md, "Stage 2"): a rule that leads the
// model past them costs a round.
describe("advisor.md leads stage 2 to a card the server accepts", () => {
  const stage2 = () => section(STAGE_2);

  it("starts stage 2 only after the direction is confirmed and the user opts in", () => {
    expect(stage2()).toContain("only after the user confirms the direction card");
    expect(section("The tools")).toContain("Stage 2 chips only after the direction is confirmed");
  });

  it("calls check_contradictions again before propose_search", () => {
    expect(section("The tools")).toMatch(/again in stage 2, before `propose_search`/);
    const confirm = stage2().split("### ")[1] ?? "";
    expect(confirm.indexOf("`check_contradictions`")).toBeLessThan(
      confirm.indexOf("`propose_search`"),
    );
  });

  it("sends only the answers with no chips, and goes back to the direction when one changes", () => {
    expect(stage2()).toContain("You never send a chip answer: the system reads it from the tap.");
    expect(stage2()).toContain("so you don't send them");
    expect(stage2()).not.toContain("Copy every stage 1 answer");
    expect(stage2()).toMatch(/call `propose_direction` again and let them confirm the new verdict/);
  });

  it("asks for the home in words and turns it into an ISO code and coordinates", () => {
    expect(stage2()).toContain("two-letter ISO 3166 code in capitals");
    expect(stage2()).toContain("latitude −90 to 90, longitude −180 to 180");
    expect(stage2()).toContain("never with chips");
  });

  it("explains the programs from the result only", () => {
    expect(stage2()).toContain("never reorder the list");
    expect(stage2()).toContain('If `access.status` is not "available"');
  });
});

describe("advisor.md explains a near miss from the issue, not as an overshoot", () => {
  it("reads the issue's note and never says a program misses a limit it's within", () => {
    const stage2 = section("Stage 2: show me programs");
    expect(stage2).toContain("as the issue's `note` says");
    expect(stage2).toContain("Never say a program misses a limit its figure is within.");
  });
});

describe("advisor.md says what a passing check asks of the user", () => {
  it("tells the model to mention a passing issue's note, such as relocating", () => {
    expect(section("Stage 2: show me programs")).toContain(
      "An issue that passes but has a `note` is something the program asks of them",
    );
  });
});

// check_contradictions runs on the taps (decisions.md, "The real API refused the stage 2
// schemas"): the prompt must not ask the model to send answers the tool no longer takes.
describe("advisor.md calls check_contradictions with what the tool takes", () => {
  it("never tells the model to send answers to check_contradictions", () => {
    expect(advisor).not.toMatch(/check_contradictions` with the/);
    expect(section("The tools")).toContain("You send only the tensions they resolved");
  });
});
