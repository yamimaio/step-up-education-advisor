import { describe, expect, it } from "vitest";
import advisor from "./advisor.md?raw";
import { CHECKLIST } from "./fields";
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
});

describe("advisor.md is a frozen prompt prefix", () => {
  it("has no dates or timestamps", () => {
    expect(advisor).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(advisor).not.toMatch(/\d{1,2}:\d{2}(:\d{2})?\s?(am|pm|utc|z)?\b/i);
    expect(advisor).not.toMatch(/\b(?:19|20)\d{2}\b/);
  });
});

describe("advisor.md carries the checklist", () => {
  it("lists all 17 entries and every profile field they fill", () => {
    expect(CHECKLIST).toHaveLength(17);
    for (const entry of CHECKLIST) {
      for (const field of entry.fields) expect(advisor).toContain(`\`${field}\``);
    }
  });
});
