import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function lint(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return (
    result?.messages.filter(
      (m) => m.ruleId === "no-restricted-imports" || m.ruleId === "no-restricted-syntax",
    ) ?? []
  );
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
    ['import x from "node:fs";', "node: built-in"],
    ['import x from "util";', "bare built-in util"],
    ['import x from "http";', "bare built-in http"],
    ['import x from "path/posix";', "bare built-in subpath"],
    ['import x from "fs/promises";', "bare built-in fs/promises"],
    ['const x = require("../server/x");\nexport const z = x;', "require()"],
    ['export const x = import("../server/x");', "dynamic import"],
  ])("rejects %s (%s)", async (code) => {
    const messages = await lint("core/__probe__.ts", `${code}\nexport const y = x;\n`);
    expect(messages.length).toBeGreaterThan(0);
  });

  it("does not mistake local files named like built-ins for built-ins", async () => {
    const messages = await lint(
      "core/engine/__probe__.ts",
      'import u from "../lib/util";\nimport p from "./path";\nexport const x = [u, p];\n',
    );
    expect(messages).toEqual([]);
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

  it.each(["app/components/__probe__.tsx", "app/page.tsx", "app/chat/__probe__.tsx"])(
    "keeps %s away from server/",
    async (file) => {
      const messages = await lint(file, 'import x from "@server/tools";\nexport const y = x;\n');
      expect(messages.length).toBeGreaterThan(0);
    },
  );

  it("lets app/api import server/", async () => {
    const messages = await lint(
      "app/api/chat/route.ts",
      'import x from "@server/tools";\nexport const y = x;\n',
    );
    expect(messages).toEqual([]);
  });

  it("does not mistake react-dom/server for the server/ directory", async () => {
    const messages = await lint(
      "app/components/__probe__.tsx",
      'import { renderToString } from "react-dom/server";\nexport const y = renderToString;\n',
    );
    expect(messages).toEqual([]);
  });
});
