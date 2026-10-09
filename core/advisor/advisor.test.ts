import { describe, expect, it } from "vitest";
import advisor from "./advisor.md?raw";
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

const STAGE_2 = "Stage 2, not wired yet";

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

  it("mentions the stage 2 tool only in the stage 2 section", () => {
    const stage1 = advisor.replace(section(STAGE_2), "");
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

describe("advisor.md runs stage 1 and stops", () => {
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

  it("records tensions outside the rules in general terms", () => {
    const tension = section("Name the tension");
    expect(tension).toContain("`otherTensions`");
    expect(tension).toContain("no names, places, employers or figures");
  });

  it("warns before a decline of needs, which makes the engine say not yet", () => {
    expect(section("How stage 1 runs")).toContain("`needs` is the exception");
    expect(section('The "not yet" rule')).toContain("declined `needs`");
  });

  it("ends the verdict with the stage 2 question", () => {
    expect(section("Deliver the verdict")).toContain('"Want to see programs that fit?"');
  });

  it("writes the stage 2 questions as the last section, marked not wired", () => {
    const headings = [...advisor.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(headings.at(-1)).toBe(STAGE_2);
    const stage2 = section(STAGE_2);
    for (const entry of STAGE_2_CHECKLIST) {
      for (const field of entry.fields) expect(stage2, field).toContain(`\`${field}\``);
    }
    expect(stage2).toContain("`formatPreference`");
  });
});
