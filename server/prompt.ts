import type Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The advisor's system prompt: core/advisor/advisor.md without its SKILL.md frontmatter, read
// once at startup. next.config.ts traces the file into the standalone output; if it is missing
// or empty the server fails at load instead of running the advisor with no rules (build-steps R3).

export function advisorPrompt(markdown: string): string {
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  if (!body) throw new Error("core/advisor/advisor.md is empty");
  return body;
}

const ADVISOR_PATH = join(process.cwd(), "core", "advisor", "advisor.md");

// One text block with the cache breakpoint: tools and system form the cached prefix.
export const SYSTEM: readonly Anthropic.TextBlockParam[] = Object.freeze([
  {
    type: "text",
    text: advisorPrompt(readFileSync(ADVISOR_PATH, "utf8")),
    cache_control: { type: "ephemeral" },
  },
]);
