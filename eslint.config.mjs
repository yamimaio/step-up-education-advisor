import { builtinModules } from "node:module";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Every Node built-in, bare and node:-prefixed (exact names, so "../lib/util" is still fine).
const nodeBuiltins = builtinModules.flatMap((name) => [name, `node:${name}`]);

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

const config = [
  { ignores: [".next/**", "node_modules/**", "coverage/**", "next-env.d.ts"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  { rules: { "no-console": "error" } },
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
      "no-restricted-globals": [
        "error",
        ...[
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
        {
          selector:
            "MemberExpression[object.name='globalThis'][property.name=/^(process|Buffer)$/]",
          message: "core/ must not reach Node globals through globalThis.",
        },
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
