import type { Program } from "./program";

// The oldest checkedOn among a program's sources, so the card shows how old the stalest fact is.
// Null when the program has no sources (the schema rejects that for real records).
export function verifiedOn(program: Pick<Program, "sources">): string | null {
  const dates = program.sources.map((s) => s.checkedOn).sort();
  return dates[0] ?? null;
}
