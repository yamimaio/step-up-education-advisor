import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateDataset } from "../core/schema/dataset";

// Usage: tsx scripts/validate-data.ts [path/to/programs.json]
const file =
  process.argv[2] ?? fileURLToPath(new URL("../core/data/programs.json", import.meta.url));
const today = new Date().toISOString().slice(0, 10);

let data: unknown;
try {
  data = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  console.error(`Cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const problems = validateDataset(data, today);
if (problems.length > 0) {
  for (const p of problems) console.error(p);
  console.error(`${problems.length} problem${problems.length === 1 ? "" : "s"} in ${file}`);
  process.exit(1);
}

const records = data as { verification: { status: string } }[];
const verified = records.filter((r) => r.verification.status === "verified").length;
console.log(
  `${records.length} records OK (${verified} verified, ${records.length - verified} draft)`,
);
