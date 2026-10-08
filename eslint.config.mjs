import { builtinModules } from "node:module";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Every Node built-in, bare and node:-prefixed (exact names, so "../lib/util" is still fine).
const nodeBuiltins = builtinModules.flatMap((name) => [name, `node:${name}`]);

// Regexes (not globs) so that "react-dom/server" isn't mistaken for the server/ directory.
const appPaths = [String.raw`^@app(/|$)`, String.raw`^(\.{1,2}/)+(.*/)?app(/|$)`];
const serverPaths = [String.raw`^@server(/|$)`, String.raw`^(\.{1,2}/)+(.*/)?server(/|$)`];

const ban = ({ regex = [], group = [], names = [] }, message) => [
  "error",
  {
    paths: names.map((name) => ({ name, message })),
    patterns: [
      ...(regex.length ? [{ regex: regex.join("|"), message }] : []),
      ...(group.length ? [{ group, message }] : []),
    ],
  },
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
      "no-restricted-imports": ban(
        {
          regex: [...appPaths, ...serverPaths],
          group: ["next/*", "react/*", "react-dom/*", "@anthropic-ai/*", "node:*"],
          names: ["next", "react", "react-dom", ...nodeBuiltins],
        },
        "core/ must stay free of web, model and Node code (see CLAUDE.md rule 1).",
      ),
      "no-restricted-syntax": [
        "error",
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
      "no-restricted-imports": ban({ regex: appPaths }, "server/ must not import from app/."),
    },
  },
  {
    // Only app/api may import server code, so server/ can't be bundled for the browser.
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/api/**"],
    rules: {
      "no-restricted-imports": ban({ regex: serverPaths }, "Browser code must not import server/."),
    },
  },
  {
    files: ["server/log.ts", "scripts/**/*.ts", "tests/**/*.ts"],
    rules: { "no-console": "off" },
  },
];

export default config;
