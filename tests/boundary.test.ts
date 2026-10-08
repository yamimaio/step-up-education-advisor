import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function lint(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.filter((m) => m.ruleId === "no-restricted-imports") ?? [];
}

describe("core/ boundary", () => {
  it.each([
    ['import x from "../server/x";', "relative server import"],
    ['import x from "@server/x";', "aliased server import"],
    ['import x from "../app/page";', "relative app import"],
    ['import x from "@app/page";', "aliased app import"],
    ['import x from "@anthropic-ai/sdk";', "model SDK"],
    ['import x from "next/server";', "next"],
    ['import x from "react";', "react"],
    ['import x from "node:fs";', "node built-in"],
  ])("rejects %s (%s)", async (code) => {
    const messages = await lint("core/__probe__.ts", `${code}\nexport const y = x;\n`);
    expect(messages.length).toBeGreaterThan(0);
  });

  it("accepts imports within core/", async () => {
    const messages = await lint(
      "core/engine/__probe__.ts",
      'import { z } from "zod";\nimport y from "../schema/y";\nexport const x = [z, y];\n',
    );
    expect(messages).toEqual([]);
  });
});

describe("browser and server boundaries", () => {
  it("keeps server/ away from app/", async () => {
    const messages = await lint(
      "server/__probe__.ts",
      'import x from "@app/page";\nexport const y = x;\n',
    );
    expect(messages.length).toBeGreaterThan(0);
  });

  it("keeps app/components away from server/", async () => {
    const messages = await lint(
      "app/components/__probe__.tsx",
      'import x from "@server/tools";\nexport const y = x;\n',
    );
    expect(messages.length).toBeGreaterThan(0);
  });
});
