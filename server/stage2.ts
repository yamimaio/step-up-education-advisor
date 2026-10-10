import type { RankedProgram, SearchResult } from "../core/engine/types";
import type { Program } from "../core/schema/program";

// What the model sees when the user confirms the stage 2 card (docs/chat-api.md, "The programs
// result"). The page gets the engine's whole SearchResult in `programs`; the model gets this
// summary of the listed programs instead. The whole result is about 2,000 characters per program,
// and the history the page posts back caps a tool result at 20,000 characters
// (server/requestSchema.ts). Built only from the result and the program records, so a retry
// rebuilds the same bytes.

export type SearchSummary = ReturnType<typeof searchSummary>;

export function searchSummary(result: SearchResult, programs: Program[]) {
  const records = new Map(programs.map((p) => [p.id, p]));
  const evaluations = new Map(result.programs.map((e) => [e.id, e]));
  const entry = ({ id, why }: RankedProgram) => {
    const record = records.get(id);
    const e = evaluations.get(id);
    return {
      id,
      name: record?.name ?? id,
      institution: record?.institution ?? null,
      category: e?.category ?? record?.category ?? null,
      status: e?.status ?? null,
      why,
      // The limits the program misses or can't be checked on, as the card shows them.
      issues: (e?.checks ?? [])
        .filter((c) => c.status !== "pass" || c.unknown)
        .map((c) => ({
          check: c.id,
          status: c.status,
          value: c.value,
          limit: c.limit,
          unit: c.unit,
          unknown: c.unknown,
          // The engine's own words on the check: a per-course estimate, a lodging-only travel
          // total, a distance it can't tell. Without it a near miss reads as an overshoot.
          ...(c.note ? { note: c.note } : {}),
        })),
      fit: [e?.score.format.text, e?.score.travel.text].filter((t): t is string => !!t),
      totalCostUsd: e?.totalCostUsd ?? null,
      confidence: e?.confidence.level ?? null,
    };
  };
  const { ranked, alsoWorthALook } = result.ranking;
  return {
    ranked: ranked.map(entry),
    alsoWorthALook: alsoWorthALook.map(entry),
    // Programs in the data that aren't listed (other types, or outside the user's limits).
    notListed: result.programs.length - ranked.length - alsoWorthALook.length,
    access: result.access,
    noProgram: result.noProgram,
    profileGaps: result.profileGaps,
  };
}
