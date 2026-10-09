import { FixtureDatasetSchema } from "../../core/schema/dataset";
import type { Program, ProgramInput } from "../../core/schema/program";
import { fixturePrograms } from "./programs";

// Fixtures parsed the way the loader parses real data, so tests get real Program objects.
export function fixtureDataset(): Program[] {
  return FixtureDatasetSchema.parse(fixturePrograms);
}

// One fixture by id, optionally changed. Defaults to the fake executive program.
export function fixture(id = "fake-executive", overrides: Partial<ProgramInput> = {}): Program {
  const base = fixturePrograms.find((p) => p.id === id);
  if (!base) throw new Error(`no fixture with id ${id}`);
  const [program] = FixtureDatasetSchema.parse([{ ...base, ...overrides }]);
  if (!program) throw new Error("fixture did not parse");
  return program;
}
