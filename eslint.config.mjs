import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const modelAndWeb = ["next", "next/*", "react", "react-dom", "@anthropic-ai/*"];
const nodeBuiltins = ["node:*", "fs", "path", "fs/promises", "child_process", "os", "crypto"];

const appPaths = ["@app/*", "**/app", "**/app/*"];
const serverPaths = ["@server/*", "**/server", "**/server/*"];

const ban = (patterns, message) => ["error", { patterns: [{ group: patterns, message }] }];

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
        [...appPaths, ...serverPaths, ...modelAndWeb, ...nodeBuiltins],
        "core/ must stay free of web, model and Node code (see CLAUDE.md rule 1).",
      ),
    },
  },
  {
    files: ["server/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ban(appPaths, "server/ must not import from app/.") },
  },
  {
    // Only app/api may import server code.
    files: ["app/components/**/*.{ts,tsx}", "app/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ban(serverPaths, "Browser code must not import server/."),
    },
  },
  {
    files: ["server/log.ts", "scripts/**/*.ts", "tests/**/*.ts"],
    rules: { "no-console": "off" },
  },
];

export default config;
