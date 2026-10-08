import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

const RESTRICTION_RULES = new Set([
  "no-restricted-imports",
  "no-restricted-syntax",
  "import/no-restricted-paths",
  "no-restricted-globals",
]);

// Returns only the boundary-rule messages, but first insists the file was really linted:
// a parse error, an ignored file or a broken config must fail the test, not look like "clean".
async function lint(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  if (!result) throw new Error(`ESLint returned no result for ${filePath}`);
  // Messages without a rule id are parse errors or "file ignored" warnings.
  const broken = result.messages.filter((m) => m.fatal || m.ruleId === null);
  if (broken.length) {
    throw new Error(`${filePath} was not linted properly: ${JSON.stringify(broken)}`);
  }
  return result.messages.filter((m) => m.ruleId !== null && RESTRICTION_RULES.has(m.ruleId));
}

describe("lint helper", () => {
  it("throws on a parse error instead of reporting a clean file", async () => {
    await expect(lint("core/__probe__.ts", "import {{{ nope")).rejects.toThrow();
  });

  it("control: a known-bad import fails in the same setup the clean cases use", async () => {
    const bad = await lint(
      "core/__probe__.ts",
      'import x from "@app/page";\nexport const y = x;\n',
    );
    const good = await lint("core/__probe__.ts", 'import { z } from "zod";\nexport const y = z;\n');
    expect(bad.length).toBeGreaterThan(0);
    expect(good).toEqual([]);
  });
});

describe("core/ boundary", () => {
  it.each([
    ['import x from "../server/index";', "relative server import"],
    ['import x from "@server/index";', "aliased server import"],
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
    ['const x = require("../server/index");\nexport const z = x;', "require()"],
    ['export const x = import("../server/index");', "dynamic import"],
    ["export const k = process.env.MODEL_API_KEY;", "process.env"],
    ["export const b = Buffer.from('x');", "Buffer"],
    ["export const d = __dirname;", "__dirname"],
    ["export const k = globalThis.process.env;", "globalThis.process"],
    ["export const k = globalThis['process'];", "globalThis['process']"],
    ["const g = globalThis;\nexport const k = g.process;", "aliased globalThis"],
    ['import x from "events/";\nexport const y = x;', "built-in name with a trailing slash"],
    ['import x from "fs/";\nexport const y = x;', "fs with a trailing slash"],
  ])("rejects %s (%s)", async (code) => {
    const messages = await lint("core/__probe__.ts", `${code}\nexport const y = x;\n`);
    expect(messages.length).toBeGreaterThan(0);
  });

  it("rejects a relative server import from a subfolder of core/", async () => {
    const messages = await lint(
      "core/engine/__probe__.ts",
      'import x from "../../server/index";\nexport const y = x;\n',
    );
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
      const messages = await lint(file, 'import x from "@server/index";\nexport const y = x;\n');
      expect(messages.length).toBeGreaterThan(0);
    },
  );

  it("lets app/api import server/", async () => {
    const messages = await lint(
      "app/api/chat/route.ts",
      'import x from "@server/index";\nexport const y = x;\n',
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
