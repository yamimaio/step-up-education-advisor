import { builtinModules } from "node:module";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Every Node built-in: bare, node:-prefixed and with a trailing slash (some resolvers map
// "fs/" to the built-in). Exact names, so "../lib/util" is still fine.
const nodeBuiltins = builtinModules.flatMap((name) => [name, `${name}/`, `node:${name}`]);

// Package bans are by name. Directory boundaries use import/no-restricted-paths below,
// which resolves the real path (so react-dom/server and core/server/ are not confused
// with the top-level server/ directory).
const ban = ({ group = [], names = [] }, message) => [
  "error",
  { paths: names.map((name) => ({ name, message })), patterns: [{ group, message }] },
];

const zones = (target, froms, message) => [
  "error",
  { zones: froms.map((from) => ({ target, from, message })) },
];

// Reading the API key anywhere but server/model/anthropic.ts (CLAUDE.md rule 3): dotted,
// computed with a string, or destructured.
const keyMessage = "Only server/model/anthropic.ts reads MODEL_API_KEY (see CLAUDE.md rule 3).";
const keyReads = [
  "MemberExpression[property.name='MODEL_API_KEY']",
  "MemberExpression[property.value='MODEL_API_KEY']",
  "ObjectPattern > Property[key.name='MODEL_API_KEY']",
  "ObjectPattern > Property[key.value='MODEL_API_KEY']",
].map((selector) => ({ selector, message: keyMessage }));

const config = [
  { ignores: [".next/**", "node_modules/**", "coverage/**", "next-env.d.ts"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  { rules: { "no-console": "error" } },
  {
    ignores: ["server/model/anthropic.ts"],
    rules: { "no-restricted-syntax": ["error", ...keyReads] },
  },
  {
    // core/ has no web or model code and never imports app/ or server/.
    files: ["core/**/*.{ts,tsx}"],
    rules: {
      "import/no-restricted-paths": zones(
        "./core",
        ["./app", "./server"],
        "core/ must not import from app/ or server/ (see CLAUDE.md rule 1).",
      ),
      "no-restricted-imports": ban(
        {
          group: ["next/*", "react/*", "react-dom/*", "@anthropic-ai/*", "node:*"],
          names: ["next", "react", "react-dom", ...nodeBuiltins],
        },
        "core/ must stay free of web, model and Node code (see CLAUDE.md rule 1).",
      ),
      // Node globals: core/ must not read process.env (the API key lives in server/model only).
      // globalThis is banned outright: every way of reaching process through it (dotted, computed,
      // aliased) would otherwise be a hole.
      "no-restricted-globals": [
        "error",
        ...[
          "globalThis",
          "process",
          "Buffer",
          "global",
          "__dirname",
          "__filename",
          "require",
          "module",
          "exports",
        ].map((name) => ({
          name,
          message: "core/ must not use Node globals (see CLAUDE.md rules 1 and 3).",
        })),
      ],
      "no-restricted-syntax": [
        "error",
        ...keyReads,
        {
          selector: "CallExpression[callee.name='require']",
          message: "core/ uses ES imports only; require() would bypass the boundary rules.",
        },
        {
          selector: "ImportExpression",
          message:
            "core/ uses static imports only; dynamic import() would bypass the boundary rules.",
        },
      ],
    },
  },
  {
    files: ["server/**/*.{ts,tsx}"],
    rules: {
      "import/no-restricted-paths": zones(
        "./server",
        ["./app"],
        "server/ must not import from app/.",
      ),
    },
  },
  {
    // Only app/api may import server code, so server/ can't be bundled for the browser.
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/api/**"],
    rules: {
      "import/no-restricted-paths": zones(
        "./app",
        ["./server"],
        "Browser code must not import server/.",
      ),
    },
  },
  {
    files: ["server/log.ts", "scripts/**/*.ts", "tests/**/*.ts"],
    rules: { "no-console": "off" },
  },
];

export default config;
