import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@core": dir("./core"),
      "@server": dir("./server"),
      "@app": dir("./app"),
    },
  },
  test: {
    environment: "node",
    // The boundary tests load the full ESLint + Next config on first use, which is slow when cold.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
