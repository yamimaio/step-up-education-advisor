// Prints one markdown summary from the walk results, for a review to paste.
// Usage: node summarize.mjs <outDir> <target> <commit> <viewports, comma-separated>
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const version = (p) => require(`${p}/package.json`).version;

const [out, target, commit, viewports] = process.argv.slice(2);
const runs = viewports.split(",").map((v) => {
  const file = `${out}/result-${v}.json`;
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { viewport: v, missing: true };
});

const mark = { pass: "pass", fail: "**FAIL**", "n/a": "n/a" };
const cell = (s) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const lines = [];
const names = runs.find((r) => r.checks)?.checks.map((c) => c.name) ?? [];
const failing = runs.flatMap((r) => (r.checks ?? []).filter((c) => c.status === "fail"));
const missing = runs.filter((r) => r.missing);

lines.push(`### /ui-walk: ${target} at ${commit.slice(0, 7)}`);
lines.push("");
lines.push(
  `Production build with MODEL_FAKE=1 (persona A's scripted advisor), Chromium in Playwright ${version("playwright")}, axe-core ${version("axe-core")}. ` +
    `Viewports: ${runs.map((r) => r.viewport).join(", ")}.`,
);
const f = runs.find((r) => r.features)?.features;
if (f) {
  const panel = runs.map((r) => `${r.features?.panel ?? "?"} at ${r.viewport}`).join(", ");
  lines.push(
    `Page: progress line ${f.progressLine ? `yes${f.stickyProgress ? " (sticky)" : ""}` : "no"}; "What I've understood" panel: ${panel}.`,
  );
}
lines.push("");
lines.push(
  `**Result: ${
    missing.length
      ? `no result at ${missing.map((r) => r.viewport).join(", ")}, so not a pass`
      : failing.length
        ? `${failing.length} failing checks`
        : "all checks pass or n/a"
  }.**`,
);
lines.push("");
lines.push(`| Check | ${runs.map((r) => r.viewport).join(" | ")} |`);
lines.push(`|---|${runs.map(() => "---").join("|")}|`);
for (const name of names) {
  const cells = runs.map((r) => {
    if (r.missing) return "**no result**";
    const c = r.checks.find((x) => x.name === name);
    return c ? `${mark[c.status]}: ${cell(c.detail)}` : "";
  });
  lines.push(`| ${name} | ${cells.join(" | ")} |`);
}
lines.push("");

const details = runs.flatMap((r) =>
  (r.checks ?? [])
    .filter((c) => c.failures.length)
    .map((c) =>
      [
        `- ${r.viewport}, ${c.name}:`,
        ...c.failures.slice(0, 8).map((x) => `  - ${x}`),
        ...(c.failures.length > 8 ? [`  - and ${c.failures.length - 8} more`] : []),
      ].join("\n"),
    ),
);
if (details.length) {
  lines.push("<details><summary>Failure details</summary>");
  lines.push("");
  lines.push(...details);
  lines.push("");
  lines.push("</details>");
  lines.push("");
}
for (const r of runs.filter((x) => x.missing))
  lines.push(`- ${r.viewport}: the walk wrote no result.`);

const shots = runs.flatMap((r) => r.screenshots ?? []);
if (shots.length)
  lines.push(`Screenshots (${shots.length}, in the run's output folder): ${shots.join(", ")}.`);
lines.push("");
lines.push(
  "Not checked: look and feel (brand, spacing, the mark), a real screen-reader pass, and walks with the real model. Those stay with Yami or a Claude desktop session, once per UI PR.",
);
process.stdout.write(`${lines.join("\n")}\n`);
