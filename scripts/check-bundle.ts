// Fails when the API key, its name or the Anthropic SDK reaches the browser bundle (CLAUDE.md
// rule 3). Run after `npm run build` with MODEL_API_KEY=ci-canary-not-a-key, as CI does.
// "anthropic-version" is a header name every build of the SDK contains, so it marks the SDK
// in a client chunk even when minified.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const STATIC_DIR = ".next/static";
const MARKERS = ["ci-canary-not-a-key", "MODEL_API_KEY", "anthropic-version"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

if (!existsSync(STATIC_DIR)) {
  console.error(`${STATIC_DIR} is missing: run npm run build first`);
  process.exit(1);
}

const all = files(STATIC_DIR);
const leaks = all.flatMap((path) => {
  const text = readFileSync(path, "utf8");
  return MARKERS.filter((m) => text.includes(m)).map((m) => `${path}: ${m}`);
});

if (all.length === 0) {
  console.error(`${STATIC_DIR} has no files: nothing was checked`);
  process.exit(1);
}
if (leaks.length) {
  console.error(`Found in the browser bundle:\n${leaks.join("\n")}`);
  process.exit(1);
}
console.log(`check-bundle: ${all.length} files in ${STATIC_DIR}, no key, key name or SDK`);
