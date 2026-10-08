import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { DatasetSchema } from "../core/schema/dataset";
import type { ProgramInput } from "../core/schema/program";
import { convertResearch, recordProblems, upsertRecord } from "./lib/research";

// Usage: tsx scripts/draft-records.ts [--dry-run] [--force] <path/to/<id>>
// Reads <id>.md, <id>-rating.md and <id>-overrides.json next to each other.
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const prefix = args.find((a) => !a.startsWith("--"));
if (!prefix) {
  console.error("Usage: draft-records [--dry-run] [--force] <path/to/<id>>");
  process.exit(1);
}

const dataFile = fileURLToPath(new URL("../core/data/programs.json", import.meta.url));
const read = (file: string) => {
  if (!existsSync(file)) {
    console.error(`Missing ${file}`);
    process.exit(1);
  }
  return readFileSync(file, "utf8");
};

try {
  const id = basename(prefix);
  const { record, notes, uncertain } = convertResearch({
    id,
    research: read(`${prefix}.md`),
    rating: read(`${prefix}-rating.md`),
    overrides: JSON.parse(read(`${prefix}-overrides.json`)),
  });

  const problems = recordProblems(record);
  for (const n of notes) console.error(`note: ${n}`);
  if (problems.length > 0) {
    for (const p of problems) console.error(`${id} › ${p}`);
    console.error(`${problems.length} problem(s). Nothing was written.`);
    process.exit(1);
  }

  if (dryRun) {
    console.log(JSON.stringify(record, null, 2));
  } else {
    const existing = JSON.parse(read(dataFile)) as ProgramInput[];
    const next = upsertRecord(existing, record, force);
    const check = DatasetSchema.safeParse(next);
    if (!check.success) {
      for (const i of check.error.issues) console.error(`${i.path.join(".")}: ${i.message}`);
      process.exit(1);
    }
    writeFileSync(dataFile, `${JSON.stringify(next, null, 2)}\n`);
    console.error(`Wrote ${id} (draft) to core/data/programs.json`);
  }

  if (uncertain.length > 0) {
    console.error("\nUncertain or conflicting (for the PR body):");
    for (const u of uncertain) console.error(`- ${u}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
